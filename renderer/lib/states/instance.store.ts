import { createStore } from 'zustand/vanilla'
import { InstanceViewModel } from '../models'
import { queryForNumericTableData } from '../services/sqlService'
import { IndexedDBService } from '../services/indexedDBService'

const INDEXED_DB_SERVICE = new IndexedDBService('states', 'instanceViewState');

export type InstanceState = {
  instanceViewState: InstanceViewModel
  numericTableData: { fieldName: string, type: string, include: string, total: number }[]
}

export type InstanceActions = {
  setInstanceViewState: (newInstanceViewState: InstanceViewModel) => void
  setNumericTableData: (newInstanceViewState: InstanceViewModel) => Promise<void>
}

export type InstanceStore = InstanceState & InstanceActions

export const createInstanceStore = (
  initState: InstanceState = {
    instanceViewState: null,
    numericTableData: null,
  },
) => {
  return createStore<InstanceStore>()((set) => ({
    ...initState,

    getDataCount: async (instanceViewState: InstanceViewModel, keyword: string): Promise<any> => {
      const key = `${instanceViewState.server}_${instanceViewState.database}_${instanceViewState.table}_${keyword}_getDataCount`;

      // Check if the result is already cached
      const cachedResult = await INDEXED_DB_SERVICE.get(key);
      if (cachedResult) {
        return cachedResult;
      }

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
                  WITH GroupedData AS (
                      SELECT ' + QUOTENAME(@groupFinalColumn) + ', ' + QUOTENAME(@groupColumn) + '
                      FROM ${instanceViewState.table}
                      GROUP BY ' + QUOTENAME(@groupFinalColumn) + ', ' + QUOTENAME(@groupColumn) + '
                  )
                  SELECT *, (SELECT COUNT(*) FROM GroupedData) AS ROW_COUNT
                  FROM GroupedData';

              -- Execute the dynamic SQL
              EXEC sp_executesql @sql;
          `
      try {
        const res = await window.ipc.invoke('runSqlQuery', instanceViewState, query);

        await INDEXED_DB_SERVICE.put(key, res);

        return res;
      } catch (error) {
        const myMsg = `Getting ${keyword} count failed.`
        console.error(`${myMsg}: ${error}`);
      }
    },
    setInstanceViewState: async (newInstanceViewState: InstanceViewModel) => set((prevState) => {
      return {
        instanceViewState: newInstanceViewState,
      }
    }),

    setNumericTableData: async (instanceViewState: InstanceViewModel) => {
      const res = await queryForNumericTableData(instanceViewState);
      const newNumericTableData = [
        {
          fieldName: 'Charge Amount',
          type: 'Amount',
          include: 'Y',
          divideBy: 'Y',
          schedule: 'Y',
          total: res?.['Total_Charge_Amount'],
        },
        {
          fieldName: 'Payment Amount',
          type: 'Amount',
          include: 'Y',
          divideBy: 'Y',
          schedule: 'Y',
          total: res?.['Total_Payment_Amount'],
        },
        {
          fieldName: 'Unit',
          type: 'Amount',
          include: 'Y',
          divideBy: 'Y',
          schedule: 'Y',
          total: res?.['Total_Unit'],
        },
        {
          fieldName: 'Final Charge Count',
          type: 'Count',
          include: 'Y',
          divideBy: 'Y',
          schedule: 'Y',
          total: res?.['Final_Charge_Count'],
        },
        {
          fieldName: 'Final Charge Count w Payment',
          type: 'Count',
          include: 'Y',
          divideBy: 'Y',
          schedule: 'Y',
          total: res?.['Final_Charge_w_Payment'],
        },
        {
          fieldName: 'Final Visit Count',
          type: 'Count',
          include: 'Y',
          divideBy: 'Y',
          schedule: 'Y',
          total: res?.['Final_Visit_Count'],
        },
        {
          fieldName: 'Final Visit Count w Payment',
          type: 'Count',
          include: 'Y',
          divideBy: 'Y',
          schedule: 'Y',
          total: res?.['Final_Visit_w_Payment'],
        }
      ]
      return set((prevState) => {
        return {
          ...prevState,
          numericTableData: newNumericTableData,
        }
      })
    },

  }))
}
