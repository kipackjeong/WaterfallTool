import { Box, Flex, Icon, IconButton, Text, useColorMode, Tooltip, Divider, Spinner, VStack, Button, useToast } from "@chakra-ui/react";
import { motion } from "framer-motion";
import ExpandableList from "../../lib/ui/ExpandableList";
import { IoClose, IoRefresh } from "react-icons/io5";
import { ElementType, useCallback, useEffect, useState, useRef } from "react";
import { GoDatabase, GoServer } from "react-icons/go";
import { HiOutlineArrowTurnDownRight } from "react-icons/hi2";
import { useProjectStore } from "../../lib/states/projectsState";
import DatabaseConnectionForm from "./DatabaseConnectionForm";
import { useInstanceStore } from "../../lib/states/instanceState";
import { DarkModeSwitch } from "./DarkModeSwitch";
import { FaPlus, FaChevronLeft, FaChevronRight, FaTable, FaSignOutAlt } from "react-icons/fa";
import { useAuth } from "../../lib/contexts/authContext";

const MotionBox = motion(Box); // Create a motion-enabled Box

const Sidebar = () => {
    const { projectsArrState, initProjects } = useProjectStore(state => state);
    const { setInstanceViewState } = useInstanceStore(state => state);
    const [isOpen, setIsOpen] = useState(true);
    const [showDatabaseForm, setShowDatabaseForm] = useState(false);
    const { colorMode } = useColorMode();
    const { logout, user } = useAuth();
    const sideBarBGColor = colorMode === 'light' ? 'gray.800' : 'gray.700';
    const iconColor = 'white';
    const [expandedDatabases, setExpandedDatabases] = useState({});
    const [sidebarWidth, setSidebarWidth] = useState(250); // Default width when open
    const [isResizing, setIsResizing] = useState(false);

    // Loading and polling states
    const [isLoading, setIsLoading] = useState(true);
    const [isPolling, setIsPolling] = useState(false);
    const [error, setError] = useState(null);
    const pollingIntervalRef = useRef(null);
    const pollingTimeoutRef = useRef(null);
    const toast = useToast();
    const POLLING_INTERVAL = 30000; // Poll every 30 seconds

    // Handle resize start
    const startResizing = useCallback((e) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    // Handle resize end
    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    // Handle resize
    const resize = useCallback(
        (e) => {
            if (isResizing && isOpen) {
                const newWidth = e.clientX;
                // Set min and max constraints
                if (newWidth >= 150 && newWidth <= 500) {
                    setSidebarWidth(newWidth);
                }
            }
        },
        [isResizing, isOpen]
    );

    // Add event listeners for mouse movements
    useEffect(() => {
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResizing);
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [resize, stopResizing]);
    // TEST SPOT 
    useEffect(() => {
        // apiClient.get(`users/${123}`).then(response => {
        //     console.log(response.data.data);
        // })
        // apiClient.post(`users`, { email: 'kipackjeong@mail.com', name: 'Kipack Jeong' }).then(response => {
        //     console.log(response.data.data);
        // })
        // apiClient.put(`users/${123}`, { name: 'John Doe' }).then(response => {
        //     console.log(response.data.data);
        // })
        // apiClient.delete(`users/${123}`).then(response => {
        //     console.log(response.data.data);
        // })
    }, [])
    // Function to fetch projects with loading states
    const fetchProjects = useCallback(async (isPollingRequest = false) => {
        if (!user) return;

        if (!isPollingRequest) {
            setIsLoading(true);
        } else {
            setIsPolling(true);
        }

        setError(null);

        try {
            await initProjects(user);
        } catch (err) {
            console.error('Error fetching projects:', err);
            setError(err.message || 'Failed to load projects');
            if (!isPollingRequest) { // Only show toast for manual refreshes
                toast({
                    title: 'Error loading projects',
                    description: err.message || 'Failed to load projects',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            }
        } finally {
            if (!isPollingRequest) {
                setIsLoading(false);
            } else {
                setIsPolling(false);
            }
        }
    }, [user]);

    // Function to start polling
    const startPolling = useCallback(() => {
        // Clear any existing intervals
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
        }

        // Set up new polling interval
        pollingIntervalRef.current = setInterval(() => {
            fetchProjects(true); // true indicates this is a background polling request
        }, POLLING_INTERVAL);
    }, [fetchProjects, POLLING_INTERVAL]);

    // Manual refresh function
    const handleRefresh = useCallback(() => {
        fetchProjects(false); // false indicates this is a manual refresh
    }, [fetchProjects]);

    // Initial fetch and polling setup
    useEffect(() => {
        if (!user) return;

        // Initial fetch
        fetchProjects(false);

        // Start polling
        startPolling();

        // Cleanup function
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
            if (pollingTimeoutRef.current) {
                clearTimeout(pollingTimeoutRef.current);
            }
        };
    }, [user, fetchProjects, startPolling]);

    useEffect(() => {
        if (!projectsArrState) return;
        const initializeExpandedDatabases = () => {
            const initialExpanded = {};
            projectsArrState.forEach(project => {
                project.sqlServers?.forEach(sqlServerInfo => {
                    sqlServerInfo.databases.forEach(databaseInfo => {
                        initialExpanded[databaseInfo.name] = true;
                    });
                });
            });
            setExpandedDatabases(initialExpanded);
        };

        if (projectsArrState.length > 0) {
            initializeExpandedDatabases();
        }
    }, [projectsArrState]);

    const toggleDatabase = (databaseName) => {
        setExpandedDatabases((prevState) => ({
            ...prevState,
            [databaseName]: !prevState[databaseName],
        }));
    };
    return (
        <>
            <DatabaseConnectionForm isOpen={showDatabaseForm} onSuccess={() => fetchProjects(false)} />
            <MotionBox
                position="relative"
                height="100vh"
                bg={sideBarBGColor}
                color="white"
                boxShadow="md"
                initial={{ width: "32px" }} // Initial width when closed
                animate={{ width: isOpen ? sidebarWidth : "32px" }} // Animate width based on isOpen and sidebarWidth
                transition={{ duration: isResizing ? 0 : 0.5 }} // No transition when resizing
                overflow="hidden" // Hide overflow to prevent content from showing when collapsed
                style={{ cursor: isResizing ? 'ew-resize' : 'default' }}
            >
                <Box w="100%" h="50px" position="relative">
                    {/* Plus Button */}
                    <Flex position="absolute" direction={isOpen ? 'row' : 'column'} alignItems="center" height="100%" width="100%" top={isOpen ? 0 : 10} left={0}>
                        <IconButton
                            size="sm"
                            margin={0}
                            padding={0}
                            variant="ghost"
                            onClick={() => {
                                setShowDatabaseForm(!showDatabaseForm)
                            }}
                            width="16px"
                            color={iconColor}
                            _hover={{
                                bg: 'transparent',
                                color: 'blue.400',
                            }}
                            aria-label={'Add Database Connection'}
                        >
                            <Icon as={FaPlus as ElementType} sx={{ width: "16px", height: "16px" }} />
                        </IconButton>
                        <Tooltip label="Refresh projects">
                            <IconButton
                                aria-label="Refresh projects"
                                icon={<Icon as={IoRefresh as ElementType} sx={{ width: "16px", height: "16px" }} />}
                                width="16px"
                                color={iconColor}
                                variant="ghost"
                                onClick={handleRefresh}
                                isLoading={isLoading && !isPolling}
                                _hover={{ color: "blue.400" }}
                            />
                        </Tooltip>
                    </Flex>

                    {/* Collapse Button */}
                    <IconButton
                        style={{ position: "absolute", top: "8px", right: "0px" }}
                        size="sm"
                        margin={0}
                        padding={0}
                        width="16px"
                        variant="ghost"
                        onClick={() => setIsOpen(!isOpen)}
                        aria-label={isOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
                        color={iconColor}
                        _hover={{
                            bg: 'transparent',
                            color: 'blue.400',
                        }}
                    >
                        {isOpen ? <Icon as={FaChevronLeft as ElementType} sx={{ width: "16px", height: "16px" }} /> : <Icon as={FaChevronRight as ElementType} sx={{ width: "16px", height: "16px" }} />}
                    </IconButton>
                </Box>

                {isOpen && (
                    <>
                        <Divider orientation="horizontal" color={iconColor} />
                        {/* Loading state */}
                        {isLoading && (
                            <VStack py={8} spacing={4}>
                                <Spinner color="blue.400" size="lg" />
                                <Text>Loading projects...</Text>
                            </VStack>
                        )}

                        {/* Error state */}
                        {error && !isLoading && (
                            <VStack py={8} spacing={4}>
                                <Text color="red.400">Error loading projects</Text>
                                <Text fontSize="sm" color="gray.400">{error}</Text>
                                <Button size="sm" onClick={handleRefresh} leftIcon={<Icon as={IoRefresh as ElementType} />}>
                                    Retry
                                </Button>
                            </VStack>
                        )}

                        {/* Projects list */}
                        {!isLoading && !error && (
                            <Flex direction="column">
                                {projectsArrState.length === 0 ? (
                                    <VStack py={8} spacing={4}>
                                        <Text color="gray.400">No projects found</Text>
                                        <Text fontSize="sm" color="gray.500">
                                            Click the + icon to add a database connection
                                        </Text>
                                    </VStack>
                                ) : (
                                    projectsArrState.map((project, index) => (
                                        <Flex key={index} direction="column" padding="8px 8px">
                                            <Text>{project?.name}</Text>
                                            <Flex gap={3} direction="column" key={index}>
                                                {project?.sqlServers?.map((sqlServerInfo, index) => (
                                                    <ServerItem
                                                        key={index}
                                                        project={project}
                                                        sqlServerInfo={sqlServerInfo}
                                                        toggleDatabase={toggleDatabase}
                                                        expandedDatabases={expandedDatabases}
                                                        setInstanceViewState={setInstanceViewState}
                                                    />
                                                ))}
                                            </Flex>
                                        </Flex>
                                    ))
                                )}

                                {/* Polling indicator */}
                                {isPolling && (
                                    <Flex justify="center" py={2}>
                                        <Spinner size="xs" color="blue.300" />
                                    </Flex>
                                )}
                            </Flex>
                        )}
                    </>
                )}
                {/* Resize Handle */}
                {isOpen && (
                    <Box
                        position="absolute"
                        top={0}
                        right={0}
                        width="4px"
                        height="100%"
                        bg="transparent"
                        cursor="ew-resize"
                        zIndex={10}
                        _hover={{ bg: "blue.400" }}
                        onMouseDown={startResizing}
                    />
                )}
                <Box as="div" bottom={4} left={0} right={0} position="absolute">
                    {isOpen && user && (
                        <Flex px={4} py={2} alignItems="center" justifyContent="space-between">
                            <Text fontSize="sm" color="gray.300" isTruncated>
                                {user.email}
                            </Text>
                            <Tooltip label="Logout">
                                <IconButton
                                    aria-label="Logout"
                                    icon={<Icon as={FaSignOutAlt as ElementType} />}
                                    size="sm"
                                    variant="ghost"
                                    colorScheme="red"
                                    onClick={logout}
                                />
                            </Tooltip>
                        </Flex>
                    )}
                    <Flex px={4} py={2} alignItems="center" justifyContent="space-between">
                        <DarkModeSwitch />
                        <IconButton
                            aria-label={isOpen ? "Close Sidebar" : "Open Sidebar"}
                            icon={isOpen ? <Icon as={FaChevronLeft as ElementType} /> : <Icon as={FaChevronRight as ElementType} />}
                            onClick={() => setIsOpen(!isOpen)}
                            size="sm"
                            variant="ghost"
                        />
                    </Flex>
                </Box>
            </MotionBox>

        </>

    );
};

export default Sidebar;

const ServerItem = ({ project, sqlServerInfo, toggleDatabase, expandedDatabases, setInstanceViewState }) => {
    return (
        <ExpandableList
            title={sqlServerInfo.name}
            titleIcon={GoServer as ElementType}
            items={sqlServerInfo.databases.map((databaseInfo, index) => (
                <DatabaseItem
                    key={index}
                    databaseInfo={databaseInfo}
                    project={project}
                    sqlServerInfo={sqlServerInfo}
                    toggleDatabase={toggleDatabase}
                    expandedDatabases={expandedDatabases}
                    setInstanceViewState={setInstanceViewState}
                />
            ))}
            initialExpanded={true}
            hoverColor="blue.400"
        />
    );
};

const DatabaseItem = ({ project, databaseInfo, sqlServerInfo, toggleDatabase, expandedDatabases, setInstanceViewState }) => {
    const { deleteTable } = useProjectStore(state => state)

    // Create a custom title with the database icon
    const databaseTitle = (
        <Flex gap={2} alignItems="center">
            <Icon as={HiOutlineArrowTurnDownRight as ElementType} />
            <Icon as={GoDatabase as ElementType} />
            <Text>{databaseInfo.name}</Text>
        </Flex>
    );

    // Create table items for the expandable list
    const tableItems = databaseInfo.tables.map((tableInfo, index) => (
        <Flex
            key={index}
            sx={{
                width: '100%',
                justifyContent: "space-between",
                alignItems: "center",
                gap: 2,
                cursor: "pointer",
                position: "relative",
                _hover: {
                    color: "blue.400",
                    ".delete-icon": {
                        display: "flex"
                    }
                }
            }}
            onClick={() => {
                setInstanceViewState({
                    isRemote: sqlServerInfo.isRemote,
                    server: sqlServerInfo.name,
                    database: databaseInfo.name,
                    table: tableInfo.name,
                    sqlConfig: sqlServerInfo.sqlConfig
                })
            }}
        >
            <Flex gap={2} alignItems="center">
                <Icon as={HiOutlineArrowTurnDownRight as ElementType} />
                <Icon as={FaTable as ElementType} />
                <Flex>
                    <Text width="6rem" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">{tableInfo.name}</Text>
                    <IconButton
                        aria-label="Delete table"
                        icon={<Icon as={IoClose as ElementType} fontSize="sm" />}
                        size="sm"
                        variant="ghost"
                        colorScheme="orange"
                        className="delete-icon"
                        sx={{
                            background: 'transparent',
                            // display: "none",
                            minWidth: "auto",
                            height: "auto",
                            _hover: {
                                background: 'transparent',
                            }
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Are you sure you want to delete table ${tableInfo.name}?`)) {
                                deleteTable(project.id, sqlServerInfo.name, databaseInfo.name, tableInfo.name);
                            }
                        }}
                    />
                </Flex>
            </Flex>
        </Flex>
    ));

    return (
        <ExpandableList
            title={databaseTitle}
            items={tableItems}
            initialExpanded={expandedDatabases[databaseInfo.name] || true}
            onToggle={(expanded) => toggleDatabase(databaseInfo.name)}
            showChevron={false}
            hoverColor="blue.400"
            deleteConfirmMessage={`Are you sure you want to delete database ${databaseInfo.name}?`}
        />
    );

};