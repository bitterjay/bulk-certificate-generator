/**
 * DATA PARSING MODULE
 * Handles the parsing of Excel data pasted into the application.
 * This module processes tab-separated data to create two data structures:
 * 1. originalData - preserves all columns as-is for table display
 * 2. parsedData - processed data for certificate generation with Name column created
 */

// Global variables to store both original and parsed data
// parsedData: Array of objects where First/Last Name are combined into 'Name' field
export let parsedData = [];
// originalHeaders: Array of column headers exactly as they appear in the Excel data
export let originalHeaders = [];
// originalData: Array of row objects with original column headers as keys
export let originalData = [];

/**
 * Parses Excel data that has been pasted into the application
 * @param {string} pastedData - Tab-separated values from Excel/spreadsheet
 * @returns {string[]} Array of filtered headers (excludes 'first name' and 'last name')
 * 
 * This function performs the following operations:
 * 1. Splits the pasted data into rows and columns (tab-separated)
 * 2. Extracts headers from the first row
 * 3. Creates originalData array preserving all columns for table display
 * 4. Creates parsedData array with combined Name field for certificates
 * 5. Returns filtered headers for the UI column selection
 */
export function parseExcelData(pastedData) {
    // Split the data into rows using newline, then split each row by tabs
    // This assumes Excel data is tab-separated when pasted
    const rows = pastedData.split('\n').map(row => row.split('\t'));
    
    // Extract original headers (first row) - store these for table display
    // Trim each header to remove any extra whitespace
    originalHeaders = rows[0].map(header => header.trim());
    
    // Store original data rows - preserve all columns for table display
    // Skip the first row (headers) and create an object for each data row
    originalData = rows.slice(1).map(row => {
        const rowData = {};
        // Map each cell value to its corresponding header
        originalHeaders.forEach((header, index) => {
            // If cell exists, trim it; otherwise use empty string
            rowData[header] = row[index] ? row[index].trim() : '';
        });
        return rowData;
    });
    
    // Process data rows for certificate generation
    // This creates a modified version where First Name + Last Name = Name
    parsedData = rows.slice(1).map(row => {
        const rowData = {};
        
        // Find the indices of 'first name' and 'last name' columns (case-insensitive)
        const firstNameIndex = originalHeaders.findIndex(h => h.toLowerCase() === 'first name');
        const lastNameIndex = originalHeaders.findIndex(h => h.toLowerCase() === 'last name');
        
        // Create Name column if both first and last name columns exist
        // This combined name will be displayed on certificates
        if (firstNameIndex !== -1 && lastNameIndex !== -1) {
            rowData['Name'] = `${row[firstNameIndex].trim()} ${row[lastNameIndex].trim()}`;
        }
        
        // Add all other columns (excluding first and last name)
        // These columns will be available for selection in the UI
        originalHeaders.forEach((header, index) => {
            if (header.toLowerCase() !== 'first name' && header.toLowerCase() !== 'last name') {
                rowData[header] = row[index] ? row[index].trim() : '';
            }
        });
        
        return rowData;
    });
    
    // Return filtered headers for certificate UI generation
    // This excludes 'first name' and 'last name' since they're combined into 'Name'
    // These headers will appear in the drag-and-drop column selection interface
    return originalHeaders.filter(h => 
        h.toLowerCase() !== 'first name' && 
        h.toLowerCase() !== 'last name'
    );
}
