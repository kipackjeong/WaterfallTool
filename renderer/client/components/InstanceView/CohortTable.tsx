'use client';

import React, { Suspense } from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Box,
  useColorMode,
  Select,
  Spinner
} from '@chakra-ui/react';
import { getTableBorderColor } from '@/lib/themes/theme';
import { useInstanceStore } from '@/lib/states/instanceState';
import LoadingSpinner from '@/client/components/common/LoadingSpinner';
import _ from 'lodash';
import {
  tableStyles,
  getCellStyles,
  getHeaderStyles,
  getSelectionCellStyles,
  selectionStyles
} from '@/lib/styles/tableStyles';
import { useAuth } from '@/lib/contexts/authContext';

// Import CohortRow to render individual rows
interface CohortRowProps {
  cohort: any;
  borderColor: string;
  onToggleRun: (cohortName: string, value: boolean) => void;
  onToggleAggregate: (cohortName: string, value: boolean) => void;
}

const CohortRow: React.FC<CohortRowProps> = ({ cohort, borderColor, onToggleRun, onToggleAggregate }) => {
  return (
    <Tr>
      <Td sx={getCellStyles(borderColor)}>{cohort.waterfallCohortName}</Td>
      <Td sx={getCellStyles(borderColor)}>{cohort.count}</Td>
      <Td sx={getSelectionCellStyles(borderColor)}>
        <Select
          value={cohort.run ? 'Y' : 'N'}
          onChange={(e) => onToggleRun(cohort.waterfallCohortName, e.target.value === 'Y')}
          size="sm"
          sx={selectionStyles}
        >
          <option value="Y">Y</option>
          <option value="N">N</option>
        </Select>
      </Td>
      <Td sx={getSelectionCellStyles(borderColor)}>
        <Select
          value={cohort.aggregate ? 'Y' : 'N'}
          onChange={(e) => onToggleAggregate(cohort.waterfallCohortName, e.target.value === 'Y')}
          size="sm"
          sx={selectionStyles}
        >
          <option value="Y">Y</option>
          <option value="N">N</option>
        </Select>
      </Td>
    </Tr>
  );
};

const CohortTable: React.FC = () => {
  const { user } = useAuth();
  const { colorMode } = useColorMode();
  const tableBorderColor = getTableBorderColor(colorMode);

  // Fetch the data from the instance state
  const { instanceState } = useInstanceStore(state => state);

  return (
    <Suspense fallback={<Spinner />}>
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
          {instanceState.waterfallCohortsTableData?.map((cohort, index) => (
            <CohortRow
              key={index}
              cohort={cohort}
              borderColor={tableBorderColor}
              onToggleRun={function (cohortName: string, value: boolean): void {
              }}
              onToggleAggregate={function (cohortName: string, value: boolean): void {
              }} />
          ))}
        </Tbody>
      </Table>
    </Suspense>
  );
};

export default CohortTable;
