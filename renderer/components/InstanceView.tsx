'use client';

import React, { useEffect, useState, lazy, Suspense } from 'react';
import {
    Flex,
    Table,
    Tbody,
    Td,
    Th,
    Thead,
    Tr,
    Spinner,
    Button,
    Select,
    Icon,
    useColorMode,
} from '@chakra-ui/react';
import { useInstanceStore } from '../lib/states/instance.provider';
import useSqlQuery from '../lib/hooks/useSqlQuery';
import { MappingsStoreProvider } from '../lib/states/mappings.provider';
import { motion } from 'framer-motion';
import { ChevronUpIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { getDarkestThemeColor, getTableBorderColor } from '../lib/themes/theme';
import { toDollar } from '../lib/helpers/numericHelper';
import { apiService } from '../lib/services/apiService';

const colorScheme = 'blue';
const MappingView = lazy(() => import('./MappingView'));

// Shared styles
const tableStyles = {
    height: 0,
    fontSize: 'sm'
};

const getCellStyles = (borderColor) => ({
    padding: '8px',
    minWidth: '70px',
    minHeight: '12px',
    textAlign: 'center',
    // borderWidth: '1px',
    borderColor,
});

const getHeaderStyles = (borderColor) => ({
    ...getCellStyles(borderColor),
    fontWeight: 'bold',
});

const getSelectionCellStyles = (borderColor) => ({
    ...getCellStyles(borderColor),
    cursor: 'pointer',
    padding: 0,
    _hover: { backgroundColor: 'gray.100' },
});

const selectionStyles = {
    padding: 0,
    textAlign: 'center',
    border: 'none',
    cursor: 'pointer',
    _hover: { backgroundColor: 'gray.100' },
    icon: { display: 'none' },
};

// Reusable Select component
const YesNoSelect = ({ defaultValue = 'Y' }) => (
    <Select sx={selectionStyles} defaultValue={defaultValue} size="sm" icon={<></>}>
        <option value="Y">Y</option>
        <option value="N">N</option>
    </Select>
);

// Cohort Table Row Component
const CohortRow = ({ name, count, borderColor }) => (
    <Tr>
        <Td sx={getCellStyles(borderColor)}>{name}</Td>
        <Td sx={getCellStyles(borderColor)}>{count || '-'}</Td>
        <Td sx={getSelectionCellStyles(borderColor)}>
            <YesNoSelect />
        </Td>
        <Td sx={getSelectionCellStyles(borderColor)}>
            <YesNoSelect />
        </Td>
    </Tr>
);

// Numeric Fields Table Row Component
const NumericFieldRow = ({ field, borderColor }) => (
    <Tr>
        <Td sx={getCellStyles(borderColor)}>{field.fieldName}</Td>
        <Td sx={getCellStyles(borderColor)}>{field.type}</Td>
        <Td sx={getSelectionCellStyles(borderColor)}>
            <YesNoSelect defaultValue={field.include} />
        </Td>
        <Td sx={getSelectionCellStyles(borderColor)}>
            <YesNoSelect defaultValue={field.divideBy} />
        </Td>
        <Td sx={getSelectionCellStyles(borderColor)}>
            <YesNoSelect defaultValue={field.schedule} />
        </Td>
        <Td sx={getSelectionCellStyles(borderColor)}>
            {field.fieldName.includes('Amount') ? toDollar(field.total) : field.total}
        </Td>
    </Tr >
);

const LoadingSpinner = () => (
    <Flex
        sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 100, // Ensure it's above other content
        }}
    >
        <Spinner size="xl" />
    </Flex>
);

