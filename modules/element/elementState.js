import { getDefaultColorForTheme, getDefaultPipeColor } from '../theme/themeManager.js';

// Element positioning state
export let elementStates = {};

// Function to get default positions for each element type
function getDefaultPosition(elementType) {
    const positions = {
        'name-element': { x: 50, y: 25 },        // center-top
        'concatenated-element': { x: 50, y: 40 }, // center below name
        'date-element': { x: 15, y: 90 },        // bottom-left
        'default': { x: 50, y: 45 }              // center-center for other elements
    };
    
    return positions[elementType] || positions['default'];
}

// Function to get default font size for each element type
function getDefaultFontSize(elementType) {
    const fontSizes = {
        'name-element': 36,
        'concatenated-element': 10,
        'date-element': 18,
        'default': 20
    };
    
    return fontSizes[elementType] || fontSizes['default'];
}

// Function to distribute positions for additional elements to avoid overlap
function getDistributedPosition(elementType, index) {
    // For additional elements (individual columns), distribute them vertically
    // Start below the concatenated element (which is at 40%)
    const baseY = 55; // Start below concatenated element
    const spacing = 8; // 8% vertical spacing between elements
    
    return {
        x: 50, // Center horizontally
        y: baseY + (index * spacing)
    };
}

// Initialize element states for all detected elements
export function initializeElementStates(availableElements) {
    console.log('=== INITIALIZING ELEMENT STATES ===');
    console.log('Available elements:', availableElements);
    
    // Clear existing states
    elementStates = {};

    // Separate individual column elements from main elements
    const mainElements = ['name-element', 'concatenated-element', 'date-element'];
    const individualElements = availableElements.filter(elementType => 
        !mainElements.includes(elementType)
    );
    
    console.log('Main elements:', mainElements);
    console.log('Individual elements:', individualElements);
    
    // Initialize states for each element type
    availableElements.forEach((elementType, index) => {
        let defaultPos;
        
        // Use distributed positioning for individual column elements
        if (individualElements.includes(elementType)) {
            const individualIndex = individualElements.indexOf(elementType);
            defaultPos = getDistributedPosition(elementType, individualIndex);
            console.log(`Individual element ${elementType} (index ${individualIndex}) assigned position:`, defaultPos);
        } else {
            defaultPos = getDefaultPosition(elementType);
            console.log(`Main element ${elementType} assigned position:`, defaultPos);
        }
        
        const defaultFontSize = getDefaultFontSize(elementType);
        
        // Determine lock defaults based on element type
        const shouldLockHorizontal = elementType !== 'date-element';
        
        elementStates[elementType] = {
            xPercent: defaultPos.x,
            yPercent: defaultPos.y,
            fontSize: defaultFontSize,
            theme: window.currentTheme || 'usa-archery',
            color: getDefaultColorForTheme(window.currentTheme || 'usa-archery'),
            pipeColor: getDefaultPipeColor(window.currentTheme || 'usa-archery'),
            lockHorizontal: shouldLockHorizontal,
            lockVertical: false,
            isVisible: true,
            isUppercase: false,
            lastUpdated: Date.now()
        };
        
        console.log(`Element state created for ${elementType}:`, elementStates[elementType]);
    });
    
    // Make elementStates available globally
    window.elementStates = elementStates;
    
    console.log('=== ELEMENT STATES INITIALIZATION COMPLETE ===');
    console.log('Final element states:', elementStates);
}

// Get complete state object for an element
export function getElementState(elementType) {
    return elementStates[elementType] || null;
}

