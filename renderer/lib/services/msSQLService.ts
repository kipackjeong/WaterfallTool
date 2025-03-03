import sql, { ConnectionPool, IResult, ISqlType, config as SqlConfig } from 'mssql';
import { ProjectViewModel, MappingsViewModel, InstanceViewModel } from "../models";
import { APIError } from '../errors/APIError';
import { table } from 'console';
import { query } from 'firebase/firestore';

export type SqlConfig = SqlConfig;

// Connection pool cache to reuse connections
const connectionPools: { [key: string]: ConnectionPool } = {};

// Helper function to create a unique key for each connection
const getConnectionKey = (config: SqlConfig): string => {
  return `${config.server}_${config.database || 'master'}_${config.user}`;
};

// Service for SQL Server operations
export const msSQLService = {
  /**
   * Establish a connection to SQL Server
   */
  async connect(config: SqlConfig): Promise<ConnectionPool> {
    try {
      const connectionKey = getConnectionKey(config);

      // Return cached connection if it exists and is connected
      if (connectionPools[connectionKey] && !connectionPools[connectionKey].closed) {
        try {
          await connectionPools[connectionKey].connect();
          return connectionPools[connectionKey];
        } catch (error) {
          // Connection is broken, create a new one
          delete connectionPools[connectionKey];
        }
      }

      // Create SQL configuration
      const sqlConfig: SqlConfig = {
        server: config.server,
        database: config.database, // Default to master if not provided
        user: config.user,
        password: config.password,
        port: config.port || 1433, // Default SQL Server port
        options: {
          encrypt: config.encrypt !== undefined ? config.encrypt : true,
          trustServerCertificate: config.trustServerCertificate !== undefined ? config.trustServerCertificate : true,
        },
      };

      // Create a new connection pool
      const pool = new sql.ConnectionPool(sqlConfig);
      await pool.connect();

      // Cache the connection
      connectionPools[connectionKey] = pool;

      return pool;
    } catch (error) {
      throw new Error(`Failed to connect to SQL Server: ${error.message}`);
    }
  },

  /**
   * Execute a SQL query
   */
  async query<T = any>(
    connectionConfig: SqlConfig,
    queryText: string,
    parameters?: Record<string, any>
  ): Promise<T[]> {
    let pool: ConnectionPool | null = null;

    try {
      pool = await this.connect(connectionConfig);

      const request = pool.request();

      // Add parameters if provided
      if (parameters) {
        Object.entries(parameters).forEach(([key, value]) => {
          request.input(key, value);
        });
      }

      const result: IResult<T> = await request.query<T>(queryText);
      return result.recordset;
    } catch (error) {
      console.error('SQL Query Error:', error);
      throw new Error(`Failed to execute SQL query: ${error.message}`);
    }
  },


  /**
   * Get all databases on the server
   */
  async getDatabases(connectionConfig: SqlConfig): Promise<{ name: string }[]> {
    const query = `
      SELECT name 
      FROM sys.databases 
      WHERE name NOT IN ('master', 'tempdb', 'model', 'msdb')
      ORDER BY name
    `;

    return this.query(connectionConfig, query);
  },

  /**
   * Get all tables in a database
   */
  async getTables(connectionConfig: SqlConfig): Promise<{ name: string }[]> {
    // Ensure database is specified
    if (!connectionConfig.database) {
      throw new Error('Database must be specified to get tables');
    }

    const query = `
      SELECT TABLE_NAME as name
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `;

    return this.query(connectionConfig, query);
  },

  /**
   * Get columns for a specific table
   */
  async getTableColumns(
    connectionConfig: SqlConfig,
    tableName: string
  ): Promise<{ name: string; dataType: string; isNullable: boolean }[]> {
    // Ensure database is specified
    if (!connectionConfig.database) {
      throw new Error('Database must be specified to get table columns');
    }

    const query = `
      SELECT 
        COLUMN_NAME as name,
        DATA_TYPE as dataType,
        CASE WHEN IS_NULLABLE = 'YES' THEN 1 ELSE 0 END as isNullable
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = @tableName
      ORDER BY ORDINAL_POSITION
    `;

    return this.query(connectionConfig, query, { tableName });
  },

  /**
   * Execute a custom SQL query with optional parameters
   */
  async executeQuery<T = any>(
    connectionConfig: SqlConfig,
    queryText: string,
    parameters?: Record<string, any>
  ): Promise<T[]> {
    console.log('[msSQLService] executeQuery:', connectionConfig, queryText, parameters);
    return this.query(connectionConfig, queryText, parameters);
  },

  /**
   * Test a connection to verify credentials and connectivity
   * @param connectionConfig - SQL Server connection configuration
   * @param tableName - Table name to use for the test query
   * @throws {APIError} with status 500 if connection fails
   */
  async testConnection(connectionConfig: SqlConfig, tableName: string) {
    console.log('[msSQLService] testConnection:', connectionConfig, tableName);
    let pool = null;
    try {
      // Establish connection
      pool = await this.connect(connectionConfig);

      // Execute a simple query to verify connectivity
      // Note: In a real application, parameterized queries should be used for security
      await pool.request().query(`SELECT 1 From ${tableName}`);
      // Connection test successful
      return;
    } catch (error) {
      throw new APIError(`Connection failed: ${error.message}`, 500);
    }
  },

  /**
   * Close all connection pools (useful when shutting down the application)
   */
  async closeAllConnections(): Promise<void> {
    const pools = Object.values(connectionPools);
    const closePromises = pools.map(pool => pool.close());

    await Promise.all(closePromises);

    // Clear the connection pools cache
    Object.keys(connectionPools).forEach(key => {
      delete connectionPools[key];
    });
  },

  /**
   * Get table data with pagination support
   */
  async getTableData<T = any>(
    connectionConfig: SqlConfig,
    tableName: string,
    page: number = 1,
    pageSize: number = 100,
    orderBy: string = 'NULL',
    direction: 'ASC' | 'DESC' = 'ASC',
    whereClause: string = ''
  ): Promise<{ data: T[]; totalCount: number }> {
    // Ensure database is specified
    if (!connectionConfig.database) {
      throw new Error('Database must be specified to get table data');
    }

    const offset = (page - 1) * pageSize;

    let orderByClause = '';
    if (orderBy && orderBy !== 'NULL') {
      orderByClause = `ORDER BY [${orderBy}] ${direction}`;
    }

    let whereStatement = '';
    if (whereClause && whereClause.trim() !== '') {
      whereStatement = `WHERE ${whereClause}`;
    }

    // Query to get paginated data
    const dataQuery = `
      SELECT * FROM [${tableName}]
      ${whereStatement}
      ${orderByClause}
      OFFSET ${offset} ROWS
      FETCH NEXT ${pageSize} ROWS ONLY
    `;

    // Query to get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as totalCount 
      FROM [${tableName}]
      ${whereStatement}
    `;

    const [data, countResult] = await Promise.all([
      this.query(connectionConfig, dataQuery),
      this.query(connectionConfig, countQuery)
    ]);

    return {
      data,
      totalCount: countResult[0]?.totalCount || 0
    };
  },
};

// async function queryMappingNames(sqlConfig: SqlConfig, table: string): Promise<string[]> {
//   const keywords = ['Procedure', 'Provider', 'Insurance', 'Location'];
//   const query = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${table}' AND (${keywords.map(keyword => `COLUMN_NAME LIKE '%${keyword}%'`).join(' OR ')})`;

//   try {
//     // Convert sqlConfig
//     const connectionConfig: SqlConfig = {
//       server: sqlConfig.server,
//       database: sqlConfig.database,
//       user: sqlConfig.user || '',
//       password: sqlConfig.password || '',
//       isRemote: sqlConfig.isRemote
//     };

//     const res = await this.query(connectionConfig, query);
//     const existingKeywords = keywords.filter(keyword => res?.some(row => row.COLUMN_NAME.includes(keyword)));
//     return existingKeywords;
//   } catch (error) {
//     console.error(`Error getting mapping names: ${error}`);
//     return [];
//   }
// }
// /**
//  * Query mappings array for visualization
//  */
// export async function queryMappingsArr(projectViewState: ProjectViewModel): Promise<MappingsViewModel[]> {
//   const names = await queryMappingNames(projectViewState);
//   const mappingsViewModels: MappingsViewModel[] = [];

//   await Promise.all(names.map(async name => {
//     const res = await _runQueryForMappingName(projectViewState, name);
//     if (res && res.length > 0) {
//       const columnName = Object.keys(res[0])[0];
//       const keyword = columnName.split('_Group')[0];

//       const data = res.map(data => ({
//         ...data,
//         [`Waterfall_Group`]: data[`${keyword}_Group_Final`]
//       }));

//       mappingsViewModels.push({
//         tabName: name,
//         keyword,
//         data
//       });
//     }
//   }));

//   // Sort mappingsViewModels by tabName
//   return mappingsViewModels.sort((a, b) => a.tabName.localeCompare(b.tabName));
// }

// /**
//  * Run a query for specific mapping name
//  */
// async function _runQueryForMappingName(projectViewState: ProjectViewModel, keyword: string): Promise<any> {
//   const query = `
//     DECLARE @sql NVARCHAR(MAX);
//     DECLARE @groupFinalColumn NVARCHAR(128);
//     DECLARE @groupColumn NVARCHAR(128);

//     -- Query to select columns based on pattern
//     SELECT TOP 1 @groupFinalColumn = COLUMN_NAME
//     FROM INFORMATION_SCHEMA.COLUMNS
//     WHERE TABLE_NAME = '${projectViewState.table}'
//     AND COLUMN_NAME LIKE '%${keyword}_Group_Final%';

//     SELECT TOP 1 @groupColumn = COLUMN_NAME
//     FROM INFORMATION_SCHEMA.COLUMNS
//     WHERE TABLE_NAME = '${projectViewState.table}'
//     AND COLUMN_NAME LIKE '%${keyword}_Group%';

//     -- Build the dynamic SQL query
//     SET @sql = N'
//         SELECT ' + QUOTENAME(@groupFinalColumn) + ', ' + QUOTENAME(@groupColumn) + ',
//             SUM(Charge_Amount) AS Total_Charge_Amount,
//             SUM(Payment_Amount) AS Total_Payment_Amount,
//             MIN(DOS_Period) AS Earliest_Min_DOS,
//             MAX(DOS_Period) AS Latest_Max_DOS
//         FROM ${projectViewState.table}
//         GROUP BY ' + QUOTENAME(@groupFinalColumn) + ', ' + QUOTENAME(@groupColumn);

//     -- Execute the dynamic SQL
//     EXEC sp_executesql @sql;
//   `;

//   try {
//     // Convert projectViewState to SqlConfig
//     const connectionConfig: SqlConfig = {
//       server: projectViewState.server,
//       database: projectViewState.database,
//       user: projectViewState.user || '',
//       password: projectViewState.password || '',
//       isRemote: projectViewState.isRemote
//     };

//     const res = await msSQLService.query(connectionConfig, query);
//     return res;
//   } catch (error) {
//     console.error(`Getting ${keyword} group mapping failed:`, error);
//     return [];
//   }
// }

/**
 * Query available mapping names
 */

// /**
//  * Query for numeric table data
//  */
// export async function queryForNumericTableData(projectViewState: ProjectViewModel): Promise<Record<string, number>> {
//   const query = `
//     SELECT
//       SUM(Charge_Amount) AS Total_Charge_Amount,
//       SUM(Payment_Amount) AS Total_Payment_Amount,
//       SUM(Unit) AS Total_Unit,
//       COUNT(Final_Charge_Count) AS Final_Charge_Count,
//       COUNT(Final_Charge_Count_w_Payment) AS Final_Charge_w_Payment,
//       COUNT(Final_Visit_Count) AS Final_Visit_Count,
//       COUNT(Final_Visit_Count_w_Payment) AS Final_Visit_w_Payment
//     FROM ${projectViewState.table};
//   `;

//   try {
//     // Convert projectViewState to SqlConfig
//     const connectionConfig: SqlConfig = {
//       server: projectViewState.server,
//       database: projectViewState.database,
//       user: projectViewState.user || '',
//       password: projectViewState.password || '',
//       isRemote: projectViewState.isRemote
//     };

//     const res = await msSQLService.query(connectionConfig, query);
//     return res[0];
//   } catch (error) {
//     console.error(`Error querying totals and counts: ${error}`);
//     return {};
//   }
// }
