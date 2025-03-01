import { createStore } from 'zustand/vanilla';
import { SqlServerViewModel } from '../models';
import { IndexedDBService } from '../services/indexedDBService';

const INDEXED_DB_SERVICE = new IndexedDBService('states', 'projectsArrState');

export type ProjectsState = {
    projectsArrState: ProjectViewModel[];
};

export type ProjectViewModel = {
    name: string;
    sqlServerViewModels: SqlServerViewModel[];
};

export type ProjectsActions = {
    initProjects: () => void;
    addProject: (project: ProjectViewModel) => void;
};

export type ProjectsStore = ProjectsState & ProjectsActions;

export const defaultInitState: ProjectsState = {
    projectsArrState: []
};

export const createProjectStore = (
    initState: ProjectsState = defaultInitState,
) => {

    return createStore<ProjectsStore>()((set) => ({
        ...initState,
        initProjects: async () => {
            try {
                const projectsArrState = await INDEXED_DB_SERVICE.get<ProjectViewModel[]>('state');
                set({ projectsArrState: projectsArrState ?? [] });
            } catch (error) {
                console.error('Error initializing projects:', error);
            }
        },
        addProject: (newProject: ProjectViewModel) => {
            set((prevState: ProjectsState) => {
                const updatedState = mergeProjects(prevState, newProject);
                INDEXED_DB_SERVICE.put('state', updatedState.projectsArrState);
                return updatedState;
            });
        }
    }));
};

const mergeProjects = (prevState: ProjectsState, newProject: ProjectViewModel): ProjectsState => {

    const mergeProjectData = (existingProject: ProjectViewModel, newProject: ProjectViewModel): ProjectViewModel => {
        const mergedSqlServerViewModels = existingProject.sqlServerViewModels.map(existingSqlServer => {
            const newSqlServer = newProject.sqlServerViewModels.find(sqlServer => sqlServer.name === existingSqlServer.name);

            if (newSqlServer) {
                const mergedDatabases = mergeDatabases(existingSqlServer.databases, newSqlServer.databases);
                return { ...existingSqlServer, databases: mergedDatabases };
            }
            return existingSqlServer;
        });

        const additionalSqlServers = newProject.sqlServerViewModels.filter(newSqlServer =>
            !existingProject.sqlServerViewModels.some(existingSqlServer => existingSqlServer.name === newSqlServer.name)
        );

        return { ...existingProject, sqlServerViewModels: [...mergedSqlServerViewModels, ...additionalSqlServers] };
    };
    const mergeDatabases = (existingDatabases, newDatabases) => {
        const mergedDatabases = existingDatabases.map(existingDatabase => {
            const newDatabase = newDatabases.find(database => database.name === existingDatabase.name);

            if (newDatabase) {
                const mergedTables = mergeTables(existingDatabase.tables, newDatabase.tables);
                return { ...existingDatabase, tables: mergedTables };
            }
            return existingDatabase;
        });

        const additionalDatabases = newDatabases.filter(newDatabase =>
            !existingDatabases.some(existingDatabase => existingDatabase.name === newDatabase.name)
        );

        return [...mergedDatabases, ...additionalDatabases];
    };

    const mergeTables = (existingTables, newTables) => {
        const mergedTables = existingTables.map(existingTable => {
            const newTable = newTables.find(table => table.name === existingTable.name);
            return newTable ? { ...existingTable, ...newTable } : existingTable;
        });

        const additionalTables = newTables.filter(newTable =>
            !existingTables.some(existingTable => existingTable.name === newTable.name)
        );

        return [...mergedTables, ...additionalTables];
    };

    const existingProject = prevState.projectsArrState.find(project => project.name === newProject.name);

    if (existingProject) {
        return {
            projectsArrState: prevState.projectsArrState.map(project =>
                project.name === existingProject.name
                    ? mergeProjectData(project, newProject)
                    : project
            )
        };
    } else {
        return {
            projectsArrState: [...prevState.projectsArrState, newProject]
        };
    }
};