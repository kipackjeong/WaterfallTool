import { Box, Flex, Icon, IconButton, Text, useColorMode, Tooltip, Divider, Spinner, VStack, Button, useToast } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { ElementType, useCallback, useEffect, useState, useRef } from "react";

// Custom components
import ExpandableList from "../../lib/ui/ExpandableList";
import DatabaseConnectionForm from "./DatabaseConnectionForm";
import { DarkModeSwitch } from "./DarkModeSwitch";

// Icons
import { IoClose, IoRefresh } from "react-icons/io5";
import { GoDatabase, GoServer } from "react-icons/go";
import { HiOutlineArrowTurnDownRight } from "react-icons/hi2";
import { FaPlus, FaChevronLeft, FaChevronRight, FaTable, FaSignOutAlt, FaProjectDiagram, FaFolderOpen } from "react-icons/fa";
import { MdDashboard } from "react-icons/md";

// State management
import { useProjectStore } from "../../lib/states/projectsState";
import { useInstanceStore } from "../../lib/states/instanceState";
import { useAuth } from "../../lib/contexts/authContext";

// Utils
import _ from 'lodash';

// Create a motion-enabled Box
const MotionBox = motion(Box);

// Constants
const POLLING_INTERVAL = 30000; // Poll every 30 seconds
const DEFAULT_SIDEBAR_WIDTH = 280; // Default width when open

