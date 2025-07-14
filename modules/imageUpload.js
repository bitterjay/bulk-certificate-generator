/**
 * IMAGE UPLOAD MODULE
 * Handles image file upload, validation, base64 conversion, and orientation detection.
 * Supports PNG, JPEG, and JPG image formats for certificate backgrounds.
 * Automatically detects image orientation (landscape/portrait) and dimensions.
 */

// Global variable to store the base64-encoded uploaded image data
export let uploadedImage = null;

// Global variable to store detected image orientation ('landscape' or 'portrait')
export let imageOrientation = 'landscape'; // Default orientation

// Global variables to store image dimensions for aspect ratio calculations
export let imageWidth = 0;
export let imageHeight = 0;
export let imageAspectRatio = 1.0;

/**
 * Handles the image upload process
 * @param {File} file - The image file object from the file input
 * @returns {Promise<string>} Promise that resolves with the base64 image data
 * 
 * This function:
 * 1. Reads the file using FileReader API
 * 2. Converts the image to base64 format
 * 3. Detects image orientation and dimensions
 * 4. Updates the UI with orientation information
 * 5. Stores all image data in module variables for later use
 */
export function handleImageUpload(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        // Called when file reading is complete
        reader.onload = (event) => {
            // Store the base64-encoded image data
            uploadedImage = event.target.result;
            
            // Detect orientation and dimensions from the loaded image
            detectImageOrientation(event.target.result)
                .then(result => {
                    // Store all detected image properties
                    imageOrientation = result.orientation;
                    imageWidth = result.width;
                    imageHeight = result.height;
                    imageAspectRatio = result.aspectRatio;
                    
                    // Update UI to show the detected orientation
                    updateOrientationDisplay(result.orientation);
                    
                    // Resolve with the base64 image data
                    resolve(event.target.result);
                })
                .catch(error => {
                    // If orientation detection fails, use default values
                    console.error('Error detecting orientation:', error);
                    imageOrientation = 'landscape'; // Default fallback
                    imageWidth = 800; // Default fallback width
                    imageHeight = 600; // Default fallback height
                    imageAspectRatio = 800 / 600; // Default fallback aspect ratio
                    
                    // Still resolve with the image data even if orientation detection failed
                    resolve(event.target.result);
                });
        };
        
        // Handle file reading errors
        reader.onerror = (error) => {
            reject(error);
        };
        
        // Start reading the file as a data URL (base64)
        reader.readAsDataURL(file);
    });
}

/**
 * Validates if the uploaded file is an allowed image type
 * @param {File} file - The file to validate
 * @returns {boolean} True if file type is allowed, false otherwise
 * 
 * Allowed types: PNG, JPEG, JPG
 */
export function validateImageFile(file) {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    return allowedTypes.includes(file.type);
}

/**
 * Shows the "View Image" button after successful image upload
 * This button allows users to preview the uploaded certificate background
 */
export function showViewImageButton() {
    const viewButton = document.getElementById('view-image-button');
    if (viewButton) {
        viewButton.style.display = 'inline-block';
    }
}

/**
 * Detects image orientation and dimensions by loading it into an Image object
 * @param {string} base64Data - Base64-encoded image data
 * @returns {Promise<Object>} Promise that resolves with orientation data
 * 
 * Returns an object containing:
 * - orientation: 'landscape' or 'portrait'
 * - width: Image width in pixels
 * - height: Image height in pixels
 * - aspectRatio: Width divided by height
 */
function detectImageOrientation(base64Data) {
    return new Promise((resolve, reject) => {
        // Create a new Image object to load the image data
        const img = new Image();
        
        // Called when image loads successfully
        img.onload = function() {
            const width = this.width;
            const height = this.height;
            const aspectRatio = width / height;
            
            // Determine orientation based on dimensions
            // Landscape: width > height, Portrait: height > width
            const orientation = width > height ? 'landscape' : 'portrait';
            
            resolve({
                orientation: orientation,
                width: width,
                height: height,
                aspectRatio: aspectRatio
            });
        };
        
        // Handle image loading errors
        img.onerror = function() {
            reject(new Error('Failed to load image for orientation detection'));
        };
        
        // Load the base64 image data
        img.src = base64Data;
    });
}

/**
 * Updates the UI to display the detected image orientation
 * @param {string} orientation - The detected orientation ('landscape' or 'portrait')
 * 
 * Creates or updates a visual indicator showing the detected orientation
 * with an icon (📏) for better user feedback
 */
function updateOrientationDisplay(orientation) {
    // Find existing orientation display element or create a new one
    let orientationDisplay = document.getElementById('orientation-display');
    
    if (!orientationDisplay) {
        // Create new orientation display element
        orientationDisplay = document.createElement('div');
        orientationDisplay.id = 'orientation-display';
        orientationDisplay.className = 'orientation-display';
        
        // Insert after the view image button for proper visual flow
        const viewButton = document.getElementById('view-image-button');
        if (viewButton && viewButton.parentNode) {
            viewButton.parentNode.insertBefore(orientationDisplay, viewButton.nextSibling);
        }
    }
    
    // Capitalize the orientation for display (e.g., 'Landscape' instead of 'landscape')
    const capitalizedOrientation = orientation.charAt(0).toUpperCase() + orientation.slice(1);
    
    // Update the display with orientation information and ruler icon
    orientationDisplay.innerHTML = `<span class="orientation-info">📏 ${capitalizedOrientation} orientation detected</span>`;
    orientationDisplay.style.display = 'block';
}
