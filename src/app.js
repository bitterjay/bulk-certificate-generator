import { parseExcelData, parsedData } from '../modules/dataParsing.js';
import { handleImageUpload, displayImagePreview } from '../modules/imageUpload.js';
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

// For debugging - expose data to global scope
window.debug = {
    get parsedData() { return parsedData; },
    get parsedHeaders() { return parsedHeaders; },
    get parsedRows() { return parsedRows; },
    get selectedColumns() { return selectedColumns; }
};

// Event Listeners
pasteFromClipboardButton.addEventListener('click', handleClipboardPaste);
manualPasteToggle.addEventListener('click', toggleManualPasteMode);
useSampleDataButton.addEventListener('click', handleUseSampleData);
pasteDataTextarea.addEventListener('input', handleDataPaste);
showTableButton.addEventListener('click', togglePastedDataTable);
pngUploadInput.addEventListener('change', function() {
    if (this.files && this.files[0]) {
        handleImageUpload(this.files[0]).then(base64Data => {
            displayImagePreview(base64Data);
        }).catch(error => {
            console.error('Error uploading image:', error);
        });
    }
});
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
    const sampleData = `First Name\tLast Name\tClub\tAge Class\tDivision\tGender\tDiscipline\tPlacement\nImtiaz\tJackasal\tTropical Troopers\tU13\tBarebow\tMen\tIndoor\t1st\nAlex\tWyatt\tLegacy Archery Club\tU13\tBasic Compound\tMen\tIndoor\t1st\nNixon\tChambers\tDesert Sky Archers\tU13\tCompound\tMen\tIndoor\t1st\nJeremiah\tLovin\tLi'l Abner Archery\tU13\tFixed Pins\tMen\tIndoor\t1st\nJack\tBower\tCarolina Bullseyes\tU13\tRecurve\tMen\tIndoor\t1st`;

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

    // Create instruction text
    const instruction = document.createElement('p');
    instruction.textContent = 'Drag columns from the available list to the concatenation area below. Order matters - columns will be concatenated left to right.';
    instruction.classList.add('instruction-text');
    columnSelectionSection.appendChild(instruction);

    // Filter out 'First Name' and 'Last Name'
    const selectableColumns = parsedHeaders.filter(
        header => header.toLowerCase() !== 'first name' &&
                  header.toLowerCase() !== 'last name'
    );

    // Create available columns container
    const availableColumnsLabel = document.createElement('h4');
    availableColumnsLabel.textContent = 'Available Columns:';
    columnSelectionSection.appendChild(availableColumnsLabel);

    const availableColumnsContainer = document.createElement('div');
    availableColumnsContainer.classList.add('available-columns');
    availableColumnsContainer.id = 'available-columns';
    columnSelectionSection.appendChild(availableColumnsContainer);

    // Create draggable column elements
    selectableColumns.forEach(column => {
        const columnTag = createDraggableColumnTag(column);
        availableColumnsContainer.appendChild(columnTag);
    });

    // Add drop zone event listeners to available columns container
    setupDropZoneEventListeners(availableColumnsContainer);

    // Create drop zone for concatenation
    const dropZoneLabel = document.createElement('h4');
    dropZoneLabel.textContent = 'Columns to Concatenate:';
    columnSelectionSection.appendChild(dropZoneLabel);

    const dropZone = document.createElement('div');
    dropZone.classList.add('concatenation-drop-zone');
    dropZone.id = 'concatenation-drop-zone';
    
    // Add placeholder text
    const placeholder = document.createElement('div');
    placeholder.classList.add('drop-zone-placeholder');
    placeholder.textContent = 'Drag columns here to concatenate';
    dropZone.appendChild(placeholder);

    // Add drop zone event listeners
    setupDropZoneEventListeners(dropZone);
    
    columnSelectionSection.appendChild(dropZone);

    // Reset selected columns
    selectedColumns = [];
    updateGeneratePreviewButton();
}

function createDraggableColumnTag(columnName) {
    const tag = document.createElement('div');
    tag.classList.add('column-tag');
    tag.textContent = columnName;
    tag.draggable = true;
    tag.dataset.column = columnName;

    // Add drag event listeners
    tag.addEventListener('dragstart', handleDragStart);
    tag.addEventListener('dragend', handleDragEnd);

    return tag;
}

