import { type ReactNode, createContext, useRef, useContext, useEffect } from 'react'
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import { devtools, persist } from 'zustand/middleware'
import { InstanceViewModel, MappingsViewModel, User } from '../models'
import apiClient from '../api/apiClient'
import * as _ from 'lodash';
import { getAuthHeaders } from '../utils/authUtils'

// Combined state from both stores
export type InstanceState = {
    // Instance related state
    instanceState: InstanceViewModel

    // Mappings related state
    mappingsState: MappingsViewModel[]
}

export type InstanceActions = {
    // Instance related actions
    setInstance: (user: User, newInstanceState: InstanceViewModel) => void,

    // Mappings related actions
    setMappingsState: (user: User, instanceState: InstanceViewModel) => Promise<void>,
    addMapping: (newMapping: MappingsViewModel) => void,
    modifyWaterfallGroup: (mappingIndex: number, rowIndex: number, newWaterfallGroup: string) => void,
    refreshMappingsState: (user: User, instanceState: InstanceViewModel) => Promise<void>,
    upsyncCurrentMappings: (user: User, instanceState: InstanceViewModel) => Promise<void>,
}

export type InstanceStore = InstanceState & InstanceActions

// Create the combined store
export const createInstanceStore = (
    initState: InstanceState = {
        instanceState: null,
        mappingsState: [],
    },
) => {
    return createStore<InstanceStore>()(
        devtools(
            (set, get) => {

                return ({
                    ...initState,

                    // INSTANCE STATE ACTIONS
                    setInstance: async (user: User, newInstanceState: InstanceViewModel) => {
                        console.log('[setInstance] Starting...')
                        // Try to load from sessionStorage first
                        try {
                            const mappingNames: string[] = await queryMappingNames(user, newInstanceState);
                            const numericTableData = await updateNumericTableData(user, newInstanceState)
                            const waterfallCohortsTableData = await Promise.all(
                                (mappingNames || []).map(async (keyword) => ({
                                    waterfallCohortName: keyword,
                                    run: true,
                                    aggregate: true,
                                    count: (await getMappingDataCount(user, newInstanceState, keyword))?.[0]?.ROW_COUNT || 0
                                }))
                            );
                            // Update the waterfallCohortListData after saving mappings
                            const newWaterfallCohortListData = await getWaterfallCohortListData(user, newInstanceState, get().mappingsState);

                            set(prevState => {
                                const newState = _.cloneDeep(prevState);
                                newState.instanceState = {
                                    ...newInstanceState,
                                    numericTableData,
                                    waterfallCohortsTableData,
                                    waterfallCohortListData: newWaterfallCohortListData
                                };
                                newState.mappingsState = null;
                                return newState;
                            });

                        } catch (err) {
                            console.error('Error setting instance view state:', err);
                            // Still update with the new instance state even if data fetching fails
                            set(prevState => {
                                const newState = _.cloneDeep(prevState);
                                newState.instanceState = newInstanceState;
                                newState.mappingsState = [];
                                return newState;
                            });
                        } finally {
                            console.log('[setInstance] Completed')
                        }
                    },
                    // MAPPINGS STATE ACTIONS
                    setMappingsState: async (user, instanceState: InstanceViewModel) => {
                        console.debug('setMappingsState called')
                        try {
                            const mappingsState = await _getMappingsState(user, instanceState);
                            // Update state
                            set(prevState => {
                                const newState = _.cloneDeep(prevState);
                                newState.mappingsState = mappingsState;
                                return newState;
                            });
                        } catch (err) {
                            console.error('Error setting mappings array state:', err);
                        }
                    },

                    refreshMappingsState: async (user, instanceState: InstanceViewModel) => {
                        try {
                            // Always query from database for refresh
                            const mappingsState = await _getMappingsState(user, instanceState);

                            // Update state
                            set(prevState => {
                                const newState = _.cloneDeep(prevState);
                                newState.mappingsState = mappingsState;
                                return newState;
                            });

                            // After refreshing mappings, update the dependent data
                            const newWaterfallCohortListData = await getWaterfallCohortListData(user, instanceState, mappingsState);
                            set(prevState => {
                                const newState = _.cloneDeep(prevState);
                                newState.instanceState = {
                                    ...instanceState,
                                    waterfallCohortListData: newWaterfallCohortListData
                                };
                                return newState;
                            });
                        } catch (err) {
                            console.error('Error refreshing mappings array state:', err);
                        }
                    },

                    addMapping: (newMapping: MappingsViewModel) => {
                        return set(prevState => {
                            // Clone the state
                            const newState = _.cloneDeep(prevState);
                            // Add the new mapping
                            newState.mappingsState = [...newState.mappingsState, newMapping];
                            return newState;
                        });
                    },

                    modifyWaterfallGroup: (mappingIndex: number, rowIndex: number, newWaterfallGroup: string) => {
                        set(prevState => {
                            // Clone the state
                            const newState = _.cloneDeep(prevState);

                            try {
                                // Get mapping details for logging
                                const mappingKeyword = newState.mappingsState[mappingIndex].keyword;
                                const oldValue = newState.mappingsState[mappingIndex].data[rowIndex].Waterfall_Group;

                                // Update the specific field
                                newState.mappingsState[mappingIndex].data[rowIndex].Waterfall_Group = newWaterfallGroup;
                            } catch (err) {
                                console.error('Error updating waterfall group:', err);
                            }

                            // Return the modified state
                            return newState;
                        });
                    },

                    upsyncCurrentMappings: async (user: User, instanceState: InstanceViewModel) => {
                        try {
                            // Update the waterfallCohortListData after saving mappings
                            const newWaterfallCohortListData = await getWaterfallCohortListData(user, instanceState, get().mappingsState);
                            set(prevState => {
                                const newState = _.cloneDeep(prevState);
                                newState.instanceState = {
                                    ...instanceState,
                                    waterfallCohortListData: newWaterfallCohortListData
                                };
                                return newState;
                            });
                        } catch (err) {
                            console.error('Error upsyncing mappings:', err);
                        }
                    }
                });
            }
        ));
}
async function _queryMappingsData(user: User, instanceState: InstanceViewModel, keyword: string): Promise<MappingsViewModel[]> {
    const query =
        `
        DECLARE @sql NVARCHAR(MAX);
        DECLARE @groupFinalColumn NVARCHAR(128);
        DECLARE @groupColumn NVARCHAR(128);

        -- Query to select columns based on pattern
        SELECT TOP 1 @groupFinalColumn = COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${instanceState.table}'
        AND COLUMN_NAME LIKE '%${keyword}_Group_Final%';

        SELECT TOP 1 @groupColumn = COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${instanceState.table}'
        AND COLUMN_NAME LIKE '%${keyword}_Group%';

        -- Build the dynamic SQL query
        SET @sql = N'
            SELECT ' + QUOTENAME(@groupFinalColumn) + ', ' + QUOTENAME(@groupColumn) + ',
                SUM(Charge_Amount) AS Total_Charge_Amount,
                SUM(Payment_Amount) AS Total_Payment_Amount,
                MIN(DOS_Period) AS Earliest_Min_DOS,
                MAX(DOS_Period) AS Latest_Max_DOS,
                MIN(Final_Charge_ID) AS Final_Charge_ID
            FROM ${instanceState.table}
            GROUP BY ' + QUOTENAME(@groupFinalColumn) + ', ' + QUOTENAME(@groupColumn);

        -- Execute the dynamic SQL
        EXEC sp_executesql @sql;
    `
    try {
        // Generate a cache key based on the query and instance details
        const cacheKey = `mapping_cache_${instanceState.server}_${instanceState.database}_${instanceState.table}_${keyword}_${query.replace(/\s+/g, '')}`;

        // Check if we have this data in sessionStorage
        try {
            // First try localStorage (faster)
            const cachedData = localStorage.getItem(cacheKey);
            if (cachedData) {
                console.log(`Using cached data from localStorage for mapping query: ${keyword}`);
                return JSON.parse(cachedData);
            }

            // Then try localStorage (more persistent)
            const localData = localStorage.getItem(cacheKey);
            if (localData) {
                console.log(`Using cached data from localStorage for mapping query: ${keyword}`);
                // Also save to sessionStorage for faster access next time
                sessionStorage.setItem(cacheKey, localData);
                return JSON.parse(localData);
            }
        } catch (cacheErr) {
            console.error('Error accessing storage cache:', cacheErr);
            // Continue with API call if cache access fails
        }

        // If not in cache, make the API call
        const authConfig = await getAuthHeaders(user);
        const data = (await apiClient.post('mssql/query', {
            config: {
                server: instanceState.server,
                database: instanceState.database,
                table: instanceState.table,
                user: instanceState.sqlConfig.user,
                password: instanceState.sqlConfig.password
            },
            query
        }, authConfig));

        console.debug('data:', data)

        // Cache the response for future use
        try {
            const cacheKey = `mapping_cache_${instanceState.server}_${instanceState.database}_${instanceState.table}_${keyword}_${query.replace(/\s+/g, '')}`;
            // Save to both storage types
            localStorage.setItem(cacheKey, JSON.stringify(data));
            sessionStorage.setItem(cacheKey, JSON.stringify(data));
        } catch (cacheErr) {
            console.error('Error caching mapping response:', cacheErr);
            // Continue even if caching fails
        }

        return data
    } catch (error) {
        console.error('Error running SQL query:', error);
    }
}

