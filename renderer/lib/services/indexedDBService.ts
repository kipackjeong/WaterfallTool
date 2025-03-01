import { IDBPDatabase, openDB, StoreKey, StoreNames } from 'idb';

const DB_VERSION = 12;
// Define a mapped type for the IndexedDB schema with dynamic store names
type DynamicDBSchema<T extends string> = {
    [K in T]: {
        key: string; // Key for storing/retrieving data (e.g., 'userSettings')
        value: any;  // Value can be any type (e.g., object, array, etc.)
    };
};

/**
 * IndexedDBService class for persistent IndexedDB operations with dynamic store names and version control.
 * Maintains a single database connection per version and provides CRUD methods.
 */
export class IndexedDBService<T extends string> {
    private dbPromises: Map<number, Promise<IDBPDatabase<DynamicDBSchema<T>>>> = new Map();
    private dbName: string;
    private storeName: T;
    private version: number = DB_VERSION;

    constructor(dbName: string, storeName: T) {
        this.dbName = dbName;
        this.storeName = storeName;
    }

    /**
     * Ensures a persistent connection to the IndexedDB database for a specific version.
     * Opens or reuses the database with the specified version and schema.
     * @param version The database version to use (defaults to 1 if not specified)
     */
    private async getDB(version: number = DB_VERSION): Promise<IDBPDatabase<DynamicDBSchema<T>>> {
        if (!this.dbPromises.has(version)) {
            this.version = version;
            this.dbPromises.set(
                version,
                openDB<DynamicDBSchema<T>>(this.dbName, version, {
                    upgrade(db, oldVersion, newVersion, transaction) {
                        // Create or upgrade the object store if it doesn't exist or needs migration
                        if (!db.objectStoreNames.contains(this?.storeName)) {
                            db.createObjectStore(this?.storeName, { keyPath: 'key', autoIncrement: true });
                        }
                        // Add migration logic here for specific version changes if needed
                        if (oldVersion < newVersion) {
                            // Example: Add indexes, modify store structure, etc.
                            console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);
                        }
                    },
                    blocked(currentVersion) {
                        console.warn(`IndexedDB database upgrade blocked at version ${currentVersion}. Close other tabs or windows using this database.`);
                    },
                    blocking(currentVersion) {
                        console.warn(`IndexedDB database blocking a downgrade to version ${currentVersion}. Close other tabs or windows.`);
                    },
                })
            );
        }

        return this.dbPromises.get(version)!;
    }

    /**
     * Retrieves data from the IndexedDB store by key for a specific version.
     * @param key The key to retrieve data for (e.g., 'userSettings')
     * @param version The database version to use (optional, defaults to 1)
     * @returns Promise resolving to the value or undefined if not found
     */
    async get<U>(key: StoreKey<DynamicDBSchema<T>, StoreNames<DynamicDBSchema<T>>>): Promise<U | undefined> {
        try {
            const db = await this.getDB(this.version);
            const tx = db.transaction(this.storeName as StoreNames<DynamicDBSchema<T>>, 'readonly');
            const store = tx.objectStore(this.storeName as StoreNames<DynamicDBSchema<T>>);
            const value = await store.get(key);
            await tx.done; // Ensure transaction completes
            return value as U | undefined;

        } catch (error) {
            console.error(`Error retrieving data for key '${key}' from store '${this.storeName}' at version ${this.version}:`, error);
        }
    }

    /**
     * Puts data into the IndexedDB store for a given key at a specific version.
     * Ensures the value is serializable before storage.
     * @param key The key to store the data under (e.g., 'userSettings')
     * @param value The value to store (e.g., object, array, etc.)
     * @param version The database version to use (optional, defaults to 1)
     * @returns Promise resolving when the data is successfully stored
     */
    async put<U>(key: IDBKeyRange | StoreKey<DynamicDBSchema<T>, StoreNames<DynamicDBSchema<T>>>, value: U): Promise<void> {
        try {
            // Ensure the value is serializable (remove non-JSON-compatible properties)
            const serializableValue = JSON.parse(JSON.stringify(value));
            const db = await this.getDB(this.version);
            const tx = db.transaction(this.storeName as StoreNames<DynamicDBSchema<T>>, 'readwrite');
            const store = tx.objectStore(this.storeName as StoreNames<DynamicDBSchema<T>>);
            await store.put(serializableValue, key);

            await tx.done; // Ensure transaction completes
        } catch (error) {
            console.error(`Error putting data for key '${key}' in store '${this.storeName}' at version ${this.version}:`, error);
        }
    }
    /**
     * Deletes data from the IndexedDB store by key for a specific version.
     * @param key The key to delete data for (e.g., 'userSettings')
     * @param version The database version to use (optional, defaults to 1)
     * @returns Promise resolving when the data is successfully deleted
     */
    async delete(key: IDBKeyRange | StoreKey<DynamicDBSchema<T>, StoreNames<DynamicDBSchema<T>>>): Promise<void> {
        try {
            const db = await this.getDB(this.version);
            const tx = db.transaction(this.storeName as StoreNames<DynamicDBSchema<T>>, 'readwrite');
            const store = tx.objectStore(this.storeName as StoreNames<DynamicDBSchema<T>>);
            await store.delete(key);

            await tx.done; // Ensure transaction completes
        } catch (error) {
            console.error(`Error deleting data for key '${key}' from store '${this.storeName}' at version ${this.version}:`, error);
        }
    }

    /**
     * Clears all data from the IndexedDB store for a specific version.
     * @param version The database version to use (optional, defaults to 1)
     * @returns Promise resolving when the store is cleared
     */
    async clear(): Promise<void> {
        try {
            const db = await this.getDB(this.version);
            const tx = db.transaction(this.storeName as StoreNames<DynamicDBSchema<T>>, 'readwrite');
            const store = tx.objectStore(this.storeName as StoreNames<DynamicDBSchema<T>>);
            await store.clear();

            await tx.done; // Ensure transaction completes
        } catch (error) {
            console.error(`Error clearing store '${this.storeName}' at version ${this.version}:`, error);
        }
    }

    /**
     * Closes the database connection for a specific version (optional, for cleanup).
     * Call this when the service is no longer needed for a particular version.
     * @param version The database version to close (optional, defaults to 1)
     */
    async close(): Promise<void> {
        if (this.dbPromises.has(this.version)) {
            const db = await this.dbPromises.get(this.version)!;
            db.close();
            this.dbPromises.delete(this.version);
        }
    }
}