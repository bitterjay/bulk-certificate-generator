// Module for handling PNG image upload and base64 conversion
export let uploadedImage = null;

export function handleImageUpload(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            uploadedImage = event.target.result; // Store the uploaded image
            resolve(event.target.result);
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
