// Element Controls Module
// Manages element selection, UI controls, and property updates

// UI state management
let currentSelectedElement = null;
let isElementControlsVisible = false;

// Slider debounce timers
let sliderSyncTimeout = null;
let fontSizeSyncTimeout = null;

// Import necessary functions from other modules
import { getElementState, updateElementState } from './elementState.js';
import { 
    getElementFriendlyName, 
    centerElementManually,
    percentToPixels,
    applyLockedElementStyling,
    applyUnlockedElementStyling
} from '../utils/domUtils.js';
import { 
    handleElementClick, 
    handleElementMouseDown, 
    handleDocumentClick, 
    dragState 
} from '../interaction/dragAndDrop.js';
import {
    generateThemeOptions,
    generateColorButtons,
    generatePipeColorButtons, 
    updateColorSelection,
    updatePipeColorSelection,
    setElementTheme,
    setElementColor,
    setPipeColor,
    applyThemeToElement,
    applyPipeColorToElement
} from '../theme/themeManager.js';

// Function to synchronize state to all slides
export function syncStateToSlides(elementType) {
    const elements = document.querySelectorAll(`[id^="${elementType}-"]`);
    const state = getElementState(elementType);
    
    if (!state) {
        console.warn(`No state found for element type: ${elementType}`);
        return;
    }
    
    elements.forEach(element => {
        // Get the certificate container to calculate dimensions
        const certificateContainer = element.closest('.certificate-preview');
        if (certificateContainer) {
            const containerRect = certificateContainer.getBoundingClientRect();
            const containerDimensions = {
                width: containerRect.width,
                height: containerRect.height
            };
            
            // Apply enhanced positioning based on lock state
            const isHorizontallyLocked = state.lockHorizontal;
            const isVerticallyLocked = state.lockVertical;
            
            if (isHorizontallyLocked || isVerticallyLocked) {
                // Use full-width/height approach for locked elements
                applyLockedElementStyling(element, state, containerDimensions, isHorizontallyLocked, isVerticallyLocked);
            } else {
                // Use traditional absolute positioning for unlocked elements
                applyUnlockedElementStyling(element, state, containerDimensions);
            }
            
            // Apply font size
            element.style.fontSize = `${state.fontSize}px`;
            
            // Apply text transformation
            element.style.textTransform = state.textTransform || 'none';
            
            // Apply theme color
            applyThemeToElement(element, state.theme, state.color);
            
            // Apply pipe color if this is a concatenated element
            if (elementType === 'concatenated-element') {
                // Ensure pipe spans exist before applying color
                if (window.ensurePipeSpans) {
                    window.ensurePipeSpans(element);
                }
                applyPipeColorToElement(element, state.theme, state.pipeColor);
            }
            
            // Apply visibility
            element.style.display = state.isVisible ? 'block' : 'none';
        }
    });
}

// Function to generate element selection buttons
export function generateElementButtons() {
    const buttonsContainer = document.getElementById('element-buttons-container');
    if (!buttonsContainer) return;
    
    // Clear existing buttons
    buttonsContainer.innerHTML = '';
    
    // Get available elements from state
    const elementTypes = Object.keys(window.elementStates || {});
    
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
export function selectElement(elementType) {
    // Clear previous selection
    clearElementSelection();
    
    // Set new selection
    currentSelectedElement = elementType;
    window.currentSelectedElement = elementType;
    
    // Update button states
    updateElementButtonStates();
    
    // Apply highlighting to all elements of this type across all slides
    applyElementHighlighting(elementType);
    
    // Show control widgets area
    showControlWidgets();
}

// Function to clear element selection
export function clearElementSelection() {
    if (currentSelectedElement) {
        // Remove highlighting from all elements
        const allElements = document.querySelectorAll(`[id^="${currentSelectedElement}-"]`);
        allElements.forEach(element => {
            element.classList.remove('element-selected');
        });
        
        currentSelectedElement = null;
        window.currentSelectedElement = null;
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
        
        // Don't center elements when they're selected to avoid jumping
        // Elements should stay in their current position
    });
}

