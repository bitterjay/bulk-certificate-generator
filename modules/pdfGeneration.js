// Module for generating PDF certificates
import { PDFDocument, rgb, StandardFonts } from 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.esm.js';

// Helper function to detect image format by magic bytes
function detectImageFormat(bytes) {
    if (!bytes || bytes.length < 8) {
        console.error('Invalid image data: too short');
        return null;
    }
    
    // Check PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
        bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A) {
        return 'png';
    }
    
    // Check JPEG signature: FF D8 FF
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
        return 'jpeg';
    }
    
    console.error('Unknown image format. First 8 bytes:', Array.from(bytes.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' '));
    return null;
}

export async function generatePdfFromPreviews(previews, orientation = 'landscape', elementStates) {
    const pdfDoc = await PDFDocument.create();

    // Use standard PDF fonts (Helvetica) instead of custom fonts to avoid fontkit dependency
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    for (const preview of previews) {
        if (preview.id === 'example-slide') continue; // Skip example slide

        // Extract the background image URL more carefully
        let imageSrc = preview.style.backgroundImage;
        console.log('Raw backgroundImage:', imageSrc);
        
        // Extract URL from CSS property - handle various formats
        if (imageSrc.startsWith('url(')) {
            imageSrc = imageSrc.substring(4, imageSrc.length - 1);
            // Remove quotes if present
            if ((imageSrc.startsWith('"') && imageSrc.endsWith('"')) || 
                (imageSrc.startsWith("'") && imageSrc.endsWith("'"))) {
                imageSrc = imageSrc.substring(1, imageSrc.length - 1);
            }
        }
        
        console.log('Extracted image source:', imageSrc);
        
        let imageBytes;
        
        // Check if it's a data URL
        if (imageSrc.startsWith('data:')) {
            // Extract the mime type and base64 data
            const dataUrlParts = imageSrc.split(',');
            const mimeInfo = dataUrlParts[0];
            const base64Data = dataUrlParts[1];
            
            if (!base64Data) {
                console.error('Invalid data URL: no base64 data found');
                continue;
            }
            
            // Convert base64 to binary
            try {
                const binaryString = atob(base64Data);
                // Convert binary string to Uint8Array
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                imageBytes = bytes;
            } catch (err) {
                console.error('Error decoding base64:', err);
                continue;
            }
        } else {
            console.error('Invalid image source - not a data URL:', imageSrc);
            console.log('First 100 characters:', imageSrc.substring(0, 100));
            
            // Try to get the background image from the imported module
            try {
                // Import the uploadedImage from imageUpload module
                const { uploadedImage } = await import('./imageUpload.js');
                console.log('Using uploadedImage from module:', uploadedImage ? 'Available' : 'Not available');
                
                if (uploadedImage && uploadedImage.startsWith('data:')) {
                    // Extract base64 data from the uploadedImage
                    const dataUrlParts = uploadedImage.split(',');
                    const base64Data = dataUrlParts[1];
                    
                    if (base64Data) {
                        const binaryString = atob(base64Data);
                        const len = binaryString.length;
                        const bytes = new Uint8Array(len);
                        for (let i = 0; i < len; i++) {
                            bytes[i] = binaryString.charCodeAt(i);
                        }
                        imageBytes = bytes;
                    }
                } else {
                    console.error('uploadedImage is not a valid data URL');
                    continue;
                }
            } catch (err) {
                console.error('Error getting uploadedImage:', err);
                continue;
            }
        }

        // Detect actual image format using magic bytes
        const detectedFormat = detectImageFormat(imageBytes);
        
        if (!detectedFormat) {
            console.error('Could not detect image format for slide');
            continue;
        }

        // Try to embed the image based on detected format
        let image;
        try {
            if (detectedFormat === 'png') {
                console.log('Embedding as PNG');
                image = await pdfDoc.embedPng(imageBytes);
            } else if (detectedFormat === 'jpeg') {
                console.log('Embedding as JPEG');
                image = await pdfDoc.embedJpg(imageBytes);
            }
        } catch (err) {
            console.error(`Error embedding ${detectedFormat} image:`, err);
            console.log('Image size:', imageBytes.length, 'bytes');
            console.log('First 16 bytes:', Array.from(imageBytes.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' '));
            
            // Skip this slide if we can't embed the image
            continue;
        }

        const imageDims = image.scale(1);

        const page = pdfDoc.addPage([imageDims.width, imageDims.height]);

        page.drawImage(image, {
            x: 0,
            y: 0,
            width: imageDims.width,
            height: imageDims.height,
        });

        const elements = preview.querySelectorAll('div[id]');
        elements.forEach(element => {
            // Extract element type from ID (format: elementType-slideIndex)
            const id = element.id;
            let elementType = null;
            if (id && id.includes('-')) {
                const lastDashIndex = id.lastIndexOf('-');
                elementType = id.substring(0, lastDashIndex);
            }
            
            if (!elementType) {
                console.warn('Could not extract element type from element ID:', id);
                return;
            }
            
            const state = elementStates[elementType];

            if (!state || !state.isVisible) return;

            const text = element.textContent;
            const x = (state.xPercent / 100) * imageDims.width;
            let y = (100 - state.yPercent) / 100 * imageDims.height;

            const fontSize = state.fontSize || 24;
            const font = (elementType === 'name-element') ? helveticaBold : helvetica;
            
            const colorKey = state.color || 'black';
            const theme = state.theme || 'usa-archery';
            // This is a placeholder. A more robust theme system would be needed here.
            const colors = {
                'usa-archery': { red: '#aa1e2e', blue: '#1c355e', black: '#000000', white: '#ffffff' },
                'classic': { red: '#8B0000', blue: '#000080', black: '#000000', white: '#ffffff' },
                'modern': { red: '#E53E3E', blue: '#3182CE', black: '#2D3748', white: '#ffffff' }
            };
            const hexColor = colors[theme] ? (colors[theme][colorKey] || '#000000') : '#000000';
            const r = parseInt(hexColor.slice(1, 3), 16) / 255;
            const g = parseInt(hexColor.slice(3, 5), 16) / 255;
            const b = parseInt(hexColor.slice(5, 7), 16) / 255;
            const textColor = rgb(r, g, b);

            const textWidth = font.widthOfTextAtSize(text, fontSize);
            const textHeight = font.heightAtSize(fontSize);
            
            // Adjust y-coordinate to match CSS top positioning (pdf-lib's origin is bottom-left)
            y = y - textHeight * 0.8; 


            page.drawText(text, {
                x: x - (textWidth / 2), // Centered text
                y: y,
                size: fontSize,
                font: font,
                color: textColor,
            });
        });
    }

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
}


export async function savePDF(pdfBytes, filename = 'certificates.pdf') {
    // Create a blob from the PDF bytes
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    
    // Create a link element to trigger download
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    
    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