// Update specific state properties for an element
export function updateElementState(elementType, updates, syncToSlides = true) {
    if (!elementStates[elementType]) {
        console.warn(`Element state not found for ${elementType}, creating new state`);
        const defaultPos = getDefaultPosition(elementType);
        const defaultFontSize = getDefaultFontSize(elementType);
        
        elementStates[elementType] = {
            xPercent: defaultPos.x,
            yPercent: defaultPos.y,
            fontSize: defaultFontSize,
            theme: window.currentTheme || 'usa-archery',
            color: getDefaultColorForTheme(window.currentTheme || 'usa-archery'),
            pipeColor: getDefaultPipeColor(window.currentTheme || 'usa-archery'),
            lockHorizontal: false,
            lockVertical: false,
            isVisible: true,
            isUppercase: false,
            lastUpdated: Date.now()
        };
    }
    
    // Validate and apply updates
    const validatedUpdates = validateStateValues(elementType, updates);
    Object.assign(elementStates[elementType], validatedUpdates);
    elementStates[elementType].lastUpdated = Date.now();
    
    // Update global state
    window.elementStates = elementStates;
    
    // Return the syncToSlides parameter
    return syncToSlides;
}

// Validate state values to ensure they're within acceptable ranges
export function validateStateValues(elementType, updates) {
    const validated = {};
    
    // Validate position percentages (0-100)
    if (updates.xPercent !== undefined) {
        validated.xPercent = clampPosition(updates.xPercent, 0, 100);
    }
    
    if (updates.yPercent !== undefined) {
        validated.yPercent = clampPosition(updates.yPercent, 0, 100);
    }
    
    // Validate font size (12-72px)
    if (updates.fontSize !== undefined) {
        validated.fontSize = clampPosition(updates.fontSize, 12, 72);
    }
    
    // Validate theme and color
    if (updates.theme !== undefined) {
        validated.theme = window.availableThemes && window.availableThemes[updates.theme] ? 
            updates.theme : (window.currentTheme || 'usa-archery');
    }
    
    if (updates.color !== undefined) {
        const theme = updates.theme || elementStates[elementType]?.theme || (window.currentTheme || 'usa-archery');
        validated.color = updates.color; // Simplified - actual validation will happen in themeManager
    }
    
    // Validate pipe color
    if (updates.pipeColor !== undefined) {
        const theme = updates.theme || elementStates[elementType]?.theme || (window.currentTheme || 'usa-archery');
        validated.pipeColor = updates.pipeColor; // Simplified - actual validation will happen in themeManager
    }
    
    // Validate boolean values
    if (updates.lockHorizontal !== undefined) {
        validated.lockHorizontal = Boolean(updates.lockHorizontal);
    }
    
    if (updates.lockVertical !== undefined) {
        validated.lockVertical = Boolean(updates.lockVertical);
    }
    
    if (updates.isVisible !== undefined) {
        validated.isVisible = Boolean(updates.isVisible);
    }
    
    if (updates.isUppercase !== undefined) {
        validated.isUppercase = Boolean(updates.isUppercase);
    }
    
    return validated;
}

// Clamp values within specified range
export function clampPosition(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// Conversion utilities
export function percentToPixels(percent, containerSize) {
    return (percent / 100) * containerSize;
}

export function pixelsToPercent(pixels, containerSize) {
    return (pixels / containerSize) * 100;
}

// Function to detect all available elements in the first slide
export function detectAvailableElements() {
    const firstSlide = document.querySelector('.swiper-slide .certificate-preview');
    if (!firstSlide) {
        console.warn('No first slide found for element detection');
        return [];
    }
    
    const elements = firstSlide.querySelectorAll('div[id]');
    const elementTypes = new Set();
    
    elements.forEach(element => {
        // Extract element type from ID (format: elementType-slideIndex)
        const id = element.id;
        if (id && id.includes('-')) {
            const lastDashIndex = id.lastIndexOf('-');
            const elementType = id.substring(0, lastDashIndex);
            elementTypes.add(elementType);
        }
    });
    
    return Array.from(elementTypes);
}

// Helper function to detect elements from data structure
export function detectAvailableElementsFromData(selectedColumns, parsedData) {
    console.log('=== DETECTING AVAILABLE ELEMENTS ===');
    console.log('Selected columns:', selectedColumns);
    console.log('Parsed data:', parsedData);
    console.log('Parsed data length:', parsedData ? parsedData.length : 'undefined');
    
    const elements = ['name-element', 'date-element']; // Always present
    
    // Add concatenated element if columns are selected
    if (selectedColumns && selectedColumns.length > 0) {
        elements.push('concatenated-element');
        console.log('Added concatenated element');
    }
    
    // Add individual column elements for unselected columns
    if (parsedData && parsedData.length > 0) {
        const allColumns = Object.keys(parsedData[0]);
        console.log('All columns in data:', allColumns);
        
        const unselectedColumns = allColumns.filter(col => 
            col !== 'Name' && 
            !selectedColumns.includes(col)
        );
        console.log('Unselected columns:', unselectedColumns);
        
        unselectedColumns.forEach(col => {
            const elementType = col.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-zA-Z0-9-_]/g, '') + '-element';
            elements.push(elementType);
            console.log(`Added individual element: ${elementType} for column: ${col}`);
        });
    }
    
    console.log('Final detected elements:', elements);
    return elements;
}

