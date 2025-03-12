import { createContext, useContext, useRef, ReactNode, useEffect } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { devtools, persist } from 'zustand/middleware';
import { InstanceViewModel, MappingsViewModel } from '../models';
import apiClient from '../api/apiClient';
import * as _ from 'lodash';
import { getAuthHeaders } from '../utils/authUtils';

// Storage helper functions
const storageHelpers = {
  // Session Storage (cleared when browser is closed)
  session: {
    getItem: (key: string): any => {
      try {
        const item = sessionStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch (err) {
        console.error('Error getting item from sessionStorage:', err);
        return null;
      }
    },
    setItem: (key: string, value: any): void => {
      try {
        sessionStorage.setItem(key, JSON.stringify(value));
      } catch (err) {
        console.error('Error setting item in sessionStorage:', err);
      }
    },
    removeItem: (key: string): void => {
      try {
        sessionStorage.removeItem(key);
      } catch (err) {
        console.error('Error removing item from sessionStorage:', err);
      }
    }
  },

  // Local Storage (persists even when browser is closed)
  local: {
    getItem: (key: string): any => {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch (err) {
        console.error('Error getting item from localStorage:', err);
        return null;
      }
    },
    setItem: (key: string, value: any): void => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (err) {
        console.error('Error setting item in localStorage:', err);
      }
    },
    removeItem: (key: string): void => {
      try {
        localStorage.removeItem(key);
      } catch (err) {
        console.error('Error removing item from localStorage:', err);
      }
    }
  }
};

//Zustand stuff
export type MappingsArrState = {
  mappingsArrState: MappingsViewModel[]
}

export type MappingsActions = {
  initMappingsArrState: (user, instanceViewState: InstanceViewModel) => Promise<void>
  setMappingsArrState: (user, instanceViewState: InstanceViewModel) => Promise<void>
  addMapping: (newMapping: MappingsViewModel) => void
  modifyWaterfallGroup: (mappingIndex: number, rowIndex: number, newWaterfallGroup: string) => void
  upsyncMappings: () => Promise<void>
  refreshMappingsArrState: (user, instanceViewState: InstanceViewModel) => Promise<void>
}

