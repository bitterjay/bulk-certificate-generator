// Module for generating PDF certificates
import * as PDFLib from 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';

async function fetchFont(url) {
    const fontBytes = await fetch(url).then(res => res.arrayBuffer());
    return fontBytes;
}

export async function generatePdfFromPreviews(previews, orientation = 'landscape', elementStates) {
    const pdfDoc = await PDFLib.PDFDocument.create();

    // Fetch and embed fonts
    const poppinsRegularBytes = await fetchFont('fonts/Poppins-Regular.ttf');
    const poppinsBoldBytes = await fetchFont('fonts/Poppins-Bold.ttf');
    
    const poppinsRegular = await pdfDoc.embedFont(poppinsRegularBytes);
    const poppinsBold = await pdfDoc.embedFont(poppinsBoldBytes);

    for (const preview of previews) {
        if (preview.id === 'example-slide') continue; // Skip example slide

        const imageSrc = preview.style.backgroundImage.slice(4, -1).replace(/"/g, "");
        const imageResponse = await fetch(imageSrc);
        const imageBytes = await imageResponse.arrayBuffer();

        const image = imageSrc.endsWith('.png') 
            ? await pdfDoc.embedPng(imageBytes) 
            : await pdfDoc.embedJpg(imageBytes);

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
            const elementType = element.getAttribute('data-element-type');
            const state = elementStates[elementType];

            if (!state || !state.isVisible) return;

            const text = element.textContent;
            const x = (state.xPercent / 100) * imageDims.width;
            let y = (100 - state.yPercent) / 100 * imageDims.height;

            const fontSize = state.fontSize || 24;
            const font = (elementType === 'name-element') ? poppinsBold : poppinsRegular;
            
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
            const textColor = PDFLib.rgb(r, g, b);

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
