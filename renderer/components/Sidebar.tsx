import { Box, Flex, Icon, IconButton, Text, useColorMode, Button, Tooltip, Divider } from "@chakra-ui/react";
import { motion } from "framer-motion";
import ExpandableList from "./common/ExpandableList";
import { IoClose } from "react-icons/io5";
import { ElementType, useCallback, useEffect, useState } from "react";
import { GoDatabase, GoServer } from "react-icons/go";
import { HiOutlineArrowTurnDownRight } from "react-icons/hi2";
import { useProjectStore } from "../lib/states/projects.provider";
import DatabaseConnectionForm from "./DatabaseConnectionForm";
import { useInstanceStore } from "../lib/states/instance.provider";
import { DarkModeSwitch } from "./DarkModeSwitch";
import { FaPlus, FaChevronLeft, FaChevronRight, FaTable, FaSignOutAlt } from "react-icons/fa";
import { useAuth } from "../lib/contexts/authContext";

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
        // apiService.get(`users/${123}`).then(data => {
        //     console.log(data);
        // })
        // apiService.post(`users`, { email: 'kipackjeong@mail.com', name: 'Kipack Jeong' }).then(data => {
        //     console.log(data);
        // })
        // apiService.put(`users/${123}`, { name: 'John Doe' }).then(data => {
        //     console.log(data);
        // })
        // apiService.delete(`users/${123}`).then(data => {
        //     console.log(data);
        // })
    }, [])
    useEffect(() => {
        if (!user) return;
        initProjects(user);
    }, [user]);

    useEffect(() => {
        const initializeExpandedDatabases = () => {
            const initialExpanded = {};
            projectsArrState.forEach(project => {
                project.sqlServerViewModels.forEach(sqlServerInfo => {
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
            <DatabaseConnectionForm isOpen={showDatabaseForm} />
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
                <Box w="100%" h="50px">
                    {/* Plus Button */}
                    <IconButton
                        style={{ position: "absolute", top: isOpen ? "8px" : "32px", left: "0px" }}
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
                        <Flex direction="column">
                            {projectsArrState.map((project, index) => (
                                <Flex direction="column" padding="8px 8px">
                                    <Text>{project?.name}</Text>
                                    <Flex gap={3} key={index}>
                                        {project?.sqlServerViewModels.map((sqlServerInfo, index) => (
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

                            ))}
                        </Flex>
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
    const { deleteDatabase, deleteTable } = useProjectStore(state => state)
    
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
                    table: tableInfo.name
                })
            }}
        >
            <Flex gap={2} alignItems="center">
                <Icon as={HiOutlineArrowTurnDownRight as ElementType} />
                <Icon as={FaTable as ElementType} />
                <Text>{tableInfo.name}</Text>
            </Flex>
            
            <IconButton
                aria-label="Delete table"
                icon={<Icon as={IoClose as ElementType} fontSize="sm" />}
                size="sm"
                variant="ghost"
                colorScheme="orange"
                className="delete-icon"
                sx={{
                    position: 'absolute',
                    right: '0px',
                    background: 'transparent',
                    display: "none",
                    minWidth: "auto",
                    height: "auto",
                    padding: "4px",
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
    ));
    
    return (
        <ExpandableList
            title={databaseTitle}
            items={tableItems}
            initialExpanded={expandedDatabases[databaseInfo.name] || false}
            onToggle={(expanded) => toggleDatabase(databaseInfo.name)}
            showChevron={false}
            hoverColor="blue.400"
            containerProps={{
                paddingLeft: "4px"
            }}
            onDelete={() => {
                deleteDatabase(project.id, sqlServerInfo.name, databaseInfo.name);
            }}
            deleteConfirmMessage={`Are you sure you want to delete database ${databaseInfo.name}?`}
        />
    );

};