async function _getMappingsState(user, instanceState: InstanceViewModel): Promise<MappingsViewModel[]> {
    let mappingsArrState: MappingsViewModel[] = [];
    _.forEach(instanceState.waterfallCohortsTableData, async cohort => {
        const mappingData = await _queryMappingsData(user, instanceState, cohort.waterfallCohortName);
        if (mappingData && mappingData.length > 0) {
            const columnName = Object.keys(mappingData[0])[0];
            const keyword = columnName.split('_Group')[0];

            const data = mappingData.map(data => ({
                ...data,
                [`Waterfall_Group`]: data[`${keyword}_Group_Final`]
            }));

            mappingsArrState.push({
                tabName: cohort.waterfallCohortName,
                keyword,
                finalChargeId: data[0].finalChargeId,
                data
            });
        }
    })

    return mappingsArrState.sort((a, b) => a.tabName.localeCompare(b.tabName));
}

async function _syncWaterfallGroupWithFinalGroup(mappingsArr: MappingsViewModel[]): Promise<MappingsViewModel[]> {
    console.log('mappingsArr:', mappingsArr)
    const waterfallGroupSyncedMappingsArr = _.cloneDeep(mappingsArr)
    console.log('waterfallGroupSyncedMappingsArr:', waterfallGroupSyncedMappingsArr)

    return mappingsArr.map((mapping) => {
        mapping.data = mapping.data.map((row) => {
            console.log('row:', row)
            row.Waterfall_Group = row[`${mapping.keyword}_Group_Final`];
            return row;
        });
        return mapping;
    });
}