// Function to show control widgets
export function showControlWidgets() {
    const controlWidgets = document.getElementById('control-widgets');
    const controlPanel = document.getElementById('element-control-panel');
    const backdrop = document.getElementById('panel-backdrop');
    
    if (controlWidgets && controlPanel && currentSelectedElement) {
        // Show the sliding panel
        controlPanel.classList.add('visible');
        backdrop.classList.add('visible');
        controlWidgets.classList.add('has-controls');
        
        // Get current state for display
        const state = getElementState(currentSelectedElement);
        const friendlyName = getElementFriendlyName(currentSelectedElement);
        
        // Check if this is a concatenated element to show pipe controls
        const isConcatenatedElement = currentSelectedElement === 'concatenated-element';
        
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
                    <div class="selected-color-display">
                        <span class="selected-color-label">Current:</span>
                        <div class="selected-color-box" id="selected-color-indicator"></div>
                    </div>
                </div>
                
                <div class="color-selection">
                    <label>Text Color:</label>
                    <div class="color-palette" id="color-palette">
                        <!-- Color buttons generated by generateColorButtons() -->
                    </div>
                </div>
                
                ${isConcatenatedElement ? `
                <div class="pipe-color-selection">
                    <label>Pipe Separator Color:</label>
                    <div class="selected-color-display">
                        <span class="selected-color-label">Current:</span>
                        <div class="selected-color-box" id="selected-pipe-color-indicator"></div>
                    </div>
                    <div class="color-palette" id="pipe-color-palette">
                        <!-- Pipe color buttons generated by generatePipeColorButtons() -->
                    </div>
                </div>
                ` : ''}
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
                    <button id="text-transform-toggle" class="text-transform-toggle-button" title="Cycle Text Transform">
                        <span class="transform-text" id="transform-display">None</span>
                    </button>
                </div>
            </div>
            
            <div class="usage-tip">
                <p>💡 <strong>Tip:</strong> Use sliders for precise positioning, or click and drag elements directly!</p>
            </div>
        `;
        
        // Initialize theme system components
        generateThemeOptions();
        generateColorButtons(
            state.theme, 
            currentSelectedElement, 
            (elementType, colorKey) => {
                setElementColor(elementType, colorKey, getElementState, updateElementState);
            },
            (elementType) => {
                updateColorSelection(elementType, getElementState);
            }
        );
        updateColorSelection(currentSelectedElement, getElementState);
        
        // Initialize pipe color system if concatenated element
        if (isConcatenatedElement) {
            generatePipeColorButtons(
                state.theme, 
                currentSelectedElement,
                (elementType, colorKey) => {
                    setPipeColor(elementType, colorKey, getElementState, updateElementState);
                },
                (elementType) => {
                    updatePipeColorSelection(elementType, getElementState);
                }
            );
            updatePipeColorSelection(currentSelectedElement, getElementState);
        }
        
        // Initialize event listeners
        initializeSliderEventListeners();
        initializeThemeEventListeners();
        initializeLockEventListeners();
        initializeAlignmentEventListeners();
        initializeFontSizeEventListeners();
        initializePanelEventListeners();

        // Update lock button states
        updateLockButtonStates(currentSelectedElement);
    }
}

// Function to hide control widgets
export function hideControlWidgets() {
    const controlWidgets = document.getElementById('control-widgets');
    const controlPanel = document.getElementById('element-control-panel');
    const backdrop = document.getElementById('panel-backdrop');
    
    if (controlWidgets && controlPanel) {
        // Hide the sliding panel
        controlPanel.classList.remove('visible');
        backdrop.classList.remove('visible');
        controlWidgets.classList.remove('has-controls');
        controlWidgets.innerHTML = 'Select an element to edit its position and styling.';
    }
}

// Function to show element controls panel
export function showElementControls() {
    // Element controls are now integrated into preview area
    // Just ensure the controls are visible and generate buttons
    isElementControlsVisible = true;
    window.isElementControlsVisible = true;
    
    // Generate element buttons
    generateElementButtons();
    
    // Ensure panel is hidden initially
    hideControlWidgets();
}

// Function to hide element controls panel
export function hideElementControls() {
    // Element controls are now integrated into preview area
    // Just hide the control widgets and clear selection
    isElementControlsVisible = false;
    window.isElementControlsVisible = false;
    
    // Clear selection
    clearElementSelection();
}

// Function to handle slide change events
export function handleSlideChange() {
    // Re-apply highlighting if an element is selected
    if (currentSelectedElement) {
        // Small delay to ensure slide transition is complete
        setTimeout(() => {
            applyElementHighlighting(currentSelectedElement);
        }, 100);
    }
}

// Position slider event handling
export function initializeSliderEventListeners() {
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

export function handleSliderChange(axis, value) {
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
    const elements = document.querySelectorAll(`[id^=\"${currentSelectedElement}-\"]`);
    
    elements.forEach(element => {
        // Add class to disable transitions for frictionless movement
        element.classList.add('slider-updating');
        
        const container = element.closest('.certificate-preview');
        if (container) {
            const containerRect = container.getBoundingClientRect();
            const state = getElementState(currentSelectedElement);
            const containerDimensions = {
                width: containerRect.width,
                height: containerRect.height
            };
            
            let newX = state.xPercent;
            let newY = state.yPercent;
            
            if (axis === 'x') {
                newX = value;
            } else {
                newY = value;
            }
            
            // Create temporary state object for positioning
            const tempState = { ...state, xPercent: newX, yPercent: newY };
            
            // Apply enhanced positioning based on lock state
            const isHorizontallyLocked = state.lockHorizontal;
            const isVerticallyLocked = state.lockVertical;
            
            if (isHorizontallyLocked || isVerticallyLocked) {
                // Use full-width/height approach for locked elements
                applyLockedElementStyling(element, tempState, containerDimensions, isHorizontallyLocked, isVerticallyLocked);
            } else {
                // Use traditional absolute positioning for unlocked elements
                applyUnlockedElementStyling(element, tempState, containerDimensions);
            }
        }
        
        // Remove the class after a short delay to re-enable transitions
        setTimeout(() => {
            element.classList.remove('slider-updating');
        }, 100);
    });
}

export function updateSliderValues(elementType) {
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

// Lock functionality
export function initializeLockEventListeners() {
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

export function toggleLockHorizontal(elementType) {
    const state = getElementState(elementType);
    if (state) {
        // Mutually exclusive lock behavior
        if (state.lockHorizontal) {
            // If horizontal is already locked, unlock it (both become movable)
            updateElementState(elementType, { lockHorizontal: false });
        } else {
            // If horizontal is not locked, lock it and unlock vertical
            updateElementState(elementType, { lockHorizontal: true, lockVertical: false });
        }
        updateLockButtonStates(elementType);
        updateSliderValues(elementType); // To disable/enable slider
        
        // Refresh element positioning to apply new lock state
        syncStateToSlides(elementType);
    }
}

export function toggleLockVertical(elementType) {
    const state = getElementState(elementType);
    if (state) {
        // Mutually exclusive lock behavior
        if (state.lockVertical) {
            // If vertical is already locked, unlock it (both become movable)
            updateElementState(elementType, { lockVertical: false });
        } else {
            // If vertical is not locked, lock it and unlock horizontal
            updateElementState(elementType, { lockVertical: true, lockHorizontal: false });
        }
        updateLockButtonStates(elementType);
        updateSliderValues(elementType); // To disable/enable slider
        
        // Refresh element positioning to apply new lock state
        syncStateToSlides(elementType);
    }
}

export function updateLockButtonStates(elementType) {
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

// Alignment functions
export function initializeAlignmentEventListeners() {
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

// Center horizontally and vertically
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

// Font size functions
export function initializeFontSizeEventListeners() {
    const fontSizeSlider = document.getElementById('font-size-slider');
    const textTransformToggle = document.getElementById('text-transform-toggle');
    
    if (fontSizeSlider) {
        // Handle real-time slider movement (input event)
        fontSizeSlider.addEventListener('input', (e) => handleFontSizeChange(e.target.value));
        
        // Handle slider release (change event) - ensure final sync
        fontSizeSlider.addEventListener('change', (e) => {
            clearTimeout(fontSizeSyncTimeout);
            syncStateToSlides(currentSelectedElement);
        });
    }
    
    if (textTransformToggle) {
        textTransformToggle.addEventListener('click', () => {
            if (currentSelectedElement) {
                cycleElementTextTransform(currentSelectedElement);
            }
        });
    }
}

export function handleFontSizeChange(value) {
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
        
        // Update text transform button state
        updateTextTransformButtonState(elementType);
    }
}

// Cycle through text transformation options
export function cycleElementTextTransform(elementType) {
    const state = getElementState(elementType);
    if (state) {
        const transforms = ['none', 'uppercase', 'lowercase', 'capitalize'];
        const currentTransform = state.textTransform || 'none';
        const currentIndex = transforms.indexOf(currentTransform);
        const nextIndex = (currentIndex + 1) % transforms.length;
        const newTransform = transforms[nextIndex];
        
        updateElementState(elementType, { textTransform: newTransform });
        updateTextTransformButtonState(elementType);
        
        // Apply changes to all certificate elements
        syncStateToSlides(elementType);
    }
}

// Update text transform button visual state
function updateTextTransformButtonState(elementType) {
    const state = getElementState(elementType);
    const textTransformButton = document.getElementById('text-transform-toggle');
    const transformDisplay = document.getElementById('transform-display');
    
    if (textTransformButton && transformDisplay && state) {
        const currentTransform = state.textTransform || 'none';
        
        // Update button text based on current transform
        const displayText = {
            'none': 'None',
            'uppercase': 'UPPER',
            'lowercase': 'lower',
            'capitalize': 'Title'
        };
        
        transformDisplay.textContent = displayText[currentTransform] || 'None';
        
        // Add active class if not 'none'
        textTransformButton.classList.toggle('active', currentTransform !== 'none');
    }
}

// Theme event listeners
export function initializeThemeEventListeners() {
    const themeSelector = document.getElementById('theme-selector');
    
    if (themeSelector) {
        themeSelector.addEventListener('change', (e) => {
            const newTheme = e.target.value;
            if (currentSelectedElement && window.availableThemes && window.availableThemes[newTheme]) {
                // Update element to new theme with default colors
                setElementTheme(currentSelectedElement, newTheme, updateElementState);
                
                // Regenerate color buttons for new theme
                generateColorButtons(
                    newTheme,
                    currentSelectedElement,
                    (elementType, colorKey) => {
                        setElementColor(elementType, colorKey, getElementState, updateElementState);
                    },
                    (elementType) => {
                        updateColorSelection(elementType, getElementState);
                    }
                );
                
                // Regenerate pipe color buttons for new theme (if concatenated element)
                if (currentSelectedElement === 'concatenated-element') {
                    generatePipeColorButtons(
                        newTheme,
                        currentSelectedElement,
                        (elementType, colorKey) => {
                            setPipeColor(elementType, colorKey, getElementState, updateElementState);
                        },
                        (elementType) => {
                            updatePipeColorSelection(elementType, getElementState);
                        }
                    );
                }
                
                // Update color selection displays
                updateColorSelection(currentSelectedElement, getElementState);
                updatePipeColorSelection(currentSelectedElement, getElementState);
            }
        });
    }
}

// Accessor functions
export function getCurrentSelectedElement() {
    return currentSelectedElement;
}

export function isControlsVisible() {
    return isElementControlsVisible;
}

// Enhanced click-to-select and drag functionality
export function addElementClickListeners() {
    // Add click and drag listeners to all certificate elements
    const allElements = document.querySelectorAll('.certificate-preview div[id]');
    allElements.forEach(element => {
        element.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent event from bubbling to document
            
            // Only proceed with selection if this was a true click (no drag movement)
            const elementType = handleElementClick(event, dragState);
            if (elementType) {
                console.log('Pure click detected - showing panel for:', elementType);
                selectElement(elementType);
            } else if (dragState.hasMoved) {
                console.log('Drag detected - panel will not show');
                // Reset drag state for next interaction
                dragState.hasMoved = false;
            }
        });
        
        element.addEventListener('mousedown', (event) => {
            handleElementMouseDown(
                event, 
                selectElement, 
                getElementState,
                updateDraggedElementPosition
            );
        });
    });
    
    // Add document click listener for click-outside-to-deselect
    addDocumentClickListener();
}

// Function to update dragged element position during drag operations
export function updateDraggedElementPosition(elementType, xPercent, yPercent, syncToSlides = false) {
    // Special case for the end of drag when we just want to get the sync function
    if (xPercent === null && yPercent === null) {
        return syncStateToSlides;
    }
    
    // Update state without syncing to all slides initially
    updateElementState(elementType, { xPercent, yPercent }, false);
    
    // Update only the currently dragged element for smooth real-time feedback
    const draggedElement = dragState.currentElement;
    if (draggedElement) {
        const container = draggedElement.closest('.certificate-preview');
        if (container) {
            const containerRect = container.getBoundingClientRect();
            const pixelX = percentToPixels(xPercent, containerRect.width);
            const pixelY = percentToPixels(yPercent, containerRect.height);
            
            // Update the center data attributes
            draggedElement.dataset.centerX = pixelX;
            draggedElement.dataset.centerY = pixelY;
            
            // Apply position directly during drag for smooth movement
            // Use transform for better performance instead of left/top
            const elementRect = draggedElement.getBoundingClientRect();
            const offsetX = pixelX - elementRect.width / 2;
            const offsetY = pixelY - elementRect.height / 2;
            
            draggedElement.style.left = `${offsetX}px`;
            draggedElement.style.top = `${offsetY}px`;
            
            // Don't call centerElementManually during drag to avoid conflicts
        }
    }
    
    // Update slider values if controls are visible (throttled)
    if (currentSelectedElement === elementType) {
        // Only update sliders periodically to avoid excessive DOM manipulation
        if (!dragState.sliderUpdateTimeout) {
            dragState.sliderUpdateTimeout = setTimeout(() => {
                updateSliderValues(elementType);
                dragState.sliderUpdateTimeout = null;
            }, 100);
        }
    }
}

// Function to initialize panel event listeners
function initializePanelEventListeners() {
    const closeButton = document.getElementById('close-panel-button');
    const backdrop = document.getElementById('panel-backdrop');
    
    if (closeButton) {
        closeButton.addEventListener('click', (event) => {
            event.stopPropagation();
            clearElementSelection();
        });
    }
    
    if (backdrop) {
        backdrop.addEventListener('click', (event) => {
            event.stopPropagation();
            clearElementSelection();
        });
    }
}

// Function to add document-level click listener for deselection
export function addDocumentClickListener() {
    // Remove existing listener if present to prevent duplicates
    document.removeEventListener('click', handleDocumentClickWrapped);
    document.addEventListener('click', handleDocumentClickWrapped);
}

// Wrapper function to provide the necessary dependencies to handleDocumentClick
function handleDocumentClickWrapped(event) {
    // Add a small delay to prevent immediate deselection when selecting an element
    requestAnimationFrame(() => {
        handleDocumentClick(
            event, 
            dragState, 
            currentSelectedElement, 
            clearElementSelection
        );
    });
}
