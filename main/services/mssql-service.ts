import { IpcRendererEvent } from "electron";

const ipcMain = require('electron').ipcMain
const sql = require('mssql');

type MSSQLConfig = {
    user: string,
    password: string,
    server: string,
    port: number,
    database: string,
    authentication: {
        type: 'default' | 'msi' | 'activeDirectoryPassword' | 'activeDirectoryMsi' | 'azureActiveDirectory'
    },
    isRemote?: boolean,
    options: {
        encrypt: boolean
        trustServerCertificate: boolean
    }
}
// NOTE: Make sure your sql server is tcp/ip is enabled. Check sql server configuration manager > sql server network configuration
const defaultConfig: MSSQLConfig = {
    user: 'kipackjeong', // better stored in an app setting such as process.env.DB_USER
    password: 'Suanoah20182021!?', // better stored in an app setting such as process.env.DB_PASSWORD
    server: '', // updated to localhost for local connection
    port: 1433, // optional, defaults to 1433, better stored in an app setting such as process.env.DB_PORT
    database: 'sampledb', // better stored in an app setting such as process.env.DB_NAME
    authentication: {
        type: 'default'
    },
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
}
const runSqlQuery = (event: IpcRendererEvent, dbInfo: Partial<MSSQLConfig>, sqlQuery: string) => {

    const config = {
        user: dbInfo.user || defaultConfig.user,
        password: dbInfo.password || defaultConfig.password,
        server: dbInfo.isRemote ? dbInfo.server += ".database.windows.net" : dbInfo.server,
        port: dbInfo.port || defaultConfig.port,
        database: dbInfo.database || defaultConfig.database,
        options: {
            encrypt: true,
            trustServerCertificate: true
        }
    }

    return new Promise(async (resolve, reject) => {
        try {
            console.debug("=== runSqlQuery() start ===")
            console.debug(config)
            console.debug(sqlQuery)
            // https://learn.microsoft.com/en-us/azure/azure-sql/database/connect-query-nodejs?view=azuresql&tabs=windows
            var poolConnection = await sql.connect(config);

            console.log("Reading rows from the Table...");
            var resultSet = await poolConnection.request().query(sqlQuery);
            console.log(`${resultSet.recordset.length} rows returned.`);

            // output column headers
            var columns = "";
            for (var column in resultSet.recordset.columns) {
                columns += column + ", ";
            }
            console.log("%s\t", columns.substring(0, columns.length - 2));

            /** resultSet.recordset =
             * [
             *  { COLUMN_NAME: 'Location_Group' },
             *  { COLUMN_NAME: 'Location_Group_Final' },
             *  { COLUMN_NAME: 'Procedure_Group' },
             *  { COLUMN_NAME: 'Procedure_Group_Final' },
             *  { COLUMN_NAME: 'Primary_Insurance_Group' },
             *  { COLUMN_NAME: 'Primary_Insurance_Group_Final' }
             * ]
             */
            resolve(resultSet.recordset);
        } catch (err) {
            console.error(err);
            reject('Failed to connect to database.')
        } finally {
            console.debug("=== runSqlQuery() end ===")
        }
    })
}

ipcMain.handle('runSqlQuery', runSqlQuery)