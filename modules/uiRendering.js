import { parsedData } from './dataParsing.js';
import { uploadedImage } from './imageUpload.js';

export function generatePreviewSlider(selectedColumns, date, orientation) {
    const previewContainer = document.getElementById('preview-container');
    previewContainer.innerHTML = ''; // Clear previous previews

    // First, create an "example" slide with maximum width elements
    const exampleSlide = createExampleSlide(selectedColumns);
    previewContainer.appendChild(exampleSlide);

    // Create slides for each data row
    parsedData.forEach((row, index) => {
        const slide = createCertificateSlide(row, selectedColumns, date, orientation, index);
        previewContainer.appendChild(slide);
    });

    // Initialize unslider after a short delay to ensure DOM is ready
    setTimeout(() => {
        if (window.$ && window.$.fn.unslider) {
            $('#preview-slider').unslider({
                dots: true,
                fluid: true
            });
        } else {
            console.error('Unslider library not loaded correctly');
        }
    }, 100);
}

function createExampleSlide(selectedColumns) {
    const slide = document.createElement('li');
    slide.classList.add('example-slide');
    
    // Create a container for the certificate
    const certificateContainer = document.createElement('div');
    certificateContainer.classList.add('certificate-preview', 'example');
    certificateContainer.style.backgroundImage = `url(${uploadedImage})`;
    certificateContainer.style.backgroundSize = 'cover';
    certificateContainer.style.position = 'relative';

    // Create elements with maximum possible content
    const nameElement = createTextElement('Longest Possible Name', 'name-element');
    certificateContainer.appendChild(nameElement);

    // Create concatenated column element
    if (selectedColumns.length > 0) {
        const concatenatedElement = createTextElement(
            selectedColumns.map(col => 'Longest ' + col).join(' '), 
            'concatenated-element'
        );
        certificateContainer.appendChild(concatenatedElement);
    }

    // Create individual column elements
    const remainingColumns = Object.keys(parsedData[0] || {})
        .filter(col => !selectedColumns.includes(col) && col !== 'Name');
    
    remainingColumns.forEach(col => {
        const columnElement = createTextElement(`Longest ${col} Content`, col + '-element');
        certificateContainer.appendChild(columnElement);
    });

    slide.appendChild(certificateContainer);
    return slide;
}

function createCertificateSlide(row, selectedColumns, date, orientation, index) {
    const slide = document.createElement('li');
    slide.classList.add('certificate-slide');
    slide.dataset.index = index;
    
    // Create a container for the certificate
    const certificateContainer = document.createElement('div');
    certificateContainer.classList.add('certificate-preview');
    certificateContainer.style.backgroundImage = `url(${uploadedImage})`;
    certificateContainer.style.backgroundSize = 'cover';
    certificateContainer.style.position = 'relative';

    // Create name element (concatenated first and last name)
    const nameElement = createTextElement(row.Name || '', 'name-element');
    certificateContainer.appendChild(nameElement);

    // Create concatenated column element
    if (selectedColumns.length > 0) {
        const concatenatedContent = selectedColumns
            .map(col => row[col] || '')
            .join(' ');
        const concatenatedElement = createTextElement(concatenatedContent, 'concatenated-element');
        certificateContainer.appendChild(concatenatedElement);
    }

    // Create individual column elements
    const remainingColumns = Object.keys(row)
        .filter(col => !selectedColumns.includes(col) && col !== 'Name');
    
    remainingColumns.forEach(col => {
        const columnElement = createTextElement(row[col] || '', col + '-element');
        certificateContainer.appendChild(columnElement);
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
