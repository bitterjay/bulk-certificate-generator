import { parsedData } from './dataParsing.js';
import { uploadedImage, imageWidth, imageHeight, imageAspectRatio } from './imageUpload.js';

// Helper function to sanitize column names for CSS class usage
function sanitizeClassName(columnName) {
    return columnName
        .toLowerCase()                    // Convert to lowercase
        .replace(/\s+/g, '-')            // Replace spaces with hyphens
        .replace(/[^a-zA-Z0-9-_]/g, ''); // Remove invalid characters
}

// Global variable to store the Swiper instance
let swiperInstance = null;

// Element positioning state
let elementStates = {};

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

            // Navigation
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },

            // Pagination
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
                dynamicBullets: true,
            },

            // Keyboard control
            keyboard: {
                enabled: true,
            },

            // Touch/swipe settings
            touchRatio: 1,
            touchAngle: 45,
            grabCursor: true,

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

    // Create elements with maximum possible content using absolute positioning
    const nameElement = createTextElement('Longest Possible Name', 'name-element', 0, slideDimensions);
    certificateContainer.appendChild(nameElement);

    // Create concatenated column element
    if (selectedColumns.length > 0) {
        const concatenatedElement = createTextElement(
            selectedColumns.map(col => 'Longest ' + col).join(' - '), 
            'concatenated-element', 0, slideDimensions
        );
        certificateContainer.appendChild(concatenatedElement);
    }

    // Create individual column elements with distributed positions
    const remainingColumns = Object.keys(parsedData[0] || {})
        .filter(col => !selectedColumns.includes(col) && col !== 'Name');
    
    remainingColumns.forEach((col, index) => {
        const elementType = sanitizeClassName(col) + '-element';
        const columnElement = createTextElement(`Longest ${col} Content`, elementType, 0, slideDimensions);
        
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

    // Add date element
    const dateElement = createTextElement('December 31, 2024', 'date-element', 0, slideDimensions);
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

    // Add date element
    const dateElement = createTextElement(date || '', 'date-element', index + 1, slideDimensions);
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
    
    // Initialize element state if not exists
    if (!elementStates[elementType]) {
        elementStates[elementType] = {
            xPercent: positions.x,
            yPercent: positions.y,
            fontSize: getDefaultFontSize(elementType),
            lockHorizontal: false,
            lockVertical: false
        };
    }
    
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

// Position management functions (foundation for element controls)
function getElementPosition(elementType) {
    return elementStates[elementType] || getDefaultPosition(elementType);
}

function setElementPosition(elementType, xPercent, yPercent) {
    if (!elementStates[elementType]) {
        elementStates[elementType] = {
            xPercent: xPercent,
            yPercent: yPercent,
            fontSize: getDefaultFontSize(elementType),
            lockHorizontal: false,
            lockVertical: false
        };
    } else {
        elementStates[elementType].xPercent = xPercent;
        elementStates[elementType].yPercent = yPercent;
    }
    
    // Update all elements of this type across all slides
    updateElementsAcrossSlides(elementType);
}

function updateElementsAcrossSlides(elementType) {
    const elements = document.querySelectorAll(`[id^="${elementType}-"]`);
    const state = elementStates[elementType];
    
    if (state) {
        elements.forEach(element => {
            // Get the certificate container to calculate dimensions
            const certificateContainer = element.closest('.certificate-preview');
            if (certificateContainer) {
                const containerRect = certificateContainer.getBoundingClientRect();
                const pixelX = (containerRect.width * state.xPercent) / 100;
                const pixelY = (containerRect.height * state.yPercent) / 100;
                
                element.style.left = `${pixelX}px`;
                element.style.top = `${pixelY}px`;
                element.dataset.centerX = pixelX;
                element.dataset.centerY = pixelY;
                
                // Center the element manually
                setTimeout(() => {
                    centerElementManually(element);
                }, 0);
            }
            
            element.style.fontSize = `${state.fontSize}px`;
        });
    }
}

function centerElementHorizontally(elementType) {
    if (elementStates[elementType] && !elementStates[elementType].lockHorizontal) {
        setElementPosition(elementType, 50, elementStates[elementType].yPercent);
    }
}

function centerElementVertically(elementType) {
    if (elementStates[elementType] && !elementStates[elementType].lockVertical) {
        setElementPosition(elementType, elementStates[elementType].xPercent, 50);
    }
}

function scaleElementByType(elementType, fontSize) {
    if (!elementStates[elementType]) {
        elementStates[elementType] = {
            xPercent: getDefaultPosition(elementType).x,
            yPercent: getDefaultPosition(elementType).y,
            fontSize: fontSize,
            lockHorizontal: false,
            lockVertical: false
        };
    } else {
        elementStates[elementType].fontSize = fontSize;
    }
    
    // Update all elements of this type across all slides
    updateElementsAcrossSlides(elementType);
}

// Export new positioning functions for element controls
export {
    getElementPosition,
    setElementPosition,
    centerElementHorizontally,
    centerElementVertically,
    scaleElementByType,
    updateElementsAcrossSlides
};
