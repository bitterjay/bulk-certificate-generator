/**
 * PDF GENERATION MODULE
 * Handles the generation of PDF certificates from the preview slides.
 * This module creates multi-page PDFs with proper font embedding, image backgrounds,
 * and element positioning that matches the preview display.
 * 
 * Key features:
 * - Multi-format image support (PNG, JPEG, JPG)
 * - Custom font embedding (Poppins family)
 * - Proper scaling from preview to PDF dimensions
 * - Concatenated element support with pipe separators
 * - Theme-based color system integration
 * - Element state management (position, color, font size, etc.)
 */

// Import PDFLib components for PDF creation
import { PDFDocument, rgb } from 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.esm.js';
// Import theme color functions from UI rendering module
import { getThemeColor, getThemeColors } from './uiRendering.js';

// Global variables for fontkit library management
let fontkit = null;
let fontkitPromise = null;

/**
 * Loads the fontkit library required for custom font embedding
 * @returns {Promise<Object>} Promise that resolves with the fontkit library
 * 
 * Fontkit is required to embed custom TTF fonts into PDFs.
 * This function loads the UMD module and caches it for reuse.
 */
async function loadFontkit() {
    if (fontkit) return fontkit;
    
    if (!fontkitPromise) {
        fontkitPromise = (async () => {
            try {
                // Fetch the fontkit UMD module
                const response = await fetch('../lib/fontkit.umd.js');
                const text = await response.text();
                
                // Create a function that executes the UMD module and returns fontkit
                const moduleWrapper = new Function('exports', 'module', text);
                const module = { exports: {} };
                moduleWrapper(module.exports, module);
                
                // Extract fontkit from module exports or window global
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

/**
 * Detects image format by examining the first few bytes (magic bytes)
 * @param {Uint8Array} bytes - The image bytes to examine
 * @returns {string|null} The detected format ('png', 'jpeg') or null if unknown
 * 
 * This function examines the binary signature of image files to determine format:
 * - PNG: 89 50 4E 47 0D 0A 1A 0A (8 bytes)
 * - JPEG: FF D8 FF (3 bytes)
 */
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

/**
 * Loads a font file from the filesystem as ArrayBuffer
 * @param {string} fontPath - Path to the font file relative to the app root
 * @returns {Promise<ArrayBuffer>} Promise that resolves with the font data
 * 
 * This function fetches TTF font files and returns them as ArrayBuffer
 * for embedding into PDF documents.
 */
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

/**
 * Converts hex color string to PDFLib RGB color object
 * @param {string} hex - Hex color string (with or without #)
 * @returns {Object} PDFLib RGB color object with r, g, b values (0-1)
 * 
 * PDFLib requires RGB values as decimals between 0-1, not 0-255.
 * This function converts standard hex colors to the required format.
 */
function hexToRgb(hex) {
    // Handle theme color or fallback to black
    if (!hex || hex === '') hex = '#000000';
    
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse hex values and convert to 0-1 range
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    
    return rgb(r, g, b);
}

/**
 * Parses concatenated element content to separate text segments from pipe separators
 * @param {HTMLElement} element - The DOM element containing concatenated content
 * @param {Object} elementState - The element's state object with color/theme info
 * @returns {Array<Object>} Array of segment objects with type, content, and color
 * 
 * This function handles concatenated elements that may contain pipe separators
 * with different colors. It parses the HTML structure to extract:
 * - Text segments with their colors
 * - Pipe separators with their independent colors
 * 
 * Each segment object contains:
 * - type: 'text' or 'pipe'
 * - content: The text content
 * - color: The hex color for this segment
 */
function parseConcatenatedContent(element, elementState) {
    const innerHTML = element.innerHTML;
    
    console.log('🔍 PDF Debug - parseConcatenatedContent:');
    console.log('  Element innerHTML:', innerHTML);
    console.log('  Element state:', {
        theme: elementState.theme,
        color: elementState.color,
        pipeColor: elementState.pipeColor,
        isUppercase: elementState.isUppercase
    });
    
    // Check if element has pipe separators with spans (more robust check)
    if (innerHTML.includes('pipe-separator')) {
        console.log('  ✅ Found pipe separators in HTML');
        
        // Create a temporary DOM element to properly parse the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = innerHTML;
        
        // Get all child nodes (text and elements)
        const childNodes = Array.from(tempDiv.childNodes);
        const segments = [];
        
        console.log('  Child nodes found:', childNodes.length);
        
        childNodes.forEach((node, index) => {
            if (node.nodeType === Node.TEXT_NODE) {
                // Text node - regular text content
                const textContent = node.textContent.trim();
                if (textContent) {
                    const textColor = getThemeColor(elementState.theme, elementState.color);
                    
                    segments.push({
                        type: 'text',
                        content: textContent,
                        color: textColor
                    });
                    
                    console.log(`    Text node ${index}: "${textContent}" with color ${textColor}`);
                }
            } else if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('pipe-separator')) {
                // Pipe separator element - may have independent color
                let pipeColor;
                
                // First try to extract color from inline style
                const inlineStyle = node.getAttribute('style');
                if (inlineStyle && inlineStyle.includes('color:')) {
                    // Extract RGB color from inline style and convert to hex
                    const colorMatch = inlineStyle.match(/color:\s*rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                    if (colorMatch) {
                        const [, r, g, b] = colorMatch;
                        pipeColor = `#${parseInt(r).toString(16).padStart(2, '0')}${parseInt(g).toString(16).padStart(2, '0')}${parseInt(b).toString(16).padStart(2, '0')}`;
                        console.log(`    Extracted inline pipe color: ${pipeColor} from style: ${inlineStyle}`);
                    } else {
                        // Fallback to state-based color
                        if (elementState.pipeColor && elementState.pipeColor !== '') {
                            pipeColor = getThemeColor(elementState.theme, elementState.pipeColor);
                        } else {
                            pipeColor = getThemeColor(elementState.theme, elementState.color);
                        }
                        console.log(`    Using fallback pipe color: ${pipeColor}`);
                    }
                } else {
                    // No inline style, use state-based color
                    if (elementState.pipeColor && elementState.pipeColor !== '') {
                        pipeColor = getThemeColor(elementState.theme, elementState.pipeColor);
                    } else {
                        pipeColor = getThemeColor(elementState.theme, elementState.color);
                    }
                    console.log(`    Using state-based pipe color: ${pipeColor}`);
                }
                
                segments.push({
                    type: 'pipe',
                    content: ' | ',
                    color: pipeColor
                });
                
                console.log(`    Pipe separator ${index}: " | " with color ${pipeColor}`);
                console.log(`      pipeColor state: "${elementState.pipeColor}", color state: "${elementState.color}"`);
            }
        });
        
        console.log('  📊 Final segments:', segments);
        return segments;
    } else {
        console.log('  ❌ No pipe separators found, treating as single text');
        
        // No pipe separators, treat as single text segment
        const textContent = element.textContent.trim();
        const textColor = getThemeColor(elementState.theme, elementState.color);
        
        const segments = [{
            type: 'text',
            content: textContent,
            color: textColor
        }];
        
        console.log('  📊 Single segment:', segments);
        return segments;
    }
}

/**
 * Draws text segments with different colors on the PDF page
 * @param {Object} page - PDFLib page object
 * @param {Array<Object>} segments - Array of text/pipe segments with colors
 * @param {number} x - X coordinate for text positioning
 * @param {number} y - Y coordinate for text positioning
 * @param {number} fontSize - Font size for all segments
 * @param {Object} font - PDFLib font object
 * @param {Object} elementState - Element state for uppercase transformation
 * 
 * This function draws multiple text segments in sequence, each with its own color.
 * It calculates the total width for proper centering and applies uppercase
 * transformation if enabled in the element state.
 */
function drawTextSegments(page, segments, x, y, fontSize, font, elementState) {
    let currentX = x;
    
    console.log('🎨 PDF Debug - drawTextSegments:');
    console.log('  Position:', { x, y });
    console.log('  Font size:', fontSize);
    console.log('  Segments to draw:', segments.length);
    
    // Calculate total width first to center properly
    let totalWidth = 0;
    segments.forEach((segment, i) => {
        const segmentWidth = font.widthOfTextAtSize(segment.content, fontSize);
        totalWidth += segmentWidth;
        console.log(`    Segment ${i} width: ${segmentWidth}px for "${segment.content}"`);
    });
    
    console.log('  Total width:', totalWidth);
    
    // Start position adjusted for centering
    currentX = x - (totalWidth / 2);
    console.log('  Centered start X:', currentX);
    
    // Draw each segment
    segments.forEach((segment, i) => {
        const segmentWidth = font.widthOfTextAtSize(segment.content, fontSize);
        const textColor = hexToRgb(segment.color);
        
        // Apply uppercase transformation if enabled
        let content = segment.content;
        if (elementState.isUppercase) {
            content = content.toUpperCase();
        }
        
        console.log(`    Drawing segment ${i}: "${content}" at x=${currentX}, color=${segment.color}`);
        console.log(`      RGB values:`, textColor);
        
        page.drawText(content, {
            x: currentX,
            y: y,
            size: fontSize,
            font: font,
            color: textColor,
        });
        
        currentX += segmentWidth;
    });
    
    console.log('  ✅ All segments drawn');
}

/**
 * Main function to generate PDF from certificate preview slides
 * @param {Array<HTMLElement>} previews - Array of preview slide DOM elements
 * @param {string} orientation - Image orientation ('landscape' or 'portrait')
 * @param {Object} elementStates - Object containing state for each element type
 * @returns {Promise<Uint8Array>} Promise that resolves with PDF bytes
 * 
 * This is the main PDF generation function that:
 * 1. Creates a new PDF document
 * 2. Loads and embeds custom fonts (Poppins family)
 * 3. Processes the uploaded certificate background image
 * 4. Calculates scaling factors between preview and PDF dimensions
 * 5. Creates a page for each certificate (skipping example slide)
 * 6. Positions and draws all text elements with proper colors and formatting
 * 7. Returns the completed PDF as bytes for download
 */
export async function generatePdfFromPreviews(previews, orientation = 'landscape', elementStates) {
    console.log('🚀 PDF Generation started');
    console.log('📊 Element states received:', elementStates);
    
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();

    // Load and register fontkit to enable custom font embedding
    try {
        const loadedFontkit = await loadFontkit();
        pdfDoc.registerFontkit(loadedFontkit);
    } catch (error) {
        console.error('Failed to load fontkit, proceeding without custom fonts:', error);
    }

    // Calculate scaling factor based on preview vs actual image dimensions
    // The preview has a max width of 800px, but the actual image could be larger
    const PREVIEW_MAX_WIDTH = 800;
    let scalingFactor = 1;

    // Load Poppins font family for professional typography
    let poppinsRegular, poppinsSemiBold, poppinsBold;
    
    try {
        console.log('Loading Poppins fonts...');
        
        // Load all three Poppins font files concurrently
        const [regularBytes, semiBoldBytes, boldBytes] = await Promise.all([
            loadFontFile('fonts/Poppins-Regular.ttf'),
            loadFontFile('fonts/Poppins-SemiBold.ttf'),
            loadFontFile('fonts/Poppins-Bold.ttf')
        ]);
        
        // Embed fonts into PDF document
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

    // Import the uploaded image directly - more reliable than extracting from DOM
    const { uploadedImage } = await import('./imageUpload.js');
    
    if (!uploadedImage || !uploadedImage.startsWith('data:')) {
        console.error('No valid uploaded image found');
        throw new Error('No certificate background image available');
    }
    
    // Extract base64 data from the data URL
    const dataUrlParts = uploadedImage.split(',');
    const base64Data = dataUrlParts[1];
    
    if (!base64Data) {
        console.error('Invalid data URL: no base64 data found');
        throw new Error('Invalid certificate background image');
    }
    
    // Convert base64 to binary once - reuse for all pages
    let imageBytes;
    try {
        // Decode base64 to binary string, then to Uint8Array
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

    // Get the actual image dimensions from the embedded image
    const imageDims = embeddedImage.scale(1);
    
    // Calculate the scaling factor between preview and actual image
    const actualImageWidth = imageDims.width;
    const actualImageHeight = imageDims.height;
    
    // Import image dimensions to get aspect ratio
    const { imageAspectRatio } = await import('./imageUpload.js');
    
    // Calculate what the preview dimensions would be
    // This matches the calculateSlideDimensions() logic in uiRendering.js
    let previewWidth = PREVIEW_MAX_WIDTH;
    let previewHeight = PREVIEW_MAX_WIDTH / imageAspectRatio;
    
    // Note: For now we're using desktop preview dimensions
    // If needed, we could detect the actual preview size from the DOM
    // but that would require passing preview dimensions from the UI
    
    // The scaling factor is the ratio between actual and preview dimensions
    scalingFactor = actualImageWidth / previewWidth;
    
    console.log(`PDF Scaling - Preview: ${previewWidth}x${previewHeight}px, Actual: ${actualImageWidth}x${actualImageHeight}px, Scale: ${scalingFactor.toFixed(2)}x`);

    // Process each preview slide to create PDF pages
    for (const preview of previews) {
        if (preview.id === 'example-slide') continue; // Skip example slide

        console.log(`🎬 Processing preview slide: ${preview.id}`);

        // Create a new page with the same dimensions as the embedded image
        const page = pdfDoc.addPage([imageDims.width, imageDims.height]);

        // Draw the background image on the page
        page.drawImage(embeddedImage, {
            x: 0,
            y: 0,
            width: imageDims.width,
            height: imageDims.height,
        });

        // Find all text elements in this preview slide
        const elements = preview.querySelectorAll('div[id]');
        console.log(`  Found ${elements.length} elements to process`);
        
        // Process each text element
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
            
            console.log(`  📝 Processing element: ${elementType} (${id})`);
            
            // Get the element's state (position, color, font size, etc.)
            const state = elementStates[elementType];

            if (!state || !state.isVisible) {
                console.log(`    ⏭️ Skipping ${elementType}: not visible or no state`);
                return;
            }

            // Convert percentage-based position to actual PDF coordinates
            const x = (state.xPercent / 100) * imageDims.width;
            // Y coordinate is inverted in PDF (0 is bottom, not top)
            let y = (100 - state.yPercent) / 100 * imageDims.height;

            // Scale the font size based on the difference between preview and actual dimensions
            const previewFontSize = state.fontSize || 24;
            const fontSize = previewFontSize * scalingFactor;
            
            console.log(`    Element ${elementType}: Preview font size: ${previewFontSize}px, PDF font size: ${fontSize}px`);
            console.log(`    Position: ${state.xPercent}% x ${state.yPercent}% = ${x}, ${y}`);

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
            
            // Handle concatenated elements with pipe separators
            if (elementType === 'concatenated-element') {
                console.log(`    🔗 Processing concatenated element`);
                
                // Parse the element to extract text and pipe segments
                const segments = parseConcatenatedContent(element, state);
                
                // Calculate text height for positioning
                const textHeight = font.heightAtSize(fontSize);
                const centerY = y - (textHeight / 2);
                
                // Draw all segments with their individual colors
                drawTextSegments(page, segments, x, centerY, fontSize, font, state);
                
                console.log(`    ✅ Concatenated element drawn with ${segments.length} segments`);
            } else {
                // Regular single-color text elements
                console.log(`    📝 Processing regular text element`);
                
                // Get the text content and apply uppercase if enabled
                let text = element.textContent;
                if (state.isUppercase) {
                    text = text.toUpperCase();
                }
                
                // Use theme system to get the correct color
                const hexColor = getThemeColor(state.theme, state.color);
                const textColor = hexToRgb(hexColor);

                // Calculate text dimensions for centering
                const textWidth = font.widthOfTextAtSize(text, fontSize);
                const textHeight = font.heightAtSize(fontSize);
                
                // Adjust positioning to center the text (matching the preview behavior)
                const centerX = x - (textWidth / 2);
                const centerY = y - (textHeight / 2);

                console.log(`    Drawing "${text}" with color ${hexColor} at ${centerX}, ${centerY}`);

                // Draw the text on the PDF page
                page.drawText(text, {
                    x: centerX,
                    y: centerY,
                    size: fontSize,
                    font: font,
                    color: textColor,
                });
                
                console.log(`    ✅ Element ${elementType} drawn with color ${hexColor}`);
            }
        });
    }

    console.log('💾 Saving PDF...');
    const pdfBytes = await pdfDoc.save();
    console.log('✅ PDF generation complete');
    return pdfBytes;
}

/**
 * Saves PDF bytes to a file and triggers download
 * @param {Uint8Array} pdfBytes - The PDF data as bytes
 * @param {string} filename - The filename for the download (default: 'certificates.pdf')
 * 
 * This function creates a blob from the PDF bytes and triggers a download
 * using a temporary anchor element. The file is saved to the user's default
 * download location.
 */
export async function savePDF(pdfBytes, filename = 'certificates.pdf') {
    // Create a blob from the PDF bytes
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    
    // Create a link element to trigger download
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    
    // Append to body, click to trigger download, then remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
