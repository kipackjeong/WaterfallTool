import { type ReactNode, createContext, useRef, useContext } from 'react'
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import { devtools, persist } from 'zustand/middleware'
import { InstanceViewModel, User } from '../models'
import apiClient from '../api/apiClient'
import * as _ from 'lodash';
import { getAuthHeaders } from '../utils/authUtils'

export type InstanceState = {
    instanceViewState: InstanceViewModel
}

export type InstanceActions = {
    setInstanceViewState: (user: User, newInstanceViewState: InstanceViewModel) => void
}

export type InstanceStore = InstanceState & InstanceActions



export const createInstanceStore = (
    initState: InstanceState = {
        instanceViewState: null,
    },
) => {
    return createStore<InstanceStore>()(
        devtools(
            persist(
                (set) => ({
                    ...initState,
                    initInstance: async (instanceViewState: InstanceViewModel) => {
                        set(prevState => {
                            const newState = _.cloneDeep(prevState);
                            newState.instanceViewState = instanceViewState;
                            return newState;
                        });
                    },

                    setInstanceViewState: async (user, newInstanceViewState: InstanceViewModel) => {
                        // Utility function to execute SQL queries and handle errors consistently
                        const executeQuery = async (user, instanceView: InstanceViewModel, query: string, errorMessage: string): Promise<any> => {
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

                        // Get count of groups for a specific keyword
                        const getDataCount = async (user, instanceView: InstanceViewModel, keyword: string): Promise<any> => {
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

                        // Get all available mapping names from columns
                        const queryMappingNames = async (user, instanceView: InstanceViewModel): Promise<string[]> => {
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

                        // Get numeric table data for statistics
                        const fetchNumericTableData = async (user, instanceView: InstanceViewModel): Promise<any> => {
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

                        try {
                            // Fetch all necessary data in parallel
                            const [mappingNames, numericTableData] = await Promise.all([
                                queryMappingNames(user, newInstanceViewState),
                                fetchNumericTableData(user, newInstanceViewState)
                            ]);

                            // For each mapping name, get the count data
                            const waterfallCohortsTableData = await Promise.all(
                                (mappingNames || []).map(async (keyword) => ({
                                    waterfallCohortName: keyword,
                                    run: true,
                                    aggregate: true,
                                    count: (await getDataCount(user, newInstanceViewState, keyword))?.[0]?.ROW_COUNT || 0
                                }))
                            );

                            // Update state with all the collected data
                            set(prevState => {
                                const newState = _.cloneDeep(prevState);
                                newState.instanceViewState = {
                                    ...newInstanceViewState,
                                    waterfallCohortsTableData,
                                    numericTableData
                                };
                                return newState;
                            });


                        } catch (err) {
                            console.error('Error setting instance view state:', err);
                            // Still update with the new instance state even if data fetching fails
                            set(prevState => {
                                const newState = _.cloneDeep(prevState);
                                newState.instanceViewState = newInstanceViewState;
                                return newState;
                            });


                        }
                    },


                }),
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
