import React, { ElementType, useEffect, useState, useMemo, ReactNode } from 'react';
import {
    Flex, Icon, IconButton, Tab, TabList, TabPanel, TabPanels, Tabs, Text, useColorMode, useColorModeValue, useToast, Tooltip
} from '@chakra-ui/react';
import SortableTable, { ColumnDef } from '../common/SortableTable';
import { FaDownload, FaSync, FaUpload } from 'react-icons/fa';
import useExportToExcel from '../../../lib/hooks/useExportToExcel';
import { MappingsViewModel } from '../../../lib/models';
import WaterfallInput from '../WaterfallInput';
import { getHeadTextColor, getTableBorderColor } from '../../../lib/themes/theme';
import { toDollar } from '../../../lib/utils/numericHelper';
import { useInstanceStore } from '../../../lib/states/instanceState';
import { useAuth } from '@/lib/contexts/authContext';
import LoadingSpinner from '../common/LoadingSpinner';
import _ from 'lodash';

// Main MappingsView component
const MappingsView: React.FC = () => {
    const { user } = useAuth();
    // Get all needed state and actions from the combined store
    const {
        instanceState,
        mappingsState,
        setMappingsState,
        upsyncCurrentMappings,
        modifyWaterfallGroup
    } = useInstanceStore(state => state);
    const exportTableToExcel = useExportToExcel();
    const toast = useToast();

    const [_loading, _setLoading] = useState(true);

    const { colorMode } = useColorMode();
    const tabBorderColor = getTableBorderColor(colorMode, 0.5);

    // Instead of auto-loading, we'll load once on initial mount only
    useEffect(() => {
        // Initial load if we have an instance
        if (instanceState && !mappingsState) {
            fetchMappingsViewsState();
        }
    }, [instanceState, mappingsState]);

    const fetchMappingsViewsState = async () => {
        _setLoading(true);
        try {
            // Only fetch if we have an instanceState
            await setMappingsState(user, instanceState);
        } catch (error) {
            console.error('Error loading mappings:', error);
            toast({
                title: 'Error',
                description: 'Failed to fetch mapping views state.',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
        } finally {
            setTimeout(() => {
                _setLoading(false);
            }, 500);
        }
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
            await upsyncCurrentMappings(user, instanceState);
            toast({
                title: 'Success',
                description: 'Waterfall mappings saved successfully.',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        } catch (err) {
            console.error('Failed to save waterfall mappings.', err);
            toast({
                title: 'Error',
                description: 'Failed to save waterfall mappings.',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
        }
    };
    // Main render with tabs and table
    return (
        !mappingsState || _loading) ?
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
                        {mappingsState.map((mapping, mappingIndex) => (
                            <Tab key={mappingIndex}>{mapping.tabName}</Tab>
                        ))}
                    </TabList>
                    <TabPanels flex={1}>
                        {mappingsState.map((mapping, mappingIndex) => (
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

// Interface for MappingTable props
interface MappingTableProps {
    mapping: MappingsViewModel;
    mappingIndex: number;
    modifyWaterfallGroup: (mappingIndex: number, rowIndex: number, newVal: string) => void;
}

// Extracted MappingTable component using the generic SortableTable
const MappingTable: React.FC<MappingTableProps> = ({ mapping, mappingIndex, modifyWaterfallGroup }) => {
    const waterfallColor = useColorModeValue('blue.200', 'blue.600');
    const { colorMode } = useColorMode();

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

    // Define columns for the SortableTable
    const columns: ColumnDef<any>[] = [
        {
            key: 'Waterfall_Group',
            header: 'Waterfall_Group',
            cell: (row, rowIndex) => (
                <WaterfallInput
                    sx={waterfallCellStyle}
                    value={row.Waterfall_Group}
                    onBlur={(newVal) => modifyWaterfallGroup(mappingIndex, mapping.data.findIndex(item => item === row), newVal)}
                />
            ),
        },
        {
            key: `${mapping.keyword}_Group_Final`,
            header: `${mapping.keyword}_Group_Final`,
            cell: (row) => row[`${mapping.keyword}_Group_Final`],
        },
        {
            key: `${mapping.keyword}_Group`,
            header: `${mapping.keyword}_Group`,
            cell: (row) => row[`${mapping.keyword}_Group`],
        },
        {
            key: 'Total_Charge_Amount',
            header: 'Total_Charge_Amount',
            cell: (row) => toDollar(row.Total_Charge_Amount),
            sortFn: (a, b, direction) => {
                return direction === 'asc'
                    ? Number(a.Total_Charge_Amount) - Number(b.Total_Charge_Amount)
                    : Number(b.Total_Charge_Amount) - Number(a.Total_Charge_Amount);
            },
        },
        {
            key: 'Total_Payment_Amount',
            header: 'Total_Payment_Amount',
            cell: (row) => toDollar(row.Total_Payment_Amount),
            sortFn: (a, b, direction) => {
                return direction === 'asc'
                    ? Number(a.Total_Payment_Amount) - Number(b.Total_Payment_Amount)
                    : Number(b.Total_Payment_Amount) - Number(a.Total_Payment_Amount);
            },
        },
        {
            key: 'Earliest_Min_DOS',
            header: 'Earliest_Min_DOS',
            cell: (row) => row.Earliest_Min_DOS,
        },
        {
            key: 'Latest_Max_DOS',
            header: 'Latest_Max_DOS',
            cell: (row) => row.Latest_Max_DOS,
        },
    ];

    // Get theme colors based on color mode for consistent styling
    const tableBorderColor = getTableBorderColor(colorMode);
    const headerTextColor = getHeadTextColor(colorMode);

    // Style objects to match the original table styling
    const cellStyle = {
        maxWidth: "300px",
        padding: "0px",
        textAlign: "center" as const,
        borderColor: tableBorderColor,
        height: "20px",
        lineHeight: "1"
    };

    const headerCellStyle = {
        ...cellStyle,
        color: headerTextColor,
        cursor: 'pointer',
        userSelect: 'none' as const
    };

    return (
        <Flex sx={{ maxHeight: "1100px", overflow: "auto" }} width="100%">
            <SortableTable
                data={mapping.data}
                columns={columns}
                tableProps={{
                    colorScheme: 'blue',
                    width: "100%",
                    style: { tableLayout: 'fixed' },
                    variant: "simple",
                    sx: {
                        'td, th': {
                            padding: '2px',
                            height: '20px',
                            lineHeight: '1'
                        }
                    }
                }}
                size="sm"
                getRowProps={(row, index) => ({ id: `${mappingIndex}-${index}` })}
                stickyHeader={true}
                // Pass the custom styles to maintain the original look
                defaultSortFn={(a, b, key, direction) => {
                    // Special handling for Waterfall_Group column
                    if (key === 'Waterfall_Group') {
                        const aValue = String(a.Waterfall_Group || '').toLowerCase();
                        const bValue = String(b.Waterfall_Group || '').toLowerCase();

                        if (aValue < bValue) {
                            return direction === 'asc' ? -1 : 1;
                        }
                        if (aValue > bValue) {
                            return direction === 'asc' ? 1 : -1;
                        }
                        return 0;
                    }

                    // Default sorting logic
                    const aValue = a[key];
                    const bValue = b[key];

                    // Handle numeric values (like amounts)
                    if (!isNaN(Number(aValue)) && !isNaN(Number(bValue))) {
                        return direction === 'asc'
                            ? Number(aValue) - Number(bValue)
                            : Number(bValue) - Number(aValue);
                    }

                    // Handle string values
                    if (aValue < bValue) {
                        return direction === 'asc' ? -1 : 1;
                    }
                    if (aValue > bValue) {
                        return direction === 'asc' ? 1 : -1;
                    }
                    return 0;
                }}
            />
        </Flex>
    );
};
