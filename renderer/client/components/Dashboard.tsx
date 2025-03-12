'use client';

import React, { useState, useEffect } from 'react';
import {
    Box,
    Flex,
    Grid,
    Heading,
    Text,
    Button,
    useColorMode,
    Card,
    CardHeader,
    CardBody,
    CardFooter,
    SimpleGrid,
    Stat,
    StatLabel,
    StatNumber,
    StatHelpText,
    Icon,
    Divider,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Badge,
    useToast
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { FaDatabase, FaServer, FaTable, FaChartLine, FaHistory, FaPlus } from 'react-icons/fa';
import { useProjectStore } from '../../lib/states/projectsState';
import { useInstanceStore } from '../../lib/states/instanceState';
import { useAuth } from '../../lib/contexts/authContext';
import { toDollar } from '../../lib/utils/numericHelper';
import { getTableBorderColor } from '../../lib/themes/theme';
import LoadingSpinner from '../common/LoadingSpinner';
import _ from 'lodash';

const MotionBox = motion(Box);

const Dashboard: React.FC = () => {
    const { projectsArrState } = useProjectStore(state => state);
    const { setInstance } = useInstanceStore(state => state);
    const { user } = useAuth();
    const { colorMode } = useColorMode();
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [recentInstances, setRecentInstances] = useState([]);
    const tableBorderColor = getTableBorderColor(colorMode, 0.6);

    // Stats for the dashboard
    const stats = {
        servers: projectsArrState?.length || 0,
        databases: projectsArrState?.reduce((acc, project) => acc + (project.sqlServers?.reduce((sAcc, server) => sAcc + (server.databases?.length || 0), 0) || 0), 0) || 0,
        tables: projectsArrState?.reduce((acc, project) =>
            acc + (project.sqlServers?.reduce((sAcc, server) =>
                sAcc + (server.databases?.reduce((dAcc, db) => dAcc + (db.tables?.length || 0), 0) || 0), 0) || 0), 0) || 0,
        recentAnalyses: recentInstances.length
    };

    // Load recent instances from sessionStorage
    useEffect(() => {
        try {
            const allStorageKeys = Object.keys(sessionStorage);
            const instanceKeys = allStorageKeys.filter(key => key.startsWith('instance_state_'));

            const recent = instanceKeys.map(key => {
                const data = JSON.parse(sessionStorage.getItem(key));
                
                // Correctly parse the storage key to get the actual server, database, and table names
                // The format is 'instance_state_<server>_<database>_<table>'
                const keyParts = key.split('_').slice(2);
                
                // Get the actual values from the stored instance state
                const actualServer = data.server || keyParts[0];
                const actualDatabase = data.database || keyParts[1];
                const actualTable = data.table || keyParts[2];
                
                return {
                    server: actualServer,
                    database: actualDatabase,
                    table: actualTable,
                    timestamp: data.timestamp || new Date().toISOString(),
                    totalChargeAmount: data.numericTableData?.find(item => item.field === 'Charge Amount')?.total || 0,
                    totalPaymentAmount: data.numericTableData?.find(item => item.field === 'Payment Amount')?.total || 0
                };
            })
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 5);

            setRecentInstances(recent);
        } catch (err) {
            console.error('Error loading recent instances:', err);
        }
    }, []);

    const handleInstanceClick = async (server, database, table) => {
        setLoading(true);
        try {
            // Find the instance in the project state
            let serverObj, dbObj, tableObj;

            // Loop through projects to find the server
            for (const project of projectsArrState) {
                const foundServer = project.sqlServers.find(s => s.name === server);
                if (foundServer) {
                    serverObj = foundServer;
                    break;
                }
            }

            if (!serverObj) throw new Error('Server not found');

            dbObj = serverObj.databases.find(d => d.name === database);
            if (!dbObj) throw new Error('Database not found');

            tableObj = dbObj.tables?.find(t => t.name === table);
            if (!tableObj) throw new Error('Table not found');

            // Set the instance
            await setInstance(user, {
                server: server,
                database: database,
                table: table
            });

            toast({
                title: 'Instance loaded',
                description: `Loaded ${table} from ${database} on ${server}`,
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        } catch (err) {
            console.error('Error loading instance:', err);
            toast({
                title: 'Error',
                description: 'Failed to load instance',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <Flex direction="column" p={6} width="100%" maxWidth="1400px" mx="auto">
            <MotionBox
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                mb={8}
            >
                <Heading size="xl" mb={2}>Welcome to Waterfall Tool</Heading>
                <Text color={colorMode === 'light' ? 'gray.600' : 'gray.300'}>
                    Your dashboard for waterfall cohort analysis and data management
                </Text>
            </MotionBox>

            {/* Stats Cards */}
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
                <StatCard
                    icon={FaServer}
                    title="Servers"
                    value={stats.servers}
                    colorScheme="blue"
                />
                <StatCard
                    icon={FaDatabase}
                    title="Databases"
                    value={stats.databases}
                    colorScheme="teal"
                />
                <StatCard
                    icon={FaTable}
                    title="Tables"
                    value={stats.tables}
                    colorScheme="purple"
                />
                <StatCard
                    icon={FaHistory}
                    title="Recent Analyses"
                    value={stats.recentAnalyses}
                    colorScheme="orange"
                />
            </SimpleGrid>

            {/* Recent Instances */}
            <Card mb={8} variant="outline" borderColor={tableBorderColor}>
                <CardHeader>
                    <Flex justify="space-between" align="center">
                        <Heading size="md">Recent Analyses</Heading>
                        <Button
                            leftIcon={<Icon as={FaPlus as any} />}
                            colorScheme="blue"
                            size="sm"
                            onClick={() => {
                                toast({
                                    title: 'Select from sidebar',
                                    description: 'Please select a table from the sidebar to start a new analysis',
                                    status: 'info',
                                    duration: 3000,
                                    isClosable: true,
                                });
                            }}
                        >
                            New Analysis
                        </Button>
                    </Flex>
                </CardHeader>
                <CardBody>
                    {recentInstances.length > 0 ? (
                        <Table variant="simple" size="sm">
                            <Thead>
                                <Tr>
                                    <Th>Server</Th>
                                    <Th>Database</Th>
                                    <Th>Table</Th>
                                    <Th>Total Charge</Th>
                                    <Th>Total Payment</Th>
                                    <Th>Actions</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {recentInstances.map((instance, index) => (
                                    <Tr key={index}>
                                        <Td>{instance.server}</Td>
                                        <Td>{instance.database}</Td>
                                        <Td>{instance.table}</Td>
                                        <Td>{toDollar(instance.totalChargeAmount)}</Td>
                                        <Td>{toDollar(instance.totalPaymentAmount)}</Td>
                                        <Td>
                                            <Button
                                                size="xs"
                                                colorScheme="blue"
                                                onClick={() => handleInstanceClick(instance.server, instance.database, instance.table)}
                                            >
                                                Open
                                            </Button>
                                        </Td>
                                    </Tr>
                                ))}
                            </Tbody>
                        </Table>
                    ) : (
                        <Flex justify="center" align="center" height="150px" direction="column">
                            <Text mb={4}>No recent analyses found</Text>
                            <Text fontSize="sm" color="gray.500">
                                Select a table from the sidebar to start your first analysis
                            </Text>
                        </Flex>
                    )}
                </CardBody>
            </Card>

            {/* Quick Start Guide */}
            <Card variant="outline" borderColor={tableBorderColor}>
                <CardHeader>
                    <Heading size="md">Quick Start Guide</Heading>
                </CardHeader>
                <CardBody>
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                        <GuideCard
                            step={1}
                            title="Connect to Database"
                            description="Select a server, database, and table from the sidebar"
                            icon={FaDatabase}
                        />
                        <GuideCard
                            step={2}
                            title="Configure Mappings"
                            description="Set up waterfall cohorts and mapping groups"
                            icon={FaTable}
                        />
                        <GuideCard
                            step={3}
                            title="Run Analysis"
                            description="Generate waterfall reports and export data"
                            icon={FaChartLine}
                        />
                    </SimpleGrid>
                </CardBody>
            </Card>
        </Flex>
    );
};

// Stat Card Component
const StatCard = ({ icon, title, value, colorScheme }) => {
    const { colorMode } = useColorMode();
    const bgColor = colorMode === 'light' ? `${colorScheme}.50` : `${colorScheme}.900`;
    const borderColor = colorMode === 'light' ? `${colorScheme}.200` : `${colorScheme}.700`;
    const iconColor = `${colorScheme}.500`;

    return (
        <Card borderColor={borderColor} borderWidth="1px" bg={bgColor}>
            <CardBody>
                <Flex justify="space-between" align="center">
                    <Stat>
                        <StatLabel>{title}</StatLabel>
                        <StatNumber fontSize="3xl">{value}</StatNumber>
                    </Stat>
                    <Box p={2} borderRadius="md" bg={`${colorScheme}.100`}>
                        <Icon as={icon} boxSize={8} color={iconColor} />
                    </Box>
                </Flex>
            </CardBody>
        </Card>
    );
};

// Guide Card Component
const GuideCard = ({ step, title, description, icon }) => {
    const { colorMode } = useColorMode();
    const bgColor = colorMode === 'light' ? 'white' : 'gray.700';

    return (
        <Card bg={bgColor} shadow="md">
            <CardBody>
                <Flex mb={4} align="center">
                    <Box
                        bg="blue.500"
                        color="white"
                        borderRadius="full"
                        w={8}
                        h={8}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        mr={3}
                    >
                        {step}
                    </Box>
                    <Heading size="md">{title}</Heading>
                </Flex>
                <Flex mb={4} align="center" justify="center">
                    <Icon as={icon} boxSize={12} color="blue.500" />
                </Flex>
                <Text>{description}</Text>
            </CardBody>
        </Card>
    );
};

export default Dashboard;