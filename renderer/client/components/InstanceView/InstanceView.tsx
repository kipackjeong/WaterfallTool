'use client';

import React, { Suspense, useEffect, useState } from 'react';
import {
    Flex,
    Button,
    useColorMode,
    Box,
    Icon,
} from '@chakra-ui/react';
import { useInstanceStore } from '@/lib/states/instanceState';
import { motion } from 'framer-motion';
import LoadingSpinner from '@/client/common/LoadingSpinner';
import { ChevronUpIcon, ChevronDownIcon } from '@chakra-ui/icons';
import MappingsView from '@/client/components/InstanceView/MappingsView';
import ListWaterfallCohortTable from './ListWaterfallCohortTable';
import _ from 'lodash';

const colorScheme = 'blue';

// Drawer handle styles
const drawerHandleStyles = {
    backdropFilter: 'blur(8px)',
    boxShadow: '0 4px 6px rgba(205, 72, 72, 0.1)',
    transition: 'all 0.3s ease',
    _hover: {
        transform: 'scale(1.05)',
    },
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
};

import CohortTable from './CohortTable';
import NumericFieldsTable from './NumericFieldsTable';

const InstanceView = () => {
    const { instanceState } = useInstanceStore((state) => state);
    // Using the waterfallCohortsTableData from instanceState directly
    const [loading, setLoading] = useState(true);
    const [isDrawerOpen, setIsDrawerOpen] = useState(true); // State for horizontal drawer control

    const { colorMode } = useColorMode();
    const pullDownBarColor = "white";
    const chevronIconColor = colorMode === 'light' ? 'black' : 'white';

    // Horizontal drawer dimensions
    const relatedHeightDown = 400;
    const relatedHeightUp = 8; // Thinner bar when closed

    // Horizontal drawer animation variants with spring physics for more natural motion
    const topPanelVariants = {
        closed: {
            height: relatedHeightUp,
            opacity: 1,
            transition: {
                type: "spring",
                stiffness: 300,
                damping: 30
            }
        },
        open: {
            height: relatedHeightDown,
            opacity: 1,
            transition: {
                type: "spring",
                stiffness: 300,
                damping: 30
            }
        },
    };

    const bottomPanelVariants = {
        open: {
            top: relatedHeightDown,
            opacity: 1,
            transition: {
                type: "spring",
                stiffness: 300,
                damping: 30
            }
        },
        closed: {
            top: relatedHeightUp,
            opacity: 1,
            transition: {
                type: "spring",
                stiffness: 300,
                damping: 30
            }
        },
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                setTimeout(async () => {
                    setLoading(false);
                }, 500);
            } catch (error) {
                console.error('Error fetching mapping names and counts:', error);
            } finally {
            }
        };
        fetchData();
    }, [instanceState]);

    return (
        <Flex width="100%" direction="column" position="relative">
            <Suspense fallback={<LoadingSpinner />}>

                <motion.div
                    className="motion.div"
                    initial="closed" // Start with a small portion visible
                    animate={isDrawerOpen ? 'open' : 'closed'}
                    variants={topPanelVariants}
                    style={{
                        display: "flex",
                        flexDirection: "row",
                        width: "100%",
                        height: "300px",
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 100, // Ensure it’s above other content
                    }}
                >
                    <Flex
                        direction="column"
                        alignItems="center"
                        justifyContent="center"
                        height="100%"
                        width="100%"
                    >
                        {isDrawerOpen && (
                            <Flex width="100%" height="100%" position="relative" direction="row" justifyContent="center" gap={2}>
                                <Flex direction="column" alignItems="center" justifyContent="center" gap={4} p={2}>
                                    <CohortTable />
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
                                <NumericFieldsTable />
                                <ListWaterfallCohortTable />
                            </Flex>
                        )}

                        <Flex
                            sx={{
                                ...drawerHandleStyles,
                                position: "absolute",
                                bottom: 0,
                                height: "8px",
                                width: "100%",
                                background: `linear-gradient(to bottom, transparent, ${pullDownBarColor})`,
                                zIndex: 101,
                            }}
                        >
                            <Box
                                sx={{
                                    position: 'absolute',
                                    bottom: '-12px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: '40px',
                                    height: '16px',
                                    borderRadius: '4px',
                                    background: pullDownBarColor,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.15)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    zIndex: 101,
                                    _hover: {
                                        height: '20px',
                                        boxShadow: '0 3px 8px rgba(0, 0, 0, 0.2)',
                                    },
                                    _active: {
                                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                                    }
                                }}
                                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                            >
                                <Icon color={chevronIconColor} boxSize={4}>
                                    {isDrawerOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
                                </Icon>
                            </Box>
                        </Flex>
                    </Flex>
                </motion.div>
            </Suspense>
            <Suspense fallback={<LoadingSpinner />}>
                <motion.div
                    className="motion.div"
                    initial="ope" // Start with a small portion visible
                    animate={isDrawerOpen ? 'open' : 'closed'}
                    variants={bottomPanelVariants}
                    style={{
                        width: "100%",
                        height: "fit-content",
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 99, // Ensure it’s above other content
                    }}
                >
                    <Flex sx={{ width: "100%", height: "100%" }} direction="column" alignItems="center" justifyContent="center" px={4} py={2}> {/* Increased padding to account for the visible drawer portion */}
                        <MappingsView />
                    </Flex>
                </motion.div>
            </Suspense>
        </Flex>
    );
};

export default InstanceView;