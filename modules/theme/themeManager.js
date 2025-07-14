// Theme Management System
// Handles theme loading, color selection, and application

// Theme state variables
let currentTheme = 'usa-archery';
let availableThemes = {};

// Load themes from JSON file
export async function loadThemes() {
    try {
        const response = await fetch('themes.json');
        if (!response.ok) {
            throw new Error(`Failed to load themes: ${response.status}`);
        }
        const themeData = await response.json();
        availableThemes = themeData.themes;
        currentTheme = themeData.defaultTheme;
        
        // Make themes available globally
        window.availableThemes = availableThemes;
        window.currentTheme = currentTheme;
        
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
        
        // Make themes available globally even in fallback mode
        window.availableThemes = availableThemes;
        window.currentTheme = currentTheme;
        
        return false;
    }
}

// Initialize the theme system
export async function initializeThemeSystem() {
    await loadThemes();
    console.log('Theme system initialized with theme:', currentTheme);
}

// Get theme colors for a specific theme
export function getThemeColors(themeId) {
    return availableThemes[themeId]?.colors || {};
}

// Get theme color hex value
export function getThemeColor(themeId, colorKey) {
    const colors = getThemeColors(themeId);
    return colors[colorKey] || colors.black || '#000000';
}

// Get default color for a theme
export function getDefaultColorForTheme(themeId) {
    return availableThemes[themeId]?.default || 'black';
}

// Function to get default pipe color for each element type
export function getDefaultPipeColor(themeId) {
    // Default pipe color is usually a lighter version of the main text color
    const defaultPipeColors = {
        'usa-archery': 'black',
        'classic': 'black', 
        'modern': 'black'
    };
    
    return defaultPipeColors[themeId] || 'black';
}

// Validate color exists in theme
export function validateColorForTheme(themeId, colorKey) {
    const colors = getThemeColors(themeId);
    return colors[colorKey] ? colorKey : getDefaultColorForTheme(themeId);
}

// Set theme for an element - forwarded to elementState updateElementState
export function setElementTheme(elementType, themeId, updateElementState) {
    if (!availableThemes[themeId]) {
        console.warn(`Theme ${themeId} not found, using current theme`);
        return;
    }
    
    const defaultColor = getDefaultColorForTheme(themeId);
    const defaultPipeColor = getDefaultPipeColor(themeId);
    updateElementState(elementType, { theme: themeId, color: defaultColor, pipeColor: defaultPipeColor });
}

// Set color for an element - forwarded to elementState updateElementState
export function setElementColor(elementType, colorKey, getElementState, updateElementState) {
    const state = getElementState(elementType);
    if (!state) {
        console.warn(`Element state not found for ${elementType}`);
        return;
    }
    
    const validatedColor = validateColorForTheme(state.theme, colorKey);
    updateElementState(elementType, { color: validatedColor });
}

// Set pipe color for an element - forwarded to elementState updateElementState
export function setPipeColor(elementType, colorKey, getElementState, updateElementState) {
    const state = getElementState(elementType);
    if (!state) {
        console.warn(`Element state not found for ${elementType}`);
        return;
    }
    
    const validatedColor = validateColorForTheme(state.theme, colorKey);
    updateElementState(elementType, { pipeColor: validatedColor });
}

// Apply theme color to DOM element with slide-specific behavior
export function applyThemeToElement(element, themeId, colorKey) {
    const slideContainer = element.closest('.swiper-slide');
    const isExampleSlide = slideContainer?.classList.contains('example-slide') || 
                           slideContainer?.querySelector('h3')?.textContent?.includes('Example');
    
    const color = getThemeColor(themeId, colorKey);
    
    if (isExampleSlide) {
        // Example slide - ensure visibility with background/shadow
        element.style.color = color;
        element.style.background = 'rgba(255,255,255,0.8)';
    } else {
        // Certificate data slides - pure theme color
        element.style.color = color;
        // Remove any visibility aids
        element.style.textShadow = '';
        element.style.background = '';
    }
}

// Apply pipe color to DOM element
export function applyPipeColorToElement(element, themeId, colorKey) {
    const color = getThemeColor(themeId, colorKey);
    const pipeSpans = element.querySelectorAll('.pipe-separator');
    
    pipeSpans.forEach(span => {
        span.style.color = color;
    });
}