function setupDropZoneEventListeners(dropZone) {
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('drop', handleDrop);
    dropZone.addEventListener('dragenter', handleDragEnter);
    dropZone.addEventListener('dragleave', handleDragLeave);
}

function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.column);
    e.dataTransfer.setData('source', e.target.parentElement.id);
    e.target.classList.add('dragging');
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    e.preventDefault();
    if (e.target.classList.contains('concatenation-drop-zone') || 
        e.target.parentElement.classList.contains('concatenation-drop-zone')) {
        e.currentTarget.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) {
        e.currentTarget.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const columnName = e.dataTransfer.getData('text/plain');
    const sourceId = e.dataTransfer.getData('source');
    const dropZone = document.getElementById('concatenation-drop-zone');
    const availableColumns = document.getElementById('available-columns');
    
    if (e.currentTarget.id === 'concatenation-drop-zone') {
        // Dropping into concatenation zone
        if (sourceId === 'available-columns') {
            // Moving from available columns to concatenation zone
            const draggedElement = Array.from(availableColumns.children)
                .find(child => child.dataset.column === columnName);
            
            if (draggedElement) {
                // Hide placeholder if it exists
                const placeholder = dropZone.querySelector('.drop-zone-placeholder');
                if (placeholder) {
                    placeholder.style.display = 'none';
                }
                
                // Remove from available columns
                draggedElement.remove();
                
                // Add to concatenation zone
                const newTag = createDraggableColumnTag(columnName);
                newTag.classList.add('concatenated-column');
                
                // Add remove functionality
                newTag.addEventListener('dblclick', () => removeConcatenatedColumn(columnName));
                
                dropZone.appendChild(newTag);
                
                // Update selected columns array
                selectedColumns.push(columnName);
                updateGeneratePreviewButton();
            }
        } else if (sourceId === 'concatenation-drop-zone') {
            // Reordering within concatenation zone
            const draggedElement = Array.from(dropZone.children)
                .find(child => child.dataset.column === columnName);
            
            if (draggedElement) {
                // Get drop position
                const afterElement = getDragAfterElement(dropZone, e.clientX);
                
                if (afterElement == null) {
                    dropZone.appendChild(draggedElement);
                } else {
                    dropZone.insertBefore(draggedElement, afterElement);
                }
                
                // Update selected columns order
                updateSelectedColumnsOrder();
            }
        }
    } else if (e.currentTarget.id === 'available-columns') {
        // Dropping back to available columns (removing from concatenation)
        if (sourceId === 'concatenation-drop-zone') {
            removeConcatenatedColumn(columnName);
        }
    }
}

function removeConcatenatedColumn(columnName) {
    const dropZone = document.getElementById('concatenation-drop-zone');
    const availableColumns = document.getElementById('available-columns');
    
    // Remove from concatenation zone
    const concatenatedTag = Array.from(dropZone.children)
        .find(child => child.dataset.column === columnName);
    
    if (concatenatedTag) {
        concatenatedTag.remove();
        
        // Add back to available columns
        const newTag = createDraggableColumnTag(columnName);
        availableColumns.appendChild(newTag);
        
        // Update selected columns array
        selectedColumns = selectedColumns.filter(col => col !== columnName);
        
        // Show placeholder if no columns left
        if (dropZone.children.length === 0 || 
            (dropZone.children.length === 1 && dropZone.querySelector('.drop-zone-placeholder'))) {
            const placeholder = dropZone.querySelector('.drop-zone-placeholder') || 
                              document.createElement('div');
            placeholder.classList.add('drop-zone-placeholder');
            placeholder.textContent = 'Drag columns here to concatenate';
            placeholder.style.display = 'block';
            if (!dropZone.contains(placeholder)) {
                dropZone.appendChild(placeholder);
            }
        }
        
        updateGeneratePreviewButton();
    }
}

function updateSelectedColumnsOrder() {
    const dropZone = document.getElementById('concatenation-drop-zone');
    selectedColumns = Array.from(dropZone.children)
        .filter(child => child.dataset.column)
        .map(child => child.dataset.column);
}

function getDragAfterElement(container, x) {
    const draggableElements = [...container.querySelectorAll('.column-tag:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = x - box.left - box.width / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
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
