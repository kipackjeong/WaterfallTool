import { createContext, useContext, useRef, ReactNode } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { devtools } from 'zustand/middleware';
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
  upsyncMappings: () => Promise<void>
  refreshMappingsArrState: (user, instanceViewState: InstanceViewModel) => Promise<void>
}

export type MappingsStore = MappingsArrState & MappingsActions

export const defaultInitState: MappingsArrState = {
  mappingsArrState: []
}

export const createMappingsStore = (
  initState: MappingsArrState = defaultInitState,
) => {

  return createStore<MappingsStore>()(
    devtools(
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
            // const mappingsArrState = get().mappingsArrState;
            // try {
            //   // Call POST /mappings
            //   await apiClient.post('mappings', mappingsArrState);
            // } catch (error) {
            //   console.error('Error saving mappings to DB:', error);
            //   throw error; // Re-throw error to be caught by UI
            // }

            // // No state change needed for this operation
            // set((prevState) => {
            //   const newState = _.cloneDeep(prevState);
            //   return newState;
            // })
          },
          saveMappingsToIndexedDB: async () => set((prevState) => {
            try {
              // INDEXED_DB_SERVICE.put(prevState.indexedDBKey, prevState.mappingsArrState);
            } catch (error) {
              console.error("Error saving mappings state to IndexedDB:", error);
            }
            const newState = _.cloneDeep(prevState);
            return newState;
          }),

        }
      },
      { name: 'Mappings Store' }
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