// Generate color buttons for a theme
export function generateColorButtons(themeId, currentSelectedElement, setElementColor, updateColorSelection) {
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

// Generate pipe color buttons for a theme
export function generatePipeColorButtons(themeId, currentSelectedElement, setPipeColor, updatePipeColorSelection) {
    const colors = getThemeColors(themeId);
    const pipePaletteContainer = document.getElementById('pipe-color-palette');
    
    if (!pipePaletteContainer) return;
    
    // Clear existing buttons
    pipePaletteContainer.innerHTML = '';
    
    // Create color buttons
    Object.entries(colors).forEach(([colorKey, colorValue]) => {
        const button = document.createElement('button');
        button.classList.add('color-button', 'pipe-color-button');
        button.style.backgroundColor = colorValue;
        button.style.border = colorValue === '#ffffff' ? '2px solid #ccc' : '2px solid transparent';
        button.title = colorKey.charAt(0).toUpperCase() + colorKey.slice(1);
        button.dataset.colorKey = colorKey;
        
        // Add click event listener
        button.addEventListener('click', () => {
            if (currentSelectedElement) {
                setPipeColor(currentSelectedElement, colorKey);
                updatePipeColorSelection(currentSelectedElement);
            }
        });
        
        pipePaletteContainer.appendChild(button);
    });
}

// Update color selection display
export function updateColorSelection(elementType, getElementState) {
    const state = getElementState(elementType);
    if (!state) return;
    
    // Update theme dropdown
    const themeSelector = document.getElementById('theme-selector');
    if (themeSelector) {
        themeSelector.value = state.theme;
    }
    
    // Update color button selection
    const colorButtons = document.querySelectorAll('.color-button:not(.pipe-color-button)');
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

// Update pipe color selection display
export function updatePipeColorSelection(elementType, getElementState) {
    const state = getElementState(elementType);
    if (!state) return;
    
    // Update pipe color button selection
    const pipeColorButtons = document.querySelectorAll('.pipe-color-button');
    pipeColorButtons.forEach(button => {
        if (button.dataset.colorKey === state.pipeColor) {
            button.classList.add('selected');
        } else {
            button.classList.remove('selected');
        }
    });
    
    // Update selected pipe color box display
    const pipeColorBoxDisplay = document.getElementById('selected-pipe-color-indicator');
    if (pipeColorBoxDisplay) {
        const colorValue = getThemeColor(state.theme, state.pipeColor);
        pipeColorBoxDisplay.style.backgroundColor = colorValue;
        pipeColorBoxDisplay.title = state.pipeColor.charAt(0).toUpperCase() + state.pipeColor.slice(1);
    }
}

// Initialize theme event listeners
export function initializeThemeEventListeners(
    currentSelectedElement,
    setElementTheme,
    generateColorButtons,
    generatePipeColorButtons,
    updateColorSelection,
    updatePipeColorSelection
) {
    const themeSelector = document.getElementById('theme-selector');
    
    if (themeSelector) {
        themeSelector.addEventListener('change', (e) => {
            const newTheme = e.target.value;
            if (currentSelectedElement && availableThemes[newTheme]) {
                // Update element to new theme with default colors
                setElementTheme(currentSelectedElement, newTheme);
                
                // Regenerate color buttons for new theme
                generateColorButtons(newTheme);
                
                // Regenerate pipe color buttons for new theme (if concatenated element)
                if (currentSelectedElement === 'concatenated-element') {
                    generatePipeColorButtons(newTheme);
                }
                
                // Update color selection displays
                updateColorSelection(currentSelectedElement);
                updatePipeColorSelection(currentSelectedElement);
            }
        });
    }
}

// Generate theme dropdown options
export function generateThemeOptions() {
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

// Getter and setter for currentTheme
export function getCurrentTheme() {
    return currentTheme;
}

export function setCurrentTheme(themeId) {
    if (availableThemes[themeId]) {
        currentTheme = themeId;
        window.currentTheme = currentTheme;
    }
}

// Getter for availableThemes
export function getAvailableThemes() {
    return availableThemes;
}
