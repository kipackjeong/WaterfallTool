import { createStore } from 'zustand/vanilla';
import { ProjectViewModel, SqlServerViewModel, User } from '../models';
import { IndexedDBService } from '../services/indexedDBService';
import { apiService } from '../services/apiService';
import { set } from 'lodash';

const INDEXED_DB_SERVICE = new IndexedDBService('states', 'projectsArrState');

export type ProjectsState = {
    projectsArrState: ProjectViewModel[];
};

export const defaultInitState: ProjectsState = {
    projectsArrState: []
};

export type ProjectsActions = {
    initProjects: (user: User) => void;
    addProject: (project: ProjectViewModel) => void;
    deleteProject: (projectId: string) => void;
    deleteSqlServer: (projectId: string, serverName: string) => void;
    deleteDatabase: (projectId: string, serverName: string, databaseName: string) => void;
    deleteTable: (projectId: string, serverName: string, databaseName: string, tableName: string) => void;
};

export type ProjectsStore = ProjectsState & ProjectsActions;

export const createProjectStore = (
    initState: ProjectsState = defaultInitState,
) => {
    return createStore<ProjectsStore>()(
        (set) => ({
            ...initState,
            initProjects: async (user: User) => {
                try {
                    const projectsArrState = await apiService.get('projects', { params: { userId: user.id } });
                    set({ projectsArrState: projectsArrState ?? [] });
                } catch (error) {
                    console.error('Error initializing projects:', error);
                }
            },
            addProject: (newProject: ProjectViewModel) => {
                set((prevState: ProjectsState) => {
                    const updatedState = mergeProjects(prevState, newProject);
                    console.log('updatedState:', updatedState)
                    apiService.post('projects', newProject).then((res) => {
                        console.log('res', res);
                        return { ...prevState, projectsArrState: res };
                    });
                    return updatedState;
                });
            },
            deleteProject: (projectId: string) => {
                set((prevState: ProjectsState) => {
                    const updatedState = { ...prevState, projectsArrState: prevState.projectsArrState.filter(project => project.id !== projectId) };
                    apiService.delete(`projects/${projectId}`).then((res) => {
                        console.log(res);
                    });
                    return updatedState;
                });
            },
            deleteSqlServer: (projectId: string, serverName: string) => {
                set((prevState: ProjectsState) => {
                    const updatedState = {
                        ...prevState, projectsArrState: prevState.projectsArrState.map(project => {
                            if (project.id === projectId) {
                                return { ...project, sqlServerViewModels: project.sqlServerViewModels.filter(sqlServer => sqlServer.name !== serverName) };
                            } else {
                                return project;
                            }
                        })
                    };
                    return updatedState;
                });
            },
            deleteDatabase: (projectId: string, serverName: string, databaseName: string) => {

                set((prevState: ProjectsState) => {
                    const updatedState = {
                        ...prevState, projectsArrState: prevState.projectsArrState.map(project => {
                            if (project.id === projectId) {
                                const updatedProject = {
                                    ...project,
                                    sqlServerViewModels: project.sqlServerViewModels.map(sqlServer => {
                                        if (sqlServer.name === serverName) {
                                            return { ...sqlServer, databases: sqlServer.databases.filter(database => database.name !== databaseName) };
                                        } else {
                                            return sqlServer;
                                        }
                                    })
                                };

                                uploadSyncProject(projectId, updatedProject)
                                return updatedProject;
                            } else {
                                return project;
                            }
                        })
                    };

                    return updatedState;
                });
            },
            deleteTable: (projectId: string, serverName: string, databaseName: string, tableName: string) => {
                set((prevState: ProjectsState) => {
                    const updatedState = {
                        ...prevState, projectsArrState: prevState.projectsArrState.map(project => {
                            if (project.id === projectId) {
                                const updatedProject = {
                                    ...project,
                                    sqlServerViewModels: project.sqlServerViewModels.map(sqlServer => {
                                        if (sqlServer.name === serverName) {
                                            return {
                                                ...sqlServer, databases: sqlServer.databases.map(database => {
                                                    if (database.name === databaseName) {
                                                        return { ...database, tables: database.tables.filter(table => table.name !== tableName) };
                                                    } else {
                                                        return database;
                                                    }
                                                })
                                            };
                                        } else {
                                            return sqlServer;
                                        }
                                    })
                                };

                                uploadSyncProject(projectId, updatedProject)
                                return updatedProject;
                            } else {
                                return project;
                            }
                        })
                    };
                    return updatedState;
                })
            }
        }
        )
    );
};
const uploadSyncProject = (projectId: string, updatedProject: ProjectViewModel) => {
    apiService.put(`projects/${projectId}`, updatedProject);
}


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