import React, { ElementType, useEffect, useState } from 'react';
import {
    Flex, Icon, IconButton, Tab, Table, TabList, TabPanel, TabPanels, Tabs, Tbody, Td, Text, Th, Thead, Tooltip, Tr, useColorMode, useColorModeValue, useToast
} from '@chakra-ui/react';
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
    const { instanceViewState } = useInstanceStore(state => state);
    const { mappingsArrState, setMappingsArrState, upsyncMappings, modifyWaterfallGroup } = useMappingsStore(state => state);
    const exportTableToExcel = useExportToExcel();
    const toast = useToast();

    const [_loading, _setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { colorMode } = useColorMode();
    const tabBorderColor = getTableBorderColor(colorMode, 0.5);

    useEffect(() => {
        fetchMappingsViewsState();
    }, [instanceViewState]);

    // Data fetching function with error handling
    const fetchMappingsViewsState = async () => {
        setError(null);
        _setLoading(true);
        try {
            await setMappingsArrState(user, instanceViewState);
        } catch (error) {
            setError('Failed to fetch mapping views state.');
        }

        setTimeout(() => {
            _setLoading(false);
        }, 2000);

    };

    // Data fetching function with error handling
    // const refreshFetchMappingsViewsState = async () => {
    //     setLoading(true);
    //     setError(null);

    //     setTimeout(async () => {
    //         try {
    //             await refreshMappingsArrState(instanceViewState);
    //             toast({
    //                 title: 'Mapping refreshed successfully.',
    //                 status: 'success',
    //                 duration: 3000,
    //                 isClosable: true
    //             })
    //         } catch (error) {
    //             setError('Failed to fetch mapping views state.');
    //             toast({
    //                 title: 'Error',
    //                 description: 'Failed to refresh mapping views state.',
    //                 status: 'error',
    //                 duration: 3000,
    //                 isClosable: true
    //             })
    //         } finally {
    //             setLoading(false);
    //             setLoading(true);
    //             setTimeout(() => {
    //                 setLoading(false);
    //             }, 1000);
    //         }
    //     }, 500);
    // }

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
            await upsyncMappings(instanceViewState);
            toast({
                title: 'Success',
                description: 'Mappings saved to database successfully.',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        } catch (err) {
            toast({
                title: 'Error',
                description: 'Failed to save mappings to database.',
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
    const tableBorderColor = getTableBorderColor(colorMode, 0.6);
    const headerTextColor = getHeadTextColor(colorMode);

    const cellStyle = {
        maxWidth: "300px",
        padding: "8px",
        textAlign: "center",
    };
    const headerCellStyle = {
        ...cellStyle,
        color: headerTextColor,
        borderColor: tableBorderColor
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
    return (
        <Flex sx={{ maxHeight: "1100px", overflow: "scroll" }}>
            <Table colorScheme={'blue'} size="sm" >
                <Thead>
                    <Tr>
                        <Th sx={headerCellStyle}>Waterfall_Group</Th>
                        <Th sx={headerCellStyle}>{mapping.keyword}_Group_Final</Th>
                        <Th sx={headerCellStyle}>{mapping.keyword}_Group</Th>
                        <Th sx={headerCellStyle}>Total_Charge_Amount</Th>
                        <Th sx={headerCellStyle}>Total_Payment_Amount</Th>
                        <Th sx={headerCellStyle}>Earliest_Min_DOS</Th>
                        <Th sx={headerCellStyle}>Latest_Max_DOS</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {mapping.data.map((row, rowIndex) => (
                        <Tr key={`${mappingIndex}-${rowIndex}`}>
                            <Td sx={{ ...cellStyle, padding: '0px' }}>
                                <WaterfallInput
                                    sx={waterfallCellStyle}
                                    value={mapping.data[rowIndex].Waterfall_Group}
                                    onBlur={(newVal) => modifyWaterfallGroup(mappingIndex, rowIndex, newVal)}
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