// Enhanced initializeElementStates to accept layout preset
export function initializeElementStatesWithLayout(availableElements, layoutPreset = null) {
    console.log('Initializing element states for:', availableElements);
    console.log('Layout preset:', layoutPreset);
    
    // Clear existing states
    elementStates = {};

    // Separate individual column elements from main elements
    const mainElements = ['name-element', 'concatenated-element', 'date-element'];
    const individualElements = availableElements.filter(elementType => 
        !mainElements.includes(elementType)
    );

    // Initialize states for each element type
    availableElements.forEach(elementType => {
        let defaultPos;
        
        // Use distributed positioning for individual column elements
        if (individualElements.includes(elementType)) {
            const individualIndex = individualElements.indexOf(elementType);
            defaultPos = getDistributedPosition(elementType, individualIndex);
        } else {
            defaultPos = getDefaultPosition(elementType);
        }
        
        const defaultFontSize = getDefaultFontSize(elementType);
        
        // Determine lock defaults based on element type
        const shouldLockHorizontal = elementType !== 'date-element';
        
        // Start with defaults
        elementStates[elementType] = {
            xPercent: defaultPos.x,
            yPercent: defaultPos.y,
            fontSize: defaultFontSize,
            theme: window.currentTheme || 'usa-archery',
            color: getDefaultColorForTheme(window.currentTheme || 'usa-archery'),
            pipeColor: getDefaultPipeColor(window.currentTheme || 'usa-archery'),
            lockHorizontal: shouldLockHorizontal,
            lockVertical: false,
            isVisible: true,
            isUppercase: false,
            lastUpdated: Date.now()
        };
        
        // Apply layout preset overrides if provided
        if (layoutPreset && layoutPreset.elementStates && layoutPreset.elementStates[elementType]) {
            const layoutState = layoutPreset.elementStates[elementType];
            const validatedState = validateStateValues(elementType, layoutState);
            elementStates[elementType] = { ...elementStates[elementType], ...validatedState };
            console.log(`Applied layout preset for ${elementType}:`, elementStates[elementType]);
        }
    });
    
    // Make elementStates available globally
    window.elementStates = elementStates;
    
    console.log('Element states initialized:', elementStates);
}

// Enhanced position management functions
export function getElementPosition(elementType) {
    const state = getElementState(elementType);
    return state ? { x: state.xPercent, y: state.yPercent } : getDefaultPosition(elementType);
}

export function setElementPosition(elementType, xPercent, yPercent) {
    return updateElementState(elementType, { xPercent, yPercent });
}

export function centerElementHorizontally(elementType) {
    const state = getElementState(elementType);
    if (state && !state.lockHorizontal) {
        return updateElementState(elementType, { xPercent: 50 });
    }
}

export function centerElementVertically(elementType) {
    const state = getElementState(elementType);
    if (state && !state.lockVertical) {
        return updateElementState(elementType, { yPercent: 50 });
    }
}

export function scaleElementByType(elementType, fontSize) {
    return updateElementState(elementType, { fontSize });
}
