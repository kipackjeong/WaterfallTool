'use client';

import React from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Box,
  useColorMode,
  Spinner,
  Center,
  Text
} from '@chakra-ui/react';
import { getTableBorderColor } from '@/lib/themes/theme';
import { useInstanceStore } from '@/lib/states/instanceState';
import {
  tableStyles,
  getCellStyles,
  getHeaderStyles
} from '@/lib/styles/tableStyles';
// Now using combined store
// import { useMappingsStore } from '@/lib/states/mappingsState';

interface ListWaterfallCohortTableProps {
}

const ListWaterfallCohortTable: React.FC<ListWaterfallCohortTableProps> = () => {
  const { colorMode } = useColorMode();
  const tableBorderColor = getTableBorderColor(colorMode);

  // Fetch the data from the instance state
  const { instanceState } = useInstanceStore(state => state);

  // Use the real data from the instance state or empty arrays if not available
  const columns = instanceState?.waterfallCohortListData

  // Find the maximum length of all columns to determine the number of rows
  const maxRowCount = Object.values(columns ?? {}).reduce(
    (max, column) => Math.max(max, column.length), 0
  );

  // If there's no data and we're not loading, show a message
  if (maxRowCount === 0) {
    return (
      <Box
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
      maxHeight="400px"
      overflowY="auto"
      backgroundColor={colorMode === 'light' ? 'green.100' : 'green.800'}
      borderRadius="md"
      borderWidth="1px"
      borderColor={tableBorderColor}
    >
      <Table sx={{ ...tableStyles }}>
        <Thead position="sticky" top={0} zIndex={1}>
          <Tr>
            {Object.keys(columns ?? {}).map((columnName) => (
              <Th key={columnName} sx={getHeaderStyles(tableBorderColor)}>
                {columnName}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {Array.from({ length: maxRowCount }).map((_, rowIndex) => (
            <Tr key={rowIndex}>
              {Object.values(columns).map((column, colIndex) => (
                <Td
                  key={`${rowIndex}-${colIndex}`}
                  sx={getCellStyles(tableBorderColor)}
                >
                  {column[rowIndex] || ''}
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