async function updateNumericTableData(user: User, newInstanceState: InstanceViewModel): Promise<any> {
    const query = `
            SELECT
                SUM(Charge_Amount) AS Total_Charge_Amount,
                SUM(Payment_Amount) AS Total_Payment_Amount,
                SUM(Unit) AS Total_Unit,
                COUNT(Final_Charge_Count) AS Final_Charge_Count,
                COUNT(Final_Charge_Count_w_Payment) AS Final_Charge_w_Payment,
                COUNT(Final_Visit_Count) AS Final_Visit_Count,
                COUNT(Final_Visit_Count_w_Payment) AS Final_Visit_w_Payment
            FROM ${newInstanceState.table};
        `;
    const result = await executeQuery(user, newInstanceState, query, 'Error getting numeric table data');
    if (!result || !result[0]) return [];

    const data = result[0];

    // Map the database fields to our UI fields
    const fieldDefinitions = [
        { fieldName: 'Charge Amount', type: 'Amount', dbField: 'Total_Charge_Amount' },
        { fieldName: 'Payment Amount', type: 'Amount', dbField: 'Total_Payment_Amount' },
        { fieldName: 'Unit', type: 'Amount', dbField: 'Total_Unit' },
        { fieldName: 'Final Charge Count', type: 'Count', dbField: 'Final_Charge_Count' },
        { fieldName: 'Final Charge Count w Payment', type: 'Count', dbField: 'Final_Charge_w_Payment' },
        { fieldName: 'Final Visit Count', type: 'Count', dbField: 'Final_Visit_Count' },
        { fieldName: 'Final Visit Count w Payment', type: 'Count', dbField: 'Final_Visit_w_Payment' },
    ]

    return fieldDefinitions.map(field => ({
        fieldName: field.fieldName,
        type: field.type,
        include: 'Y',
        divideBy: 'Y',
        schedule: 'Y',
        total: data[field.dbField]
    }));;
}

