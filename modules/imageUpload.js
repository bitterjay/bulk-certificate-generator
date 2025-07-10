// Module for handling PNG image upload and base64 conversion
export let uploadedImage = null;
export let imageOrientation = 'landscape'; // Default orientation

export function handleImageUpload(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            uploadedImage = event.target.result; // Store the uploaded image
            
            // Detect orientation from image dimensions
            detectImageOrientation(event.target.result)
                .then(orientation => {
                    imageOrientation = orientation;
                    // Update UI to show detected orientation
                    updateOrientationDisplay(orientation);
                    resolve(event.target.result);
                })
                .catch(error => {
                    console.error('Error detecting orientation:', error);
                    imageOrientation = 'landscape'; // Default fallback
                    resolve(event.target.result);
                });
        };
        reader.onerror = (error) => {
            reject(error);
        };
        reader.readAsDataURL(file);
    });
}

export function validateImageFile(file) {
    const allowedTypes = ['image/png'];
    return allowedTypes.includes(file.type);
}

export function displayImagePreview(base64Data) {
    const previewContainer = document.getElementById('image-preview-container');
    const previewImage = document.getElementById('image-preview');
    
    if (previewContainer && previewImage) {
        previewImage.src = base64Data;
        previewContainer.style.display = 'block';
    }
}

function detectImageOrientation(base64Data) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            const orientation = this.width > this.height ? 'landscape' : 'portrait';
            resolve(orientation);
        };
        img.onerror = function() {
            reject(new Error('Failed to load image for orientation detection'));
        };
        img.src = base64Data;
    });
}

function updateOrientationDisplay(orientation) {
    // Find or create orientation display element
    let orientationDisplay = document.getElementById('orientation-display');
    
    if (!orientationDisplay) {
        orientationDisplay = document.createElement('div');
        orientationDisplay.id = 'orientation-display';
        orientationDisplay.className = 'orientation-display';
        
        // Insert after the image preview container
        const previewContainer = document.getElementById('image-preview-container');
        if (previewContainer && previewContainer.parentNode) {
            previewContainer.parentNode.insertBefore(orientationDisplay, previewContainer.nextSibling);
        }
    }
    
    const capitalizedOrientation = orientation.charAt(0).toUpperCase() + orientation.slice(1);
    orientationDisplay.innerHTML = `<span class="orientation-info">📏 ${capitalizedOrientation} orientation detected</span>`;
    orientationDisplay.style.display = 'block';
}
