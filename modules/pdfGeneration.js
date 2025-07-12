// Module for generating PDF certificates
import { PDFDocument, rgb } from 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.esm.js';

// Load fontkit UMD module
let fontkit = null;
let fontkitPromise = null;

async function loadFontkit() {
    if (fontkit) return fontkit;
    
    if (!fontkitPromise) {
        fontkitPromise = (async () => {
            try {
                const response = await fetch('../lib/fontkit.umd.js');
                const text = await response.text();
                // Create a function that executes the UMD module and returns fontkit
                const moduleWrapper = new Function('exports', 'module', text);
                const module = { exports: {} };
                moduleWrapper(module.exports, module);
                fontkit = module.exports || window.fontkit;
                console.log('Fontkit loaded successfully');
                return fontkit;
            } catch (error) {
                console.error('Failed to load fontkit:', error);
                throw error;
            }
        })();
    }
    
    return fontkitPromise;
}

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

// Helper function to load font file as ArrayBuffer
async function loadFontFile(fontPath) {
    try {
        const response = await fetch(fontPath);
        if (!response.ok) {
            throw new Error(`Failed to load font: ${fontPath}`);
        }
        const fontBytes = await response.arrayBuffer();
        return fontBytes;
    } catch (error) {
        console.error(`Error loading font file ${fontPath}:`, error);
        throw error;
    }
}

export async function generatePdfFromPreviews(previews, orientation = 'landscape', elementStates) {
    const pdfDoc = await PDFDocument.create();

    // Load and register fontkit to enable custom font embedding
    try {
        const loadedFontkit = await loadFontkit();
        pdfDoc.registerFontkit(loadedFontkit);
    } catch (error) {
        console.error('Failed to load fontkit, proceeding without custom fonts:', error);
    }

    // Load Poppins fonts
    let poppinsRegular, poppinsSemiBold, poppinsBold;
    
    try {
        console.log('Loading Poppins fonts...');
        
        // Load font files
        const [regularBytes, semiBoldBytes, boldBytes] = await Promise.all([
            loadFontFile('fonts/Poppins-Regular.ttf'),
            loadFontFile('fonts/Poppins-SemiBold.ttf'),
            loadFontFile('fonts/Poppins-Bold.ttf')
        ]);
        
        // Embed fonts into PDF
        poppinsRegular = await pdfDoc.embedFont(regularBytes);
        poppinsSemiBold = await pdfDoc.embedFont(semiBoldBytes);
        poppinsBold = await pdfDoc.embedFont(boldBytes);
        
        console.log('Poppins fonts loaded successfully');
    } catch (error) {
        console.error('Failed to load Poppins fonts, falling back to Helvetica:', error);
        // Fallback to standard fonts if custom fonts fail to load
        const { StandardFonts } = await import('https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.esm.js');
        poppinsRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
        poppinsSemiBold = await pdfDoc.embedFont(StandardFonts.Helvetica);
        poppinsBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    }

    // Import the uploadedImage directly - more reliable than extracting from DOM
    const { uploadedImage } = await import('./imageUpload.js');
    
    if (!uploadedImage || !uploadedImage.startsWith('data:')) {
        console.error('No valid uploaded image found');
        throw new Error('No certificate background image available');
    }
    
    // Extract base64 data from the uploadedImage
    const dataUrlParts = uploadedImage.split(',');
    const base64Data = dataUrlParts[1];
    
    if (!base64Data) {
        console.error('Invalid data URL: no base64 data found');
        throw new Error('Invalid certificate background image');
    }
    
    // Convert base64 to binary once - reuse for all pages
    let imageBytes;
    try {
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        imageBytes = bytes;
    } catch (err) {
        console.error('Error decoding base64:', err);
        throw new Error('Failed to decode certificate background image');
    }
    
    // Detect actual image format using magic bytes
    const detectedFormat = detectImageFormat(imageBytes);
    
    if (!detectedFormat) {
        console.error('Could not detect image format');
        throw new Error('Unsupported image format');
    }
    
    // Embed the image once - reuse for all pages
    let embeddedImage;
    try {
        if (detectedFormat === 'png') {
            console.log('Embedding as PNG');
            embeddedImage = await pdfDoc.embedPng(imageBytes);
        } else if (detectedFormat === 'jpeg') {
            console.log('Embedding as JPEG');
            embeddedImage = await pdfDoc.embedJpg(imageBytes);
        }
    } catch (err) {
        console.error(`Error embedding ${detectedFormat} image:`, err);
        throw new Error(`Failed to embed ${detectedFormat} image`);
    }

    const imageDims = embeddedImage.scale(1);

    for (const preview of previews) {
        if (preview.id === 'example-slide') continue; // Skip example slide

        // Create a new page with the same dimensions as the embedded image
        const page = pdfDoc.addPage([imageDims.width, imageDims.height]);

        // Draw the background image on the page
        page.drawImage(embeddedImage, {
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
            
            // Select appropriate font weight based on element type and web styling
            let font;
            if (elementType === 'name-element') {
                // Name uses font-weight: 600 (SemiBold) in CSS
                font = poppinsSemiBold;
            } else if (elementType === 'concatenated-element' || elementType === 'date-element') {
                // Concatenated and date use font-weight: 600 (SemiBold) in CSS
                font = poppinsSemiBold;
            } else {
                // Other elements also use font-weight: 600 (SemiBold) in CSS
                font = poppinsSemiBold;
            }
            
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