async function getWaterfallCohortListData(user: User, instanceState: InstanceViewModel, mappingsState: MappingsViewModel[]): Promise<any> {
    try {
        // Get the static columns first (DOS and Posting)
        const dosQuery = `
                SELECT DISTINCT DOS_Period as DOS 
                FROM ${instanceState.table} 
                WHERE DOS_Period IS NOT NULL 
                ORDER BY DOS_Period
            `;

        const postingQuery = `
                SELECT DISTINCT Posting_Period as Posting 
                FROM ${instanceState.table} 
                WHERE Posting_Period IS NOT NULL 
                ORDER BY Posting_Period
            `;

        const [dosResult, postingResult] = await Promise.all([
            executeQuery(user, instanceState, dosQuery, 'Error getting DOS data'),
            executeQuery(user, instanceState, postingQuery, 'Error getting Posting data')
        ]);


        // Initialize the result object with the static columns
        const result: Record<string, any[]> = {
            DOS: dosResult ? dosResult.map(row => row.DOS) : [],
            Posting: postingResult ? postingResult.map(row => row.Posting) : [],
        };

        // Use the mappingsState from the store directly
        if (mappingsState && mappingsState.length > 0) {
            // Build keywords string and populate results in one pass
            const keywords = _.reduce(mappingsState, (acc, mapping) => {
                // Extract unique Waterfall_Group values for each tab
                result[mapping.tabName] = _.chain(mapping.data)
                    .map('Waterfall_Group')
                    .uniq()
                    .compact()
                    .value();

                // Append to keywords string
                return acc + mapping.tabName + '-';
            }, '');

            // Initialize empty array for combined keywords
            result[keywords] = [];
        }

        return result;
    }
    catch (error) {
        console.error('Error in getWaterfallCohortListData:', error);
        // Return empty arrays for all columns
        const defaultResult: Record<string, any[]> = {
            DOS: [],
            Posting: [],
            LocationPayorProcedure: []
        };

        return defaultResult;
    }
}

