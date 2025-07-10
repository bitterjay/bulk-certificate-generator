import { parseExcelData, parsedData } from '../modules/dataParsing.js';
import { handleImageUpload } from '../modules/imageUpload.js';
import { generatePreviewSlider } from '../modules/uiRendering.js';

// DOM Elements
const pasteDataTextarea = document.getElementById('paste-data');
const pasteFromClipboardButton = document.getElementById('paste-from-clipboard');
const manualPasteToggle = document.getElementById('manual-paste-toggle');
const useSampleDataButton = document.getElementById('use-sample-data');
const pasteStatus = document.getElementById('paste-status');
const showTableButton = document.getElementById('show-table');
const pngUploadInput = document.getElementById('png-upload');
const generatePreviewButton = document.getElementById('generate-preview');
const certificateDateInput = document.getElementById('certificate-date');
const certificateOrientationSelect = document.getElementById('certificate-orientation');
const columnSelectionSection = document.getElementById('column-selection');
const tableContainer = document.getElementById('table-container');

// State variables
let parsedHeaders = [];
let parsedRows = [];
let selectedColumns = [];
let isTableVisible = false;
let isManualPasteMode = false;

// Event Listeners
pasteFromClipboardButton.addEventListener('click', handleClipboardPaste);
manualPasteToggle.addEventListener('click', toggleManualPasteMode);
useSampleDataButton.addEventListener('click', handleUseSampleData);
pasteDataTextarea.addEventListener('input', handleDataPaste);
showTableButton.addEventListener('click', togglePastedDataTable);
pngUploadInput.addEventListener('change', handleImageUpload);
generatePreviewButton.addEventListener('click', handleGeneratePreview);

// Check if Clipboard API is supported
function isClipboardAPISupported() {
    return navigator.clipboard && navigator.clipboard.readText;
}

// Initialize the paste interface based on browser support
function initializePasteInterface() {
    if (!isClipboardAPISupported()) {
        // Show manual paste mode by default if clipboard API is not supported
        showManualPasteMode();
        pasteFromClipboardButton.style.display = 'none';
        pasteStatus.innerHTML = '<span class="warning">Clipboard API not supported. Please use manual paste.</span>';
    }
}

async function handleClipboardPaste() {
    try {
        pasteStatus.innerHTML = '<span class="info">Reading from clipboard...</span>';
        
        const clipboardText = await navigator.clipboard.readText();
        
        if (!clipboardText.trim()) {
            pasteStatus.innerHTML = '<span class="error">Clipboard is empty. Please copy data from Excel first.</span>';
            return;
        }
        
        // Set the clipboard content to the hidden textarea
        pasteDataTextarea.value = clipboardText;
        
        // Process the data
        handleDataPaste();
        
        pasteStatus.innerHTML = '<span class="success">Data pasted successfully!</span>';
        
    } catch (error) {
        console.error('Failed to read clipboard:', error);
        
        if (error.name === 'NotAllowedError') {
            pasteStatus.innerHTML = '<span class="error">Clipboard access denied. Please allow clipboard access or use manual paste.</span>';
        } else {
            pasteStatus.innerHTML = '<span class="error">Failed to read clipboard. Please try manual paste.</span>';
        }
        
        // Show manual paste option as fallback
        showManualPasteMode();
    }
}

function toggleManualPasteMode() {
    if (isManualPasteMode) {
        hideManualPasteMode();
    } else {
        showManualPasteMode();
    }
}

function showManualPasteMode() {
    pasteDataTextarea.style.display = 'block';
    manualPasteToggle.textContent = 'Hide Manual Paste';
    isManualPasteMode = true;
    pasteStatus.innerHTML = '<span class="info">Paste your Excel data in the text area below.</span>';
}

function hideManualPasteMode() {
    pasteDataTextarea.style.display = 'none';
    manualPasteToggle.textContent = 'Manual Paste';
    isManualPasteMode = false;
    pasteStatus.innerHTML = '';
}

function handleUseSampleData() {
    // Sample data from test-file.xlsx
    const sampleData = `First Name\tLast Name\tClub\tAge Class\tDivision\tGender\tDiscipline\tPlacement
Imtiaz\tJackasal\tTropical Troopers\tU13\tBarebow\tMen\tIndoor\t1st
Alex\tWyatt\tLegacy Archery Club\tU13\tBasic Compound\tMen\tIndoor\t1st
Nixon\tChambers\tDesert Sky Archers\tU13\tCompound\tMen\tIndoor\t1st
Jeremiah\tLovin\tLi'l Abner Archery\tU13\tFixed Pins\tMen\tIndoor\t1st
Jack\tBower\tCarolina Bullseyes\tU13\tRecurve\tMen\tIndoor\t1st`;

    // Set the sample data to the hidden textarea
    pasteDataTextarea.value = sampleData;
    
    // Process the data
    handleDataPaste();
    
    // Show success status
    pasteStatus.innerHTML = '<span class="success">Sample data loaded successfully!</span>';
    
    // Hide manual paste mode if it's showing
    if (isManualPasteMode) {
        hideManualPasteMode();
    }
}

