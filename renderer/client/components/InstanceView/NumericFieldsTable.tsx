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
  useColorMode
} from '@chakra-ui/react';
import { getTableBorderColor } from '@/lib/themes/theme';
import { useInstanceStore } from '@/lib/states/instanceState';
import LoadingSpinner from '@/client/common/LoadingSpinner';
import _ from 'lodash';
import {
  tableStyles,
  getCellStyles,
  getHeaderStyles
} from '@/lib/styles/tableStyles';

// NumericFieldRow component for rendering individual rows
interface NumericFieldRowProps {
  field: any;
  borderColor: string;
}

const NumericFieldRow: React.FC<NumericFieldRowProps> = ({ field, borderColor }) => {
  return (
    <Tr>
      <Td sx={getCellStyles(borderColor)}>{field.fieldName}</Td>
      <Td sx={getCellStyles(borderColor)}>{field.type}</Td>
      <Td sx={getCellStyles(borderColor)}>{field.include}</Td>
      <Td sx={getCellStyles(borderColor)}>{field.divideBy}</Td>
      <Td sx={getCellStyles(borderColor)}>{field.schedule}</Td>
      <Td sx={getCellStyles(borderColor)}>{field.total}</Td>
    </Tr>
  );
};

const NumericFieldsTable: React.FC = () => {
  const { colorMode } = useColorMode();
  const tableBorderColor = getTableBorderColor(colorMode);

  // Fetch the data from the instance state
  const instanceState = useInstanceStore(state => state.instanceState);
  const loading = useInstanceStore(state => state.isUpdatinginstanceState);

  // If there's no data or we're loading, show a spinner
  if (!instanceState || loading || _.isEmpty(instanceState.numericTableData)) {
    return <LoadingSpinner />;
  }

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
        {instanceState?.numericTableData?.map((field) => (
          <NumericFieldRow
            key={field.fieldName}
            field={field}
            borderColor={tableBorderColor}
          />
        ))}
      </Tbody>
    </Table>
  );
};

export default NumericFieldsTable;
