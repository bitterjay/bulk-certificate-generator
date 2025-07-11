// Module for handling PNG and JPG image upload and base64 conversion
export let uploadedImage = null;
export let imageOrientation = 'landscape'; // Default orientation
export let imageWidth = 0;
export let imageHeight = 0;
export let imageAspectRatio = 1.0;

export function handleImageUpload(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            uploadedImage = event.target.result; // Store the uploaded image
            
            // Detect orientation and dimensions from image
            detectImageOrientation(event.target.result)
                .then(result => {
                    imageOrientation = result.orientation;
                    imageWidth = result.width;
                    imageHeight = result.height;
                    imageAspectRatio = result.aspectRatio;
                    
                    // Update UI to show detected orientation
                    updateOrientationDisplay(result.orientation);
                    resolve(event.target.result);
                })
                .catch(error => {
                    console.error('Error detecting orientation:', error);
                    imageOrientation = 'landscape'; // Default fallback
                    imageWidth = 800; // Default fallback
                    imageHeight = 600; // Default fallback
                    imageAspectRatio = 800 / 600; // Default fallback
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
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    return allowedTypes.includes(file.type);
}

export function showViewImageButton() {
    const viewButton = document.getElementById('view-image-button');
    if (viewButton) {
        viewButton.style.display = 'inline-block';
    }
}

function detectImageOrientation(base64Data) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            const width = this.width;
            const height = this.height;
            const aspectRatio = width / height;
            const orientation = width > height ? 'landscape' : 'portrait';
            
            resolve({
                orientation: orientation,
                width: width,
                height: height,
                aspectRatio: aspectRatio
            });
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
        
        // Insert after the view image button
        const viewButton = document.getElementById('view-image-button');
        if (viewButton && viewButton.parentNode) {
            viewButton.parentNode.insertBefore(orientationDisplay, viewButton.nextSibling);
        }
    }
    
    const capitalizedOrientation = orientation.charAt(0).toUpperCase() + orientation.slice(1);
    orientationDisplay.innerHTML = `<span class="orientation-info">📏 ${capitalizedOrientation} orientation detected</span>`;
    orientationDisplay.style.display = 'block';
}
