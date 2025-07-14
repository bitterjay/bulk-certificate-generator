// This file serves as a compatibility layer to maintain the original API
// while delegating the actual implementation to modular files

// Import from element state module
import {
    elementStates,
    initializeElementStates,
    getElementState,
    updateElementState,
    validateStateValues,
    clampPosition,
    percentToPixels,
    pixelsToPercent,
    getElementPosition,
    setElementPosition,
    centerElementHorizontally,
    centerElementVertically,
    scaleElementByType,
    detectAvailableElements,
    detectAvailableElementsFromData,
    initializeElementStatesWithLayout
} from './element/elementState.js';

// Import from theme manager module
import {
    loadThemes,
    initializeThemeSystem,
    getThemeColors,
    getThemeColor,
    getDefaultColorForTheme,
    validateColorForTheme,
    getDefaultPipeColor,
    setElementTheme,
    setElementColor,
    setPipeColor,
    applyThemeToElement,
    applyPipeColorToElement,
    generateColorButtons,
    generatePipeColorButtons,
    updateColorSelection,
    updatePipeColorSelection,
    generateThemeOptions,
    getCurrentTheme,
    setCurrentTheme,
    getAvailableThemes
} from './theme/themeManager.js';

// Import from DOM utilities module
import {
    sanitizeClassName,
    formatDateForDisplay,
    createConcatenatedContentWithSpans,
    ensurePipeSpans,
    percentToPixels as domPercentToPixels,
    pixelsToPercent as domPixelsToPercent,
    getContainerDimensions,
    calculateSlideDimensions,
    createTextElementWithState,
    centerElementManually,
    getElementFriendlyName,
    updateElementPosition,
    centerElement,
    scaleElement
} from './utils/domUtils.js';

// Import from drag and drop module
import {
    dragState,
    handleElementMouseDown,
    handleDragMove,
    handleDragEnd,
    handleElementClick,
    handleDocumentClick,
    getElementTypeFromElement
} from './interaction/dragAndDrop.js';

// Import from element controls module
import {
    selectElement,
    clearElementSelection,
    showControlWidgets,
    hideControlWidgets,
    showElementControls,
    hideElementControls,
    handleSlideChange,
    generateElementButtons,
    initializeSliderEventListeners,
    handleSliderChange,
    updateSliderValues,
    initializeLockEventListeners,
    toggleLockHorizontal,
    toggleLockVertical,
    updateLockButtonStates,
    initializeAlignmentEventListeners,
    initializeFontSizeEventListeners,
    handleFontSizeChange,
    toggleElementUppercase,
    initializeThemeEventListeners,
    syncStateToSlides,
    getCurrentSelectedElement,
    isControlsVisible,
    updateDraggedElementPosition
} from './element/elementControls.js';

// Import from preview generator module
import {
    generatePreviewSlider,
    loadLayoutPresets,
    applyLayoutPreset,
    getLayoutPreset,
    initializeLayoutSystem,
    generateLayoutOptions,
    updateLayoutDescription,
    swiperInstance
} from './element/previewGenerator.js';

// Compatibility function to setup element interactions
function addElementClickListeners() {
    // Add click and drag listeners to all certificate elements
    const allElements = document.querySelectorAll('.certificate-preview div[id]');
    
    allElements.forEach(element => {
        // Remove existing listeners to prevent duplicates
        element.removeEventListener('click', handleElementClickWrapper);
        element.removeEventListener('mousedown', handleElementMouseDownWrapper);
        
        // Add new listeners
        element.addEventListener('click', handleElementClickWrapper);
        element.addEventListener('mousedown', handleElementMouseDownWrapper);
    });
    
    // Add document click listener for click-outside-to-deselect
    addDocumentClickListener();
}

// Wrapper functions for compatibility
function handleElementClickWrapper(event) {
    const elementType = handleElementClick(event, dragState);
    if (elementType) {
        selectElement(elementType);
    }
}

function handleElementMouseDownWrapper(event) {
    handleElementMouseDown(
        event, 
        selectElement, 
        getElementState, 
        updateDraggedElementPosition
    );
}

function addDocumentClickListener() {
    // Remove existing listener if present to prevent duplicates
    document.removeEventListener('click', handleDocumentClickWrapper);
    document.addEventListener('click', handleDocumentClickWrapper);
}

function handleDocumentClickWrapper(event) {
    handleDocumentClick(
        event, 
        dragState, 
        getCurrentSelectedElement(), 
        clearElementSelection
    );
}

// Re-export all the functions and variables for backward compatibility
export {
    // Original state variables
    elementStates,
    swiperInstance,
    dragState,
    
    // Main preview generation function
    generatePreviewSlider,
    
    // Element state management
    initializeElementStates,
    getElementState,
    updateElementState,
    validateStateValues,
    clampPosition,
    percentToPixels,
    pixelsToPercent,
    getContainerDimensions,
    detectAvailableElements,
    detectAvailableElementsFromData,
    
    // Element positioning
    getElementPosition,
    setElementPosition,
    centerElementHorizontally,
    centerElementVertically,
    scaleElementByType,
    syncStateToSlides as updateElementsAcrossSlides,
    
    // Theme management
    loadThemes,
    initializeThemeSystem,
    getThemeColors,
    getThemeColor,
    getDefaultColorForTheme,
    validateColorForTheme,
    getDefaultPipeColor,
    setElementTheme,
    setElementColor,
    setPipeColor,
    applyThemeToElement,
    applyPipeColorToElement,
    generateColorButtons,
    generatePipeColorButtons,
    updateColorSelection,
    updatePipeColorSelection,
    generateThemeOptions,
    initializeThemeEventListeners,
    
    // Element selection and UI
    selectElement,
    clearElementSelection,
    showControlWidgets,
    hideControlWidgets,
    showElementControls,
    hideElementControls,
    handleSlideChange,
    generateElementButtons,
    
    // UI Event handlers
    initializeSliderEventListeners,
    handleSliderChange,
    updateSliderValues,
    initializeLockEventListeners,
    toggleLockHorizontal,
    toggleLockVertical,
    updateLockButtonStates,
    initializeAlignmentEventListeners,
    initializeFontSizeEventListeners,
    handleFontSizeChange,
    toggleElementUppercase,
    
    // DOM utilities
    sanitizeClassName,
    formatDateForDisplay,
    createConcatenatedContentWithSpans,
    ensurePipeSpans,
    calculateSlideDimensions,
    createTextElementWithState,
    centerElementManually,
    getElementFriendlyName,
    
    // Drag and drop
    handleElementMouseDown,
    handleDragMove,
    handleDragEnd,
    handleElementClick,
    handleDocumentClick,
    getElementTypeFromElement,
    addElementClickListeners,
    updateDraggedElementPosition,
    
    // Layout system
    loadLayoutPresets,
    applyLayoutPreset,
    getLayoutPreset,
    initializeLayoutSystem,
    generateLayoutOptions,
    updateLayoutDescription,
    initializeElementStatesWithLayout,
    
    // Legacy compatibility functions
    updateElementPosition,
    centerElement,
    scaleElement
};
