import { useToast } from '@chakra-ui/react';
import { InstanceViewModel, MappingViewModel } from '../models';
import { IndexedDBService } from '../services/indexedDBService';

const useSqlQuery = () => {
    const toast = useToast();

    async function runSqlServerHandshake(instanceViewState: InstanceViewModel): Promise<any> {
        const query = `SELECT TOP 1 * FROM ${instanceViewState.table}`;
        try {
            const res = await window.ipc.invoke('runSqlQuery', instanceViewState, query);
            toast({
                title: `Connected to ${instanceViewState.database} database in ${instanceViewState.server} server.`,
                status: "success",
                duration: 3000,
                isClosable: true,
            });
            return res;
        } catch (error) {
            const myMsg = `Connection to ${instanceViewState.table} table in ${instanceViewState.database} database in ${instanceViewState.server} server failed.`;
            toast({
                title: myMsg,
                description: error.message,
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            console.error(`${myMsg}: ${error}`);
        }
    }

    async function getDataCount(instanceViewState: InstanceViewModel, keyword: string): Promise<any> {
        const key = `${instanceViewState.server}_${instanceViewState.database}_${instanceViewState.table}_${keyword}_getDataCount`;

        // Check if the result is already cached
        const indexedDBService = new IndexedDBService('cache-sqlquery', 'queries');
        const cachedResult = await indexedDBService.get(key);
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
            toast({
                title: `Getting ${keyword} group mapping was successful.`,
                status: "success",
                duration: 3000,
                isClosable: true,
            });
            await indexedDBService.put(key, res);

            return res;
        } catch (error) {
            const myMsg = `Getting ${keyword} count failed.`
            toast({
                title: myMsg,
                description: error.message,
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            console.error(`${myMsg}: ${error}`);
        } finally {
            await indexedDBService.close();
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
            toast({
                title: myMsg,
                description: error.message,
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            console.error(`${myMsg}: ${error}`);
        }
    };

    return { runSqlServerHandshake, getDataCount, queryMappingNames };
};

export default useSqlQuery;