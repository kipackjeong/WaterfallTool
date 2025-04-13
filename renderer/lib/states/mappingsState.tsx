import { createContext, useContext, useRef, ReactNode, useEffect } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { devtools, persist } from 'zustand/middleware';
import { InstanceViewModel, MappingsViewModel } from '../models';
import apiClient from '../api/apiClient';
import * as _ from 'lodash';
import { getAuthHeaders } from '../utils/authUtils';

//Zustand stuff
export type MappingsArrState = {
  mappingsArrState: MappingsViewModel[]
}

export type MappingsActions = {
  initMappingsArrState: (user, InstanceState: InstanceViewModel) => Promise<void>
  setMappingsArrState: (user, InstanceState: InstanceViewModel) => Promise<void>
  addMapping: (newMapping: MappingsViewModel) => void
  modifyWaterfallGroup: (mappingIndex: number, rowIndex: number, newWaterfallGroup: string) => void
  upsyncMappings: (InstanceState: InstanceViewModel) => Promise<void>
  refreshMappingsArrState: (user, InstanceState: InstanceViewModel) => Promise<void>
}

export type MappingsStore = MappingsArrState & MappingsActions & {
  // Storage operations
  saveToLocalStorage: (InstanceState: InstanceViewModel) => void;
  loadFromLocalStorage: (InstanceState: InstanceViewModel) => boolean;
  clearLocalStorage: (InstanceState: InstanceViewModel) => void;
}

export const defaultInitState: MappingsArrState = {
  mappingsArrState: []
}

export const createMappingsStore = (
  initState: MappingsArrState = defaultInitState,
) => {

  return createStore<MappingsStore>()(
    devtools(
      persist(
        (set, get) => {
          return {
            ...initState,
            initMappingsArrState: async (user, InstanceState: InstanceViewModel) => {
              // Load mappings from localStorage with the instance view state
              // get().loadFromLocalStorage(InstanceState);
            },

            setMappingsArrState: async (user, InstanceState: InstanceViewModel) => {
              const mappingsArrState = await _queryMappingsArr(user, InstanceState);
              console.log('mappingsArrState:', mappingsArrState)

              set((prevState) => {
                const newState = _.cloneDeep(prevState);
                newState.mappingsArrState = mappingsArrState;
                return newState;
              })
            },

            refreshMappingsArrState: async (user, InstanceState: InstanceViewModel) => {
              const mappingsArrState = await _queryMappingsArr(user, InstanceState);
              console.log('mappingsArrState:', mappingsArrState)

              set((prevState) => {
                const newState = _.cloneDeep(prevState);
                newState.mappingsArrState = mappingsArrState;
                return newState;
              })
            },

            addMapping: (newMapping: MappingsViewModel) => set((prevState) => {
              // Clone the state
              const newState = _.cloneDeep(prevState);
              // Add the new mapping
              newState.mappingsArrState = [...newState.mappingsArrState, newMapping];
              // Return the new state
              return newState;
            }),

            modifyWaterfallGroup: (mappingIndex: number, rowIndex: number, newWaterfallGroup: string) => {
              set((prevState) => {
                // Clone the state
                const newState = _.cloneDeep(prevState);

                // Update the specific field
                newState.mappingsArrState[mappingIndex].data[rowIndex].Waterfall_Group = newWaterfallGroup;

                // Return the modified state
                return newState;
              })
            },
            upsyncMappings: async (InstanceState: InstanceViewModel) => {
              const state = get();
              state.saveToLocalStorage(InstanceState);
            },

            saveToLocalStorage: (InstanceState: InstanceViewModel) => {
              try {
                const state = get();
                const storageKey = `mappings_${InstanceState.server}_${InstanceState.database}_${InstanceState.table}`;
                localStorage.setItem(storageKey, JSON.stringify(state.mappingsArrState));
                console.log(`Saved mappings to localStorage with key: ${storageKey}`);
              } catch (err) {
                console.error('Error saving to localStorage:', err);
              }
            },

            loadFromLocalStorage: (InstanceState: InstanceViewModel) => {
              try {
                const storageKey = `mappings_${InstanceState.server}_${InstanceState.database}_${InstanceState.table}`;
                const savedState = localStorage.getItem(storageKey);
                if (savedState) {
                  set(state => ({
                    ...state,
                    mappingsArrState: JSON.parse(savedState)
                  }));
                  console.log(`Loaded mappings from localStorage with key: ${storageKey}`);
                  return true;
                }
                return false;
              } catch (err) {
                console.error('Error loading from localStorage:', err);
                return false;
              }
            },

            clearLocalStorage: (InstanceState: InstanceViewModel) => {
              try {
                const storageKey = `mappings_${InstanceState.server}_${InstanceState.database}_${InstanceState.table}`;
                localStorage.removeItem(storageKey);
                console.log(`Cleared mappings from localStorage with key: ${storageKey}`);
              } catch (err) {
                console.error('Error clearing localStorage:', err);
              }
            }
          }
        },
        {
          name: 'mappings-storage',
          storage: {
            getItem: (name) => {
              try {
                const str = localStorage.getItem(name);
                return str ? Promise.resolve(JSON.parse(str)) : Promise.resolve(null);
              } catch (err) {
                console.error('Error getting item from storage:', err);
                return Promise.resolve(null);
              }
            },
            setItem: (name, value) => {
              try {
                localStorage.setItem(name, JSON.stringify(value));
                return Promise.resolve();
              } catch (err) {
                console.error('Error setting item in storage:', err);
                return Promise.resolve();
              }
            },
            removeItem: (name) => {
              try {
                localStorage.removeItem(name);
                return Promise.resolve();
              } catch (err) {
                console.error('Error removing item from storage:', err);
                return Promise.resolve();
              }
            }
          }
        }
      )
    )
  )
}

