// Global variable to store parsed data
export let parsedData = [];

export function parseExcelData(pastedData) {
    // Split the data into rows
    const rows = pastedData.split('\n').map(row => row.split('\t'));
    
    // Extract headers (first row)
    const headers = rows[0].map(header => header.trim());
    
    // Process data rows
    parsedData = rows.slice(1).map(row => {
        const rowData = {};
        
        // Combine first and last name
        const firstNameIndex = headers.findIndex(h => h.toLowerCase() === 'first name');
        const lastNameIndex = headers.findIndex(h => h.toLowerCase() === 'last name');
        
        // Create Name column if first and last name exist
        if (firstNameIndex !== -1 && lastNameIndex !== -1) {
            rowData['Name'] = `${row[firstNameIndex].trim()} ${row[lastNameIndex].trim()}`;
        }
        
        // Add other columns
        headers.forEach((header, index) => {
            if (header.toLowerCase() !== 'first name' && header.toLowerCase() !== 'last name') {
                rowData[header] = row[index] ? row[index].trim() : '';
            }
        });
        
        return rowData;
    });
    
    // Return headers for UI generation
    return headers.filter(h => 
        h.toLowerCase() !== 'first name' && 
        h.toLowerCase() !== 'last name'
    );
}
