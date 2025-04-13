/**
 * Centralized table styles for consistent UI across the application
 */

// Common table styles
export const tableStyles = {
  height: 0,
  maxWidth: "600px",
  minWidth: "300px",
  fontSize: 'sm'
};

// Cell styling function
export const getCellStyles = (borderColor) => ({
  padding: '8px',
  minWidth: '70px',
  minHeight: '12px',
  textAlign: 'center',
  borderColor,
});

// Header cell styling function
export const getHeaderStyles = (borderColor) => ({
  ...getCellStyles(borderColor),
  fontWeight: 'bold',
});

// Selection cell styling (for interactive cells)
export const getSelectionCellStyles = (borderColor) => ({
  ...getCellStyles(borderColor),
  cursor: 'pointer',
  padding: 0,
  _hover: { backgroundColor: 'gray.100' },
});

// Selection specific styles
export const selectionStyles = {
  padding: 0,
  textAlign: 'center',
  border: 'none',
  cursor: 'pointer',
  _hover: { backgroundColor: 'gray.100' },
  icon: { display: 'none' },
};
