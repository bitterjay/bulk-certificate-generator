import { initializeElementStates, initializeElementStatesWithLayout, detectAvailableElementsFromData } from './elementState.js';
import { syncStateToSlides } from './elementControls.js';
import { initializeThemeSystem } from '../theme/themeManager.js';
import { 
    calculateSlideDimensions, 
    createTextElementWithState, 
    formatDateForDisplay,
    createConcatenatedContentWithSpans
} from '../utils/domUtils.js';
import { getElementState } from './elementState.js';
import { parsedData } from '../dataParsing.js';

// Global variable to store the Swiper instance
let swiperInstance = null;

// Global variable to store loaded layout presets
let loadedLayoutPresets = {};

// Function to find the longest values in each column for the example slide
function findLongestValuesInData(selectedColumns) {
    if (!parsedData || parsedData.length === 0) {
        return {
            name: 'Sample Name',
            concatenated: 'Sample Info',
            date: '12/31/2024',
            individualColumns: {}
        };
    }

    const result = {
        name: '',
        concatenated: '',
        date: '12/31/2024',
        individualColumns: {}
    };

    // Find longest name
    parsedData.forEach(row => {
        if (row.Name && row.Name.length > result.name.length) {
            result.name = row.Name;
        }
    });

    // Find the row that produces the longest concatenated string
    let longestConcatenatedLength = 0;
    let longestConcatenatedContent = '';
    
    parsedData.forEach(row => {
        if (selectedColumns.length > 0) {
            // Use the same logic as certificate slides for consistency
            const concatenatedContent = selectedColumns
                .map(col => row[col] || '')
                .filter(value => value.trim() !== '')
                .join('   <span class="pipe-separator">|</span>   ');
            
            if (concatenatedContent.length > longestConcatenatedLength) {
                longestConcatenatedLength = concatenatedContent.length;
                longestConcatenatedContent = concatenatedContent;
            }
        }
    });
    
    result.concatenated = longestConcatenatedContent;

    // Find longest values for individual columns (non-selected, non-Name columns)
    const remainingColumns = Object.keys(parsedData[0] || {})
        .filter(col => !selectedColumns.includes(col) && col !== 'Name');

    remainingColumns.forEach(col => {
        let longestValue = '';
        parsedData.forEach(row => {
            if (row[col] && row[col].toString().length > longestValue.length) {
                longestValue = row[col].toString();
            }
        });
        result.individualColumns[col] = longestValue;
    });

    return result;
}

// Function to calculate slide dimensions based on image aspect ratio
function updateSwiperContainerHeight(height) {
    const swiperContainer = document.getElementById('preview-slider');
    if (swiperContainer) {
        // Add some padding for navigation elements
        const totalHeight = height + 100; // Extra space for pagination and margins
        swiperContainer.style.height = `${totalHeight}px`;
        swiperContainer.style.minHeight = `${totalHeight}px`;
    }
}