function handleDataPaste() {
    const pastedData = pasteDataTextarea.value.trim();
    if (pastedData) {
        try {
            // Parse the data and get headers and rows
            parsedHeaders = parseExcelData(pastedData);
            parsedRows = parsedData; // Always set parsedRows to the global parsedData

            // Show table button
            showTableButton.style.display = 'inline-block';
            showTableButton.textContent = 'Show Table';
            isTableVisible = false;

            // Clear any existing table
            tableContainer.innerHTML = '';

            // Generate column selection UI
            generateColumnSelectionUI();
            
            // Update status
            if (pasteStatus.innerHTML.includes('info')) {
                pasteStatus.innerHTML = '<span class="success">Data processed successfully!</span>';
            }
        } catch (error) {
            console.error('Error parsing data:', error);
            pasteStatus.innerHTML = '<span class="error">Error parsing data. Please ensure you have copied the data correctly.</span>';
        }
    }
}

function togglePastedDataTable() {
    if (isTableVisible) {
        // Hide the table
        tableContainer.innerHTML = '';
        showTableButton.textContent = 'Show Table';
        isTableVisible = false;
    } else {
        // Show the table
        showPastedDataTable();
        showTableButton.textContent = 'Hide Table';
        isTableVisible = true;
    }
}

function showPastedDataTable() {
    tableContainer.innerHTML = ''; // Clear previous table

    // Create grid table as a div
    const table = document.createElement('div');
    table.classList.add('pasted-data-table');
    table.style.setProperty('--columns', parsedHeaders.length);

    // Add header cells
    parsedHeaders.forEach(header => {
        const headerDiv = document.createElement('div');
        headerDiv.classList.add('pasted-data-header');
        headerDiv.textContent = header;
        table.appendChild(headerDiv);
    });

    // Add data cells
    if (parsedRows && parsedRows.length > 0) {
        parsedRows.forEach(row => {
            parsedHeaders.forEach(header => {
                const cellDiv = document.createElement('div');
                cellDiv.classList.add('pasted-data-cell');
                cellDiv.textContent = row[header] !== undefined ? row[header] : '';
                table.appendChild(cellDiv);
            });
        });
    }

    tableContainer.appendChild(table);
}

function generateColumnSelectionUI() {
    columnSelectionSection.innerHTML = ''; // Clear previous UI

    // Create header for column selection
    const header = document.createElement('h3');
    header.textContent = 'Select Columns to Concatenate';
    columnSelectionSection.appendChild(header);

    // Filter out 'First Name' and 'Last Name'
    const selectableColumns = parsedHeaders.filter(
        header => header.toLowerCase() !== 'first name' &&
                  header.toLowerCase() !== 'last name'
    );

    // Create checkboxes for column selection
    selectableColumns.forEach(column => {
        const checkboxContainer = document.createElement('div');
        checkboxContainer.classList.add('checkbox-container');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `column-${column}`;
        checkbox.name = column;

        const label = document.createElement('label');
        label.htmlFor = `column-${column}`;
        label.textContent = column;

        checkboxContainer.appendChild(checkbox);
        checkboxContainer.appendChild(label);

        columnSelectionSection.appendChild(checkboxContainer);

        // Add event listener to track selected columns
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                selectedColumns.push(column);
            } else {
                selectedColumns = selectedColumns.filter(col => col !== column);
            }

            // Enable generate preview if conditions are met
            updateGeneratePreviewButton();
        });
    });
}

function updateGeneratePreviewButton() {
    const isImageUploaded = !!document.querySelector('#png-upload').files.length;
    const isDateSelected = !!certificateDateInput.value;

    generatePreviewButton.disabled = !(isImageUploaded && isDateSelected);
}

function handleGeneratePreview() {
    const date = certificateDateInput.value;
    const orientation = certificateOrientationSelect.value;

    // Generate preview slider
    generatePreviewSlider(selectedColumns, date, orientation);

    // Enable PDF generation button
    document.getElementById('generate-pdf').disabled = false;
}

// Update generate preview button state on image upload and date selection
pngUploadInput.addEventListener('change', updateGeneratePreviewButton);
certificateDateInput.addEventListener('change', updateGeneratePreviewButton);

// Initial setup
generatePreviewButton.disabled = true;
document.getElementById('generate-pdf').disabled = true;

// Initialize the interface based on browser capabilities
initializePasteInterface();
