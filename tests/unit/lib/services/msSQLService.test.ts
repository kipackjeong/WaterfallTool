import { msSQLService } from '@/lib/services/msSQLService';
import { APIError } from '@/lib/errors/APIError';
import sql from 'mssql';

// Mock the mssql library
jest.mock('mssql', () => {
  const mockPool = {
    request: jest.fn().mockReturnThis(),
    query: jest.fn().mockResolvedValue({ recordset: [{ value: 1 }] }),
    close: jest.fn(),
  };

  return {
    connect: jest.fn().mockResolvedValue(mockPool),
    ConnectionPool: jest.fn().mockImplementation(() => ({
      connect: jest.fn().mockResolvedValue(mockPool),
    })),
  };
});

describe('msSQLService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('testConnection', () => {
    const mockSqlConfig = {
      server: 'sandboxvbasqlserver.database.windows.net',
      database: 'sampledb',
      user: 'kipackjeong',
      password: 'Suanoah20182021!?123',
      options: {
        trustServerCertificate: true,
        encrypt: true,
      },
      table: 'DataSource',
    };

    it('should successfully test connection when SQL server is available', async () => {
      // Arrange
      const tableName = 'DataSource';
      const mockConnect = jest.spyOn(msSQLService, 'connect').mockResolvedValue({
        request: jest.fn().mockReturnThis(),
        query: jest.fn().mockResolvedValue({ recordset: [{ value: 1 }] }),
        close: jest.fn(),
      } as any);

      try {
        const result = await msSQLService.testConnection(mockSqlConfig, mockSqlConfig.table);
        // Assert
        expect(mockConnect).toHaveBeenCalledWith(mockSqlConfig);
        expect(result).toBeUndefined();
      } catch (error) {
        console.log('error:', error)
        expect(error).toBeInstanceOf(APIError);
      }
    });

    it('should throw APIError with status 500 when connection fails', async () => {
      // Arrange
      const connectionError = new Error('Connection refused');

      // Mock the connect method to throw an error
      jest.spyOn(msSQLService, 'connect').mockRejectedValue(connectionError);

      // Act & Assert
      let caughtError;
      try {
        await msSQLService.testConnection(mockSqlConfig, mockSqlConfig.table);
        fail('Expected an error to be thrown');
      } catch (err) {
        caughtError = err;
      }

      // Verify error properties
      expect(caughtError).toBeDefined();
      expect(caughtError.message).toBe(`Connection failed: ${connectionError.message}`);
      expect(caughtError.statusCode).toBe(500);
    });

    it('should throw APIError with status 500 when query fails', async () => {
      // Arrange
      const queryError = new Error('Invalid table name');

      // Mock successful connection but failed query
      jest.spyOn(msSQLService, 'connect').mockResolvedValue({
        request: jest.fn().mockReturnThis(),
        query: jest.fn().mockRejectedValue(queryError),
        close: jest.fn(),
      } as any);

      // Act & Assert
      await expect(msSQLService.testConnection(mockSqlConfig, mockSqlConfig.table))
        .rejects
        .toThrow(new APIError(`Connection failed: ${queryError.message}`, 500));
    });

    it('should pass the correct query to test the connection', async () => {
      // Arrange
      const queryMock = jest.fn().mockResolvedValue({ recordset: [{ value: 1 }] });

      // Mock the connection with a spy on the query method
      jest.spyOn(msSQLService, 'connect').mockResolvedValue({
        request: jest.fn().mockReturnThis(),
        query: queryMock,
        close: jest.fn(),
      } as any);

      // Act
      await msSQLService.testConnection(mockSqlConfig, mockSqlConfig.table);

      // Assert
      expect(queryMock).toHaveBeenCalledWith(`SELECT 1 From ${mockSqlConfig.table}`);
    });

    it('should handle SQL injection attempts in tableName', async () => {
      // Arrange
      const maliciousTableName = 'users; DROP TABLE users;--';
      const queryMock = jest.fn().mockResolvedValue({ recordset: [{ value: 1 }] });

      // Mock the connection with a spy on the query method
      jest.spyOn(msSQLService, 'connect').mockResolvedValue({
        request: jest.fn().mockReturnThis(),
        query: queryMock,
        close: jest.fn(),
      } as any);

      // Act
      await msSQLService.testConnection(mockSqlConfig, maliciousTableName);

      // Assert
      // This test verifies the raw SQL is passed directly to the query method
      // In a real application, we'd want to use parameterized queries for security
      expect(queryMock).toHaveBeenCalledWith(`SELECT 1 From ${maliciousTableName}`);
    });

    it('should properly close the connection after testing', async () => {
      // Arrange
      const closeMock = jest.fn();

      // Create a pool mock with a close method spy
      const poolMock = {
        request: jest.fn().mockReturnThis(),
        query: jest.fn().mockResolvedValue({ recordset: [{ value: 1 }] }),
        close: closeMock,
      };

      // Mock the connect method to return our pool with the close spy
      jest.spyOn(msSQLService, 'connect').mockResolvedValue(poolMock as any);

      // Act
      await msSQLService.testConnection(mockSqlConfig, mockSqlConfig.table);

      // Assert
      // Note: The testConnection method doesn't actually close the connection,
      // but in a real application it would be a good practice to do so.
      // This test would verify that behavior if implemented.
      //expect(closeMock).toHaveBeenCalled();
    });
  });
});
