import { Box, Flex, Icon, IconButton, Text, useColorMode, Button, Tooltip } from "@chakra-ui/react";
import { color, motion } from "framer-motion";
import { IoClose } from "react-icons/io5";
import { ElementType, useEffect, useState } from "react";
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
                animate={{ width: isOpen ? 250 : "32px" }} // Animate width based on isOpen
                transition={{ duration: 0.5 }} // Duration of the animation
                overflow="hidden" // Hide overflow to prevent content from showing when collapsed
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
                        <Box borderBottom="1px solid" borderColor={iconColor} width="100%" mb={2} />
                        <Flex direction="column">
                            {projectsArrState.map((project, index) => (
                                <Flex gap={3} padding="8px 8px" key={index}>
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
                            ))}
                        </Flex>
                    </>
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
    const [expanded, setExpanded] = useState(true);

    const toggleServer = () => {
        setExpanded(!expanded);
    };

    return (
        <Flex direction="column" width={'100%'}>
            <Flex
                sx={{
                    position: 'relative',
                    justifyContent: "start",
                    alignItems: "center",
                    gap: 2,
                    cursor: "pointer",
                    _hover: {
                        color: "blue.400"
                    }
                }}
                onClick={toggleServer}
            >
                <Icon as={GoServer as ElementType} />
                <Text>{sqlServerInfo.name}</Text>
            </Flex>
            {expanded && (
                sqlServerInfo.databases.map((databaseInfo, index) => (
                    <DatabaseItem
                        key={index}
                        databaseInfo={databaseInfo}
                        project={project}
                        sqlServerInfo={sqlServerInfo}
                        toggleDatabase={toggleDatabase}
                        expandedDatabases={expandedDatabases}
                        setInstanceViewState={setInstanceViewState}
                    />
                ))
            )}
        </Flex>
    );
};

const DatabaseItem = ({ project, databaseInfo, sqlServerInfo, toggleDatabase, expandedDatabases, setInstanceViewState }) => {
    const { deleteDatabase } = useProjectStore(state => state)
    return (
        <>
            <Flex
                sx={{
                    width: '100%',
                    justifyContent: "start",
                    padding: "0 4px 0px 8px",
                }}
            >
                <Flex
                    sx={{
                        width: '100%',
                        gap: 2,
                        cursor: "pointer",
                        alignItems: "center",
                        justifyContent: "space-between",
                        _hover: {
                            color: "blue.400",
                            ".delete-icon": {
                                display: "flex"
                            }
                        }
                    }}
                >
                    <Flex
                        sx={{
                            width: '100%',
                            gap: 2,
                            alignItems: "center",
                        }}
                        onClick={() => toggleDatabase(databaseInfo.name)}
                    >
                        <Icon as={HiOutlineArrowTurnDownRight as ElementType} />
                        <Icon as={GoDatabase as ElementType} />
                        <Text>{databaseInfo.name}</Text>
                    </Flex>

                    <IconButton
                        aria-label="Delete database"
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
                            if (window.confirm(`Are you sure you want to delete database ${databaseInfo.name}?`)) {
                                // Get the project id, server name, and database name
                                // and call deleteDatabase
                                const projectId = project.id;
                                const serverName = sqlServerInfo.name;
                                console.log('projectId:', projectId)
                                deleteDatabase(projectId, serverName, databaseInfo.name);
                            }
                        }}
                    />
                </Flex>

            </Flex >
            {
                expandedDatabases[databaseInfo.name] && (
                    databaseInfo.tables.map((tableInfo, index) => (
                        <Flex
                            key={index}
                            sx={{
                                flex: 1,
                                justifyContent: "start",
                                alignItems: "center",
                                padding: "0 32px",
                                gap: 2,
                                cursor: "pointer",
                                _hover: {
                                    color: "blue.400"
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
                            <Icon as={HiOutlineArrowTurnDownRight as ElementType} />
                            <Icon as={FaTable as ElementType} />
                            <Text>{tableInfo.name}</Text>
                        </Flex>
                    ))
                )
            }
        </>
    );
};