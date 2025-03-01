import { InstanceViewModel, MappingViewModel } from "../models";

export async function queryMappingsArr(instanceViewState: InstanceViewModel): Promise<MappingViewModel[]> {
    const names = await queryMappingNames(instanceViewState);
    const mappingViewModels: MappingViewModel[] = [];

    await Promise.all(names.map(async name => {
        const res = await _runQueryForMappingName(instanceViewState, name);
        if (res && res.length > 0) {
            const columnName = Object.keys(res[0])[0];
            const keyword = columnName.split('_Group')[0];

            const data = res.map(data => ({
                ...data,
                [`Waterfall_Group`]: data[`${keyword}_Group_Final`]
            }));

            mappingViewModels.push({
                tabName: name,
                keyword,
                data
            });
        }
    }));



    // Sort mappingViewModels by tabName
    return mappingViewModels.sort((a, b) => a.tabName.localeCompare(b.tabName));
}

async function _runQueryForMappingName(instanceViewState: InstanceViewModel, keyword: string): Promise<any> {
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
        const res = await window.ipc.invoke('runSqlQuery', instanceViewState, query);
        return res;
    } catch (error) {
        const myMsg = `Getting ${keyword} group mapping failed.`;
    }
}


const queryMappingNames = async (instanceViewState: InstanceViewModel) => {
    const keywords = ['Procedure', 'Provider', 'Insurance', 'Location'];
    const query = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${instanceViewState.table}' AND (${keywords.map(keyword => `COLUMN_NAME LIKE '%${keyword}%'`).join(' OR ')})`;
    try {
        const res = await window.ipc.invoke('runSqlQuery', instanceViewState, query);
        const existingKeywords = keywords.filter(keyword => res?.some(row => row.COLUMN_NAME.includes(keyword)));
        return existingKeywords;
    } catch (error) {
        const myMsg = `Error getting mapping names:`;
        console.error(`${myMsg}: ${error}`);
    }
};

export async function queryForNumericTableData(instanceViewState: InstanceViewModel): Promise<Record<string, number>> {
    const query = `
        SELECT
            SUM(Charge_Amount) AS Total_Charge_Amount,
            SUM(Payment_Amount) AS Total_Payment_Amount,
            SUM(Unit) AS Total_Unit,
            COUNT(Final_Charge_Count) AS Final_Charge_Count,
            COUNT(Final_Charge_Count_w_Payment) AS Final_Charge_w_Payment,
            COUNT(Final_Visit_Count) AS Final_Visit_Count,
            COUNT(Final_Visit_Count_w_Payment) AS Final_Visit_w_Payment
        FROM ${instanceViewState.table};
    `;

    try {
        const res = await window.ipc.invoke('runSqlQuery', instanceViewState, query);
        return res[0];
    } catch (error) {
        console.error(`Error querying totals and counts: ${error}`);
        return {};
    }
}