const Sidebar = () => {
    // State management hooks
    const { projectsArrState, initProjects, deleteTable } = useProjectStore(state => state);
    const { setInstance, instanceState } = useInstanceStore(state => state);
    const { logout, user } = useAuth();
    const { colorMode } = useColorMode();
    const toast = useToast();

    // UI state
    const [isOpen, setIsOpen] = useState(true);
    const [showDatabaseForm, setShowDatabaseForm] = useState(false);
    const [expandedDatabases, setExpandedDatabases] = useState({});
    const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
    const [isResizing, setIsResizing] = useState(false);

    // Data loading state
    const [isLoading, setIsLoading] = useState(true);
    const [isPolling, setIsPolling] = useState(false);
    const [error, setError] = useState(null);

    // Refs
    const pollingIntervalRef = useRef(null);
    const pollingTimeoutRef = useRef(null);

    // Theme variables
    const sideBarBGColor = colorMode === 'light' ? 'gray.800' : 'gray.700';
    const iconColor = 'white';

    // Sidebar resizing handlers
    const startResizing = useCallback((e) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback((e) => {
        if (isResizing && isOpen) {
            const newWidth = e.clientX;
            // Set min and max constraints
            if (newWidth >= 150 && newWidth <= 500) {
                setSidebarWidth(newWidth);
            }
        }
    }, [isResizing, isOpen]);

    // Add event listeners for mouse movements
    useEffect(() => {
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResizing);
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [resize, stopResizing]);
    // Commented test code - preserved for reference
    // useEffect(() => {
    //     // API client tests
    // }, [])
    // Data fetching functions
    const fetchProjects = useCallback(async (isPollingRequest = false) => {
        if (!user) return;

        // Set appropriate loading state
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

            // Only show toast for manual refreshes
            if (!isPollingRequest) {
                toast({
                    title: 'Error loading projects',
                    description: err.message || 'Failed to load projects',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            }
        } finally {
            // Reset loading state
            if (!isPollingRequest) {
                setIsLoading(false);
            } else {
                setIsPolling(false);
            }
        }
    }, [user, initProjects, toast]);

    // Polling management
    const startPolling = useCallback(() => {
        // Clear any existing intervals
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
        }

        // Set up new polling interval
        pollingIntervalRef.current = setInterval(() => {
            fetchProjects(true); // true indicates this is a background polling request
        }, POLLING_INTERVAL);
    }, [fetchProjects]);

    // Manual refresh function
    const handleRefresh = useCallback(() => {
        fetchProjects(false); // false indicates this is a manual refresh
    }, [fetchProjects]);

    // Effects

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

    // Initialize expanded databases state
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

    // Event handlers
    const onTableClick = useCallback((sqlServerInfo, databaseInfo, tableInfo) => {
        setInstance(user, {
            isRemote: sqlServerInfo.isRemote,
            server: sqlServerInfo.name,
            database: databaseInfo.name,
            table: tableInfo.name,
            sqlConfig: sqlServerInfo.sqlConfig
        });
    }, [user, instanceState, setInstance]);

    const toggleDatabase = useCallback((databaseName) => {
        setExpandedDatabases((prevState) => ({
            ...prevState,
            [databaseName]: !prevState[databaseName],
        }));
    }, []);

    const navigateToDashboard = useCallback(() => {
        // Clear the instance state to show the dashboard
        setInstance(user, null);
    }, [user, setInstance]);
    return (
        <>
            <DatabaseConnectionForm isOpen={showDatabaseForm} onSuccess={() => fetchProjects(false)} />
            <MotionBox
                position="relative"
                bg={sideBarBGColor}
                color="white"
                boxShadow="md"
                height="100vh"
                initial={{ width: "32px" }} // Initial width when closed
                animate={{ width: isOpen ? sidebarWidth : "32px" }} // Animate width based on isOpen and sidebarWidth
                gap={2}
                transition={{ duration: isResizing ? 0 : 0.5 }} // No transition when resizing
                overflow="hidden" // Hide overflow to prevent content from showing when collapsed
                style={{ cursor: isResizing ? 'ew-resize' : 'default' }}
            >
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
                <Box height="40px" />
                <Box>
                    <Button
                        leftIcon={<Icon as={MdDashboard as ElementType} />}
                        variant="ghost"
                        color="white"
                        justifyContent="flex-start"
                        sx={{
                            padding: '4px 8px',
                            height: "30px"
                        }}
                        _hover={{ color: 'blue.400' }}
                        onClick={navigateToDashboard}
                    >
                        Dashboard
                    </Button>
                </Box>
                <Flex w="100%" position="relative" gap={4} alignItems="center">
                    <Box>
                        <Button
                            leftIcon={<Icon as={FaProjectDiagram as ElementType} />}
                            variant="ghost"
                            color="white"
                            justifyContent="flex-start"
                            sx={{
                                padding: '4px 8px',
                                height: "30px",
                                pointerEvents: "none"
                            }}
                        >
                            Projects
                        </Button>
                    </Box>
                    {/* Plus Button */}
                    <Flex position="absolute" direction={isOpen ? 'row' : 'column'} alignItems="center" justifyContent={"flex-end"} height="100%" width="100%" top={isOpen ? 0 : 12} right={0} gap={2}>
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
                </Flex>

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
                            <Flex width="100%" direction="column">
                                {projectsArrState.length === 0 ? (
                                    <VStack py={8} spacing={4}>
                                        <Text color="gray.400">No projects found</Text>
                                        <Text fontSize="sm" color="gray.500">
                                            Click the + icon to add a database connection
                                        </Text>
                                    </VStack>
                                ) : (
                                    projectsArrState.map((project, index) => (
                                        <ExpandableList
                                            key={index}
                                            title={project?.name}
                                            titleIcon={FaFolderOpen as ElementType}
                                            items={project?.sqlServers?.map((sqlServerInfo, index) => (
                                                <ServerItem
                                                    key={index}
                                                    project={project}
                                                    sqlServerInfo={sqlServerInfo}
                                                    toggleDatabase={toggleDatabase}
                                                    expandedDatabases={expandedDatabases}
                                                    onTableClick={onTableClick}
                                                />
                                            ))}
                                            initialExpanded={true}
                                            hoverColor="blue.400"
                                            containerProps={{ padding: "8px 8px" }}
                                        />
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

// Sub-components
const ServerItem = ({ project, sqlServerInfo, toggleDatabase, expandedDatabases, onTableClick }) => {
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
                    onTableClick={onTableClick}
                />
            ))}
            initialExpanded={true}
            hoverColor="blue.400"
        />
    );
};

const DatabaseItem = ({ project, databaseInfo, sqlServerInfo, toggleDatabase, expandedDatabases, onTableClick }) => {
    const { deleteTable } = useProjectStore(state => state);
    const { user } = useAuth();

    // Create table items for the expandable list
    const tableItems = databaseInfo.tables.map((tableInfo, index) => (
        <Button
            variant="ghost"
            color="white"
            key={index}
            sx={{
                padding: 0,
                height: '24px',
                justifyContent: "flex-start",
                alignItems: "center",
                cursor: "pointer",
                position: "relative",
                _hover: {
                    color: "blue.400",
                    ".delete-icon": {
                        display: "flex"
                    }
                },
            }}
            leftIcon={<Flex gap={2} alignItems="center"><Icon as={HiOutlineArrowTurnDownRight as ElementType} /><Icon as={FaTable as ElementType} /></Flex>}
            onClick={() => {
                if (!user) return;
                onTableClick(sqlServerInfo, databaseInfo, tableInfo)
            }}
        >
            <Flex gap={2} alignItems="center" onClick={() => {
                if (!user) return;
                onTableClick(sqlServerInfo, databaseInfo, tableInfo)
            }}>
                <Text width="fit-content" overflow="hidden" textAlign="left" textOverflow="ellipsis" whiteSpace="nowrap">{tableInfo.name}</Text>
                <IconButton
                    aria-label="Delete table"
                    icon={<Icon as={IoClose as ElementType} fontSize="sm" />}
                    size="sm"
                    variant="ghost"
                    colorScheme="orange"
                    className="delete-icon"
                    sx={{
                        background: 'transparent',
                        display: "none",
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

        </Button>
    ));

    return (
        <ExpandableList
            title={databaseInfo.name}
            titleIcon={GoDatabase as ElementType}
            items={tableItems}
            initialExpanded={expandedDatabases[databaseInfo.name] || true}
            onToggle={(expanded) => toggleDatabase(databaseInfo.name)}
            hoverColor="blue.400"
            deleteConfirmMessage={`Are you sure you want to delete database ${databaseInfo.name}?`}
        />
    );

};