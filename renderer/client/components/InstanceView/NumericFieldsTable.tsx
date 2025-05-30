'use client';

import React, { Suspense, useEffect } from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useColorMode
} from '@chakra-ui/react';
import { getTableBorderColor } from '@/lib/themes/theme';
import { useInstanceStore } from '@/lib/states/instanceState';
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
  const { instanceState } = useInstanceStore(state => state);
  return instanceState?.numericTableData && (
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
