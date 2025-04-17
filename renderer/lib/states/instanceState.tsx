import { type ReactNode, createContext, useRef, useContext } from 'react'
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import { devtools, persist } from 'zustand/middleware'
import { InstanceViewModel, MappingsViewModel, User } from '../models'
import apiClient from '../api/apiClient'
import * as _ from 'lodash';
import { getAuthHeaders } from '../utils/authUtils'

export type InstanceState = {
    instanceState: InstanceViewModel
    isUpdatinginstanceState: boolean
}

export type InstanceActions = {
    setInstance: (user: User, newinstanceState: InstanceViewModel) => void,
    updateNumericTableData: (user: User) => Promise<any>,
}

export type InstanceStore = InstanceState & InstanceActions



export const createInstanceStore = (
    initState: InstanceState = {
        instanceState: null,
        isUpdatinginstanceState: true,
    },
) => {
    return createStore<InstanceStore>()(
        devtools(
            persist(
                (set, get) => {
                    // Define the store methods outside the return object
                    const _switchIsUpdatinginstanceState = (isUpdating: boolean) => {
                        set(prevState => {
                            const newState = _.cloneDeep(prevState);
                            newState.isUpdatinginstanceState = isUpdating;
                            return newState;
                        });
                    };

                    return ({
                        ...initState,
                        setInstance: async (user, newinstanceState: InstanceViewModel) => {
                            console.log('[setInstance] Starting...')
                            _switchIsUpdatinginstanceState(true);
                            // Try to load from sessionStorage first
                            try {
                                // const stateKey = `instance_state_${newinstanceState.server}_${newinstanceState.database}_${newinstanceState.table}`;
                                // const savedState = sessionStorage.getItem(stateKey);

                                // if (savedState) {
                                //     const parsedState = JSON.parse(savedState);
                                //     console.log('Loaded state from sessionStorage:', parsedState);

                                //     set(prevState => {
                                //         const newState = _.cloneDeep(prevState);
                                //         newState.instanceState = parsedState;
                                //         newState.isUpdatinginstanceState = false;
                                //         return newState;
                                //     });

                                //     // Return early if we have saved state
                                //     return;
                                // }
                                const mappingNames: string[] = await queryMappingNames(user, newinstanceState);
                                // Fetch all necessary data in parallel
                                const [numericTableData] = await Promise.all([
                                    get().updateNumericTableData(user),
                                ]);

                                // For each mapping name, get the count data
                                const waterfallCohortsTableData = await Promise.all(
                                    (mappingNames || []).map(async (keyword) => ({
                                        waterfallCohortName: keyword,
                                        run: true,
                                        aggregate: true,
                                        count: (await getMappingDataCount(user, newinstanceState, keyword))?.[0]?.ROW_COUNT || 0
                                    }))
                                );

                                // Update state with all the collected data
                                set(prevState => {
                                    const newState = _.cloneDeep(prevState);
                                    newState.instanceState = {
                                        ...newinstanceState,
                                        waterfallCohortsTableData,
                                        numericTableData,
                                    };

                                    // Save to sessionStorage
                                    try {
                                        const stateKey = `instance_state_${newinstanceState.server}_${newinstanceState.database}_${newinstanceState.table}`;
                                        sessionStorage.setItem(stateKey, JSON.stringify(newState.instanceState));
                                    } catch (err) {
                                        console.error('Error saving state to sessionStorage:', err);
                                    }

                                    return newState;
                                });


                            } catch (err) {
                                console.error('Error setting instance view state:', err);
                                // Still update with the new instance state even if data fetching fails
                                set(prevState => {
                                    const newState = _.cloneDeep(prevState);
                                    newState.instanceState = newinstanceState;
                                    return newState;
                                });
                            } finally {
                                _switchIsUpdatinginstanceState(false);
                            }
                        },
                        updateNumericTableData: async (user: User): Promise<any> => {
                            const instanceState = get().instanceState;
                            const query = `
                                SELECT
                                    SUM(Charge_Amount) AS Total_Charge_Amount,
                                    SUM(Payment_Amount) AS Total_Payment_Amount,
                                    SUM(Unit) AS Total_Unit,
                                    COUNT(Final_Charge_Count) AS Final_Charge_Count,
                                    COUNT(Final_Charge_Count_w_Payment) AS Final_Charge_w_Payment,
                                    COUNT(Final_Visit_Count) AS Final_Visit_Count,
                                    COUNT(Final_Visit_Count_w_Payment) AS Final_Visit_w_Payment
                                FROM ${instanceState.table};
                            `;
                            const result = await executeQuery(user, instanceState, query, 'Error getting numeric table data');
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
                            ];

                            // Convert to the format expected by the UI
                            return fieldDefinitions.map(field => ({
                                fieldName: field.fieldName,
                                type: field.type,
                                include: 'Y',
                                divideBy: 'Y',
                                schedule: 'Y',
                                total: data[field.dbField]
                            }));
                        },
                        updateWaterfallCohortListData: async (user: User): Promise<any> => {
                            const instanceState = get().instanceState;
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

                                const stateKey = `mappings_${instanceState.server}_${instanceState.database}_${instanceState.table}`;

                                const mappingsArrStateFromLocalStorage = localStorage.getItem(stateKey);
                                if (mappingsArrStateFromLocalStorage) {
                                    const mappingsArrState: MappingsViewModel[] = JSON.parse(mappingsArrStateFromLocalStorage);
                                    // Build keywords string and populate results in one pass
                                    const keywords = _.reduce(mappingsArrState, (acc, mapping) => {

                                        // Extract unique Waterfall_Group values for each tab
                                        result[mapping.tabName] = _.chain(mapping.data)
                                            .map('Waterfall_Group')
                                            .uniq()
                                            .compact()
                                            .value();

                                        // Append to keywords string
                                        return acc + mapping.keyword + '-';
                                    }, '');

                                    // Initialize empty array for combined keywords
                                    result[keywords] = [];
                                }
                                console.debug('result:', result)
                                // Update state with all the collected data
                                set(prevState => {
                                    const newState = _.cloneDeep(prevState);
                                    newState.instanceState.waterfallCohortListData = result as any;

                                    // Save to sessionStorage
                                    try {
                                        const stateKey = `instance_state_${newState.instanceState.server}_${newState.instanceState.database}_${newState.instanceState.table}`;
                                        sessionStorage.setItem(stateKey, JSON.stringify(newState.instanceState));
                                    } catch (err) {
                                        console.error('Error saving state to sessionStorage:', err);
                                    }

                                    return newState;
                                });
                                return result;
                            }
                            catch (error) {
                                // Return empty arrays for all columns
                                const defaultResult: Record<string, any[]> = {
                                    DOS: [],
                                    Posting: [],
                                    LocationPayorProcedure: []
                                };

                                return defaultResult;
                            }
                            finally {

                            }
                        }
                    });
                },
                {
                    name: 'instance-storage',
                    getStorage: () => ({
                        getItem: (name: string): string | null => {
                            try {
                                return sessionStorage.getItem(name);
                            } catch (err) {
                                console.error('Error getting item from storage:', err);
                                return null;
                            }
                        },
                        setItem: (name: string, value: string): void => {
                            try {
                                sessionStorage.setItem(name, value);
                            } catch (err) {
                                console.error('Error setting item in storage:', err);
                            }
                        },
                        removeItem: (name: string): void => {
                            try {
                                sessionStorage.removeItem(name);
                            } catch (err) {
                                console.error('Error removing item from storage:', err);
                            }
                        }
                    })
                }
            )
        ));
}

