import { parseExcelData, parsedData, originalHeaders, originalData } from '../modules/dataParsing.js';
import { handleImageUpload, showViewImageButton, uploadedImage, imageOrientation, imageWidth, imageHeight, imageAspectRatio } from '../modules/imageUpload.js';
import { generatePreviewSlider, hideElementControls, elementStates, loadLayoutPresets, applyLayoutPreset, getLayoutPreset, initializeLayoutSystem, generateLayoutOptions, updateLayoutDescription } from '../modules/uiRendering.js';
import { generatePdfFromPreviews, savePDF } from '../modules/pdfGeneration.js';

// DOM Elements
const pasteDataTextarea = document.getElementById('paste-data');
const pasteFromClipboardButton = document.getElementById('paste-from-clipboard');
const manualPasteToggle = document.getElementById('manual-paste-toggle');
const useSampleDataButton = document.getElementById('use-sample-data');
const showTableButton = document.getElementById('show-table');
const pngUploadInput = document.getElementById('png-upload');
const generatePreviewButton = document.getElementById('generate-preview');
const generateTestPortraitButton = document.getElementById('generate-test-portrait-preview');
const generateTestLandscapeButton = document.getElementById('generate-test-landscape-preview');
const generatePdfButton = document.getElementById('generate-pdf');
const certificateDateInput = document.getElementById('certificate-date');
const todayButton = document.getElementById('today-button');
const columnSelectionSection = document.getElementById('column-selection');
const tableContainer = document.getElementById('table-container');
const layoutSelectionSection = document.getElementById('layout-selection');
const layoutSelector = document.getElementById('layout-selector');
const layoutDescription = document.getElementById('layout-description');
const layoutColumns = document.getElementById('layout-columns');

// State variables
let parsedHeaders = [];
let parsedRows = [];
let selectedColumns = [];
let isTableVisible = false;
let isManualPasteMode = false;
let availableLayouts = {};
let selectedLayout = null;

// For debugging - expose data to global scope
window.debug = {
    get parsedData() { return parsedData; },
    get originalHeaders() { return originalHeaders; },
    get originalData() { return originalData; },
    get parsedHeaders() { return parsedHeaders; },
    get parsedRows() { return parsedRows; },
    get selectedColumns() { return selectedColumns; }
};

// Toast Notification System
class ToastManager {
    constructor() {
        this.container = this.createContainer();
        this.toasts = new Set();
    }

