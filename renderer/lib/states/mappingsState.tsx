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
  initMappingsArrState: (user, instanceViewState: InstanceViewModel) => Promise<void>
  setMappingsArrState: (user, instanceViewState: InstanceViewModel) => Promise<void>
  addMapping: (newMapping: MappingsViewModel) => void
  modifyWaterfallGroup: (mappingIndex: number, rowIndex: number, newWaterfallGroup: string) => void
  upsyncMappings: (instanceViewState: InstanceViewModel) => Promise<void>
  refreshMappingsArrState: (user, instanceViewState: InstanceViewModel) => Promise<void>
}

export type MappingsStore = MappingsArrState & MappingsActions & {
  // Storage operations
  saveToLocalStorage: (instanceViewState: InstanceViewModel) => void;
  loadFromLocalStorage: (instanceViewState: InstanceViewModel) => boolean;
  clearLocalStorage: (instanceViewState: InstanceViewModel) => void;
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
              // Load mappings from localStorage with the instance view state
              // get().loadFromLocalStorage(instanceViewState);
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
            upsyncMappings: async (instanceViewState: InstanceViewModel) => {
              const state = get();
              state.saveToLocalStorage(instanceViewState);
            },

            saveToLocalStorage: (instanceViewState: InstanceViewModel) => {
              try {
                const state = get();
                const storageKey = `mappings_${instanceViewState.server}_${instanceViewState.database}_${instanceViewState.table}`;
                localStorage.setItem(storageKey, JSON.stringify(state.mappingsArrState));
                console.log(`Saved mappings to localStorage with key: ${storageKey}`);
              } catch (err) {
                console.error('Error saving to localStorage:', err);
              }
            },

            loadFromLocalStorage: (instanceViewState: InstanceViewModel) => {
              try {
                const storageKey = `mappings_${instanceViewState.server}_${instanceViewState.database}_${instanceViewState.table}`;
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

            clearLocalStorage: (instanceViewState: InstanceViewModel) => {
              try {
                const storageKey = `mappings_${instanceViewState.server}_${instanceViewState.database}_${instanceViewState.table}`;
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