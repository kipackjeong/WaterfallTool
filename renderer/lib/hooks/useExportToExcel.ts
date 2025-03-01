import { useCallback } from 'react';
import * as XLSX from 'xlsx';

/**
 * Custom hook to export table data to an Excel file.
 *
 * @returns {function} - A function to export data to Excel.
 */
const useExportToExcel = () => {
  /**
   * Converts table data to an Excel file and triggers a download.
   * @param {Array} headers - An array of header strings.
   * @param {Array} data - An array of objects representing the table rows.
   * @param {string} fileName - The name of the Excel file to be downloaded.
   */
  const exportTableToExcel = useCallback((headers, data, fileName) => {
    // Create a worksheet from the data
    const worksheetData = [headers, ...data.map(item => headers.map(header => item[header]))];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Resize columns based on the longest content in each column
    const maxLengths = headers.map((header, i) =>
      Math.max(
        header.length,
        ...data.map(item => (item[header] ? item[header].toString().length : 0))
      )
    );
    worksheet['!cols'] = maxLengths.map(length => ({ wch: length + 2 })); // Add some padding

    // Create a new workbook and append the worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    // Generate Excel file and trigger download
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  }, []);

  return exportTableToExcel;
};

export default useExportToExcel;
