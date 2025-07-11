import { parsedData } from './dataParsing.js';
import { uploadedImage, imageWidth, imageHeight, imageAspectRatio } from './imageUpload.js';

// Helper function to sanitize column names for CSS class usage
function sanitizeClassName(columnName) {
    return columnName
        .toLowerCase()                    // Convert to lowercase
        .replace(/\s+/g, '-')            // Replace spaces with hyphens
        .replace(/[^a-zA-Z0-9-_]/g, ''); // Remove invalid characters
}

// Helper function to format date from yyyy-mm-dd to mm/dd/yyyy
function formatDateForDisplay(dateString) {
    if (!dateString) return '';
    
    try {
        // Handle both yyyy-mm-dd and already formatted dates
        if (dateString.includes('/')) {
            return dateString; // Already in mm/dd/yyyy format
        }
        
        // Parse yyyy-mm-dd format
        const [year, month, day] = dateString.split('-');
        
        // Validate the parts
        if (!year || !month || !day) {
            return dateString; // Return original if parsing fails
        }
        
        // Format as mm/dd/yyyy with zero-padding
        const formattedMonth = month.padStart(2, '0');
        const formattedDay = day.padStart(2, '0');
        
        return `${formattedMonth}/${formattedDay}/${year}`;
    } catch (error) {
        console.warn('Error formatting date:', error);
        return dateString; // Return original date if formatting fails
    }
}

// Global variable to store the Swiper instance
let swiperInstance = null;

// Element positioning state - Enhanced for Step 3
export let elementStates = {};

// STEP 5: Theme Management State
let currentTheme = 'usa-archery';
let availableThemes = {};

// Element selection state
let currentSelectedElement = null;
let isElementControlsVisible = false;

// Performance optimization: Cache container dimensions during drag
let cachedContainerDimensions = null;

// Drag state management - Enhanced with offset tracking and performance optimization
let dragState = {
    isDragging: false,
    currentElement: null,
    startX: 0,
    startY: 0,
    elementType: null,
    initialOffsetX: 0,  // New: offset from mouse to element position
    initialOffsetY: 0,  // New: offset from mouse to element position
    initialElementX: 0, // New: element's initial position
    initialElementY: 0, // New: element's initial position
    animationFrameId: null // For smooth updates
};

// Function to get default positions for each element type
function getDefaultPosition(elementType) {
    const positions = {
        'name-element': { x: 50, y: 25 },        // center-top
        'concatenated-element': { x: 50, y: 60 }, // center-middle
        'date-element': { x: 85, y: 90 },        // bottom-right
        'default': { x: 50, y: 45 }              // center-center for other elements
    };
    
    return positions[elementType] || positions['default'];
}

// Function to get default font size for each element type
function getDefaultFontSize(elementType) {
    const fontSizes = {
        'name-element': 36,
        'concatenated-element': 24,
        'date-element': 18,
        'default': 20
    };
    
    return fontSizes[elementType] || fontSizes['default'];
}

// Function to distribute positions for additional elements to avoid overlap
function getDistributedPosition(elementType, index) {
    // For additional elements (individual columns), distribute them vertically
    const baseY = 35; // Start below the name
    const spacing = 8; // 8% vertical spacing between elements
    
    return {
        x: 50, // Center horizontally
        y: baseY + (index * spacing)
    };
}

// STEP 3: Enhanced State Management Functions

// Initialize element states for all detected elements
function initializeElementStates(availableElements) {
    console.log('Initializing element states for:', availableElements);
    
    // Clear existing states
    elementStates = {};
    
    // Initialize states for each element type
    availableElements.forEach(elementType => {
        const defaultPos = getDefaultPosition(elementType);
        const defaultFontSize = getDefaultFontSize(elementType);
        
        // By default, lock horizontal movement for all elements except date
        const shouldLockHorizontal = elementType !== 'date-element';
        
        elementStates[elementType] = {
            xPercent: defaultPos.x,
            yPercent: defaultPos.y,
            fontSize: defaultFontSize,
            theme: currentTheme,
            color: getDefaultColorForTheme(currentTheme),
            lockHorizontal: shouldLockHorizontal,
            lockVertical: false,
            isVisible: true,
            isUppercase: false,
            lastUpdated: Date.now()
        };
    });
    
    console.log('Element states initialized:', elementStates);
}

// Get complete state object for an element
function getElementState(elementType) {
    return elementStates[elementType] || null;
}

// Update specific state properties for an element
function updateElementState(elementType, updates, syncToSlides = true) {
    if (!elementStates[elementType]) {
        console.warn(`Element state not found for ${elementType}, creating new state`);
        const defaultPos = getDefaultPosition(elementType);
        const defaultFontSize = getDefaultFontSize(elementType);
        
        elementStates[elementType] = {
            xPercent: defaultPos.x,
            yPercent: defaultPos.y,
            fontSize: defaultFontSize,
            theme: currentTheme,
            color: getDefaultColorForTheme(currentTheme),
            lockHorizontal: false,
            lockVertical: false,
            isVisible: true,
            lastUpdated: Date.now()
        };
    }
    
    // Validate and apply updates
    const validatedUpdates = validateStateValues(elementType, updates);
    Object.assign(elementStates[elementType], validatedUpdates);
    elementStates[elementType].lastUpdated = Date.now();
    
    // Sync changes to all slides only if requested (performance optimization)
    if (syncToSlides) {
        syncStateToSlides(elementType);
    }
    
    // console.log(`Updated state for ${elementType}:`, elementStates[elementType]);
}

