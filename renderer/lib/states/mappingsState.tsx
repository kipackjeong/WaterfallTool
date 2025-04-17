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
  setMappingsArrState: (user, instanceState: InstanceViewModel) => Promise<void>
  addMapping: (newMapping: MappingsViewModel) => void
  modifyWaterfallGroup: (mappingIndex: number, rowIndex: number, newWaterfallGroup: string) => void
  upsyncMappings: (instanceState: InstanceViewModel) => Promise<void>
  refreshMappingsArrState: (user, instanceState: InstanceViewModel) => Promise<void>
}

export type MappingsStore = MappingsArrState & MappingsActions & {
  // Storage operations
  saveToLocalStorage: (instanceState: InstanceViewModel) => void;
  loadFromLocalStorage: (instanceState: InstanceViewModel) => boolean;
  clearLocalStorage: (instanceState: InstanceViewModel) => void;
}

export const defaultInitState: MappingsArrState = {
  mappingsArrState: []
}

export const createMappingsStore = (
  initState: MappingsArrState = {
    mappingsArrState: [],
  }
) => {
  return createStore<MappingsStore>()(
    devtools(
      (set, get) => ({
        ...initState,
        setMappingsArrState: async (user, instanceState: InstanceViewModel) => {
          const mappingsArrState = await _queryMappingsArr(user, instanceState);

          set((prevState) => {
            const newState = _.cloneDeep(prevState);
            newState.mappingsArrState = mappingsArrState;

            return newState;
          });
        },


        refreshMappingsArrState: async (user, instanceState: InstanceViewModel) => {

          const mappingsArrState = await _queryMappingsArr(user, instanceState);


          set((prevState) => {
            const newState = _.cloneDeep(prevState);
            const prevCount = newState.mappingsArrState.length;
            newState.mappingsArrState = mappingsArrState;

            return newState;
          })
        },

        addMapping: (newMapping: MappingsViewModel) => {
          return set((prevState) => {
            // Clone the state
            const newState = _.cloneDeep(prevState);
            // Add the new mapping
            newState.mappingsArrState = [...newState.mappingsArrState, newMapping];

            // Return the new state
            return newState;
          });
        },

        modifyWaterfallGroup: (mappingIndex: number, rowIndex: number, newWaterfallGroup: string) => {
          set((prevState) => {
            // Clone the state
            const newState = _.cloneDeep(prevState);

            try {
              // Get mapping details for logging
              const mappingKeyword = newState.mappingsArrState[mappingIndex].keyword;
              const oldValue = newState.mappingsArrState[mappingIndex].data[rowIndex].Waterfall_Group;

              // Update the specific field
              newState.mappingsArrState[mappingIndex].data[rowIndex].Waterfall_Group = newWaterfallGroup;


            } catch (err) {
              console.error('Error updating waterfall group:', err);

            }

            // Return the modified state
            return newState;
          })
        },
        upsyncMappings: async (instanceState: InstanceViewModel) => {

          const state = get();
          const mappingsCount = state.mappingsArrState.length;

          state.saveToLocalStorage(instanceState);
        },

        saveToLocalStorage: (instanceState: InstanceViewModel) => {
          try {
            const state = get();
            const stateKey = `mappings_${instanceState.server}_${instanceState.database}_${instanceState.table}`;
            const mappingsData = state.mappingsArrState;
            const dataSize = JSON.stringify(mappingsData).length;

            localStorage.setItem(stateKey, JSON.stringify(mappingsData));

          } catch (err) {
            console.error('Error saving to localStorage:', err);
          }
        },

        loadFromLocalStorage: (instanceState: InstanceViewModel) => {
          try {
            const stateKey = `mappings_${instanceState.server}_${instanceState.database}_${instanceState.table}`;
            const savedState = localStorage.getItem(stateKey);

            if (savedState) {
              const parsedData = JSON.parse(savedState);

              set(state => ({
                ...state,
                mappingsArrState: parsedData
              }));

              return true;
            }


            return false;
          } catch (err) {
            console.error('Error loading from localStorage:', err);

            return false;
          }
        },

        clearLocalStorage: (instanceState: InstanceViewModel) => {
          try {
            const stateKey = `mappings_${instanceState.server}_${instanceState.database}_${instanceState.table}`;
            localStorage.removeItem(stateKey);

          } catch (err) {
            console.error('Error clearing localStorage:', err);

          }
        }
      })
    )
  );
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
async function _getMappingData(user, instanceState: InstanceViewModel, keyword: string): Promise<MappingsViewModel[]> {
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

async function _queryMappingsArr(user, instanceState: InstanceViewModel): Promise<MappingsViewModel[]> {
  let mappingsArrState: MappingsViewModel[] = [];
  _.forEach(instanceState.waterfallCohortsTableData, async cohort => {
    const mappingData = await _getMappingData(user, instanceState, cohort.waterfallCohortName);
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