export type MappingsStore = MappingsArrState & MappingsActions & {
  // Storage operations
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => boolean;
  clearLocalStorage: () => void;
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
            initMappingsArrState: async (user, instanceViewState: InstanceViewModel) => {
            },

            setMappingsArrState: async (user, instanceViewState: InstanceViewModel) => {
              const mappingsArrState = await _queryMappingsArr(user, instanceViewState);
              console.log('mappingsArrState:', mappingsArrState)

              set((prevState) => {
                const newState = _.cloneDeep(prevState);
                newState.mappingsArrState = mappingsArrState;
                return newState;
              })
            },

            refreshMappingsArrState: async (user, instanceViewState: InstanceViewModel) => {
              const mappingsArrState = await _queryMappingsArr(user, instanceViewState);
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
            upsyncMappings: async () => {
              get().saveToLocalStorage();
            },
            // Local storage operations
            saveToLocalStorage: () => {
              try {
                const state = get();
                storageHelpers.local.setItem('mappings_local_storage', state.mappingsArrState);
                console.log('Saved mappings to localStorage');
              } catch (err) {
                console.error('Error saving to localStorage:', err);
              }
            },

            loadFromLocalStorage: () => {
              try {
                const savedState = storageHelpers.local.getItem('mappings_local_storage');
                if (savedState) {
                  set(state => ({
                    ...state,
                    mappingsArrState: savedState
                  }));
                  console.log('Loaded mappings from localStorage');
                  return true;
                }
                return false;
              } catch (err) {
                console.error('Error loading from localStorage:', err);
                return false;
              }
            },

            clearLocalStorage: () => {
              try {
                storageHelpers.local.removeItem('mappings_local_storage');
                console.log('Cleared mappings from localStorage');
              } catch (err) {
                console.error('Error clearing localStorage:', err);
              }
            },

            // Legacy method - kept for backward compatibility
            saveMappingsToIndexedDB: async () => set((prevState) => {
              try {
                // Save to localStorage instead
                storageHelpers.local.setItem('mappings_local_storage', prevState.mappingsArrState);
              } catch (err) {
                console.error("Error saving mappings state:", err);
              }
              const newState = _.cloneDeep(prevState);
              return newState;
            }),

          }
        },
        {
          name: 'mappings-storage',
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
    ))
}
async function _getMappingData(user, instanceViewState: InstanceViewModel, keyword: string): Promise<MappingsViewModel[]> {
  const query =
    `
        DECLARE @sql NVARCHAR(MAX);
        DECLARE @groupFinalColumn NVARCHAR(128);
        DECLARE @groupColumn NVARCHAR(128);

        -- Query to select columns based on pattern
        SELECT TOP 1 @groupFinalColumn = COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${instanceViewState.table}'
        AND COLUMN_NAME LIKE '%${keyword}_Group_Final%';

        SELECT TOP 1 @groupColumn = COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${instanceViewState.table}'
        AND COLUMN_NAME LIKE '%${keyword}_Group%';

        -- Build the dynamic SQL query
        SET @sql = N'
            SELECT ' + QUOTENAME(@groupFinalColumn) + ', ' + QUOTENAME(@groupColumn) + ',
                SUM(Charge_Amount) AS Total_Charge_Amount,
                SUM(Payment_Amount) AS Total_Payment_Amount,
                MIN(DOS_Period) AS Earliest_Min_DOS,
                MAX(DOS_Period) AS Latest_Max_DOS
            FROM ${instanceViewState.table}
            GROUP BY ' + QUOTENAME(@groupFinalColumn) + ', ' + QUOTENAME(@groupColumn);

        -- Execute the dynamic SQL
        EXEC sp_executesql @sql;
      `
  try {
    // Generate a cache key based on the query and instance details
    const cacheKey = `mapping_cache_${instanceViewState.server}_${instanceViewState.database}_${instanceViewState.table}_${keyword}_${query.replace(/\s+/g, '')}`;

    // Check if we have this data in sessionStorage
    try {
      // First try sessionStorage (faster)
      const cachedData = storageHelpers.session.getItem(cacheKey);
      if (cachedData) {
        console.log(`Using cached data from sessionStorage for mapping query: ${keyword}`);
        return cachedData;
      }

      // Then try localStorage (more persistent)
      const localData = storageHelpers.local.getItem(cacheKey);
      if (localData) {
        console.log(`Using cached data from localStorage for mapping query: ${keyword}`);
        // Also save to sessionStorage for faster access next time
        storageHelpers.session.setItem(cacheKey, localData);
        return localData;
      }
    } catch (cacheErr) {
      console.error('Error accessing storage cache:', cacheErr);
      // Continue with API call if cache access fails
    }

    // If not in cache, make the API call
    const authConfig = await getAuthHeaders(user);
    const data = (await apiClient.post('mssql/query', {
      config: {
        server: instanceViewState.server,
        database: instanceViewState.database,
        table: instanceViewState.table,
        user: instanceViewState.sqlConfig.user,
        password: instanceViewState.sqlConfig.password
      },
      query
    }, authConfig));

    // Cache the response for future use
    try {
      const cacheKey = `mapping_cache_${instanceViewState.server}_${instanceViewState.database}_${instanceViewState.table}_${keyword}_${query.replace(/\s+/g, '')}`;
      // Save to both storage types
      storageHelpers.session.setItem(cacheKey, data);
      storageHelpers.local.setItem(cacheKey, data);
    } catch (cacheErr) {
      console.error('Error caching mapping response:', cacheErr);
      // Continue even if caching fails
    }

    return data
  } catch (error) {
    console.error('Error running SQL query:', error);
  }
}
async function _queryMappingsArr(user, instanceViewState: InstanceViewModel): Promise<MappingsViewModel[]> {
  let mappingsArrState: MappingsViewModel[] = [];
  _.forEach(instanceViewState.waterfallCohortsTableData, async cohort => {
    const mappingData = await _getMappingData(user, instanceViewState, cohort.waterfallCohortName);
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

function syncWaterfallGroupWithFinalGroup(mappingsArr: MappingsViewModel[]): MappingsViewModel[] {
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

  // Try to load from localStorage when component mounts
  useEffect(() => {
    try {
      const store = storeRef.current;
      if (store) {
        // First check if we have data in sessionStorage (from persist middleware)
        // If not, try to load from localStorage as a fallback
        const currentState = store.getState();
        if (!currentState.mappingsArrState || currentState.mappingsArrState.length === 0) {
          store.getState().loadFromLocalStorage();
        }
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