/**
 * Executes a SQL query against the specified database instance with error handling and caching.
 * 
 * @param user - The authenticated user making the request
 * @param instanceState - The view model containing database connection details
 * @param query - The SQL query string to execute
 * @param errorMessage - Custom error message prefix for logging failures
 * @returns Promise resolving to the query results or null if the query fails
 * 
 * @remarks
 * This function implements caching using sessionStorage to improve performance for
 * repeated queries. If cached data exists for the query, it will be returned without
 * making a database call. Query results are automatically cached for future use.
 */
async function executeQuery(user, instanceState: InstanceViewModel, query: string, errorMessage: string): Promise<any> {
    try {
        // Generate a cache key based on the query and instance details
        const cacheKey = `query_cache_${instanceState.server}_${instanceState.database}_${instanceState.table}_${query.replace(/\s+/g, '')}`;

        // Check if we have this data in sessionStorage
        try {
            const cachedData = sessionStorage.getItem(cacheKey);
            if (cachedData) {
                console.log('Using cached data for query');
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

/**
 * Retrieves the count of distinct groups for a specific mapping keyword.
 * 
 * @param user - The authenticated user making the request
 * @param instanceState - The view model containing database connection details
 * @param keyword - The mapping keyword to count groups for (e.g., 'Procedure', 'Provider')
 * @returns Promise resolving to the query results containing ROW_COUNT
 * 
 * @remarks
 * This function dynamically finds columns containing the keyword pattern and builds
 * a query to count the distinct groups. It uses dynamic SQL to handle different
 * table structures with consistent logic.
 */
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

/**
 * Discovers available mapping keywords by examining table column names.
 * 
 * @param user - The authenticated user making the request
 * @param instanceState - The view model containing database connection details
 * @returns Promise resolving to an array of mapping keywords found in the table columns
 * 
 * @remarks
 * This function examines the table's schema to find columns related to predefined
 * mapping keywords (Procedure, Provider, Insurance, Location). It only returns
 * keywords that have corresponding columns in the table structure.
 */
async function queryMappingNames(user, instanceState: InstanceViewModel): Promise<string[]> {
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
