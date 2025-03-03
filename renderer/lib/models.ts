import { SqlConfig } from "./services/msSQLService";

export type ProjectViewModel = {
    id?: string;
    userId: string;
    name: string;
    sqlServerViewModels: SqlServerViewModel[];
};

export type ProjectDataModel = {
    updatedAt: string
    createdAt: string
} & ProjectViewModel

export type SqlServerViewModel = {
    isRemote: boolean
    name: string
    sqlConfig: SqlConfig
    databases: DatabaseViewModel[]
}

export type DatabaseViewModel = {
    name: string
    server: string
    tables?: TableViewModel[]
    model?: string
}

export type TableViewModel = {
    name: string
}

export type InstanceViewModel = {
    isRemote: boolean
    server: string
    database?: string
    table: string
    sqlConfig: SqlConfig
    dataCount: number
    waterfallCohortsTableData: {
        waterfallCohortName: string
        run: boolean
        aggregate: boolean
        count: number
    }[]
    numericTableData: any[]
}

export type MappingsViewModel = {
    tabName: string
    keyword: string
    data: any[]
}

/**
 * User model representing an authenticated user in the system
 */
export type User = {
    /** Unique identifier for the user */
    id: string;
    /** User's email address, used for authentication */
    email: string;
    password: string;
    passwordHash: string;
    /** User's display name or username */
    displayName?: string;
    /** URL to user's profile photo */
    photoURL?: string;
    /** Provider used for authentication (e.g., 'email', 'google', 'github') */
    provider?: string;
    /** Timestamp when the user was created */
    createdAt?: string;
    /** Timestamp when the user profile was last updated */
    updatedAt?: string;
    _duplicate?: boolean;
}
