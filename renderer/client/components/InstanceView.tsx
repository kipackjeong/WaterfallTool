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
  Button,
  Select,
  useColorMode,
  Box,
  Icon,
  useTheme,
} from '@chakra-ui/react';
import { useInstanceStore } from '../../lib/states/instanceState';
import { motion } from 'framer-motion';
import LoadingSpinner from '../common/LoadingSpinner';
import { ChevronUpIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { getDarkestThemeColor, getTableBorderColor } from '../../lib/themes/theme';
import { toDollar } from '../../lib/utils/numericHelper';
import { MappingsStoreProvider } from '@/lib/states/mappingsState';
import MappingsView from './MappingsView';

const colorScheme = 'blue';

// Drawer handle styles
const drawerHandleStyles = {
  backdropFilter: 'blur(8px)',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  transition: 'all 0.3s ease',
  _hover: {
    transform: 'scale(1.05)',
  },
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

// Shared styles
const tableStyles = {
  height: 0,
  maxWidth: "600px",
  minWidth: "300px",
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

const InstanceView = () => {
  const { instanceViewState } = useInstanceStore((state) => state);
  // Using the waterfallCohortsTableData from instanceViewState directly
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true); // State for horizontal drawer control
  const [isVerticalDrawerOpen, setIsVerticalDrawerOpen] = useState(true); // State for vertical drawer control

  const { colorMode } = useColorMode();
  const pullDownBarColor = getDarkestThemeColor(colorMode);
  const tableBorderColor = getTableBorderColor(colorMode);


  // Theme for gradients and colors
  const theme = useTheme();

  // Horizontal drawer dimensions
  const relatedHeightDown = 400;
  const relatedHeightUp = 8; // Thinner bar when closed

  // Vertical drawer dimensions
  const verticalDrawerWidthOpen = 350; // Width when open
  const verticalDrawerWidthClosed = 10; // Thinner bar when closed

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

  // Vertical drawer animation variants with spring physics
  const leftPanelVariants = {
    open: {
      width: verticalDrawerWidthOpen,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    },
    closed: {
      width: verticalDrawerWidthClosed,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    },
  };

  const rightPanelVariants = {
    open: {
      left: verticalDrawerWidthOpen,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    },
    closed: {
      left: verticalDrawerWidthClosed,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    },
  };
  useEffect(() => {
    console.log('instanceViewState:', instanceViewState)
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

    if (instanceViewState) fetchData();
  }, [instanceViewState]);

  const renderCohortTable = () => {
    if (!instanceViewState) return null;
    return (
      <Table sx={{ ...tableStyles, width: "0px" }}>
        <Thead>
          <Tr>
            <Th sx={getHeaderStyles(tableBorderColor)}>Waterfall Cohort</Th>
            <Th sx={getHeaderStyles(tableBorderColor)}># of Value</Th>
            <Th sx={getHeaderStyles(tableBorderColor)}>Run</Th>
            <Th sx={getHeaderStyles(tableBorderColor)}>Aggregate</Th>
          </Tr>
        </Thead>
        <Tbody>
          {instanceViewState.waterfallCohortsTableData?.map((cohort, index) => (
            <CohortRow
              key={index}
              cohort={cohort}
              borderColor={tableBorderColor}
            />
          ))}
        </Tbody>
      </Table>
    );
  }

  const renderNumericFieldsTable = () => {
    // if (loading || !instanceViewState?.numericTableData || instanceViewState.numericTableData.length === 0) {
    //   return <LoadingSpinner />;
    // }

    if (!instanceViewState || loading) return <LoadingSpinner />;
    return (
      <Table sx={{ ...tableStyles }}>
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
          {instanceViewState?.numericTableData?.map((field) => (
            <NumericFieldRow key={field.fieldName} field={field} borderColor={tableBorderColor} />
          ))}
        </Tbody>
      </Table>
    );
  };
  return (
    <Flex width="100%" direction="column" position="relative">
      {/* {!instanceViewState || loading &&
        <div style={{ width: "100vw", height: "100vh" }}>
          <LoadingSpinner />
        </div>
      } */}
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
          alignItems="center"
          justifyContent="center"
          height="100%"
          width="100%"
        >
          {/* Visible portion when closed (e.g., a handle or title) */}
          {isDrawerOpen && (
            <Flex width="100%" height="100%" position="relative" direction="column" justifyContent="center" gap={2}>
              {/* Left panel with vertical drawer */}
              <motion.div
                className="vertical-drawer"
                initial="open"
                animate={isVerticalDrawerOpen ? 'open' : 'closed'}
                variants={leftPanelVariants}
                style={{
                  position: 'relative',
                  height: '100%',
                  width: "100%",
                  overflow: 'hidden',
                  borderRight: isVerticalDrawerOpen ? '1px solid rgba(0,0,0,0.1)' : 'none',
                  boxShadow: isVerticalDrawerOpen ? '0 0 15px rgba(0,0,0,0.05)' : 'none',
                  borderRadius: '0 8px 8px 0',
                  display: isVerticalDrawerOpen ? 'block' : 'none'
                }}
              >
                <Flex width="100%" height="100%" direction="column" alignItems="center" justifyContent="center" gap={4} p={2}>
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

                {/* Vertical drawer edge gradient */}
                <Box
                  sx={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: "4px",
                    height: "100%",
                    background: `linear-gradient(to right, transparent, ${pullDownBarColor})`,
                    zIndex: 200,
                  }}
                />
              </motion.div>

              {/* Vertical drawer handle */}
              <Box
                sx={{
                  position: 'absolute',
                  left: `calc(${isVerticalDrawerOpen ? verticalDrawerWidthOpen : verticalDrawerWidthClosed}px)`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '16px',
                  height: '40px',
                  borderRadius: '4px',
                  background: pullDownBarColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 5px rgba(0, 0, 0, 0.15)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  zIndex: 101,
                  _hover: {
                    width: '20px',
                  }
                }}
                onClick={() => setIsVerticalDrawerOpen(!isVerticalDrawerOpen)}
              >
                <Icon sx={{ opacity: 1 }} color="white" boxSize={4}>
                  {isVerticalDrawerOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                </Icon>
              </Box>

              {/* Right panel that shifts with the drawer */}
              <motion.div
                className="vertical-drawer-content"
                initial="open"
                animate={isVerticalDrawerOpen ? 'open' : 'closed'}
                variants={rightPanelVariants}
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  right: 0,
                  zIndex: 100,
                  left: verticalDrawerWidthOpen,
                  height: '100%',
                }}
              >
                <Flex sx={{ width: "100%", height: "100%", overflow: 'scroll', justifyContent: 'center', alignItems: 'center' }} p={2}>
                  {renderNumericFieldsTable()}
                </Flex>
              </motion.div>
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
            {/* Bottom drawer handle */}
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
              <Icon color="white" boxSize={4}>
                {isDrawerOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
              </Icon>
            </Box>
          </Flex>
        </Flex>

      </motion.div>


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

        {/* Main content (shifted down to avoid overlap) */}
        <Flex sx={{ width: "100%", height: "100%" }} direction="column" alignItems="center" justifyContent="center" px={4} py={2}> {/* Increased padding to account for the visible drawer portion */}
          {/* Distribution line for grok */}
          <MappingsStoreProvider>
            <MappingsView />
          </MappingsStoreProvider>
        </Flex>
      </motion.div>
    </Flex>
  );
};

export default InstanceView;


// Reusable Select component
const YesNoSelect = ({ defaultValue = 'Y' }) => (
  <Select sx={selectionStyles} defaultValue={defaultValue} size="sm" icon={<></>}>
    <option value="Y">Y</option>
    <option value="N">N</option>
  </Select>
);

// Cohort Table Row Component
const CohortRow = ({ cohort, borderColor }) => (
  <Tr>
    <Td sx={getCellStyles(borderColor)}>{cohort.waterfallCohortName}</Td>
    <Td sx={getCellStyles(borderColor)}>{cohort.count || '-'}</Td>
    <Td sx={getSelectionCellStyles(borderColor)}>
      <YesNoSelect defaultValue={cohort.run ? 'Y' : 'N'} />
    </Td>
    <Td sx={getSelectionCellStyles(borderColor)}>
      <YesNoSelect defaultValue={cohort.aggregate ? 'Y' : 'N'} />
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