    createContainer() {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    show(message, type = 'info', duration = null) {
        const toast = this.createToast(message, type);
        this.container.appendChild(toast);
        this.toasts.add(toast);

        // Trigger show animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Set auto-dismiss duration based on type
        if (duration === null) {
            switch (type) {
                case 'success': duration = 3000; break;
                case 'info': duration = 4000; break;
                case 'warning': duration = 5000; break;
                case 'error': duration = 8000; break;
                default: duration = 4000;
            }
        }

        // Auto-dismiss timer
        if (duration > 0) {
            this.startProgressBar(toast, duration);
            setTimeout(() => this.dismiss(toast), duration);
        }

        return toast;
    }

    createToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon"></div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" aria-label="Close">&times;</button>
            <div class="toast-progress">
                <div class="toast-progress-bar"></div>
            </div>
        `;

        // Close button functionality
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.dismiss(toast));

        // Click to dismiss (optional)
        toast.addEventListener('click', (e) => {
            if (e.target === toast || e.target.classList.contains('toast-content') || e.target.classList.contains('toast-message')) {
                this.dismiss(toast);
            }
        });

        return toast;
    }

    startProgressBar(toast, duration) {
        const progressBar = toast.querySelector('.toast-progress-bar');
        if (progressBar) {
            progressBar.style.transition = `width ${duration}ms linear`;
            requestAnimationFrame(() => {
                progressBar.style.width = '0%';
            });
        }
    }

    dismiss(toast) {
        if (!this.toasts.has(toast)) return;

        toast.classList.remove('show');
        toast.classList.add('hide');
        
        // Remove from DOM after animation
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            this.toasts.delete(toast);
        }, 300);
    }

    success(message, duration = null) {
        return this.show(message, 'success', duration);
    }

    error(message, duration = null) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration = null) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration = null) {
        return this.show(message, 'info', duration);
    }
}

// Initialize toast manager
const toast = new ToastManager();

// Lightbox functionality
function openLightbox() {
    const lightbox = document.getElementById('image-lightbox');
    const lightboxImage = document.getElementById('lightbox-image');
    
    if (lightbox && lightboxImage && uploadedImage) {
        lightboxImage.src = uploadedImage;
        lightbox.style.display = 'flex';
        requestAnimationFrame(() => {
            lightbox.classList.add('show');
        });
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }
}

function closeLightbox() {
    const lightbox = document.getElementById('image-lightbox');
    
    if (lightbox) {
        lightbox.classList.remove('show');
        setTimeout(() => {
            lightbox.style.display = 'none';
        }, 300);
        
        // Restore body scroll
        document.body.style.overflow = '';
    }
}

// Table Lightbox functionality
function openTableLightbox() {
    const tableLightbox = document.getElementById('table-lightbox');
    const lightboxTableContainer = document.getElementById('lightbox-table-container');
    
    if (tableLightbox && lightboxTableContainer) {
        // Generate table content
        generateLightboxTable(lightboxTableContainer);
        
        tableLightbox.style.display = 'flex';
        requestAnimationFrame(() => {
            tableLightbox.classList.add('show');
        });
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }
}

function closeTableLightbox() {
    const tableLightbox = document.getElementById('table-lightbox');
    
    if (tableLightbox) {
        tableLightbox.classList.remove('show');
        setTimeout(() => {
            tableLightbox.style.display = 'none';
        }, 300);
        
        // Restore body scroll
        document.body.style.overflow = '';
    }
}

function generateLightboxTable(container) {
    container.innerHTML = ''; // Clear previous table
    
    // Create grid table as a div - use ORIGINAL data for complete table display
    const table = document.createElement('div');
    table.classList.add('lightbox-table');
    table.style.setProperty('--columns', originalHeaders.length);

    // Add header cells - use original headers to show ALL columns
    originalHeaders.forEach(header => {
        const headerDiv = document.createElement('div');
        headerDiv.classList.add('pasted-data-header');
        headerDiv.textContent = header;
        table.appendChild(headerDiv);
    });

    // Add data cells - use original data to show ALL column values
    if (originalData && originalData.length > 0) {
        originalData.forEach(row => {
            originalHeaders.forEach(header => {
                const cellDiv = document.createElement('div');
                cellDiv.classList.add('pasted-data-cell');
                cellDiv.textContent = row[header] !== undefined ? row[header] : '';
                table.appendChild(cellDiv);
            });
        });
    }

    container.appendChild(table);
}

// File upload helper functions
function clearFileSelection() {
    const fileInput = document.getElementById('png-upload');
    const filenameDisplay = document.getElementById('filename-display');
    const uploadButton = document.getElementById('upload-trigger');
    const viewImageButton = document.getElementById('view-image-button');
    
    fileInput.value = '';
    filenameDisplay.style.display = 'none';
    uploadButton.innerHTML = '📁 Choose Certificate Background';
    viewImageButton.style.display = 'none';
    
    // Clear any uploaded image data and orientation display
    const orientationDisplay = document.querySelector('.orientation-display');
    if (orientationDisplay) {
        orientationDisplay.remove();
    }
    
    // Update preview button state
    updateGeneratePreviewButton();
    
    toast.info('File selection cleared');
}

function updateFilenameDisplay(filename) {
    const filenameDisplay = document.getElementById('filename-display');
    const filenameText = document.querySelector('.filename-text');
    const uploadButton = document.getElementById('upload-trigger');
    
    filenameText.textContent = filename;
    filenameDisplay.style.display = 'flex';
    uploadButton.innerHTML = '📁 Change Certificate Background';
}

// Event Listeners
pasteFromClipboardButton.addEventListener('click', handleClipboardPaste);
manualPasteToggle.addEventListener('click', toggleManualPasteMode);
useSampleDataButton.addEventListener('click', handleUseSampleData);
pasteDataTextarea.addEventListener('input', handleDataPaste);
showTableButton.addEventListener('click', togglePastedDataTable);
pngUploadInput.addEventListener('change', function() {
    if (this.files && this.files[0]) {
        const file = this.files[0];
        updateFilenameDisplay(file.name);
        
        handleImageUpload(file).then(base64Data => {
            // Set the uploaded image and dimensions to window for preview generator access
            window.uploadedImage = uploadedImage;
            window.imageAspectRatio = imageAspectRatio;
            window.imageWidth = imageWidth;
            window.imageHeight = imageHeight;
            window.imageOrientation = imageOrientation;
            showViewImageButton();
            // Update preview button state after orientation is detected
            updateGeneratePreviewButton();
        }).catch(error => {
            console.error('Error uploading image:', error);
            // Reset filename display on error
            clearFileSelection();
        });
    } else {
        // No file selected, clear display
        clearFileSelection();
    }
});
generatePreviewButton.addEventListener('click', handleGeneratePreview);
generateTestPortraitButton.addEventListener('click', handleGenerateTestPortraitPreview);
generateTestLandscapeButton.addEventListener('click', handleGenerateTestLandscapePreview);
generatePdfButton.addEventListener('click', handleGeneratePdf);
todayButton.addEventListener('click', handleTodayButtonClick);
layoutSelector.addEventListener('change', handleLayoutSelection);

// File upload button event listeners
document.getElementById('upload-trigger').addEventListener('click', function() {
    document.getElementById('png-upload').click();
});

document.getElementById('clear-file').addEventListener('click', function() {
    clearFileSelection();
});

// Lightbox event listeners
document.getElementById('view-image-button').addEventListener('click', openLightbox);

// Handle close buttons for both lightboxes
document.querySelectorAll('.lightbox-close').forEach(closeBtn => {
    closeBtn.addEventListener('click', function() {
        const lightbox = this.closest('.lightbox-overlay');
        if (lightbox.id === 'image-lightbox') {
            closeLightbox();
        } else if (lightbox.id === 'table-lightbox') {
            closeTableLightbox();
        }
    });
});

// Click outside to close lightboxes
document.getElementById('image-lightbox').addEventListener('click', function(e) {
    if (e.target === this) {
        closeLightbox();
    }
});

document.getElementById('table-lightbox').addEventListener('click', function(e) {
    if (e.target === this) {
        closeTableLightbox();
    }
});

// ESC key to close lightboxes
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeLightbox();
        closeTableLightbox();
    }
});

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
        toast.warning('Clipboard API not supported. Please use manual paste.');
    }
}

async function handleClipboardPaste() {
    try {
        toast.info('Reading from clipboard...');
        
        const clipboardText = await navigator.clipboard.readText();
        
        if (!clipboardText.trim()) {
            toast.error('Clipboard is empty. Please copy data from Excel first.');
            return;
        }
        
        // Set the clipboard content to the hidden textarea
        pasteDataTextarea.value = clipboardText;
        
        // Process the data
        handleDataPaste();
        
        toast.success('Data pasted successfully!');
        
    } catch (error) {
        console.error('Failed to read clipboard:', error);
        
        if (error.name === 'NotAllowedError') {
            toast.error('Clipboard access denied. Please allow clipboard access or use manual paste.');
        } else {
            toast.error('Failed to read clipboard. Please try manual paste.');
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
    toast.info('Paste your Excel data in the text area below.');
}

function hideManualPasteMode() {
    pasteDataTextarea.style.display = 'none';
    manualPasteToggle.textContent = 'Manual Paste';
    isManualPasteMode = false;
}

function handleUseSampleData() {
    // Sample data from test-file.xlsx
    const sampleData = `First Name\tLast Name\tClub\tAge Class\tDivision\tGender\tDiscipline\tPlacement\nImtiaz\tJackasal\tTropical Troopers\tU13\tBarebow\tMen\tIndoor\t1st\nAlex\tWyatt\tLegacy Archery Club\tU13\tBasic Compound\tMen\tIndoor\t1st\nNixon\tChambers\tDesert Sky Archers\tU13\tCompound\tMen\tIndoor\t1st\nJeremiah\tLovin\tLi'l Abner Archery\tU13\tFixed Pins\tMen\tIndoor\t1st\nJack\tBower\tCarolina Bullseyes\tU13\tRecurve\tMen\tIndoor\t1st`;

    // Set the sample data to the hidden textarea
    pasteDataTextarea.value = sampleData;
    
    // Process the data
    handleDataPaste();
    
    // Show success status
    toast.success('Sample data loaded successfully!');
    
    // Hide manual paste mode if it's showing
    if (isManualPasteMode) {
        hideManualPasteMode();
    }
}

function handleTodayButtonClick() {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    certificateDateInput.value = todayString;
    
    // Trigger change event to update preview button state
    certificateDateInput.dispatchEvent(new Event('change'));
    
    // Optional: Add visual feedback
    todayButton.textContent = 'Set!';
    setTimeout(() => {
        todayButton.textContent = 'Today';
    }, 1000);
}

async function handleGenerateTestPortraitPreview() {
    try {
        // Update button text to show loading
        generateTestPortraitButton.textContent = 'Loading Portrait Test...';
        generateTestPortraitButton.disabled = true;
        
        // Step 1: Load sample data
        handleUseSampleData();
        
        // Step 2: Set today's date
        handleTodayButtonClick();
        
        // Step 3: Load test portrait image
        const response = await fetch('test-files/test-portrait.png');
        if (!response.ok) {
            throw new Error(`Failed to fetch test portrait image: ${response.status}`);
        }
        
        const blob = await response.blob();
        const file = new File([blob], 'test-portrait.png', { type: 'image/png' });
        
        // Step 4: Process the image upload
        updatePortraitButtonText('Processing Portrait Image...');
        const base64Data = await handleImageUpload(file);
        // Set the uploaded image and dimensions to window for preview generator access
        window.uploadedImage = uploadedImage;
        window.imageAspectRatio = imageAspectRatio;
        window.imageWidth = imageWidth;
        window.imageHeight = imageHeight;
        window.imageOrientation = imageOrientation;
        showViewImageButton();
        
        // Step 5: Set default column concatenation (use some interesting columns)
        updatePortraitButtonText('Configuring Columns...');
        await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause for UI updates
        
        // Auto-select some columns for concatenation
        if (parsedHeaders.includes('Division') && parsedHeaders.includes('Placement')) {
            selectedColumns = ['Division', 'Placement'];
            updateColumnSelectionUI();
        }
        
        // Step 6: Generate preview
        updatePortraitButtonText('Generating Portrait Preview...');
        await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause
        
        handleGeneratePreview();
        
        // Reset button
        updatePortraitButtonText('Portrait Test Complete!');
        setTimeout(() => {
            generateTestPortraitButton.textContent = 'Test Portrait Preview';
            generateTestPortraitButton.disabled = false;
        }, 2000);
        
    } catch (error) {
        console.error('Error generating portrait test preview:', error);
        generateTestPortraitButton.textContent = 'Portrait Error - Try Again';
        generateTestPortraitButton.disabled = false;
        
        // Show error in toast
        toast.error(`Portrait test error: ${error.message}`);
        
        setTimeout(() => {
            generateTestPortraitButton.textContent = 'Test Portrait Preview';
        }, 3000);
    }
}

async function handleGenerateTestLandscapePreview() {
    try {
        // Update button text to show loading
        generateTestLandscapeButton.textContent = 'Loading Landscape Test...';
        generateTestLandscapeButton.disabled = true;
        
        // Step 1: Load sample data
        handleUseSampleData();
        
        // Step 2: Set today's date
        handleTodayButtonClick();
        
        // Step 3: Load test landscape image
        const response = await fetch('test-files/test-landscape.jpg');
        if (!response.ok) {
            throw new Error(`Failed to fetch test landscape image: ${response.status}`);
        }
        
        const blob = await response.blob();
        const file = new File([blob], 'test-landscape.jpg', { type: 'image/jpeg' });
        
        // Step 4: Process the image upload
        updateLandscapeButtonText('Processing Landscape Image...');
        const base64Data = await handleImageUpload(file);
        // Set the uploaded image and dimensions to window for preview generator access
        window.uploadedImage = uploadedImage;
        window.imageAspectRatio = imageAspectRatio;
        window.imageWidth = imageWidth;
        window.imageHeight = imageHeight;
        window.imageOrientation = imageOrientation;
        showViewImageButton();
        
        // Step 5: Set default column concatenation (use some interesting columns)
        updateLandscapeButtonText('Configuring Columns...');
        await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause for UI updates
        
        // Auto-select some columns for concatenation
        if (parsedHeaders.includes('Division') && parsedHeaders.includes('Placement')) {
            selectedColumns = ['Division', 'Placement'];
            updateColumnSelectionUI();
        }
        
        // Step 6: Generate preview
        updateLandscapeButtonText('Generating Landscape Preview...');
        await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause
        
        handleGeneratePreview();
        
        // Reset button
        updateLandscapeButtonText('Landscape Test Complete!');
        setTimeout(() => {
            generateTestLandscapeButton.textContent = 'Test Landscape Preview';
            generateTestLandscapeButton.disabled = false;
        }, 2000);
        
    } catch (error) {
        console.error('Error generating landscape test preview:', error);
        generateTestLandscapeButton.textContent = 'Landscape Error - Try Again';
        generateTestLandscapeButton.disabled = false;
        
        // Show error in toast
        toast.error(`Landscape test error: ${error.message}`);
        
        setTimeout(() => {
            generateTestLandscapeButton.textContent = 'Test Landscape Preview';
        }, 3000);
    }
}

function updatePortraitButtonText(text) {
    generateTestPortraitButton.textContent = text;
}

function updateLandscapeButtonText(text) {
    generateTestLandscapeButton.textContent = text;
}

function updateColumnSelectionUI() {
    // Update the visual column selection to reflect the programmatically selected columns
    const dropZone = document.getElementById('concatenation-drop-zone');
    const availableColumns = document.getElementById('available-columns');
    
    if (!dropZone || !availableColumns) return;
    
    selectedColumns.forEach(columnName => {
        // Find the column in available columns
        const columnElement = Array.from(availableColumns.children)
            .find(child => child.dataset.column === columnName);
        
        if (columnElement) {
            // Remove from available columns
            columnElement.remove();
            
            // Add to concatenation zone
            const newTag = createDraggableColumnTag(columnName);
            newTag.classList.add('concatenated-column');
            newTag.addEventListener('dblclick', () => removeConcatenatedColumn(columnName));
            
            // Hide placeholder if it exists
            const placeholder = dropZone.querySelector('.drop-zone-placeholder');
            if (placeholder) {
                placeholder.style.display = 'none';
            }
            
            dropZone.appendChild(newTag);
        }
    });
}

function handleDataPaste() {
    const pastedData = pasteDataTextarea.value.trim();
    if (pastedData) {
        try {
            // Hide element controls when new data is pasted
            hideElementControls();
            
            // Hide preview area when new data is pasted
            document.getElementById('preview-area').style.display = 'none';
            
            // Parse the data and get headers and rows
            parsedHeaders = parseExcelData(pastedData);
            parsedRows = parsedData; // Always set parsedRows to the global parsedData

            // Show table button
            showTableButton.style.display = 'inline-block';
            showTableButton.textContent = 'View Table';
            isTableVisible = false;

            // Clear any existing table
            tableContainer.innerHTML = '';

            // Show layout selection section
            layoutSelectionSection.style.display = 'block';

            // Generate column selection UI
            generateColumnSelectionUI();
            
            // If a layout is selected, auto-configure columns
            if (selectedLayout) {
                autoConfigureColumnsForLayout(selectedLayout);
            }
            
            // Update status - only show success if we haven't already shown a success message
            if (!document.querySelector('.toast.success')) {
                toast.success('Data processed successfully!');
            }
        } catch (error) {
            console.error('Error parsing data:', error);
            toast.error('Error parsing data. Please ensure you have copied the data correctly.');
        }
    }
}

function togglePastedDataTable() {
    // Always open table in lightbox - no more toggle behavior
    openTableLightbox();
}

function showPastedDataTable() {
    // Legacy function - now redirects to lightbox
    openTableLightbox();
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

    // Create wrapper container for h4s and main containers only
    const columnSelectionContainer = document.createElement('div');
    columnSelectionContainer.id = 'column-selection-container';

    // Filter out 'First Name' and 'Last Name'
    const selectableColumns = parsedHeaders.filter(
        header => header.toLowerCase() !== 'first name' &&
                  header.toLowerCase() !== 'last name'
    );

    // Create grid column for available columns
    const availableGridColumn = document.createElement('div');
    availableGridColumn.classList.add('grid-column');

    // Create available columns container
    const availableColumnsLabel = document.createElement('h4');
    availableColumnsLabel.textContent = 'Available Columns:';
    availableGridColumn.appendChild(availableColumnsLabel);

    const availableColumnsContainer = document.createElement('div');
    availableColumnsContainer.classList.add('available-columns');
    availableColumnsContainer.id = 'available-columns';
    availableGridColumn.appendChild(availableColumnsContainer);

    // Create draggable column elements
    selectableColumns.forEach(column => {
        const columnTag = createDraggableColumnTag(column);
        availableColumnsContainer.appendChild(columnTag);
    });

    // Add drop zone event listeners to available columns container
    setupDropZoneEventListeners(availableColumnsContainer);

    columnSelectionContainer.appendChild(availableGridColumn);

    // Create grid column for concatenation drop zone
    const concatenationGridColumn = document.createElement('div');
    concatenationGridColumn.classList.add('grid-column');

    // Create drop zone for concatenation
    const dropZoneLabel = document.createElement('h4');
    dropZoneLabel.textContent = 'Columns to Concatenate:';
    concatenationGridColumn.appendChild(dropZoneLabel);

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
    
    concatenationGridColumn.appendChild(dropZone);

    columnSelectionContainer.appendChild(concatenationGridColumn);

    // Append the wrapper container to the column selection section
    columnSelectionSection.appendChild(columnSelectionContainer);

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
    // Use auto-detected orientation from image upload module
    const orientation = imageOrientation;

    // DEBUG: Log generate button click data
    console.log('=== GENERATE PREVIEW BUTTON CLICKED ===');
    console.log('Selected columns:', selectedColumns);
    console.log('Date:', date);
    console.log('Orientation:', orientation);
    console.log('Selected layout:', selectedLayout);
    console.log('Parsed headers:', parsedHeaders);
    console.log('Parsed data length:', parsedData ? parsedData.length : 'undefined');
    console.log('Parsed data sample:', parsedData ? parsedData[0] : 'undefined');
    
    // Show the preview area
    document.getElementById('preview-area').style.display = 'block';

    // Generate preview slider with layout preset
    generatePreviewSlider(selectedColumns, date, orientation, selectedLayout);

    // Enable PDF generation button
    document.getElementById('generate-pdf').disabled = false;
}

async function handleGeneratePdf() {
    try {
        // Disable button to prevent multiple clicks
        generatePdfButton.disabled = true;
        generatePdfButton.textContent = 'Generating PDF...';

        // Get all preview slides
        const previews = document.querySelectorAll('.swiper-slide');
        
        // Generate PDF
        const pdfBytes = await generatePdfFromPreviews(previews, imageOrientation, elementStates);

        // Save the PDF
        await savePDF(pdfBytes, 'certificates.pdf');

        // Re-enable button
        generatePdfButton.textContent = 'Generate PDF';
        // The button remains disabled because a new preview must be generated to create another PDF
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        // Re-enable button and show error
        generatePdfButton.disabled = false;
        generatePdfButton.textContent = 'Error - Try Again';
        toast.error(`Failed to generate PDF: ${error.message}`);
    }
}

// Update generate preview button state on image upload and date selection
pngUploadInput.addEventListener('change', updateGeneratePreviewButton);
certificateDateInput.addEventListener('change', updateGeneratePreviewButton);

// Initial setup
generatePreviewButton.disabled = true;
document.getElementById('generate-pdf').disabled = true;


function handleLayoutSelection() {
    const selectedLayoutId = layoutSelector.value;
    
    if (selectedLayoutId) {
        selectedLayout = availableLayouts[selectedLayoutId];
        
        // Show layout information
        if (selectedLayout) {
            layoutDescription.textContent = selectedLayout.description;
            layoutDescription.style.display = 'block';
            
            // Show expected columns
            if (selectedLayout.expectedColumns && selectedLayout.expectedColumns.length > 0) {
                layoutColumns.innerHTML = `<strong>Works best with:</strong> ${selectedLayout.expectedColumns.join(', ')}`;
                layoutColumns.style.display = 'block';
            } else {
                layoutColumns.style.display = 'none';
            }
            
            // Auto-configure column concatenation if data is available
            if (parsedHeaders && parsedHeaders.length > 0) {
                autoConfigureColumnsForLayout(selectedLayout);
            }
            
            toast.success(`Layout "${selectedLayout.name}" selected`);
        }
    } else {
        // Manual configuration selected
        selectedLayout = null;
        layoutDescription.style.display = 'none';
        layoutColumns.style.display = 'none';
        toast.info('Manual configuration mode selected');
    }
}

function autoConfigureColumnsForLayout(layout) {
    if (!layout.expectedColumns || !parsedHeaders) return;
    
    // Clear current selection
    selectedColumns = [];
    
    // Auto-select columns that exist in the data
    const availableColumns = layout.expectedColumns.filter(col => 
        parsedHeaders.some(header => header.toLowerCase() === col.toLowerCase())
    );
    
    if (availableColumns.length > 0) {
        selectedColumns = availableColumns;
        
        // Update the UI if column selection is already generated
        if (document.getElementById('available-columns')) {
            updateColumnSelectionForLayout();
        }
        
        toast.info(`Auto-configured columns: ${availableColumns.join(', ')}`);
    }
}

function updateColumnSelectionForLayout() {
    // Save the current selection before regenerating UI
    const savedSelection = [...selectedColumns];
    
    // Regenerate the column selection UI to reflect auto-selected columns
    generateColumnSelectionUI();
    
    // Restore the saved selection
    selectedColumns = savedSelection;
    
    // Apply the selected columns to the UI
    selectedColumns.forEach(columnName => {
        const availableColumns = document.getElementById('available-columns');
        const dropZone = document.getElementById('concatenation-drop-zone');
        
        // Find the column in available columns
        const columnElement = Array.from(availableColumns.children)
            .find(child => child.dataset.column === columnName);
        
        if (columnElement && dropZone) {
            // Remove from available columns
            columnElement.remove();
            
            // Add to concatenation zone
            const newTag = createDraggableColumnTag(columnName);
            newTag.classList.add('concatenated-column');
            newTag.addEventListener('dblclick', () => removeConcatenatedColumn(columnName));
            
            // Hide placeholder if it exists
            const placeholder = dropZone.querySelector('.drop-zone-placeholder');
            if (placeholder) {
                placeholder.style.display = 'none';
            }
            
            dropZone.appendChild(newTag);
        }
    });
    
    // Update generate preview button state
    updateGeneratePreviewButton();
}

// Initialize the interface based on browser capabilities
initializePasteInterface();

// Initialize layout system
initializeLayoutSystem().then(() => {
    // Load layout presets and populate dropdown
    loadLayoutPresets().then(layouts => {
        availableLayouts = layouts;
        generateLayoutOptions();
        
        // Set up layout change event listener after dropdown is populated
        if (layoutSelector) {
            // Remove any existing listeners to prevent duplicates
            layoutSelector.removeEventListener('change', handleLayoutSelection);
            layoutSelector.addEventListener('change', handleLayoutSelection);
        }
        
        console.log('Layout system fully initialized');
    });
}).catch(error => {
    console.error('Error initializing layout system:', error);
});