// Generate preview slider function
export async function generatePreviewSlider(selectedColumns, date, orientation, layoutPreset = null) {
    // DEBUG: Log preview generation start
    console.log('=== GENERATE PREVIEW SLIDER STARTED ===');
    console.log('Parameters received:');
    console.log('- selectedColumns:', selectedColumns);
    console.log('- date:', date);
    console.log('- orientation:', orientation);
    console.log('- layoutPreset:', layoutPreset);
    console.log('- parsedData:', parsedData);
    console.log('- parsedData length:', parsedData ? parsedData.length : 'undefined');
    
    const previewContainer = document.getElementById('preview-container');
    previewContainer.innerHTML = ''; // Clear previous previews

    // Calculate slide dimensions based on image aspect ratio
    const slideDimensions = calculateSlideDimensions();
    console.log('Slide dimensions:', slideDimensions);
    
    // Update Swiper container height to match slide dimensions
    updateSwiperContainerHeight(slideDimensions.height);

    // Initialize theme system and element states BEFORE creating slides
    console.log('Initializing theme system...');
    await initializeThemeSystem();
    
    console.log('=== DETECTING AVAILABLE ELEMENTS ===');
    // Pre-detect what elements will be available based on data structure
    const availableElements = detectAvailableElementsFromData(selectedColumns, parsedData);
    console.log('Available elements detected:', availableElements);
    
    console.log('=== INITIALIZING ELEMENT STATES ===');
    // Auto-use default layout if no specific layout is provided
    const effectiveLayoutPreset = layoutPreset || loadedLayoutPresets['default'] || null;
    console.log('Effective layout preset:', effectiveLayoutPreset);
    
    if (effectiveLayoutPreset) {
        initializeElementStatesWithLayout(availableElements, effectiveLayoutPreset);
    } else {
        initializeElementStates(availableElements);
    }

    // Log element states after initialization
    console.log('Element states after initialization:', window.elementStates);

    // Now create slides with state-driven positioning
    console.log('=== CREATING EXAMPLE SLIDE ===');
    const exampleSlide = createExampleSlide(selectedColumns, slideDimensions);
    previewContainer.appendChild(exampleSlide);

    console.log('=== CREATING CERTIFICATE SLIDES ===');
    // Check if parsedData is available and has content
    if (!parsedData || parsedData.length === 0) {
        console.error('No parsed data available for preview generation');
        return;
    }
    
    // Create slides for each data row
    parsedData.forEach((row, index) => {
        console.log(`Creating slide ${index + 1} for row:`, row);
        const slide = createCertificateSlide(row, selectedColumns, date, orientation, index, slideDimensions);
        previewContainer.appendChild(slide);
    });

    // Initialize Swiper
    console.log('Initializing Swiper...');
    initializeSwiper();
    
    // Add click listeners to all elements
    console.log('Setting up element interactions...');
    addElementClickListeners();
    
    // Show element controls after everything is ready
    showElementControls();
    
    console.log('=== PREVIEW GENERATION COMPLETE ===');
}

function initializeSwiper() {
    // Destroy existing Swiper instance if it exists
    if (swiperInstance) {
        swiperInstance.destroy(true, true);
        swiperInstance = null;
    }

    // Wait a brief moment for DOM to be ready
    setTimeout(() => {
        // Check if Swiper is available
        if (typeof Swiper === 'undefined') {
            console.error('Swiper library not loaded');
            return;
        }

        // Initialize new Swiper instance
        swiperInstance = new Swiper('#preview-slider', {
            // Basic settings
            slidesPerView: 1,
            spaceBetween: 30,
            loop: false,
            centeredSlides: true,

            // DISABLE touch/swipe interactions to prevent conflicts with drag system
            allowTouchMove: false,        // Disable touch swiping
            simulateTouch: false,         // Disable mouse drag simulation
            touchRatio: 0,               // Disable touch sensitivity
            grabCursor: false,           // Remove grab cursor

            // KEEP navigation arrows
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },

            // Pagination (visual only, not clickable)
            pagination: {
                el: '.swiper-pagination',
                clickable: false,        // Disable pagination clicks
                dynamicBullets: true,
            },

            // DISABLE keyboard navigation to prevent conflicts
            keyboard: {
                enabled: false,          // Disable arrow key navigation
            },

            // Events
            on: {
                slideChange: handleSlideChange,
            },

            // Responsive breakpoints
            breakpoints: {
                640: {
                    slidesPerView: 1,
                    spaceBetween: 20,
                },
                768: {
                    slidesPerView: 1,
                    spaceBetween: 30,
                },
                1024: {
                    slidesPerView: 1,
                    spaceBetween: 40,
                },
            },

            // Effects
            effect: 'slide',
            speed: 300,
        });

        console.log('Swiper initialized successfully');
    }, 100);
}

