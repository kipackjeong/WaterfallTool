import { type ReactNode, createContext, useRef, useContext } from 'react'
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import { devtools, persist } from 'zustand/middleware'
import { InstanceViewModel, User } from '../models'
import apiClient from '../api/apiClient'
import * as _ from 'lodash';
import { getAuthHeaders } from '../utils/authUtils'
import { createMappingsStore } from './mappingsState'

export type InstanceState = {
    InstanceState: InstanceViewModel
    IsUpdatingInstanceState: boolean
}

export type InstanceActions = {
    setInstance: (user: User, newInstanceState: InstanceViewModel) => void
}

export type InstanceStore = InstanceState & InstanceActions



export const createInstanceStore = (
    initState: InstanceState = {
        InstanceState: null,
        IsUpdatingInstanceState: true,
    },
) => {
    return createStore<InstanceStore>()(
        devtools(
            persist(
                (set) => {
                    // Define the store methods outside the return object
                    const _switchIsUpdatingInstanceState = (isUpdating: boolean) => {
                        set(prevState => {
                            const newState = _.cloneDeep(prevState);
                            newState.IsUpdatingInstanceState = isUpdating;
                            return newState;
                        });
                    };

                    return ({
                        ...initState,
                        initInstance: async (InstanceState: InstanceViewModel) => {
                            set(prevState => {
                                const newState = _.cloneDeep(prevState);
                                newState.InstanceState = InstanceState;
                                return newState;
                            });
                        },
                        setInstance: async (user, newInstanceState: InstanceViewModel) => {
                            console.log('[setInstance] Starting...')
                            _switchIsUpdatingInstanceState(true);
                            // Try to load from sessionStorage first
                            try {
                                // const stateKey = `instance_state_${newInstanceState.server}_${newInstanceState.database}_${newInstanceState.table}`;
                                // const savedState = sessionStorage.getItem(stateKey);

                                // if (savedState) {
                                //     const parsedState = JSON.parse(savedState);
                                //     console.log('Loaded state from sessionStorage:', parsedState);

                                //     set(prevState => {
                                //         const newState = _.cloneDeep(prevState);
                                //         newState.InstanceState = parsedState;
                                //         newState.IsUpdatingInstanceState = false;
                                //         return newState;
                                //     });

                                //     // Return early if we have saved state
                                //     return;
                                // }

                                // Fetch all necessary data in parallel
                                const [mappingNames, numericTableData, waterfallCohortListData] = await Promise.all([
                                    queryMappingNames(user, newInstanceState),
                                    fetchNumericTableData(user, newInstanceState),
                                    fetchWaterfallCohortListData(user, newInstanceState)
                                ]);

                                // For each mapping name, get the count data
                                const waterfallCohortsTableData = await Promise.all(
                                    (mappingNames || []).map(async (keyword) => ({
                                        waterfallCohortName: keyword,
                                        run: true,
                                        aggregate: true,
                                        count: (await getMappingDataCount(user, newInstanceState, keyword))?.[0]?.ROW_COUNT || 0
                                    }))
                                );

                                // Update state with all the collected data
                                set(prevState => {
                                    const newState = _.cloneDeep(prevState);
                                    newState.InstanceState = {
                                        ...newInstanceState,
                                        waterfallCohortsTableData,
                                        numericTableData,
                                        waterfallCohortListData
                                    };

                                    // Save to sessionStorage
                                    try {
                                        const stateKey = `instance_state_${newInstanceState.server}_${newInstanceState.database}_${newInstanceState.table}`;
                                        sessionStorage.setItem(stateKey, JSON.stringify(newState.InstanceState));
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
                                    newState.InstanceState = newInstanceState;
                                    return newState;
                                });


                            } finally {
                                _switchIsUpdatingInstanceState(false);
                            }
                        },


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
 * @param instanceView - The view model containing database connection details
 * @param query - The SQL query string to execute
 * @param errorMessage - Custom error message prefix for logging failures
 * @returns Promise resolving to the query results or null if the query fails
 * 
 * @remarks
 * This function implements caching using sessionStorage to improve performance for
 * repeated queries. If cached data exists for the query, it will be returned without
 * making a database call. Query results are automatically cached for future use.
 */
async function executeQuery(user, instanceView: InstanceViewModel, query: string, errorMessage: string): Promise<any> {
    try {
        // Generate a cache key based on the query and instance details
        const cacheKey = `query_cache_${instanceView.server}_${instanceView.database}_${instanceView.table}_${query.replace(/\s+/g, '')}`;

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
                server: instanceView.server,
                database: instanceView.database,
                table: instanceView.table,
                user: instanceView.sqlConfig.user,
                password: instanceView.sqlConfig.password,
            },
            query
        }, authConfig);
        console.log('response:', response);

        // Cache the response for future use
        try {
            const cacheKey = `query_cache_${instanceView.server}_${instanceView.database}_${instanceView.table}_${query.replace(/\s+/g, '')}`;
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
 * @param instanceView - The view model containing database connection details
 * @param keyword - The mapping keyword to count groups for (e.g., 'Procedure', 'Provider')
 * @returns Promise resolving to the query results containing ROW_COUNT
 * 
 * @remarks
 * This function dynamically finds columns containing the keyword pattern and builds
 * a query to count the distinct groups. It uses dynamic SQL to handle different
 * table structures with consistent logic.
 */
async function getMappingDataCount(user, instanceView: InstanceViewModel, keyword: string): Promise<any> {
    const mappingsStore = createMappingsStore();
    // const mappingsState = mappingsStore.getState();

    const query = `
        DECLARE @sql NVARCHAR(MAX);
        DECLARE @groupFinalColumn NVARCHAR(128);
        DECLARE @groupColumn NVARCHAR(128);

        -- Query to select columns based on pattern
        SELECT TOP 1 @groupFinalColumn = COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${instanceView.table}'
        AND COLUMN_NAME LIKE '%${keyword}_Group_Final%';

        SELECT TOP 1 @groupColumn = COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${instanceView.table}'
        AND COLUMN_NAME LIKE '%${keyword}_Group%';

        -- Build the dynamic SQL query
        SET @sql = N'
            WITH GroupedData AS (
                SELECT ' + QUOTENAME(@groupFinalColumn) + ', ' + QUOTENAME(@groupColumn) + '
                FROM ${instanceView.table}
                GROUP BY ' + QUOTENAME(@groupFinalColumn) + ', ' + QUOTENAME(@groupColumn) + '
            )
            SELECT *, (SELECT COUNT(*) FROM GroupedData) AS ROW_COUNT
            FROM GroupedData';

        -- Execute the dynamic SQL
        EXEC sp_executesql @sql;
    `;

    return executeQuery(user, instanceView, query, `Getting ${keyword} count failed`);
};

/**
 * Discovers available mapping keywords by examining table column names.
 * 
 * @param user - The authenticated user making the request
 * @param instanceView - The view model containing database connection details
 * @returns Promise resolving to an array of mapping keywords found in the table columns
 * 
 * @remarks
 * This function examines the table's schema to find columns related to predefined
 * mapping keywords (Procedure, Provider, Insurance, Location). It only returns
 * keywords that have corresponding columns in the table structure.
 */
async function queryMappingNames(user, instanceView: InstanceViewModel): Promise<string[]> {
    const keywords = ['Procedure', 'Provider', 'Insurance', 'Location'];
    const query = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                                       WHERE TABLE_NAME = '${instanceView.table}' 
                                       AND (${keywords.map(keyword => `COLUMN_NAME LIKE '%${keyword}%'`).join(' OR ')})`;

    const mappingNames = await executeQuery(user, instanceView, query, 'Error getting mapping names');

    if (!mappingNames) return [];

    return keywords.filter(keyword =>
        mappingNames.some(row => row.COLUMN_NAME.includes(keyword))
    );
};

/**
 * Fetches and formats numeric summary data for dashboard statistics.
 * 
 * @param user - The authenticated user making the request
 * @param instanceView - The view model containing database connection details
 * @returns Promise resolving to an array of formatted field objects for UI display
 * 
 * @remarks
 * This function retrieves aggregate data (sums and counts) from the table and transforms
 * it into a standardized format for display in the UI's numeric table. It includes
 * charge amounts, payment amounts, units, and various count metrics.
 */
async function fetchNumericTableData(user, instanceView: InstanceViewModel): Promise<any> {
    const query = `
                                SELECT
                                    SUM(Charge_Amount) AS Total_Charge_Amount,
                                    SUM(Payment_Amount) AS Total_Payment_Amount,
                                    SUM(Unit) AS Total_Unit,
                                    COUNT(Final_Charge_Count) AS Final_Charge_Count,
                                    COUNT(Final_Charge_Count_w_Payment) AS Final_Charge_w_Payment,
                                    COUNT(Final_Visit_Count) AS Final_Visit_Count,
                                    COUNT(Final_Visit_Count_w_Payment) AS Final_Visit_w_Payment
                                FROM ${instanceView.table};
                            `;
    const result = await executeQuery(user, instanceView, query, 'Error getting numeric table data');
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
};

/**
 * Retrieves the distinct values for each column category needed by the waterfall cohort list table.
 * 
 * @param user - The authenticated user making the request
 * @param instanceView - The view model containing database connection details
 * @returns Promise resolving to an object containing arrays of distinct values for each category
 * 
 * @remarks
 * This function executes multiple parallel queries to get the distinct values for DOS periods,
 * posting dates, locations, payors, procedures, and combined location-payor-procedure values.
 * The results are organized into arrays suitable for display in the ListWaterfallCohortTable component.
 * Detailed logging is included to assist with debugging and performance monitoring.
 */
async function fetchWaterfallCohortListData(user, instanceView: InstanceViewModel): Promise<any> {
    console.log('[fetchWaterfallCohortListData] Starting...');
    console.log('[fetchWaterfallCohortListData] Parameters:', {
        serverName: instanceView.server,
        database: instanceView.database,
        table: instanceView.table
    });
    try {
        // SQL query to get data for each column
        const dosQuery = `
            SELECT DISTINCT DOS_Period as DOS 
            FROM ${instanceView.table} 
            WHERE DOS_Period IS NOT NULL 
            ORDER BY DOS_Period
        `;

        const postingQuery = `
            SELECT DISTINCT Posting_Period as Posting 
            FROM ${instanceView.table} 
            WHERE Posting_Period IS NOT NULL 
            ORDER BY Posting_Period
        `;

        const locationQuery = `
            SELECT DISTINCT Location_Group_Final as Location 
            FROM ${instanceView.table} 
            WHERE Location_Group_Final IS NOT NULL 
            ORDER BY Location_Group_Final
        `;

        const payorQuery = `
            SELECT DISTINCT Primary_Insurance_Group_Final as Payor 
            FROM ${instanceView.table} 
            WHERE Primary_Insurance_Group_Final IS NOT NULL 
            ORDER BY Primary_Insurance_Group_Final
        `;

        const procedureQuery = `
            SELECT DISTINCT Procedure_Group_Final as Procedure 
            FROM ${instanceView.table} 
            WHERE Procedure_Group_Final IS NOT NULL 
            ORDER BY Procedure_Group_Final
        `;

        const locationPayorProcedureQuery = `
            SELECT DISTINCT 
                CONCAT(Location, ' - ', Payor, ' - ', Procedure) as LocationPayorProcedure 
            FROM ${instanceView.table} 
            WHERE Location IS NOT NULL AND Payor IS NOT NULL AND Procedure IS NOT NULL 
            ORDER BY Location, Payor, Procedure
        `;

        // Execute all queries in parallel
        console.log('[fetchWaterfallCohortListData] Executing parallel queries...');
        const [dosResult, postingResult, locationResult, payorResult, procedureResult, locationPayorProcedureResult] =
            await Promise.all([
                executeQuery(user, instanceView, dosQuery, 'Error getting DOS data'),
                executeQuery(user, instanceView, postingQuery, 'Error getting Posting data'),
                executeQuery(user, instanceView, locationQuery, 'Error getting Location data'),
                executeQuery(user, instanceView, payorQuery, 'Error getting Payor data'),
                executeQuery(user, instanceView, procedureQuery, 'Error getting Procedure data'),
                executeQuery(user, instanceView, locationPayorProcedureQuery, 'Error getting LocationPayorProcedure data')
            ]);

        // Map results to array format
        console.log('[fetchWaterfallCohortListData] Query results received:', {
            dosResultCount: dosResult ? dosResult.length : 0,
            postingResultCount: postingResult ? postingResult.length : 0,
            locationResultCount: locationResult ? locationResult.length : 0,
            payorResultCount: payorResult ? payorResult.length : 0,
            procedureResultCount: procedureResult ? procedureResult.length : 0,
            locationPayorProcedureResultCount: locationPayorProcedureResult ? locationPayorProcedureResult.length : 0
        });

        const result = {
            DOS: dosResult ? dosResult.map(row => row.DOS) : [],
            Posting: postingResult ? postingResult.map(row => row.Posting) : [],
            Location: locationResult ? locationResult.map(row => row.Location) : [],
            Payor: payorResult ? payorResult.map(row => row.Payor) : [],
            Procedure: procedureResult ? procedureResult.map(row => row.Procedure) : [],
            LocationPayorProcedure: locationPayorProcedureResult ? locationPayorProcedureResult.map(row => row.LocationPayorProcedure) : []
        };

        console.log('[fetchWaterfallCohortListData] Processed results:', {
            DOSCount: result.DOS.length,
            PostingCount: result.Posting.length,
            LocationCount: result.Location.length,
            PayorCount: result.Payor.length,
            ProcedureCount: result.Procedure.length,
            LocationPayorProcedureCount: result.LocationPayorProcedure.length
        });

        return result;
    } catch (error) {
        console.error('[fetchWaterfallCohortListData] ERROR:', error);
        console.error('[fetchWaterfallCohortListData] Stack trace:', error.stack);
        return {
            DOS: [],
            Posting: [],
            Location: [],
            Payor: [],
            Procedure: [],
            LocationPayorProcedure: []
        };
    } finally {
        console.log('[fetchWaterfallCohortListData] Completed');
    }
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
