import { type ReactNode, createContext, useRef, useContext } from 'react'
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla';
import { devtools } from 'zustand/middleware';
import { ProjectViewModel, User } from '../models';
import apiClient from '../api/apiClient';
import * as _ from 'lodash';

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
  upSyncProject: (projectId: string, updatedProject: ProjectViewModel) => void;
  downSyncProject: (projectId: string) => Promise<void>;
};

export type ProjectsStore = ProjectsState & ProjectsActions;

export const createProjectStore = (
  initState: ProjectsState = defaultInitState,
) => {
  return createStore<ProjectsStore>()(
    devtools(
      (set, get) => {
        return {
          ...initState,
          initProjects: async (user: User) => {
            try {
              const res = await apiClient.get('projects', { params: { userId: user.id } });
              const projectsArrState = res.data;
              set(prevState => {
                const newState = _.cloneDeep(prevState);
                newState.projectsArrState = projectsArrState ?? [];
                return newState;
              });
            } catch (error) {
              console.error('Error initializing projects:', error);
            }
          },
          addProject: async (newProject: ProjectViewModel) => {
            const res = await apiClient.post('projects', newProject);
            if (!res) return;
            const createdProject = res.data;
            set((prevState) => {
              const newState = _.cloneDeep(prevState);
              newState.projectsArrState = [...prevState.projectsArrState, createdProject];
              return newState;
            });
            // Sync the complete data from the server
            await get().downSyncProject(createdProject.id);
          },
          deleteProject: (projectId: string) => {
            set((prevState: ProjectsState) => {
              const newState = _.cloneDeep(prevState);
              newState.projectsArrState = prevState.projectsArrState.filter(project => project.id !== projectId);
              apiClient.delete(`projects/${projectId}`).then((res) => {
                console.debug(res.data.data);
              });
              return newState;
            });
          },
          deleteSqlServer: (projectId: string, serverName: string) => {
            set((prevState: ProjectsState) => {
              const newState = _.cloneDeep(prevState);
              newState.projectsArrState = prevState.projectsArrState.map(project => {
                if (project.id === projectId) {
                  const updatedProject = { ...project };
                  updatedProject.sqlServerViewModels = project.sqlServerViewModels.filter(sqlServer => sqlServer.name !== serverName);
                  return updatedProject;
                } else {
                  return project;
                }
              });
              return newState;
            });
          },
          deleteDatabase: (projectId: string, serverName: string, databaseName: string) => {
            set((prevState: ProjectsState) => {
              const newState = _.cloneDeep(prevState);
              newState.projectsArrState = prevState.projectsArrState.map(project => {
                if (project.id === projectId) {
                  const updatedProject = {
                    ..._.cloneDeep(project),
                    sqlServerViewModels: project.sqlServerViewModels.map(sqlServer => {
                      if (sqlServer.name === serverName) {
                        return { ...sqlServer, databases: sqlServer.databases.filter(database => database.name !== databaseName) };
                      } else {
                        return sqlServer;
                      }
                    })
                  };

                  get().upSyncProject(projectId, updatedProject)
                  return updatedProject;
                } else {
                  return project;
                }
              });

              return newState;
            });
          },
          deleteTable: (projectId: string, serverName: string, databaseName: string, tableName: string) => {

            set((prevState: ProjectsState) => {
              // Check if this is the only table in the project
              const projectToCheck = prevState.projectsArrState.find(p => p.id === projectId);
              if (projectToCheck) {
                // Check if we need to remove entire project
                const isOnlyTable = checkIfOnlyTable(projectToCheck, serverName, databaseName, tableName);

                if (isOnlyTable) {
                  // Remove the entire project if this is the only table
                  console.debug(`Removing project ${projectId} as its only table ${tableName} is being deleted`);
                  const newState = _.cloneDeep(prevState);
                  newState.projectsArrState = prevState.projectsArrState.filter(p => p.id !== projectId);
                  // We're not calling upSyncProject here since we're deleting the whole project
                  get().deleteProject(projectId);
                  return newState;
                }
              }

              // Normal behavior - just remove the table
              const newState = _.cloneDeep(prevState);
              newState.projectsArrState = prevState.projectsArrState.map(project => {
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
                          }).filter(database => database.tables.length > 0) // Remove empty databases
                        };
                      } else {
                        return sqlServer;
                      }
                    }).filter(sqlServer => sqlServer.databases.length > 0) // Remove empty servers
                  };

                  get().upSyncProject(projectId, updatedProject)
                  return updatedProject;
                } else {
                  return project;
                }
              });
              return newState;
            })
          },
          upSyncProject: async (projectId: string, updatedProject: ProjectViewModel) => {
            await apiClient.put(`projects/${projectId}`, updatedProject);
          },
          downSyncProject: async (projectId: string): Promise<void> => {
            const res = await apiClient.get(`projects/${projectId}`);
            set((prevState) => {
              const newState = _.cloneDeep(prevState);
              newState.projectsArrState = prevState.projectsArrState.map(project => {
                if (project.id === projectId) {
                  return res.data;
                } else {
                  return project;
                }
              });
              return newState;
            })
          }
        }
      },
      { name: 'Projects Store' }
    )
  );
};

// Helper function to check if this is the only table in the project
const checkIfOnlyTable = (project, serverName, databaseName, tableName) => {
  // Count total tables in the project excluding the one we're deleting
  let tableCount = 0;

  for (const server of project.sqlServerViewModels) {
    for (const database of server.databases) {
      for (const table of database.tables) {
        // Skip counting the table we're about to delete
        if (server.name === serverName && database.name === databaseName && table.name === tableName) {
          continue;
        }
        tableCount++;
      }
    }
  }

  return tableCount === 0; // Return true if this is the only table
};

export type ProjectStoreApi = ReturnType<typeof createProjectStore>

export const ProjectStoreContext = createContext<ProjectStoreApi | undefined>(
  undefined,
)

export interface ProjectStoreProviderProps {
  children: ReactNode
}

export const ProjectStoreProvider = ({
  children,
}: ProjectStoreProviderProps) => {
  const storeRef = useRef<ProjectStoreApi>(null)
  if (!storeRef.current) {
    storeRef.current = createProjectStore()
  }

  return (
    <ProjectStoreContext.Provider value={storeRef.current}>
      {children}
    </ProjectStoreContext.Provider>
  )
}

export const useProjectStore = <T,>(
  selector: (store: ProjectsStore) => T,
): T => {
  const projectStoreContext = useContext(ProjectStoreContext)

  if (!projectStoreContext) {
    throw new Error(`useProjectStore must be used within ProjectStoreProvider`)
  }

  return useStore(projectStoreContext, selector)
}
