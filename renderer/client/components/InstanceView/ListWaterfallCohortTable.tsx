'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Box,
  useColorMode,
  Center,
  Text,
  Flex,
  Icon
} from '@chakra-ui/react';
import { TriangleUpIcon, TriangleDownIcon } from '@chakra-ui/icons';
import { getTableBorderColor } from '@/lib/themes/theme';
import { useInstanceStore } from '@/lib/states/instanceState';
import {
  tableStyles,
  getCellStyles,
  getHeaderStyles
} from '@/lib/styles/tableStyles';

interface ListWaterfallCohortTableProps {
}

const ListWaterfallCohortTable: React.FC<ListWaterfallCohortTableProps> = () => {
  const { colorMode } = useColorMode();
  const tableBorderColor = getTableBorderColor(colorMode);

  // Fetch the data from the instance state
  const { instanceState } = useInstanceStore(state => state);

  const [columns, setColumns] = useState({} as Record<string, any[]>);
  const [maxRowCount, setMaxRowCount] = useState(0);

  useEffect(() => {
    console.debug('ListWaterfallCohortTable useEffect');
    const _columns = instanceState?.waterfallCohortListData;
    setColumns(_columns ?? {} as Record<string, any[]>);
    setMaxRowCount(_columns ? Object.values(_columns).reduce(
      (max, column) => Math.max(max, Array.isArray(column) ? column.length : 0), 0
    ) : 0);
  }, [instanceState.waterfallCohortListData])

  // If there's no data and we're not loading, show a message
  if (maxRowCount === 0) {
    return (
      <Box
        width="100%"
        maxHeight="400px"
        overflowY="auto"
        backgroundColor={colorMode === 'light' ? 'green.100' : 'green.800'}
        borderRadius="md"
        borderWidth="1px"
        borderColor={tableBorderColor}
        p={4}
      >
        <Center>
          <Text>No data available</Text>
        </Center>
      </Box>
    );
  }

  return (
    <Box
      height="100%"
      overflowY="auto"
      backgroundColor={colorMode === 'light' ? 'green.100' : 'green.800'}
      borderRadius="md"
      borderWidth="1px"
      borderColor={tableBorderColor}
    >
      <Table sx={{ ...tableStyles }}>
        <Thead position="sticky" top={0} zIndex={1}>
          <Tr>
            {Object.keys(columns).map((columnName) => (
              <Th
                key={columnName}
                sx={{ ...getHeaderStyles(tableBorderColor), fontSize: 'xs' }}
              >
                <Flex align="center" justify="center">
                  {columnName}
                </Flex>
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {Array.from({ length: maxRowCount }).map((_, rowIndex) => (
            <Tr key={rowIndex}>
              {Object.entries(columns).map(([columnName, column], colIndex) => (
                <Td
                  key={`${rowIndex}-${colIndex}`}
                  sx={getCellStyles(tableBorderColor)}
                >
                  {Array.isArray(column) ? column[rowIndex] || '' : ''}
                </Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};

export default ListWaterfallCohortTable;