async function executeQuery(user, instanceState: InstanceViewModel, query: string, errorMessage: string): Promise<any> {
    try {
        // Generate a cache key based on the query and instance details
        const cacheKey = `query_cache_${instanceState.server}_${instanceState.database}_${instanceState.table}_${query.replace(/\s+/g, '')}`;

        // Check if we have this data in sessionStorage
        try {
            const cachedData = sessionStorage.getItem(cacheKey);
            if (cachedData) {
                return JSON.parse(cachedData);
            }
        } catch (cacheErr) {
            console.error('Error accessing cache:', cacheErr);
            // Continue with API call if cache access fails
        }

        // If not in cache, make the API call
        const authConfig = await getAuthHeaders(user);
        const response = await apiClient.post('mssql/query', {
            config: {
                server: instanceState.server,
                database: instanceState.database,
                table: instanceState.table,
                user: instanceState.sqlConfig.user,
                password: instanceState.sqlConfig.password,
            },
            query
        }, authConfig);
        console.log('response:', response);

        // Cache the response for future use
        try {
            const cacheKey = `query_cache_${instanceState.server}_${instanceState.database}_${instanceState.table}_${query.replace(/\s+/g, '')}`;
            sessionStorage.setItem(cacheKey, JSON.stringify(response));
        } catch (cacheErr) {
            console.error('Error caching response:', cacheErr);
            // Continue even if caching fails
        }

        return response;
    } catch (err) {
        console.error(`${errorMessage}:`, err);
        return null;
    }
};

async function getMappingDataCount(user: User, instanceState: InstanceViewModel, keyword: string): Promise<any> {
    const query = `
        DECLARE @sql NVARCHAR(MAX);
        DECLARE @groupFinalColumn NVARCHAR(128);
        DECLARE @groupColumn NVARCHAR(128);

        -- Query to select columns based on pattern
        SELECT TOP 1 @groupFinalColumn = COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${instanceState.table}'
        AND COLUMN_NAME LIKE '%${keyword}_Group_Final%';

        SELECT TOP 1 @groupColumn = COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${instanceState.table}'
        AND COLUMN_NAME LIKE '%${keyword}_Group%';

        -- Build the dynamic SQL query
        SET @sql = N'
            WITH GroupedData AS (
                SELECT ' + QUOTENAME(@groupFinalColumn) + ', ' + QUOTENAME(@groupColumn) + '
                FROM ${instanceState.table}
                GROUP BY ' + QUOTENAME(@groupFinalColumn) + ', ' + QUOTENAME(@groupColumn) + '
            )
            SELECT *, (SELECT COUNT(*) FROM GroupedData) AS ROW_COUNT
            FROM GroupedData';

        -- Execute the dynamic SQL
        EXEC sp_executesql @sql;
    `;

    return executeQuery(user, instanceState, query, `Getting ${keyword} count failed`);
};

async function queryMappingNames(user: User, instanceState: InstanceViewModel): Promise<string[]> {
    const keywords = ['Procedure', 'Provider', 'Insurance', 'Location'];
    const query = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                                       WHERE TABLE_NAME = '${instanceState.table}' 
                                       AND (${keywords.map(keyword => `COLUMN_NAME LIKE '%${keyword}%'`).join(' OR ')})`;

    const mappingNames = await executeQuery(user, instanceState, query, 'Error getting mapping names');

    if (!mappingNames) return [];

    return keywords.filter(keyword =>
        mappingNames.some(row => row.COLUMN_NAME.includes(keyword))
    );
};


export type InstanceStoreApi = ReturnType<typeof createInstanceStore>;

export const InstanceStoreContext = createContext<InstanceStoreApi | undefined>(
    undefined,
)

export interface InstanceStoreProviderProps {
    children: ReactNode
}

export const InstanceStoreProvider = ({ children }: InstanceStoreProviderProps) => {
    const storeRef = useRef<InstanceStoreApi>(null);
    if (!storeRef.current) {
        storeRef.current = createInstanceStore();
    }

    return (
        <InstanceStoreContext.Provider value={storeRef.current}>
            {children}
        </InstanceStoreContext.Provider>
    );
}

export const useInstanceStore = <T,>(
    selector: (store: InstanceStore) => T,
): T => {
    const instanceStoreContext = useContext(InstanceStoreContext);

    if (!instanceStoreContext) {
        throw new Error(`useInstanceStore must be used within InstanceStoreProvider`);
    }

    return useStore(instanceStoreContext, selector);
}