// Validate state values to ensure they're within acceptable ranges
function validateStateValues(elementType, updates) {
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
        validated.theme = availableThemes[updates.theme] ? updates.theme : currentTheme;
    }
    
    if (updates.color !== undefined) {
        const theme = updates.theme || elementStates[elementType]?.theme || currentTheme;
        validated.color = validateColorForTheme(theme, updates.color);
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
function clampPosition(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// Conversion utilities
function percentToPixels(percent, containerSize) {
    return (percent / 100) * containerSize;
}

function pixelsToPercent(pixels, containerSize) {
    return (pixels / containerSize) * 100;
}

function getContainerDimensions(slideIndex = 0) {
    const slide = document.querySelector(`.swiper-slide:nth-child(${slideIndex + 1}) .certificate-preview`);
    if (slide) {
        const rect = slide.getBoundingClientRect();
        return {
            width: rect.width,
            height: rect.height
        };
    }
    
    // Fallback to calculated dimensions
    return calculateSlideDimensions();
}

// Enhanced synchronization function
function syncStateToSlides(elementType) {
    const elements = document.querySelectorAll(`[id^="${elementType}-"]`);
    const state = elementStates[elementType];
    
    if (!state) {
        console.warn(`No state found for element type: ${elementType}`);
        return;
    }
    
    elements.forEach(element => {
        // Get the certificate container to calculate dimensions
        const certificateContainer = element.closest('.certificate-preview');
        if (certificateContainer) {
            const containerRect = certificateContainer.getBoundingClientRect();
            const pixelX = percentToPixels(state.xPercent, containerRect.width);
            const pixelY = percentToPixels(state.yPercent, containerRect.height);
            
            // Apply position
            element.style.left = `${pixelX}px`;
            element.style.top = `${pixelY}px`;
            element.dataset.centerX = pixelX;
            element.dataset.centerY = pixelY;
            
            // Apply font size
            element.style.fontSize = `${state.fontSize}px`;
            
            // Apply uppercase text transformation
            element.style.textTransform = state.isUppercase ? 'uppercase' : 'none';
            
            // Apply theme color
            applyThemeToElement(element, state.theme, state.color);
            
            // Apply visibility
            element.style.display = state.isVisible ? 'block' : 'none';
            
            // Center the element manually after positioning
            centerElementManually(element);
        }
    });
}

// Performance-optimized function to update only the dragged element
function updateDraggedElementPosition(elementType, xPercent, yPercent) {
    // Update state without syncing to all slides
    updateElementState(elementType, { xPercent, yPercent }, false);
    
    // Update only the currently dragged element
    const draggedElement = dragState.currentElement;
    if (draggedElement) {
        const container = draggedElement.closest('.certificate-preview');
        if (container) {
            const containerRect = cachedContainerDimensions || container.getBoundingClientRect();
            const pixelX = percentToPixels(xPercent, containerRect.width);
            const pixelY = percentToPixels(yPercent, containerRect.height);
            
            draggedElement.style.left = `${pixelX}px`;
            draggedElement.style.top = `${pixelY}px`;
            draggedElement.dataset.centerX = pixelX;
            draggedElement.dataset.centerY = pixelY;
            
            // Center the element manually
            centerElementManually(draggedElement);
        }
    }
}

// Function to detect all available elements in the first slide
function detectAvailableElements() {
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

// STEP 5: Theme Management Functions

// Load themes from JSON file
async function loadThemes() {
    try {
        const response = await fetch('themes.json');
        if (!response.ok) {
            throw new Error(`Failed to load themes: ${response.status}`);
        }
        const themeData = await response.json();
        availableThemes = themeData.themes;
        currentTheme = themeData.defaultTheme;
        
        console.log('Themes loaded successfully:', availableThemes);
        return true;
    } catch (error) {
        console.error('Error loading themes:', error);
        // Fall back to default theme structure
        availableThemes = {
            'usa-archery': {
                name: 'USA Archery',
                colors: {
                    red: '#aa1e2e',
                    blue: '#1c355e',
                    black: '#000000',
                    white: '#ffffff'
                },
                default: 'black'
            }
        };
        currentTheme = 'usa-archery';
        return false;
    }
}

// Initialize the theme system
async function initializeThemeSystem() {
    await loadThemes();
    console.log('Theme system initialized with theme:', currentTheme);
}

// Get theme colors for a specific theme
function getThemeColors(themeId) {
    return availableThemes[themeId]?.colors || {};
}

// Get theme color hex value
function getThemeColor(themeId, colorKey) {
    const colors = getThemeColors(themeId);
    return colors[colorKey] || colors.black || '#000000';
}

// Get default color for a theme
function getDefaultColorForTheme(themeId) {
    return availableThemes[themeId]?.default || 'black';
}

// Validate color exists in theme
function validateColorForTheme(themeId, colorKey) {
    const colors = getThemeColors(themeId);
    return colors[colorKey] ? colorKey : getDefaultColorForTheme(themeId);
}

// Set theme for an element
function setElementTheme(elementType, themeId) {
    if (!availableThemes[themeId]) {
        console.warn(`Theme ${themeId} not found, using current theme`);
        return;
    }
    
    const defaultColor = getDefaultColorForTheme(themeId);
    updateElementState(elementType, { theme: themeId, color: defaultColor });
}

// Set color for an element
function setElementColor(elementType, colorKey) {
    const state = getElementState(elementType);
    if (!state) {
        console.warn(`Element state not found for ${elementType}`);
        return;
    }
    
    const validatedColor = validateColorForTheme(state.theme, colorKey);
    updateElementState(elementType, { color: validatedColor });
}

// Apply theme color to DOM element with slide-specific behavior
function applyThemeToElement(element, themeId, colorKey) {
    const slideContainer = element.closest('.swiper-slide');
    const isExampleSlide = slideContainer?.classList.contains('example-slide') || 
                           slideContainer?.querySelector('h3')?.textContent?.includes('Example');
    
    const color = getThemeColor(themeId, colorKey);
    
    if (isExampleSlide) {
        // Example slide - ensure visibility with background/shadow
        element.style.color = color;
        // element.style.textShadow = '2px 2px 4px rgba(255,255,255,0.8)';
        element.style.background = 'rgba(255,255,255,0.8)';
    } else {
        // Certificate data slides - pure theme color
        element.style.color = color;
        // Remove any visibility aids
        element.style.textShadow = '';
        element.style.background = '';
    }
}

// Generate color buttons for a theme
function generateColorButtons(themeId) {
    const colors = getThemeColors(themeId);
    const paletteContainer = document.getElementById('color-palette');
    
    if (!paletteContainer) return;
    
    // Clear existing buttons
    paletteContainer.innerHTML = '';
    
    // Create color buttons
    Object.entries(colors).forEach(([colorKey, colorValue]) => {
        const button = document.createElement('button');
        button.classList.add('color-button');
        button.style.backgroundColor = colorValue;
        button.style.border = colorValue === '#ffffff' ? '2px solid #ccc' : '2px solid transparent';
        button.title = colorKey.charAt(0).toUpperCase() + colorKey.slice(1);
        button.dataset.colorKey = colorKey;
        
        // Add click event listener
        button.addEventListener('click', () => {
            if (currentSelectedElement) {
                setElementColor(currentSelectedElement, colorKey);
                updateColorSelection(currentSelectedElement);
            }
        });
        
        paletteContainer.appendChild(button);
    });
}

// Update color selection display
function updateColorSelection(elementType) {
    const state = getElementState(elementType);
    if (!state) return;
    
    // Update theme dropdown
    const themeSelector = document.getElementById('theme-selector');
    if (themeSelector) {
        themeSelector.value = state.theme;
    }
    
    // Update color button selection
    const colorButtons = document.querySelectorAll('.color-button');
    colorButtons.forEach(button => {
        if (button.dataset.colorKey === state.color) {
            button.classList.add('selected');
        } else {
            button.classList.remove('selected');
        }
    });
    
    // Update selected color box display
    const colorBoxDisplay = document.getElementById('selected-color-indicator');
    if (colorBoxDisplay) {
        const colorValue = getThemeColor(state.theme, state.color);
        colorBoxDisplay.style.backgroundColor = colorValue;
        colorBoxDisplay.title = state.color.charAt(0).toUpperCase() + state.color.slice(1);
    }
}

// Initialize theme event listeners
function initializeThemeEventListeners() {
    const themeSelector = document.getElementById('theme-selector');
    
    if (themeSelector) {
        themeSelector.addEventListener('change', (e) => {
            const newTheme = e.target.value;
            if (currentSelectedElement && availableThemes[newTheme]) {
                // Update element to new theme with default color
                setElementTheme(currentSelectedElement, newTheme);
                
                // Regenerate color buttons for new theme
                generateColorButtons(newTheme);
                
                // Update color selection display
                updateColorSelection(currentSelectedElement);
            }
        });
    }
}

// Generate theme dropdown options
function generateThemeOptions() {
    const themeSelector = document.getElementById('theme-selector');
    if (!themeSelector) return;
    
    // Clear existing options
    themeSelector.innerHTML = '';
    
    // Create options for each theme
    Object.entries(availableThemes).forEach(([themeId, theme]) => {
        const option = document.createElement('option');
        option.value = themeId;
        option.textContent = theme.name;
        themeSelector.appendChild(option);
    });
}

// DIRECT INTERACTION FEATURES

// Enhanced click-to-select and drag functionality
function addElementClickListeners() {
    // Add click and drag listeners to all certificate elements
    const allElements = document.querySelectorAll('.certificate-preview div[id]');
    allElements.forEach(element => {
        element.addEventListener('click', handleElementClick);
        element.addEventListener('mousedown', handleElementMouseDown);
    });
    
    // Add document click listener for click-outside-to-deselect
    addDocumentClickListener();
}

// Function to add document-level click listener for deselection
function addDocumentClickListener() {
    // Remove existing listener if present to prevent duplicates
    document.removeEventListener('click', handleDocumentClick);
    document.addEventListener('click', handleDocumentClick);
}

// Handle clicks outside of elements to deselect
function handleDocumentClick(event) {
    // Don't deselect during drag operations
    if (dragState.isDragging) return;
    
    // Don't deselect if no element is currently selected
    if (!currentSelectedElement) return;
    
    // Check if click is on certificate elements, controls, or buttons
    const isClickOnCertificate = event.target.closest('.certificate-preview');
    const isClickOnControls = event.target.closest('#element-controls');
    const isClickOnElement = event.target.closest('.certificate-preview div[id]');
    const isClickOnButton = event.target.closest('button');
    
    // Deselect if click is outside certificate area and not on controls/buttons
    if (!isClickOnCertificate && !isClickOnControls && !isClickOnButton) {
        clearElementSelection();
    }
}

function handleElementClick(event) {
    // Only handle click if not dragging
    if (!dragState.isDragging) {
        event.stopPropagation();
        const elementType = getElementTypeFromElement(event.target);
        if (elementType) {
            selectElement(elementType);
        }
    }
}

function getElementTypeFromElement(element) {
    // Extract element type from ID (format: elementType-slideIndex)
    const id = element.id;
    if (id && id.includes('-')) {
        const lastDashIndex = id.lastIndexOf('-');
        return id.substring(0, lastDashIndex);
    }
    return null;
}

// Enhanced drag functionality with offset tracking and performance optimization
function handleElementMouseDown(event) {
    // Only start drag if this element is selected
    const elementType = getElementTypeFromElement(event.target);
    if (elementType !== currentSelectedElement) {
        return; // Let click handler select the element first
    }
    
    event.preventDefault();
    event.stopPropagation();
    
    const container = event.target.closest('.certificate-preview');
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const elementRect = event.target.getBoundingClientRect();
    
    // Cache container dimensions for performance
    cachedContainerDimensions = containerRect;
    
    // Calculate the mouse position relative to the container
    const mouseX = event.clientX - containerRect.left;
    const mouseY = event.clientY - containerRect.top;
    
    // Calculate the element's current center position
    const elementCenterX = elementRect.left + elementRect.width / 2 - containerRect.left;
    const elementCenterY = elementRect.top + elementRect.height / 2 - containerRect.top;
    
    // Calculate the offset between mouse and element center
    const offsetX = mouseX - elementCenterX;
    const offsetY = mouseY - elementCenterY;
    
    // Store drag state with offset information
    dragState.isDragging = true;
    dragState.currentElement = event.target;
    dragState.elementType = elementType;
    dragState.startX = event.clientX;
    dragState.startY = event.clientY;
    dragState.initialOffsetX = offsetX;
    dragState.initialOffsetY = offsetY;
    dragState.initialElementX = elementCenterX;
    dragState.initialElementY = elementCenterY;
    
    // Add global event listeners
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    
    // Add dragging class and disable transitions
    dragState.currentElement.classList.add('dragging');
    
    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
}

function handleDragMove(event) {
    if (!dragState.isDragging) return;
    
    // Cancel any pending animation frame
    if (dragState.animationFrameId) {
        cancelAnimationFrame(dragState.animationFrameId);
    }
    
    // Use requestAnimationFrame for smooth updates
    dragState.animationFrameId = requestAnimationFrame(() => {
        const container = dragState.currentElement.closest('.certificate-preview');
        if (!container) return;
        
        // Use cached container dimensions for performance
        const containerRect = cachedContainerDimensions || container.getBoundingClientRect();
        
        // Calculate mouse position relative to container
        const mouseX = event.clientX - containerRect.left;
        const mouseY = event.clientY - containerRect.top;
        
        // Calculate new element center position by subtracting the stored offset
        const newElementCenterX = mouseX - dragState.initialOffsetX;
        const newElementCenterY = mouseY - dragState.initialOffsetY;
        
        // Convert to percentages
        let xPercent = (newElementCenterX / containerRect.width) * 100;
        let yPercent = (newElementCenterY / containerRect.height) * 100;
        
        // Get current state to check locks
        const currentState = getElementState(dragState.elementType);
        
        // If locked, use current position instead of calculated position
        if (currentState?.lockHorizontal) {
            xPercent = currentState.xPercent;
        }
        if (currentState?.lockVertical) {
            yPercent = currentState.yPercent;
        }
        
        // Clamp to valid range
        const clampedX = Math.max(0, Math.min(100, xPercent));
        const clampedY = Math.max(0, Math.min(100, yPercent));
        
        // Update position immediately for smooth dragging (optimized)
        updateDraggedElementPosition(dragState.elementType, clampedX, clampedY);
        
        // Don't update control widgets during drag for performance
        // showControlWidgets(); // Removed - will update on drag end
    });
}

function handleDragEnd(event) {
    if (!dragState.isDragging) return;
    
    // Cancel any pending animation frame
    if (dragState.animationFrameId) {
        cancelAnimationFrame(dragState.animationFrameId);
        dragState.animationFrameId = null;
    }
    
    // Remove global event listeners
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    
    // Remove dragging class
    dragState.currentElement.classList.remove('dragging');
    
    // Restore text selection
    document.body.style.userSelect = '';
    
    // Sync position to all slides now that drag is complete
    syncStateToSlides(dragState.elementType);
    
    // Update control widgets with final position
    showControlWidgets();
    
    // Clear cached container dimensions
    cachedContainerDimensions = null;
    
    // Reset drag state
    dragState.isDragging = false;
    dragState.currentElement = null;
    dragState.elementType = null;
    dragState.initialOffsetX = 0;
    dragState.initialOffsetY = 0;
    dragState.initialElementX = 0;
    dragState.initialElementY = 0;
}

// Function to calculate slide dimensions based on image aspect ratio
function calculateSlideDimensions() {
    const maxWidth = 800;
    
    // Use actual image aspect ratio if available, otherwise default
    const aspectRatio = imageAspectRatio > 0 ? imageAspectRatio : 1.33; // Default 4:3 ratio
    
    // Calculate height based on aspect ratio with max width
    let calculatedHeight = maxWidth / aspectRatio;
    let calculatedWidth = maxWidth;
    
    // Mobile responsive adjustments
    const isMobile = window.innerWidth <= 768;
    const isSmallMobile = window.innerWidth <= 480;
    
    if (isMobile) {
        // Scale down for mobile while maintaining aspect ratio
        const mobileMaxWidth = isSmallMobile ? window.innerWidth - 40 : window.innerWidth - 60;
        const scaleFactor = Math.min(1, mobileMaxWidth / maxWidth);
        
        calculatedWidth = maxWidth * scaleFactor;
        calculatedHeight = calculatedHeight * scaleFactor;
        
        // Also limit height on mobile
        const maxMobileHeight = isSmallMobile ? window.innerHeight * 0.6 : window.innerHeight * 0.7;
        if (calculatedHeight > maxMobileHeight) {
            const heightScaleFactor = maxMobileHeight / calculatedHeight;
            calculatedHeight = maxMobileHeight;
            calculatedWidth = calculatedWidth * heightScaleFactor;
        }
    }
    
    return {
        width: calculatedWidth,
        height: calculatedHeight
    };
}

// Function to get user-friendly element names
function getElementFriendlyName(elementType) {
    const friendlyNames = {
        'name-element': 'Name',
        'concatenated-element': 'Additional Info',
        'date-element': 'Date'
    };
    
    if (friendlyNames[elementType]) {
        return friendlyNames[elementType];
    }
    
    // For individual column elements, extract the column name
    if (elementType.endsWith('-element')) {
        const columnName = elementType.replace('-element', '');
        // Convert dash-separated back to proper title case
        return columnName.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }
    
    return elementType;
}

// Function to generate element selection buttons
function generateElementButtons() {
    const buttonsContainer = document.getElementById('element-buttons-container');
    if (!buttonsContainer) return;
    
    // Clear existing buttons
    buttonsContainer.innerHTML = '';
    
    // Get available elements from state
    const elementTypes = Object.keys(elementStates);
    
    if (elementTypes.length === 0) {
        console.warn('No element types found in state');
        return;
    }
    
    // Create buttons for each element type
    elementTypes.forEach(elementType => {
        const button = document.createElement('button');
        button.classList.add('element-button');
        button.textContent = getElementFriendlyName(elementType);
        button.dataset.elementType = elementType;
        
        // Add click event listener
        button.addEventListener('click', () => selectElement(elementType));
        
        buttonsContainer.appendChild(button);
    });
}

// Function to select an element
function selectElement(elementType) {
    // Clear previous selection
    clearElementSelection();
    
    // Set new selection
    currentSelectedElement = elementType;
    
    // Update button states
    updateElementButtonStates();
    
    // Apply highlighting to all elements of this type across all slides
    applyElementHighlighting(elementType);
    
    // Show control widgets area
    showControlWidgets();
}

// Function to clear element selection
function clearElementSelection() {
    if (currentSelectedElement) {
        // Remove highlighting from all elements
        const allElements = document.querySelectorAll(`[id^="${currentSelectedElement}-"]`);
        allElements.forEach(element => {
            element.classList.remove('element-selected');
        });
        
        currentSelectedElement = null;
    }
    
    // Update button states
    updateElementButtonStates();
    
    // Hide control widgets
    hideControlWidgets();
}

// Function to update button states
function updateElementButtonStates() {
    const buttons = document.querySelectorAll('.element-button');
    buttons.forEach(button => {
        const elementType = button.dataset.elementType;
        if (elementType === currentSelectedElement) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

// Function to apply highlighting to elements
function applyElementHighlighting(elementType) {
    const elements = document.querySelectorAll(`[id^="${elementType}-"]`);
    elements.forEach(element => {
        element.classList.add('element-selected');
    });
}

// Function to show control widgets
function showControlWidgets() {
    const controlWidgets = document.getElementById('control-widgets');
    if (controlWidgets && currentSelectedElement) {
        controlWidgets.classList.add('has-controls');
        
        // Get current state for display
        const state = getElementState(currentSelectedElement);
        const friendlyName = getElementFriendlyName(currentSelectedElement);
        
        controlWidgets.innerHTML = `
            <div class="control-header">
                <h4>Editing: ${friendlyName}</h4>
            </div>
            
            <div class="theme-controls">
                <div class="theme-selection">
                    <label>Theme:</label>
                    <select id="theme-selector" class="theme-dropdown">
                        <!-- Options populated by generateThemeOptions() -->
                    </select>
                </div>
                
                <div class="color-selection">
                    <label>Text Color:</label>
                    <div class="color-palette" id="color-palette">
                        <!-- Color buttons generated by generateColorButtons() -->
                    </div>
                    <div class="selected-color-display">
                        <span class="selected-color-label">Current:</span>
                        <div class="selected-color-box" id="selected-color-indicator"></div>
                    </div>
                </div>
            </div>
            
            <div class="position-controls">
                <div class="control-group">
                    <label>X Position: <span class="slider-value" id="x-position-display">${state.xPercent.toFixed(2)}%</span></label>
                    <input type="range" id="x-position-slider" class="control-slider" 
                           min="0" max="100" step="0.01" value="${state.xPercent.toFixed(2)}">
                </div>
                
                <div class="control-group">
                    <label>Y Position: <span class="slider-value" id="y-position-display">${state.yPercent.toFixed(2)}%</span></label>
                    <input type="range" id="y-position-slider" class="control-slider" 
                           min="0" max="100" step="0.01" value="${state.yPercent.toFixed(2)}">
                </div>
            </div>

            <div class="lock-controls">
                <div class="control-group">
                    <label>Movement Locks:</label>
                    <div class="lock-buttons">
                        <button id="lock-horizontal-toggle" class="lock-toggle-button" title="Lock Horizontal Movement">↔</button>
                        <button id="lock-vertical-toggle" class="lock-toggle-button" title="Lock Vertical Movement">↕</button>
                    </div>
                </div>
            </div>

            <div class="alignment-controls">
                <div class="control-group">
                    <label>Alignment:</label>
                    <div class="alignment-buttons">
                        <button id="center-horizontal-button" class="alignment-button">Center Horizontally</button>
                        <button id="center-vertical-button" class="alignment-button">Center Vertically</button>
                    </div>
                </div>
            </div>

            <div class="font-size-controls">
                <div class="control-group">
                    <label>Font Size: <span class="slider-value" id="font-size-display">${state.fontSize}px</span></label>
                    <input type="range" id="font-size-slider" class="control-slider" 
                           min="12" max="72" step="1" value="${state.fontSize}">
                </div>
                
                <div class="control-group">
                    <label>Text Transform:</label>
                    <button id="uppercase-toggle" class="uppercase-toggle-button" title="Toggle Uppercase Text">
                        <span class="uppercase-text">ABC</span>
                    </button>
                </div>
            </div>
            
            <div class="usage-tip">
                <p>💡 <strong>Tip:</strong> Use sliders for precise positioning, or click and drag elements directly!</p>
            </div>
        `;
        
        // Initialize theme system components
        generateThemeOptions();
        generateColorButtons(state.theme);
        updateColorSelection(currentSelectedElement);
        
        // Initialize event listeners
        initializeSliderEventListeners();
        initializeThemeEventListeners();
        initializeLockEventListeners();
        initializeAlignmentEventListeners();
        initializeFontSizeEventListeners();

        // Update lock button states
        updateLockButtonStates(currentSelectedElement);
    }
}

// Function to hide control widgets
function hideControlWidgets() {
    const controlWidgets = document.getElementById('control-widgets');
    if (controlWidgets) {
        controlWidgets.classList.remove('has-controls');
        controlWidgets.innerHTML = 'Select an element to edit its position and styling.';
    }
}

// Function to show element controls panel
function showElementControls() {
    const elementControls = document.getElementById('element-controls');
    if (elementControls) {
        elementControls.style.display = 'block';
        isElementControlsVisible = true;
        
        // Generate element buttons
        generateElementButtons();
    }
}

// Function to hide element controls panel
function hideElementControls() {
    const elementControls = document.getElementById('element-controls');
    if (elementControls) {
        elementControls.style.display = 'none';
        isElementControlsVisible = false;
        
        // Clear selection
        clearElementSelection();
    }
}

// Function to handle slide change events
function handleSlideChange() {
    // Re-apply highlighting if an element is selected
    if (currentSelectedElement) {
        // Small delay to ensure slide transition is complete
        setTimeout(() => {
            applyElementHighlighting(currentSelectedElement);
        }, 100);
    }
}

// Step 4: Slider Event Handling Functions

function initializeSliderEventListeners() {
    const xSlider = document.getElementById('x-position-slider');
    const ySlider = document.getElementById('y-position-slider');
    
    if (xSlider && ySlider) {
        // Handle real-time slider movement (input event)
        xSlider.addEventListener('input', (e) => handleSliderChange('x', e.target.value));
        ySlider.addEventListener('input', (e) => handleSliderChange('y', e.target.value));
        
        // Handle slider release (change event) - ensure final sync
        xSlider.addEventListener('change', (e) => {
            clearTimeout(sliderSyncTimeout);
            syncStateToSlides(currentSelectedElement);
        });
        ySlider.addEventListener('change', (e) => {
            clearTimeout(sliderSyncTimeout);
            syncStateToSlides(currentSelectedElement);
        });
    }
}

// Debouncing for slider sync
let sliderSyncTimeout = null;

function handleSliderChange(axis, value) {
    if (currentSelectedElement) {
        const numericValue = parseFloat(value);
        
        // Update display immediately
        if (axis === 'x') {
            document.getElementById('x-position-display').textContent = `${numericValue.toFixed(2)}%`;
        } else {
            document.getElementById('y-position-display').textContent = `${numericValue.toFixed(2)}%`;
        }
        
        // Update only the currently selected elements immediately (no sync)
        updateSelectedElementPosition(axis, numericValue);
        
        // Update state without syncing to all slides
        const updates = {};
        if (axis === 'x') {
            updates.xPercent = numericValue;
        } else {
            updates.yPercent = numericValue;
        }
        updateElementState(currentSelectedElement, updates, false); // false = don't sync
        
        // Debounce sync to all slides for performance
        clearTimeout(sliderSyncTimeout);
        sliderSyncTimeout = setTimeout(() => {
            syncStateToSlides(currentSelectedElement);
        }, 50); // Sync after 50ms of no slider movement
    }
}

// Optimized function to update only selected elements during slider movement
function updateSelectedElementPosition(axis, value) {
    const elements = document.querySelectorAll(`[id^="${currentSelectedElement}-"]`);
    
    elements.forEach(element => {
        // Add class to disable transitions for frictionless movement
        element.classList.add('slider-updating');
        
        const container = element.closest('.certificate-preview');
        if (container) {
            const containerRect = container.getBoundingClientRect();
            const state = getElementState(currentSelectedElement);
            
            let newX = state.xPercent;
            let newY = state.yPercent;
            
            if (axis === 'x') {
                newX = value;
            } else {
                newY = value;
            }
            
            const pixelX = percentToPixels(newX, containerRect.width);
            const pixelY = percentToPixels(newY, containerRect.height);
            
            element.style.left = `${pixelX}px`;
            element.style.top = `${pixelY}px`;
            element.dataset.centerX = pixelX;
            element.dataset.centerY = pixelY;
            
            centerElementManually(element);
        }
        
        // Remove the class after a short delay to re-enable transitions
        setTimeout(() => {
            element.classList.remove('slider-updating');
        }, 100);
    });
}

function updateSliderValues(elementType) {
    const state = getElementState(elementType);
    if (state) {
        const xSlider = document.getElementById('x-position-slider');
        const ySlider = document.getElementById('y-position-slider');
        const xDisplay = document.getElementById('x-position-display');
        const yDisplay = document.getElementById('y-position-display');
        
        if (xSlider && ySlider && xDisplay && yDisplay) {
            xSlider.value = state.xPercent.toFixed(2);
            ySlider.value = state.yPercent.toFixed(2);
            xDisplay.textContent = `${state.xPercent.toFixed(2)}%`;
            yDisplay.textContent = `${state.yPercent.toFixed(2)}%`;

            // Respect lock state
            xSlider.disabled = state.lockHorizontal;
            ySlider.disabled = state.lockVertical;
        }

        // Update font size slider
        updateFontSizeSlider(elementType);
    }
}

// STEP 6: Lock Functions
function initializeLockEventListeners() {
    const lockHorizontalButton = document.getElementById('lock-horizontal-toggle');
    const lockVerticalButton = document.getElementById('lock-vertical-toggle');

    if (lockHorizontalButton) {
        lockHorizontalButton.addEventListener('click', () => {
            if (currentSelectedElement) {
                toggleLockHorizontal(currentSelectedElement);
            }
        });
    }

    if (lockVerticalButton) {
        lockVerticalButton.addEventListener('click', () => {
            if (currentSelectedElement) {
                toggleLockVertical(currentSelectedElement);
            }
        });
    }
}

function toggleLockHorizontal(elementType) {
    const state = getElementState(elementType);
    if (state) {
        const newLockState = !state.lockHorizontal;
        updateElementState(elementType, { lockHorizontal: newLockState });
        updateLockButtonStates(elementType);
        updateSliderValues(elementType); // To disable/enable slider
    }
}

function toggleLockVertical(elementType) {
    const state = getElementState(elementType);
    if (state) {
        const newLockState = !state.lockVertical;
        updateElementState(elementType, { lockVertical: newLockState });
        updateLockButtonStates(elementType);
        updateSliderValues(elementType); // To disable/enable slider
    }
}

function updateLockButtonStates(elementType) {
    const state = getElementState(elementType);
    if (state) {
        const lockHorizontalButton = document.getElementById('lock-horizontal-toggle');
        const lockVerticalButton = document.getElementById('lock-vertical-toggle');

        if (lockHorizontalButton) {
            lockHorizontalButton.classList.toggle('active', state.lockHorizontal);
        }
        if (lockVerticalButton) {
            lockVerticalButton.classList.toggle('active', state.lockVertical);
        }
    }
}

// STEP 7: Alignment Functions
function initializeAlignmentEventListeners() {
    const centerHorizontalButton = document.getElementById('center-horizontal-button');
    const centerVerticalButton = document.getElementById('center-vertical-button');

    if (centerHorizontalButton) {
        centerHorizontalButton.addEventListener('click', () => {
            if (currentSelectedElement) {
                centerElementHorizontally(currentSelectedElement);
                updateSliderValues(currentSelectedElement);
            }
        });
    }

    if (centerVerticalButton) {
        centerVerticalButton.addEventListener('click', () => {
            if (currentSelectedElement) {
                centerElementVertically(currentSelectedElement);
                updateSliderValues(currentSelectedElement);
            }
        });
    }
}

// STEP 8: Font Size Functions
function initializeFontSizeEventListeners() {
    const fontSizeSlider = document.getElementById('font-size-slider');
    const uppercaseToggle = document.getElementById('uppercase-toggle');
    
    if (fontSizeSlider) {
        // Handle real-time slider movement (input event)
        fontSizeSlider.addEventListener('input', (e) => handleFontSizeChange(e.target.value));
        
        // Handle slider release (change event) - ensure final sync
        fontSizeSlider.addEventListener('change', (e) => {
            clearTimeout(fontSizeSyncTimeout);
            syncStateToSlides(currentSelectedElement);
        });
    }
    
    if (uppercaseToggle) {
        uppercaseToggle.addEventListener('click', () => {
            if (currentSelectedElement) {
                toggleElementUppercase(currentSelectedElement);
            }
        });
    }
}

// Debouncing for font size sync
let fontSizeSyncTimeout = null;

function handleFontSizeChange(value) {
    if (currentSelectedElement) {
        const numericValue = parseInt(value);
        
        // Update display immediately
        document.getElementById('font-size-display').textContent = `${numericValue}px`;
        
        // Update only the currently selected elements immediately (no sync)
        updateSelectedElementFontSize(numericValue);
        
        // Update state without syncing to all slides
        updateElementState(currentSelectedElement, { fontSize: numericValue }, false); // false = don't sync
        
        // Debounce sync to all slides for performance
        clearTimeout(fontSizeSyncTimeout);
        fontSizeSyncTimeout = setTimeout(() => {
            syncStateToSlides(currentSelectedElement);
        }, 50); // Sync after 50ms of no slider movement
    }
}

// Optimized function to update only selected elements during font size slider movement
function updateSelectedElementFontSize(fontSize) {
    const elements = document.querySelectorAll(`[id^="${currentSelectedElement}-"]`);
    
    elements.forEach(element => {
        // Add class to disable transitions for frictionless movement
        element.classList.add('slider-updating');
        
        element.style.fontSize = `${fontSize}px`;
        
        // Remove the class after a short delay to re-enable transitions
        setTimeout(() => {
            element.classList.remove('slider-updating');
        }, 100);
    });
}

function updateFontSizeSlider(elementType) {
    const state = getElementState(elementType);
    if (state) {
        const fontSizeSlider = document.getElementById('font-size-slider');
        const fontSizeDisplay = document.getElementById('font-size-display');
        
        if (fontSizeSlider && fontSizeDisplay) {
            fontSizeSlider.value = state.fontSize;
            fontSizeDisplay.textContent = `${state.fontSize}px`;
        }
        
        // Update uppercase button state
        updateUppercaseButtonState(elementType);
    }
}

// Toggle uppercase text transformation
function toggleElementUppercase(elementType) {
    const state = getElementState(elementType);
    if (state) {
        const newUppercaseState = !state.isUppercase;
        updateElementState(elementType, { isUppercase: newUppercaseState });
        updateUppercaseButtonState(elementType);
    }
}

// Update uppercase button visual state
function updateUppercaseButtonState(elementType) {
    const state = getElementState(elementType);
    const uppercaseButton = document.getElementById('uppercase-toggle');
    
    if (uppercaseButton && state) {
        uppercaseButton.classList.toggle('active', state.isUppercase);
    }
}


export function generatePreviewSlider(selectedColumns, date, orientation) {
    const previewContainer = document.getElementById('preview-container');
    previewContainer.innerHTML = ''; // Clear previous previews

    // Calculate slide dimensions based on image aspect ratio
    const slideDimensions = calculateSlideDimensions();
    
    // Update Swiper container height to match slide dimensions
    updateSwiperContainerHeight(slideDimensions.height);

    // First, create an "example" slide with maximum width elements
    const exampleSlide = createExampleSlide(selectedColumns, slideDimensions);
    previewContainer.appendChild(exampleSlide);

    // Create slides for each data row
    parsedData.forEach((row, index) => {
        const slide = createCertificateSlide(row, selectedColumns, date, orientation, index, slideDimensions);
        previewContainer.appendChild(slide);
    });

    // Initialize Swiper
    initializeSwiper();
    
    // STEP 3 & 5: Initialize theme system and element states after slides are created
    setTimeout(async () => {
        // Initialize theme system first
        await initializeThemeSystem();
        
        // Then initialize element states (which now includes theme data)
        const availableElements = detectAvailableElements();
        initializeElementStates(availableElements);
        
        // Add click listeners to all elements
        addElementClickListeners();
        
        // Show element controls after states are initialized
        showElementControls();
    }, 200);
}

function updateSwiperContainerHeight(height) {
    const swiperContainer = document.getElementById('preview-slider');
    if (swiperContainer) {
        // Add some padding for navigation elements
        const totalHeight = height + 100; // Extra space for pagination and margins
        swiperContainer.style.height = `${totalHeight}px`;
        swiperContainer.style.minHeight = `${totalHeight}px`;
    }
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

function createExampleSlide(selectedColumns, slideDimensions) {
    const slide = document.createElement('div');
    slide.classList.add('swiper-slide', 'example-slide');
    
    // Create a container for the certificate
    const certificateContainer = document.createElement('div');
    certificateContainer.classList.add('certificate-preview', 'example');
    certificateContainer.style.backgroundImage = `url(${uploadedImage})`;
    certificateContainer.style.backgroundSize = 'cover';
    certificateContainer.style.backgroundPosition = 'center';
    certificateContainer.style.position = 'relative';
    
    // Apply calculated dimensions
    certificateContainer.style.width = `${slideDimensions.width}px`;
    certificateContainer.style.height = `${slideDimensions.height}px`;

    // Create elements with clean example content using absolute positioning
    const nameElement = createTextElement('Name', 'name-element', 0, slideDimensions);
    certificateContainer.appendChild(nameElement);

    // Create concatenated column element
    if (selectedColumns.length > 0) {
        const concatenatedElement = createTextElement(
            selectedColumns.map(col => col).join(' - '), 
            'concatenated-element', 0, slideDimensions
        );
        certificateContainer.appendChild(concatenatedElement);
    }

    // Create individual column elements with distributed positions
    const remainingColumns = Object.keys(parsedData[0] || {})
        .filter(col => !selectedColumns.includes(col) && col !== 'Name');
    
    remainingColumns.forEach((col, index) => {
        const elementType = sanitizeClassName(col) + '-element';
        const columnElement = createTextElement(col, elementType, 0, slideDimensions);
        
        // Apply distributed position for additional elements
        const position = getDistributedPosition(elementType, index);
        const pixelX = (slideDimensions.width * position.x) / 100;
        const pixelY = (slideDimensions.height * position.y) / 100;
        
        columnElement.style.left = `${pixelX}px`;
        columnElement.style.top = `${pixelY}px`;
        columnElement.dataset.centerX = pixelX;
        columnElement.dataset.centerY = pixelY;
        
        certificateContainer.appendChild(columnElement);
    });

    // Add date element with formatted date
    const dateElement = createTextElement('12/31/2024', 'date-element', 0, slideDimensions);
    certificateContainer.appendChild(dateElement);
    
    // Center all elements manually after they are added to DOM
    setTimeout(() => {
        centerElementManually(nameElement);
        if (selectedColumns.length > 0) {
            const concatenatedElement = certificateContainer.querySelector('.concatenated');
            if (concatenatedElement) centerElementManually(concatenatedElement);
        }
        centerElementManually(dateElement);
        
        // Center additional elements
        remainingColumns.forEach((col, index) => {
            const sanitizedCol = sanitizeClassName(col);
            const element = certificateContainer.querySelector(`#${sanitizedCol}-element-0`);
            if (element) centerElementManually(element);
        });
    }, 0);

    slide.appendChild(certificateContainer);
    return slide;
}

function createCertificateSlide(row, selectedColumns, date, orientation, index, slideDimensions) {
    const slide = document.createElement('div');
    slide.classList.add('swiper-slide', 'certificate-slide');
    slide.dataset.index = index;
    
    // Create a container for the certificate
    const certificateContainer = document.createElement('div');
    certificateContainer.classList.add('certificate-preview');
    certificateContainer.style.backgroundImage = `url(${uploadedImage})`;
    certificateContainer.style.backgroundSize = 'cover';
    certificateContainer.style.backgroundPosition = 'center';
    certificateContainer.style.position = 'relative';
    
    // Apply calculated dimensions
    certificateContainer.style.width = `${slideDimensions.width}px`;
    certificateContainer.style.height = `${slideDimensions.height}px`;

    // Create name element (concatenated first and last name) with absolute positioning
    const nameElement = createTextElement(row.Name || '', 'name-element', index + 1, slideDimensions);
    certificateContainer.appendChild(nameElement);

    // Create concatenated column element
    let concatenatedElement = null;
    if (selectedColumns.length > 0) {
        const concatenatedContent = selectedColumns
            .map(col => row[col] || '')
            .filter(value => value.trim() !== '') // Filter out empty values
            .join(' - ');
        
        if (concatenatedContent.trim() !== '') {
            concatenatedElement = createTextElement(concatenatedContent, 'concatenated-element', index + 1, slideDimensions);
            certificateContainer.appendChild(concatenatedElement);
        }
    }

    // Create individual column elements with distributed positions
    const remainingColumns = Object.keys(row)
        .filter(col => !selectedColumns.includes(col) && col !== 'Name');
    
    const additionalElements = [];
    let elementIndex = 0;
    remainingColumns.forEach(col => {
        if (row[col] && row[col].toString().trim() !== '') {
            const elementType = sanitizeClassName(col) + '-element';
            const columnElement = createTextElement(row[col] || '', elementType, index + 1, slideDimensions);
            
            // Apply distributed position for additional elements
            const position = getDistributedPosition(elementType, elementIndex);
            const pixelX = (slideDimensions.width * position.x) / 100;
            const pixelY = (slideDimensions.height * position.y) / 100;
            
            columnElement.style.left = `${pixelX}px`;
            columnElement.style.top = `${pixelY}px`;
            columnElement.dataset.centerX = pixelX;
            columnElement.dataset.centerY = pixelY;
            
            certificateContainer.appendChild(columnElement);
            additionalElements.push(columnElement);
            elementIndex++;
        }
    });

    // Add date element with formatted date
    const formattedDate = formatDateForDisplay(date);
    const dateElement = createTextElement(formattedDate || '', 'date-element', index + 1, slideDimensions);
    certificateContainer.appendChild(dateElement);
    
    // Center all elements manually after they are added to DOM
    setTimeout(() => {
        centerElementManually(nameElement);
        if (concatenatedElement) centerElementManually(concatenatedElement);
        centerElementManually(dateElement);
        
        // Center additional elements
        additionalElements.forEach(element => {
            centerElementManually(element);
        });
    }, 0);

    slide.appendChild(certificateContainer);
    return slide;
}

// Function to create text elements with absolute positioning
function createTextElement(text, elementType, slideIndex = 0, containerDimensions) {
    const element = document.createElement('div');
    element.textContent = text;
    
    // Standardized class assignment - all elements of the same type use the same class
    let cssClass;
    if (elementType === 'name-element') {
        cssClass = 'name';
    } else if (elementType === 'concatenated-element') {
        cssClass = 'concatenated';
    } else if (elementType === 'date-element') {
        cssClass = 'date';
    } else {
        // For other element types, use sanitized column name as class
        cssClass = elementType.replace('-element', '');
    }
    
    element.classList.add(cssClass);
    element.classList.add('element'); // Add shared class for all certificate elements
    
    // Add unique ID for each element instance
    element.id = `${elementType}-${slideIndex}`;
    
    // Set default pixel positions based on element type and container dimensions
    const positions = getDefaultPosition(elementType);
    
    // Convert percentage positions to pixel values
    const pixelX = (containerDimensions.width * positions.x) / 100;
    const pixelY = (containerDimensions.height * positions.y) / 100;
    
    // Apply positioning without transform (will be centered manually after element is added to DOM)
    element.style.position = 'absolute';
    element.style.left = `${pixelX}px`;
    element.style.top = `${pixelY}px`;
    
    // Store positioning data for later centering
    element.dataset.centerX = pixelX;
    element.dataset.centerY = pixelY;
    
    return element;
}

// Function to center element manually after it's added to DOM
function centerElementManually(element) {
    // Get the element's dimensions
    const rect = element.getBoundingClientRect();
    const elementWidth = rect.width;
    const elementHeight = rect.height;
    
    // Get the center position from data attributes
    const centerX = parseFloat(element.dataset.centerX);
    const centerY = parseFloat(element.dataset.centerY);
    
    // Calculate the top-left position to center the element
    const leftPosition = centerX - (elementWidth / 2);
    const topPosition = centerY - (elementHeight / 2);
    
    // Apply the centered position
    element.style.left = `${leftPosition}px`;
    element.style.top = `${topPosition}px`;
}

// Legacy export functions for backward compatibility
export function updateElementPosition(elementSelector, x, y) {
    const element = document.querySelector(elementSelector);
    if (element) {
        element.style.position = 'absolute';
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
    }
}

export function centerElement(elementSelector) {
    const element = document.querySelector(elementSelector);
    const parent = element.parentElement;
    
    if (element && parent) {
        const parentWidth = parent.clientWidth;
        const elementWidth = element.clientWidth;
        
        element.style.position = 'absolute';
        element.style.left = `${(parentWidth - elementWidth) / 2}px`;
    }
}

// Export function to scale element
export function scaleElement(elementSelector, fontSize) {
    const element = document.querySelector(elementSelector);
    if (element) {
        element.style.fontSize = `${fontSize}px`;
    }
}

// Enhanced position management functions (Step 3)
function getElementPosition(elementType) {
    const state = getElementState(elementType);
    return state ? { x: state.xPercent, y: state.yPercent } : getDefaultPosition(elementType);
}

function setElementPosition(elementType, xPercent, yPercent) {
    updateElementState(elementType, { xPercent, yPercent });
}

function updateElementsAcrossSlides(elementType) {
    // This function is now handled by syncStateToSlides
    syncStateToSlides(elementType);
}

function centerElementHorizontally(elementType) {
    const state = getElementState(elementType);
    if (state && !state.lockHorizontal) {
        updateElementState(elementType, { xPercent: 50 });
    }
}

function centerElementVertically(elementType) {
    const state = getElementState(elementType);
    if (state && !state.lockVertical) {
        updateElementState(elementType, { yPercent: 50 });
    }
}

function scaleElementByType(elementType, fontSize) {
    updateElementState(elementType, { fontSize });
}

// Export new element selection functions and Step 3 functions
export {
    generateElementButtons,
    selectElement,
    clearElementSelection,
    showElementControls,
    hideElementControls,
    getElementPosition,
    setElementPosition,
    centerElementHorizontally,
    centerElementVertically,
    scaleElementByType,
    updateElementsAcrossSlides,
    // Step 3 exports
    initializeElementStates,
    getElementState,
    updateElementState,
    validateStateValues,
    syncStateToSlides,
    percentToPixels,
    pixelsToPercent,
    getContainerDimensions,
    detectAvailableElements,
    // Direct interaction exports
    addElementClickListeners,
    handleElementClick,
    getElementTypeFromElement,
    addDocumentClickListener,
    handleDocumentClick,
    // Step 4 exports
    initializeSliderEventListeners,
    handleSliderChange,
    updateSliderValues,
    // Step 5 theme exports
    loadThemes,
    initializeThemeSystem,
    getThemeColors,
    getThemeColor,
    setElementTheme,
    setElementColor,
    applyThemeToElement,
    generateColorButtons,
    generateThemeOptions,
    updateColorSelection,
    initializeThemeEventListeners,
    // Step 6 lock exports
    initializeLockEventListeners,
    toggleLockHorizontal,
    toggleLockVertical,
    updateLockButtonStates,
    // Step 7 alignment exports
    initializeAlignmentEventListeners
};
