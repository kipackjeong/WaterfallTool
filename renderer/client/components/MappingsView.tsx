import React, { ElementType, useEffect, useState, useMemo } from 'react';
import {
    Flex, Icon, IconButton, Tab, Table, TabList, TabPanel, TabPanels, Tabs, Tbody, Td, Text, Th, Thead, Tooltip, Tr, useColorMode, useColorModeValue, useToast, Box
} from '@chakra-ui/react';
import { TriangleDownIcon, TriangleUpIcon } from '@chakra-ui/icons';
import { FaDownload, FaSync, FaUpload } from 'react-icons/fa';
import useExportToExcel from '../../lib/hooks/useExportToExcel';
import { MappingsViewModel } from '../../lib/models';
import WaterfallInput from './WaterfallInput';
import { getHeadTextColor, getTableBorderColor } from '../../lib/themes/theme';
import { toDollar } from '../../lib/utils/numericHelper';
import { useInstanceStore } from '../../lib/states/instanceState';
import { useMappingsStore } from '@/lib/states/mappingsState';
import _ from 'lodash';
import { useAuth } from '@/lib/contexts/authContext';
import LoadingSpinner from '../common/LoadingSpinner';
import { setTimeout } from 'timers';

// Main MappingsView component
const MappingsView: React.FC = () => {
    const { user } = useAuth();
    const { InstanceState } = useInstanceStore(state => state);
    const { mappingsArrState, setMappingsArrState, upsyncMappings, modifyWaterfallGroup } = useMappingsStore(state => state);
    const exportTableToExcel = useExportToExcel();
    const toast = useToast();

    const [_loading, _setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { colorMode } = useColorMode();
    const tabBorderColor = getTableBorderColor(colorMode, 0.5);

    useEffect(() => {
        fetchMappingsViewsState();
    }, [InstanceState]);

    // Data fetching function with error handling
    const fetchMappingsViewsState = async () => {
        setError(null);
        _setLoading(true);
        try {
            await setMappingsArrState(user, InstanceState);
        } catch (error) {
            setError('Failed to fetch mapping views state.');
        }

        setTimeout(() => {
            _setLoading(false);
        }, 2000);

    };

    // Export mapping data to Excel
    const handleExport = (mapping: MappingsViewModel) => {
        const headers = [
            'Waterfall_Group',
            `${mapping.keyword}_Group_Final`,
            `${mapping.keyword}_Group`,
            'Total_Charge_Amount',
            'Total_Payment_Amount',
            'Earliest_Min_DOS',
            'Latest_Max_DOS'
        ];

        const data = mapping.data.map(row => ({
            Waterfall_Group: row.Waterfall_Group,
            [`${mapping.keyword}_Group_Final`]: row[`${mapping.keyword}_Group_Final`],
            [`${mapping.keyword}_Group`]: row[`${mapping.keyword}_Group`],
            Total_Charge_Amount: row.Total_Charge_Amount,
            Total_Payment_Amount: row.Total_Payment_Amount,
            Earliest_Min_DOS: row.Earliest_Min_DOS,
            Latest_Max_DOS: row.Latest_Max_DOS
        }));

        exportTableToExcel(headers, data, `${mapping.keyword}_Mapping`);
    };

    // Upload mappings to server with feedback
    const handleUpload = async () => {
        try {
            await upsyncMappings(InstanceState);
            toast({
                title: 'Success',
                description: 'Waterfall mappings saved successfully.',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        } catch (err) {
            toast({
                title: 'Error',
                description: 'Failed to save waterfall mappings.',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
        }
    };

    // Render error state
    if (error) {
        return <Text color="red.500">{error}</Text>;
    }

    // Main render with tabs and table
    return (
        !mappingsArrState || _loading) ?
        <div style={{ width: "100%", height: "500px" }}>
            <LoadingSpinner />
        </div>
        : (
            <Tabs variant="line" colorScheme="blue" sx={{
                width: "100%",
                height: "100%",
            }}>
                <Flex sx={{
                    flexDirection: "column",
                    width: "100%", height: "100%",
                }}>
                    <TabList sx={{ position: "relative", borderColor: tabBorderColor }}>
                        {mappingsArrState.map((mapping, mappingIndex) => (
                            <Tab key={mappingIndex}>{mapping.tabName}</Tab>
                        ))}
                    </TabList>
                    <TabPanels flex={1}>
                        {mappingsArrState.map((mapping, mappingIndex) => (
                            <TabPanel key={mappingIndex} sx={{ padding: 0 }}>
                                <Flex direction="row" sx={{ margin: 0, position: "relative", height: "44px", justifyContent: "center", alignItems: "center" }}>

                                    <Text sx={{ flex: 1, margin: 0 }} fontSize="sm" textAlign="center" mb={2}>
                                        {mapping.data.length} entities found.
                                    </Text>
                                </Flex>
                                <MappingTable
                                    mapping={mapping}
                                    mappingIndex={mappingIndex}
                                    modifyWaterfallGroup={modifyWaterfallGroup}
                                />
                                <Flex sx={{ position: "absolute", top: 0, right: 0, bottom: '10%', gap: 1 }}>
                                    <Tooltip label="Refresh Mapping">
                                        <IconButton
                                            onClick={() => fetchMappingsViewsState()}
                                            size="sm"
                                            colorScheme="blue"
                                            variant="outline"
                                            aria-label="Refresh Mapping Button"
                                        >
                                            <Icon as={FaSync as ElementType} />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip label="Upload Mapping">
                                        <IconButton
                                            onClick={handleUpload}
                                            size="sm"
                                            colorScheme="blue"
                                            variant="outline"
                                            aria-label="Upload Mapping Button"
                                        >
                                            <Icon as={FaUpload as ElementType} />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip
                                        label="Download Excel">
                                        <IconButton
                                            onClick={() => handleExport(mapping)}
                                            size="sm"
                                            colorScheme="blue"
                                            variant="outline"
                                            aria-label="Download Excel Button"
                                        >
                                            <Icon as={FaDownload as ElementType} />
                                        </IconButton>
                                    </Tooltip>

                                </Flex>
                            </TabPanel>
                        ))}
                    </TabPanels>
                </Flex>

            </Tabs>
        );
};

export default MappingsView;

// Type for sort direction
type SortDirection = 'asc' | 'desc' | null;

// Interface for column sorting
interface SortConfig {
    key: string;
    direction: SortDirection;
}

// Interface for MappingTable props
interface MappingTableProps {
    mapping: MappingsViewModel;
    mappingIndex: number;
    modifyWaterfallGroup: (mappingIndex: number, rowIndex: number, newVal: string) => void;
}

// Extracted MappingTable component
const MappingTable: React.FC<MappingTableProps> = ({ mapping, mappingIndex, modifyWaterfallGroup }) => {
    const waterfallColor = useColorModeValue('blue.200', 'blue.600')
    const { colorMode } = useColorMode();
    const tableBorderColor = getTableBorderColor(colorMode);
    const headerTextColor = getHeadTextColor(colorMode);

    // State for sorting
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null });

    const cellStyle = {
        maxWidth: "300px",
        padding: "8px",
        textAlign: "center",
        borderColor: tableBorderColor
    };
    const headerCellStyle = {
        ...cellStyle,
        color: headerTextColor,
        cursor: 'pointer',
        userSelect: 'none'
    };

    const waterfallCellStyle = {
        width: '100%',
        border: '0px',
        padding: '0px',
        _focus: { border: '0px' },
        textAlign: "center",
        backgroundColor: waterfallColor,
        borderColor: waterfallColor,
        borderRadius: 'none'
    };

    // Handle column sorting
    const handleSort = (key: string) => {
        let direction: SortDirection = 'asc';

        if (sortConfig.key === key) {
            if (sortConfig.direction === 'asc') {
                direction = 'desc';
            } else if (sortConfig.direction === 'desc') {
                direction = null;
            }
        }

        setSortConfig({ key, direction });
    };

    // Get sorted data based on current sort configuration
    const sortedData = useMemo(() => {
        if (!sortConfig.direction || !sortConfig.key) {
            return mapping.data;
        }

        return [...mapping.data].sort((a, b) => {
            // Special handling for Waterfall_Group column
            if (sortConfig.key === 'Waterfall_Group') {
                const aValue = String(a.Waterfall_Group || '').toLowerCase();
                const bValue = String(b.Waterfall_Group || '').toLowerCase();

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            }

            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            // Handle numeric values (like amounts)
            if (!isNaN(Number(aValue)) && !isNaN(Number(bValue))) {
                return sortConfig.direction === 'asc'
                    ? Number(aValue) - Number(bValue)
                    : Number(bValue) - Number(aValue);
            }

            // Handle string values
            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [mapping.data, sortConfig]);

    // Render sort indicator
    const renderSortIcon = (columnName: string) => {
        if (sortConfig.key !== columnName) {
            return null;
        }

        return sortConfig.direction === 'asc' ? (
            <TriangleUpIcon ml={1} w={3} h={3} />
        ) : sortConfig.direction === 'desc' ? (
            <TriangleDownIcon ml={1} w={3} h={3} />
        ) : null;
    };

    return (
        <Flex sx={{ maxHeight: "1100px", overflow: "scroll" }}>
            <Table colorScheme={'blue'} size="sm" >
                <Thead>
                    <Tr>
                        <Th sx={headerCellStyle} onClick={() => handleSort('Waterfall_Group')}>
                            <Flex align="center">
                                Waterfall_Group
                                {renderSortIcon('Waterfall_Group')}
                            </Flex>
                        </Th>
                        <Th sx={headerCellStyle} onClick={() => handleSort(`${mapping.keyword}_Group_Final`)}>
                            <Flex align="center">
                                {mapping.keyword}_Group_Final
                                {renderSortIcon(`${mapping.keyword}_Group_Final`)}
                            </Flex>
                        </Th>
                        <Th sx={headerCellStyle} onClick={() => handleSort(`${mapping.keyword}_Group`)}>
                            <Flex align="center">
                                {mapping.keyword}_Group
                                {renderSortIcon(`${mapping.keyword}_Group`)}
                            </Flex>
                        </Th>
                        <Th sx={headerCellStyle} onClick={() => handleSort('Total_Charge_Amount')}>
                            <Flex align="center">
                                Total_Charge_Amount
                                {renderSortIcon('Total_Charge_Amount')}
                            </Flex>
                        </Th>
                        <Th sx={headerCellStyle} onClick={() => handleSort('Total_Payment_Amount')}>
                            <Flex align="center">
                                Total_Payment_Amount
                                {renderSortIcon('Total_Payment_Amount')}
                            </Flex>
                        </Th>
                        <Th sx={headerCellStyle} onClick={() => handleSort('Earliest_Min_DOS')}>
                            <Flex align="center">
                                Earliest_Min_DOS
                                {renderSortIcon('Earliest_Min_DOS')}
                            </Flex>
                        </Th>
                        <Th sx={headerCellStyle} onClick={() => handleSort('Latest_Max_DOS')}>
                            <Flex align="center">
                                Latest_Max_DOS
                                {renderSortIcon('Latest_Max_DOS')}
                            </Flex>
                        </Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {sortedData.map((row, rowIndex) => (
                        <Tr key={`${mappingIndex}-${rowIndex}`}>
                            <Td sx={{ ...cellStyle, padding: '0px' }}>
                                <WaterfallInput
                                    sx={waterfallCellStyle}
                                    value={row.Waterfall_Group}
                                    onBlur={(newVal) => modifyWaterfallGroup(mappingIndex, mapping.data.findIndex(item => item === row), newVal)}
                                />
                            </Td>
                            <Td sx={cellStyle}>{row[`${mapping.keyword}_Group_Final`]}</Td>
                            <Td sx={cellStyle}>{row[`${mapping.keyword}_Group`]}</Td>
                            <Td sx={cellStyle}>{toDollar(row.Total_Charge_Amount)}</Td>
                            <Td sx={cellStyle}>{toDollar(row.Total_Payment_Amount)}</Td>
                            <Td sx={cellStyle}>{row.Earliest_Min_DOS}</Td>
                            <Td sx={cellStyle}>{row.Latest_Max_DOS}</Td>
                        </Tr>
                    ))}
                </Tbody>
            </Table>
        </Flex>

    );
};