export type MappingsStoreApi = ReturnType<typeof createMappingsStore>

export const MappingsStoreContext = createContext<MappingsStoreApi | undefined>(
  undefined,
)

export interface MappingsStoreProviderProps {
  children: ReactNode
}

export const MappingsStoreProvider = ({ children }: MappingsStoreProviderProps) => {
  const storeRef = useRef<MappingsStoreApi>(null)
  if (!storeRef.current) {
    storeRef.current = createMappingsStore()
  }

  // We'll load from localStorage when the instance is set, not on component mount
  // The loadFromLocalStorage function will be called from initMappingsArrState
  useEffect(() => {
    try {
      const store = storeRef.current;
      if (store) {
        // We'll wait for the instance view state to be set before loading
        console.log('MappingsStoreProvider mounted, waiting for instance state');
      }
    } catch (err) {
      console.error('Error initializing storage:', err);
    }
  }, []);

  return (
    <MappingsStoreContext.Provider value={storeRef.current}>
      {children}
    </MappingsStoreContext.Provider>
  )
}

export const useMappingsStore = <T,>(
  selector: (store: MappingsStore) => T,
): T => {
  const mappingsStoreContext = useContext(MappingsStoreContext)

  if (!mappingsStoreContext) {
    throw new Error(`useMappingsStore must be used within MappingsStoreProvider`)
  }

  return useStore(mappingsStoreContext, selector)
}

// Helper functions
async function _getMappingData(user, InstanceState: InstanceViewModel, keyword: string): Promise<MappingsViewModel[]> {
  const query =
    `
        DECLARE @sql NVARCHAR(MAX);
        DECLARE @groupFinalColumn NVARCHAR(128);
        DECLARE @groupColumn NVARCHAR(128);

        -- Query to select columns based on pattern
        SELECT TOP 1 @groupFinalColumn = COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${InstanceState.table}'
        AND COLUMN_NAME LIKE '%${keyword}_Group_Final%';

        SELECT TOP 1 @groupColumn = COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${InstanceState.table}'
        AND COLUMN_NAME LIKE '%${keyword}_Group%';

        -- Build the dynamic SQL query
        SET @sql = N'
            SELECT ' + QUOTENAME(@groupFinalColumn) + ', ' + QUOTENAME(@groupColumn) + ',
                SUM(Charge_Amount) AS Total_Charge_Amount,
                SUM(Payment_Amount) AS Total_Payment_Amount,
                MIN(DOS_Period) AS Earliest_Min_DOS,
                MAX(DOS_Period) AS Latest_Max_DOS
            FROM ${InstanceState.table}
            GROUP BY ' + QUOTENAME(@groupFinalColumn) + ', ' + QUOTENAME(@groupColumn);

        -- Execute the dynamic SQL
        EXEC sp_executesql @sql;
      `
  try {
    // Generate a cache key based on the query and instance details
    const cacheKey = `mapping_cache_${InstanceState.server}_${InstanceState.database}_${InstanceState.table}_${keyword}_${query.replace(/\s+/g, '')}`;

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
        server: InstanceState.server,
        database: InstanceState.database,
        table: InstanceState.table,
        user: InstanceState.sqlConfig.user,
        password: InstanceState.sqlConfig.password
      },
      query
    }, authConfig));

    // Cache the response for future use
    try {
      const cacheKey = `mapping_cache_${InstanceState.server}_${InstanceState.database}_${InstanceState.table}_${keyword}_${query.replace(/\s+/g, '')}`;
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

async function _queryMappingsArr(user, InstanceState: InstanceViewModel): Promise<MappingsViewModel[]> {
  let mappingsArrState: MappingsViewModel[] = [];
  _.forEach(InstanceState.waterfallCohortsTableData, async cohort => {
    const mappingData = await _getMappingData(user, InstanceState, cohort.waterfallCohortName);
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
