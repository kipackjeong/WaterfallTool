import { createStore } from 'zustand/vanilla'
import { InstanceViewModel, MappingViewModel } from '../models'
import { IndexedDBService } from '../services/indexedDBService'
import { queryMappingsArr } from '../services/sqlService'

const INDEXED_DB_SERVICE = new IndexedDBService('states', 'mappingsArrState');

//Zustand stuff
export type MappingsState = {
  indexedDBKey: string
  mappingsArrState: MappingViewModel[]
}

export type MappingsActions = {
  initMappingsState: (instanceViewState: InstanceViewModel) => Promise<void>
  setMappingsArrState: (instanceViewState: InstanceViewModel) => Promise<void>
  addMapping: (newMapping: MappingViewModel) => void
  modifyWaterfallGroup: (mappingIndex: number, rowIndex: number, newWaterfallGroup: string) => void
  saveMappingsToIndexedDB: () => Promise<void>
  refreshMappingsState: (instanceViewState: InstanceViewModel) => Promise<void>
}

export type MappingsStore = MappingsState & MappingsActions

export const defaultInitState: MappingsState = {
  indexedDBKey: '',
  mappingsArrState: []
}

export const createMappingsStore = (
  initState: MappingsState = defaultInitState,
) => {

  return createStore<MappingsStore>()((set, get) => {
    return {
      ...initState,
      initMappingsState: async (instanceViewState: InstanceViewModel) => {
        try {

          const key = `${instanceViewState.server}_${instanceViewState.database}_${instanceViewState.table}_mapping_state`;
          let mappingsArrState: MappingViewModel[] = [];
          try {
            mappingsArrState = await INDEXED_DB_SERVICE.get<MappingViewModel[]>(key);
          } catch (error) {
            console.error('Error initializing IndexedDB:', error);
          }

          if (!mappingsArrState || mappingsArrState.length === 0) {
            mappingsArrState = syncWaterfallGroupWithFinalGroup(await queryMappingsArr(instanceViewState));
          }


          set({ indexedDBKey: key, mappingsArrState });
        } catch (error) {
          console.error('Error initializing mappings:', error);
        }
      },

      setMappingsArrState: async (instanceViewState: InstanceViewModel) => {
        const key = `${instanceViewState.server}_${instanceViewState.database}_${instanceViewState.table}_mapping_state`;
        let mappingsArrState: MappingViewModel[] = [];
        try {
          mappingsArrState = await INDEXED_DB_SERVICE.get<MappingViewModel[]>(key);
        } catch (error) {
          console.error('Error getting mappings from IndexedDB:', error);
        }

        if (!mappingsArrState || mappingsArrState.length === 0) {
          mappingsArrState = syncWaterfallGroupWithFinalGroup(await queryMappingsArr(instanceViewState));
        }

        return set((prevState) => {
          return {
            ...prevState,
            indexedDBKey: key,
            mappingsArrState: mappingsArrState,
          }
        })
      },

      refreshMappingsState: async (instanceViewState: InstanceViewModel) => {
        const key = `${instanceViewState.server}_${instanceViewState.database}_${instanceViewState.table}_mapping_state`;

        let mappingsArrState = syncWaterfallGroupWithFinalGroup(await queryMappingsArr(instanceViewState));

        await INDEXED_DB_SERVICE.put(key, mappingsArrState);

        set((prevState) => {
          return {
            ...prevState,
            indexedDBKey: key,
            mappingsArrState: mappingsArrState,
          }
        })
      },

      addMapping: (newMapping: MappingViewModel) => set((prevState) => {
        return {
          ...prevState,
          mappingsArrState: [...prevState.mappingsArrState, newMapping],
        }
      }),

      modifyWaterfallGroup: (mappingIndex: number, rowIndex: number, newWaterfallGroup: string) => {
        set((prevState) => {
          const newState = { ...prevState }
          newState.mappingsArrState[mappingIndex].data[rowIndex].Waterfall_Group = newWaterfallGroup

          return newState
        })
      },

      saveMappingsToIndexedDB: async () => set((prevState) => {
        try {
          INDEXED_DB_SERVICE.put(prevState.indexedDBKey, prevState.mappingsArrState);
        } catch (error) {
          console.error("Error saving mappings state to IndexedDB:", error);
        } finally {
          return prevState
        }
      }),

    }
  })
}

function syncWaterfallGroupWithFinalGroup(mappingsArrState: MappingViewModel[]): MappingViewModel[] {
  return mappingsArrState.map((mapping) => {
    mapping.data = mapping.data.map((row) => {
      row.Waterfall_Group = row[`${mapping.keyword}_Group_Final`];
      return row;
    });
    return mapping;
  });
}