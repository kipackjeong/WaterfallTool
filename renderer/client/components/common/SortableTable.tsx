import React, { useState, useMemo, ReactNode } from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Flex,
  TableProps,
  Icon,
  useColorMode,
} from '@chakra-ui/react';
import { TriangleUpIcon, TriangleDownIcon } from '@chakra-ui/icons';
import { getHeadTextColor, getTableBorderColor } from '@/lib/themes/theme';

// Type for sort direction
export type SortDirection = 'asc' | 'desc' | null;

// Interface for column sorting
export interface SortConfig {
  key: string;
  direction: SortDirection;
}

// Column definition interface
export interface ColumnDef<T> {
  key: string;           // Property key in the data object
  header: string;        // Display name for the column header
  cell: (row: T, index: number) => ReactNode; // Cell renderer
  isSortable?: boolean;  // Whether the column is sortable (default: true)
  sortFn?: (a: T, b: T, direction: SortDirection) => number; // Custom sort function
}

// Main component props
export interface SortableTableProps<T> {
  data: T[];                            // Data array to display
  columns: ColumnDef<T>[];              // Column definitions
  initialSort?: SortConfig;             // Initial sort configuration
  defaultSortFn?: (a: T, b: T, key: string, direction: SortDirection) => number; // Default sort function
  tableProps?: TableProps;              // Additional table props
  getRowProps?: (row: T, index: number) => object; // Additional props for each row
  stickyHeader?: boolean;               // Whether header should be sticky
  emptyMessage?: ReactNode;             // Message to display when data is empty
  size?: 'sm' | 'md' | 'lg';            // Table size
  colorScheme?: string;                 // Table color scheme
}

// Generic sortable table component
function SortableTable<T>({
  data,
  columns,
  initialSort = { key: '', direction: null },
  defaultSortFn,
  tableProps = {},
  getRowProps,
  stickyHeader = false,
  emptyMessage = 'No data available',
  size = 'md',
  colorScheme = 'blue',
}: SortableTableProps<T>) {
  // State for sorting
  const [sortConfig, setSortConfig] = useState<SortConfig>(initialSort);

  // Get theme colors based on color mode
  const { colorMode } = useColorMode();
  const tableBorderColor = getTableBorderColor(colorMode);
  const headerTextColor = getHeadTextColor(colorMode);

  // Style objects
  const cellStyle = {
    padding: size === 'sm' ? '8px' : size === 'md' ? '12px' : '16px',
    textAlign: "center" as const,
    borderColor: tableBorderColor,
  };

  const headerCellStyle = {
    ...cellStyle,
    color: headerTextColor,
    cursor: 'pointer',
    userSelect: 'none' as const,
    position: stickyHeader ? 'sticky' as const : undefined,
    top: stickyHeader ? 0 : undefined,
    zIndex: stickyHeader ? 1 : undefined,
    bg: stickyHeader ? (colorMode === 'light' ? 'white' : 'gray.800') : undefined,
  };

  // Default sort function implementation
  const defaultSort = (a: T, b: T, key: string, direction: SortDirection): number => {
    if (!direction) return 0;

    const aValue = a[key as keyof T];
    const bValue = b[key as keyof T];

    // Handle numeric values
    if (!isNaN(Number(aValue)) && !isNaN(Number(bValue))) {
      return direction === 'asc'
        ? Number(aValue) - Number(bValue)
        : Number(bValue) - Number(aValue);
    }

    // Handle string values
    const aString = String(aValue || '').toLowerCase();
    const bString = String(bValue || '').toLowerCase();

    if (aString < bString) {
      return direction === 'asc' ? -1 : 1;
    }
    if (aString > bString) {
      return direction === 'asc' ? 1 : -1;
    }
    return 0;
  };

  // Handle column sorting
  const handleSort = (key: string) => {
    let direction: SortDirection = 'asc';

    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else if (sortConfig.direction === 'desc') {
        direction = null;
      }
    }

    setSortConfig({ key, direction });
  };

  // Get sorted data based on current sort configuration
  const sortedData = useMemo(() => {
    if (!sortConfig.direction || !sortConfig.key) {
      return data;
    }

    return [...data].sort((a, b) => {
      // Get the column definition for the sort key
      const column = columns.find(col => col.key === sortConfig.key);

      // Use column-specific sort function if provided
      if (column?.sortFn) {
        return column.sortFn(a, b, sortConfig.direction);
      }

      // Use the provided default sort function if available
      if (defaultSortFn) {
        return defaultSortFn(a, b, sortConfig.key, sortConfig.direction);
      }

      // Fallback to the internal default sort implementation
      return defaultSort(a, b, sortConfig.key, sortConfig.direction);
    });
  }, [data, columns, sortConfig, defaultSortFn]);

  // Render sort indicator
  const renderSortIcon = (columnKey: string) => {
    if (sortConfig.key !== columnKey) {
      return null;
    }

    return sortConfig.direction === 'asc' ? (
      <Icon as={TriangleUpIcon} ml={1} w={3} h={3} />
    ) : sortConfig.direction === 'desc' ? (
      <Icon as={TriangleDownIcon} ml={1} w={3} h={3} />
    ) : null;
  };

  // If no data, show empty message
  if (!data.length) {
    return <>{emptyMessage}</>;
  }

  return (
    <Table size={size} colorScheme={colorScheme} {...tableProps}>
      <Thead>
        <Tr>
          {columns.map((column) => (
            <Th
              key={column.key}
              sx={headerCellStyle}
              onClick={() => column.isSortable !== false && handleSort(column.key)}
              cursor={column.isSortable !== false ? 'pointer' : 'default'}
            >
              <Flex align="center" justify="center">
                {column.header}
                {column.isSortable !== false && renderSortIcon(column.key)}
              </Flex>
            </Th>
          ))}
        </Tr>
      </Thead>
      <Tbody>
        {sortedData.map((row, rowIndex) => (
          <Tr key={rowIndex} {...(getRowProps ? getRowProps(row, rowIndex) : {})}>
            {columns.map((column) => (
              <Td key={`${rowIndex}-${column.key}`} sx={cellStyle}>
                {column.cell(row, rowIndex)}
              </Td>
            ))}
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}

export default SortableTable;