// Create example slide showing maximum length elements
function createExampleSlide(selectedColumns, slideDimensions) {
    const slide = document.createElement('div');
    slide.classList.add('swiper-slide', 'example-slide');
    
    // Create a container for the certificate
    const certificateContainer = document.createElement('div');
    certificateContainer.classList.add('certificate-preview', 'example');
    certificateContainer.style.backgroundImage = `url(${window.uploadedImage})`;
    certificateContainer.style.backgroundSize = 'cover';
    certificateContainer.style.backgroundPosition = 'center';
    certificateContainer.style.position = 'relative';
    
    // Apply calculated dimensions
    certificateContainer.style.width = `${slideDimensions.width}px`;
    certificateContainer.style.height = `${slideDimensions.height}px`;

    // Get the longest values from actual data
    const longestValues = findLongestValuesInData(selectedColumns);

    // Create name element using longest actual name
    const nameElement = createTextElementWithState(longestValues.name, 'name-element', 0, slideDimensions, false, getElementState);
    certificateContainer.appendChild(nameElement);

    // Create concatenated column element with actual longest concatenated content
    if (selectedColumns.length > 0 && longestValues.concatenated) {
        // Content already has HTML spans from findLongestValuesInData
        const concatenatedElement = createTextElementWithState(
            longestValues.concatenated, 
            'concatenated-element', 0, slideDimensions, true, getElementState
        );
        certificateContainer.appendChild(concatenatedElement);
    }

    // Create individual column elements with longest actual values
    const remainingColumns = Object.keys((parsedData && parsedData[0]) || {})
        .filter(col => !selectedColumns.includes(col) && col !== 'Name');
    
    remainingColumns.forEach((col, index) => {
        const longestValue = longestValues.individualColumns[col] || '';
        if (longestValue.trim() !== '') {
            const elementType = sanitizeClassName(col) + '-element';
            const columnElement = createTextElementWithState(longestValue, elementType, 0, slideDimensions, false, getElementState);
            certificateContainer.appendChild(columnElement);
        }
    });

    // Add date element
    const dateElement = createTextElementWithState(longestValues.date, 'date-element', 0, slideDimensions, false, getElementState);
    certificateContainer.appendChild(dateElement);

    slide.appendChild(certificateContainer);
    return slide;
}

// Create certificate slide for a specific data row
function createCertificateSlide(row, selectedColumns, date, orientation, index, slideDimensions) {
    const slide = document.createElement('div');
    slide.classList.add('swiper-slide', 'certificate-slide');
    slide.dataset.index = index;
    
    // Create a container for the certificate
    const certificateContainer = document.createElement('div');
    certificateContainer.classList.add('certificate-preview');
    certificateContainer.style.backgroundImage = `url(${window.uploadedImage})`;
    certificateContainer.style.backgroundSize = 'cover';
    certificateContainer.style.backgroundPosition = 'center';
    certificateContainer.style.position = 'relative';
    
    // Apply calculated dimensions
    certificateContainer.style.width = `${slideDimensions.width}px`;
    certificateContainer.style.height = `${slideDimensions.height}px`;

    // Create name element using state positioning
    const nameElement = createTextElementWithState(row.Name || '', 'name-element', index + 1, slideDimensions, false, getElementState);
    certificateContainer.appendChild(nameElement);

    // Create concatenated column element
    if (selectedColumns.length > 0) {
        const concatenatedContent = selectedColumns
            .map(col => row[col] || '')
            .filter(value => value.trim() !== '')
            .join('   <span class="pipe-separator">|</span>   ');
        
        if (concatenatedContent.trim() !== '') {
            const concatenatedElement = createTextElementWithState(concatenatedContent, 'concatenated-element', index + 1, slideDimensions, true, getElementState);
            certificateContainer.appendChild(concatenatedElement);
        }
    }

    // Create individual column elements using state positioning
    const remainingColumns = Object.keys(row)
        .filter(col => !selectedColumns.includes(col) && col !== 'Name');
    
    remainingColumns.forEach(col => {
        if (row[col] && row[col].toString().trim() !== '') {
            const elementType = sanitizeClassName(col) + '-element';
            const columnElement = createTextElementWithState(row[col] || '', elementType, index + 1, slideDimensions, false, getElementState);
            certificateContainer.appendChild(columnElement);
        }
    });

    // Add date element
    const formattedDate = formatDateForDisplay(date);
    const dateElement = createTextElementWithState(formattedDate || '', 'date-element', index + 1, slideDimensions, false, getElementState);
    certificateContainer.appendChild(dateElement);

    slide.appendChild(certificateContainer);
    return slide;
}

// Helper function to sanitize column names for CSS class usage
function sanitizeClassName(columnName) {
    return columnName
        .toLowerCase()                    // Convert to lowercase
        .replace(/\s+/g, '-')            // Replace spaces with hyphens
        .replace(/[^a-zA-Z0-9-_]/g, ''); // Remove invalid characters
}

// Layout management functions
export async function loadLayoutPresets() {
    const layoutFiles = [
        'default.json',
        'virtual-tournament.json',
        'in-person-competition.json', 
        'achievement-certificate.json'
    ];
    
    const layouts = {};
    
    for (const filename of layoutFiles) {
        try {
            const response = await fetch(`layouts/${filename}`);
            if (response.ok) {
                const layoutData = await response.json();
                const layoutId = filename.replace('.json', '');
                layouts[layoutId] = layoutData;
                console.log(`Loaded layout: ${layoutId}`);
            } else {
                console.warn(`Failed to load layout: ${filename} - ${response.status}`);
            }
        } catch (error) {
            console.error(`Error loading layout ${filename}:`, error);
        }
    }
    
    loadedLayoutPresets = layouts;
    console.log('Layout presets loaded:', Object.keys(layouts));
    return layouts;
}

