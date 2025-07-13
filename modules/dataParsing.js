// Global variables to store both original and parsed data
export let parsedData = [];
export let originalHeaders = [];
export let originalData = [];

export function parseExcelData(pastedData) {
    // Split the data into rows
    const rows = pastedData.split('\n').map(row => row.split('\t'));
    
    // Extract original headers (first row) - store these for table display
    originalHeaders = rows[0].map(header => header.trim());
    
    // Store original data rows - preserve all columns for table display
    originalData = rows.slice(1).map(row => {
        const rowData = {};
        originalHeaders.forEach((header, index) => {
            rowData[header] = row[index] ? row[index].trim() : '';
        });
        return rowData;
    });
    
    // Process data rows for certificate generation (existing logic)
    parsedData = rows.slice(1).map(row => {
        const rowData = {};
        
        // Combine first and last name
        const firstNameIndex = originalHeaders.findIndex(h => h.toLowerCase() === 'first name');
        const lastNameIndex = originalHeaders.findIndex(h => h.toLowerCase() === 'last name');
        
        // Create Name column if first and last name exist
        if (firstNameIndex !== -1 && lastNameIndex !== -1) {
            rowData['Name'] = `${row[firstNameIndex].trim()} ${row[lastNameIndex].trim()}`;
        }
        
        // Add other columns (excluding first and last name)
        originalHeaders.forEach((header, index) => {
            if (header.toLowerCase() !== 'first name' && header.toLowerCase() !== 'last name') {
                rowData[header] = row[index] ? row[index].trim() : '';
            }
        });
        
        return rowData;
    });
    
    // Return filtered headers for certificate UI generation (existing behavior)
    return originalHeaders.filter(h => 
        h.toLowerCase() !== 'first name' && 
        h.toLowerCase() !== 'last name'
    );
}