const InstanceView = () => {
    const { instanceViewState, numericTableData, setNumericTableData } = useInstanceStore((state) => state);
    const { queryMappingNames, getDataCount } = useSqlQuery();
    const [mappingNames, setMappingNames] = useState([]);
    const [cohortCounts, setCohortCounts] = useState({});
    const [loading, setLoading] = useState(true);
    const [isDrawerOpen, setIsDrawerOpen] = useState(true); // State for drawer control

    const { colorMode } = useColorMode();
    const pullDownBarColor = getDarkestThemeColor(colorMode);
    const tableBorderColor = getTableBorderColor(colorMode);


    const relatedHeightDown = 400;
    const relatedHeightUp = 5;
    // Drawer animation variants (updated to show a small portion by default)
    const topPanelVariants = {
        closed: { height: relatedHeightUp, opacity: 1, transition: { duration: 0.3 } }, // Small visible portion (e.g., 40px)
        open: { height: relatedHeightDown, opacity: 1, transition: { duration: 0.3 } }, // Full open height (e.g., 300px)
    };
    const bottomPanelVariants = {
        open: { top: relatedHeightDown, opacity: 1, transition: { duration: 0.3 } }, // Small visible portion (e.g., 40px)
        closed: { top: relatedHeightUp, opacity: 1, transition: { duration: 0.3 } }, // Full open height (e.g., 300px)
    };
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const names = await queryMappingNames(instanceViewState);
                const counts = Object.fromEntries(
                    await Promise.all(
                        names.map(async (name) => {
                            const res = await getDataCount(instanceViewState, name);
                            return [name, res?.[0]?.ROW_COUNT ?? 0];
                        })
                    )
                );
                setNumericTableData(instanceViewState);
                setMappingNames(names);
                setCohortCounts(counts);
            } catch (error) {
                console.error('Error fetching mapping names and counts:', error);
            } finally {
                setLoading(false);
            }
        };

        if (instanceViewState) fetchData();
    }, [instanceViewState]);

    const renderCohortTable = () => (
        <Table sx={tableStyles} flex={1}>
            <Thead>
                <Tr>
                    <Th sx={getHeaderStyles(tableBorderColor)}>Waterfall Cohort</Th>
                    <Th sx={getHeaderStyles(tableBorderColor)}># of Value</Th>
                    <Th sx={getHeaderStyles(tableBorderColor)}>Run</Th>
                    <Th sx={getHeaderStyles(tableBorderColor)}>Aggregate</Th>
                </Tr>
            </Thead>
            <Tbody>
                {mappingNames.map((name, index) => (
                    <CohortRow key={index} name={name} count={cohortCounts[name]} borderColor={tableBorderColor} />
                ))}
            </Tbody>
        </Table>
    );

    const renderNumericFieldsTable = () => {
        if (loading || !numericTableData || numericTableData.length === 0) {
            return <LoadingSpinner />;
        }

        return (
            <Table sx={tableStyles}>
                <Thead>
                    <Tr>
                        <Th sx={getHeaderStyles(tableBorderColor)}>Numeric Fields</Th>
                        <Th sx={getHeaderStyles(tableBorderColor)}>Type</Th>
                        <Th sx={getHeaderStyles(tableBorderColor)}>Include</Th>
                        <Th sx={getHeaderStyles(tableBorderColor)}>Divide BY</Th>
                        <Th sx={getHeaderStyles(tableBorderColor)}>Schedule</Th>
                        <Th sx={getHeaderStyles(tableBorderColor)}>Total</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {numericTableData.map((field) => (
                        <NumericFieldRow key={field.fieldName} field={field} borderColor={tableBorderColor} />
                    ))}
                </Tbody>
            </Table>
        );
    };

    if (!InstanceView || loading) {
        return (
            <LoadingSpinner />
        );
    }

    return (
        <Flex width="100%" direction="column" position="relative">
            {/* Pull-down Drawer (Blind-like animation) */}
            <motion.div
                className="motion.div"
                initial="closed" // Start with a small portion visible
                animate={isDrawerOpen ? 'open' : 'closed'}
                variants={topPanelVariants}
                style={{
                    height: "fit-content",
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 100, // Ensure it’s above other content
                }}
            >
                <Flex
                    direction="column"
                    p={4}
                    alignItems="center"
                    justifyContent="center"
                    height="100%"
                >
                    {/* Visible portion when closed (e.g., a handle or title) */}
                    {isDrawerOpen && (
                        <Flex width="100%" height="100%" direction="column" justifyContent="center" p={4} gap={2}>
                            <Flex width="100%" gap={8} alignItems="center">
                                <Flex direction="column" alignItems="center" gap={4}>
                                    {renderCohortTable()}
                                    <Button
                                        colorScheme={colorScheme}
                                        variant="outline"
                                        size="sm"
                                        width="200px"
                                        borderRadius="full"
                                    >
                                        List Waterfall Cohorts
                                    </Button>
                                    <Button
                                        colorScheme={colorScheme}
                                        variant="outline"
                                        size="sm"
                                        width="200px"
                                        borderRadius="full"
                                    >
                                        Run Waterfall
                                    </Button>
                                </Flex>
                                {renderNumericFieldsTable()}
                            </Flex>
                        </Flex>
                    )}

                    <Flex
                        sx={{
                            position: "absolute",
                            bottom: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: "20px",
                            width: "100vw",
                            background: pullDownBarColor,
                            zIndex: 101,
                            cursor: "pointer",
                        }}
                        onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                    >
                        <Icon sx={{ zIndex: 102, opacity: 1 }} color={isDrawerOpen ? 'white' : 'white'} boxSize={6}>
                            {isDrawerOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
                        </Icon>
                    </Flex>
                </Flex>

            </motion.div>


            <motion.div
                className="motion.div"
                initial="closed" // Start with a small portion visible
                animate={isDrawerOpen ? 'open' : 'closed'}
                variants={bottomPanelVariants}
                style={{
                    width: "100%",
                    height: "fit-content",
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 100, // Ensure it’s above other content
                }}
            >

                {/* Main content (shifted down to avoid overlap) */}
                <Flex sx={{ width: "100%", height: "100%" }} direction="column" alignItems="center" justifyContent="center" p={4} gap={4}> {/* Increased padding to account for the visible drawer portion */}
                    {/* Distribution line for grok */}
                    <MappingsStoreProvider>
                        <Suspense fallback={<Spinner size="xl" />}>
                            <MappingView />
                        </Suspense>
                    </MappingsStoreProvider>
                </Flex>
            </motion.div>
        </Flex>
    );
};

export default InstanceView;