export function applyLayoutPreset(layoutName) {
    const layout = loadedLayoutPresets[layoutName];
    if (!layout) {
        console.warn(`Layout preset '${layoutName}' not found`);
        return false;
    }
    
    console.log(`Applying layout preset: ${layoutName}`);
    
    // Apply element states from layout
    if (layout.elementStates) {
        Object.entries(layout.elementStates).forEach(([elementType, layoutState]) => {
            if (window.elementStates[elementType]) {
                // Merge layout state with current state, preserving user customizations
                const mergedState = {
                    ...window.elementStates[elementType],
                    ...layoutState,
                    lastUpdated: Date.now()
                };
                
                // Validate the merged state
                const validatedState = validateStateValues(elementType, mergedState);
                window.elementStates[elementType] = { ...window.elementStates[elementType], ...validatedState };
                
                console.log(`Applied layout state for ${elementType}:`, window.elementStates[elementType]);
            }
        });
        
        // Sync all changes to slides
        Object.keys(layout.elementStates).forEach(elementType => {
            if (window.elementStates[elementType]) {
                syncStateToSlides(elementType);
            }
        });
    }
    
    // Update current theme if specified
    if (layout.defaultTheme && window.availableThemes[layout.defaultTheme]) {
        window.currentTheme = layout.defaultTheme;
        console.log(`Set theme to: ${window.currentTheme}`);
    }
    
    return true;
}

export function getLayoutPreset(layoutName) {
    return loadedLayoutPresets[layoutName] || null;
}

export async function initializeLayoutSystem() {
    console.log('Initializing layout system...');
    
    try {
        // Initialize theme system first
        await initializeThemeSystem();
        
        // Load layout presets
        await loadLayoutPresets();
        
        console.log('Layout system initialized successfully');
        return true;
    } catch (error) {
        console.error('Error initializing layout system:', error);
        return false;
    }
}

// Generate layout dropdown options and set default as selected
export function generateLayoutOptions() {
    const layoutSelector = document.getElementById('layout-selector');
    if (!layoutSelector) return;
    
    // Clear existing options
    layoutSelector.innerHTML = '';
    
    // Create options for each layout
    Object.entries(loadedLayoutPresets).forEach(([layoutId, layout]) => {
        const option = document.createElement('option');
        option.value = layoutId;
        option.textContent = layout.name;
        
        // Set default as selected
        if (layoutId === 'default') {
            option.selected = true;
        }
        
        layoutSelector.appendChild(option);
    });
    
    // Update layout description for the default selection
    updateLayoutDescription('default');
}

// Update layout description display
export function updateLayoutDescription(layoutId) {
    const layout = loadedLayoutPresets[layoutId];
    const descriptionElement = document.getElementById('layout-description');
    const columnsElement = document.getElementById('layout-columns');
    
    if (layoutId && layout) {
        // Show layout information
        if (descriptionElement) {
            descriptionElement.textContent = layout.description || '';
            descriptionElement.style.display = 'block';
        }
        
        if (columnsElement) {
            if (layout.expectedColumns && layout.expectedColumns.length > 0) {
                columnsElement.innerHTML = `<strong>Works best with:</strong> ${layout.expectedColumns.join(', ')}`;
                columnsElement.style.display = 'block';
            } else {
                columnsElement.style.display = 'none';
            }
        }
    } else {
        // Hide layout information for manual configuration
        if (descriptionElement) {
            descriptionElement.style.display = 'none';
        }
        if (columnsElement) {
            columnsElement.style.display = 'none';
        }
    }
}

// Import functions from elementControls.js
import { 
    selectElement, 
    clearElementSelection, 
    showElementControls, 
    hideElementControls, 
    handleSlideChange, 
    generateElementButtons, 
    addElementClickListeners 
} from './elementControls.js';

// Export combined API for backward compatibility
export {
    selectElement,
    clearElementSelection,
    showElementControls,
    hideElementControls,
    handleSlideChange,
    generateElementButtons,
    swiperInstance
};
