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

    // Create elements with maximum possible content
    const nameElement = createTextElement('Longest Possible Name', 'name-element');
    certificateContainer.appendChild(nameElement);

    // Create concatenated column element
    if (selectedColumns.length > 0) {
        const concatenatedElement = createTextElement(
            selectedColumns.map(col => 'Longest ' + col).join(' - '), 
            'concatenated-element'
        );
        certificateContainer.appendChild(concatenatedElement);
    }

    // Create individual column elements
    const remainingColumns = Object.keys(parsedData[0] || {})
        .filter(col => !selectedColumns.includes(col) && col !== 'Name');
    
    remainingColumns.forEach(col => {
        const columnElement = createTextElement(`Longest ${col} Content`, sanitizeClassName(col) + '-element');
        certificateContainer.appendChild(columnElement);
    });

    // Add date element
    const dateElement = createTextElement('December 31, 2024', 'date-element');
    certificateContainer.appendChild(dateElement);

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

    // Create name element (concatenated first and last name)
    const nameElement = createTextElement(row.Name || '', 'name-element');
    certificateContainer.appendChild(nameElement);

    // Create concatenated column element
    if (selectedColumns.length > 0) {
        const concatenatedContent = selectedColumns
            .map(col => row[col] || '')
            .filter(value => value.trim() !== '') // Filter out empty values
            .join(' - ');
        
        if (concatenatedContent.trim() !== '') {
            const concatenatedElement = createTextElement(concatenatedContent, 'concatenated-element');
            certificateContainer.appendChild(concatenatedElement);
        }
    }

    // Create individual column elements
    const remainingColumns = Object.keys(row)
        .filter(col => !selectedColumns.includes(col) && col !== 'Name');
    
    remainingColumns.forEach(col => {
        if (row[col] && row[col].toString().trim() !== '') {
            const columnElement = createTextElement(row[col] || '', sanitizeClassName(col) + '-element');
            certificateContainer.appendChild(columnElement);
        }
    });

    // Add date element
    const dateElement = createTextElement(date || '', 'date-element');
    certificateContainer.appendChild(dateElement);

    slide.appendChild(certificateContainer);
    return slide;
}

function createTextElement(text, className) {
    const element = document.createElement('div');
    element.textContent = text;
    element.classList.add('certificate-text-element', className);
    return element;
}

// Export function to update element positions
export function updateElementPosition(elementSelector, x, y) {
    const element = document.querySelector(elementSelector);
    if (element) {
        element.style.position = 'absolute';
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
    }
}

// Export function to center an element
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
