// DOM Utilities
// Common DOM manipulation functions extracted from original uiRendering.js

import { getThemeColor } from '../theme/themeManager.js';
import { applyThemeToElement, applyPipeColorToElement } from '../theme/themeManager.js';

// Helper function to sanitize column names for CSS class usage
export function sanitizeClassName(columnName) {
    return columnName
        .toLowerCase()                    // Convert to lowercase
        .replace(/\s+/g, '-')            // Replace spaces with hyphens
        .replace(/[^a-zA-Z0-9-_]/g, ''); // Remove invalid characters
}

// Helper function to format date from yyyy-mm-dd to mm/dd/yyyy
export function formatDateForDisplay(dateString) {
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

// Helper function to create concatenated content with pipe spans
export function createConcatenatedContentWithSpans(columns) {
    if (!columns || columns.length === 0) return '';
    
    return columns
        .filter(col => col && col.toString().trim() !== '') // Filter out empty values
        .join('   <span class="pipe-separator">|</span>   ');
}

// Helper function to ensure pipe spans exist in concatenated elements
export function ensurePipeSpans(element) {
    if (!element || !element.innerHTML) return;
    
    // Check if element already has spans
    if (element.querySelectorAll('.pipe-separator').length > 0) return;
    
    // If no spans found, convert plain text pipes to spans
    const content = element.innerHTML;
    if (content.includes('|')) {
        // Replace plain pipes with span-wrapped pipes
        const updatedContent = content.replace(/\s*\|\s*/g, '   <span class="pipe-separator">|</span>   ');
        element.innerHTML = updatedContent;
    }
}

// Function to calculate slide dimensions based on image aspect ratio
export function calculateSlideDimensions() {
    const maxWidth = 800;
    
    // Use actual image aspect ratio if available, otherwise default
    const aspectRatio = window.imageAspectRatio > 0 ? window.imageAspectRatio : 1.33; // Default 4:3 ratio
    
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

// Function to get container dimensions for a slide
export function getContainerDimensions(slideIndex = 0) {
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

// Conversion utilities
export function percentToPixels(percent, containerSize) {
    return (percent / 100) * containerSize;
}

export function pixelsToPercent(pixels, containerSize) {
    return (pixels / containerSize) * 100;
}

// Function to get user-friendly element names
export function getElementFriendlyName(elementType) {
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

// NEW: Enhanced element creation that uses state from the start
export function createTextElementWithState(text, elementType, slideIndex = 0, containerDimensions, useHTML = false, getElementState) {
    const element = document.createElement('div');
    
    // Set content based on whether we should use HTML or plain text
    if (useHTML) {
        element.innerHTML = text;
    } else {
        element.textContent = text;
    }
    
    // Standardized class assignment
    let cssClass;
    if (elementType === 'name-element') {
        cssClass = 'name';
    } else if (elementType === 'concatenated-element') {
        cssClass = 'concatenated';
    } else if (elementType === 'date-element') {
        cssClass = 'date';
    } else {
        cssClass = elementType.replace('-element', '');
    }
    
    element.classList.add(cssClass);
    element.classList.add('element');
    element.id = `${elementType}-${slideIndex}`;
    
    // Use state position instead of default position
    const state = getElementState(elementType);
    const positions = state ? { x: state.xPercent, y: state.yPercent } : null;
    
    // If positions are available, use them
    if (positions) {
        // Convert percentage positions to pixel values
        const pixelX = (containerDimensions.width * positions.x) / 100;
        const pixelY = (containerDimensions.height * positions.y) / 100;
        
        // Apply state-driven positioning
        element.style.position = 'absolute';
        element.style.left = `${pixelX}px`;
        element.style.top = `${pixelY}px`;
        
        // Store positioning data
        element.dataset.centerX = pixelX;
        element.dataset.centerY = pixelY;
        
        // Apply state-driven styling if available
        if (state) {
            element.style.fontSize = `${state.fontSize}px`;
            element.style.textTransform = state.isUppercase ? 'uppercase' : 'none';
            applyThemeToElement(element, state.theme, state.color);
            
            // Apply pipe color if this is a concatenated element
            if (elementType === 'concatenated-element') {
                ensurePipeSpans(element);
                applyPipeColorToElement(element, state.theme, state.pipeColor);
            }
            
            element.style.display = state.isVisible ? 'block' : 'none';
        }
    } else {
        // Default positioning
        element.style.position = 'absolute';
        element.style.left = '50%';
        element.style.top = '50%';
        element.style.transform = 'translate(-50%, -50%)';
    }
    
    // Center element manually with improved timing
    centerElementManually(element);
    
    return element;
}

// Function to center element manually after it's added to DOM
export function centerElementManually(element) {
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
        // Get the element's dimensions
        const rect = element.getBoundingClientRect();
        const elementWidth = rect.width;
        const elementHeight = rect.height;
        
        // Validate that we have valid dimensions
        if (elementWidth === 0 || elementHeight === 0) {
            // Retry after a short delay if dimensions aren't available
            setTimeout(() => centerElementManually(element), 50);
            return;
        }
        
        // Get the center position from data attributes
        const centerX = parseFloat(element.dataset.centerX);
        const centerY = parseFloat(element.dataset.centerY);
        
        // Validate center positions
        if (isNaN(centerX) || isNaN(centerY)) {
            console.warn('Invalid center position data for element:', element);
            return;
        }
        
        // Calculate the top-left position to center the element
        const leftPosition = centerX - (elementWidth / 2);
        const topPosition = centerY - (elementHeight / 2);
        
        // Apply the centered position
        element.style.left = `${leftPosition}px`;
        element.style.top = `${topPosition}px`;
        
        // Debug logging for troubleshooting
        console.log(`Centered element ${element.id}: center(${centerX}, ${centerY}) -> position(${leftPosition}, ${topPosition}), dimensions(${elementWidth}, ${elementHeight})`);
    });
}

// Legacy position update functions for backward compatibility
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

// Legacy scale function for backward compatibility
export function scaleElement(elementSelector, fontSize) {
    const element = document.querySelector(elementSelector);
    if (element) {
        element.style.fontSize = `${fontSize}px`;
    }
}
