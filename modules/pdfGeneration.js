// Module for generating PDF certificates
import * as PDFLib from 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';

export async function generateCertificatePDF(certificates, orientation = 'landscape') {
    // Create a new PDFDocument
    const pdfDoc = await PDFLib.PDFDocument.create();
    
    // Get a font
    const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
    
    for (const cert of certificates) {
        // Add a new page
        const page = pdfDoc.addPage();
        
        // Set page size based on orientation
        const pageWidth = orientation === 'landscape' 
            ? page.getWidth() 
            : page.getHeight();
        const pageHeight = orientation === 'landscape' 
            ? page.getHeight() 
            : page.getWidth();
        
        // Embed background image
        if (cert.backgroundImage) {
            const backgroundImage = await pdfDoc.embedPng(cert.backgroundImage);
            page.drawImage(backgroundImage, {
                x: 0,
                y: 0,
                width: pageWidth,
                height: pageHeight
            });
        }
        
        // Draw name
        page.drawText(cert.name, {
            x: cert.namePosition.x,
            y: cert.namePosition.y,
            size: 24,
            font: font,
            color: PDFLib.rgb(0, 0, 0)
        });
        
        // Draw additional information
        cert.additionalInfo.forEach((info, index) => {
            page.drawText(info, {
                x: cert.additionalInfoPositions[index].x,
                y: cert.additionalInfoPositions[index].y,
                size: 16,
                font: font,
                color: PDFLib.rgb(0, 0, 0)
            });
        });
    }
    
    // Serialize PDF to bytes
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

export async function prepareCertificateData(data, backgroundImage, namePosition, additionalInfoPositions) {
    return data.map(row => ({
        name: row.Name,
        backgroundImage: backgroundImage,
        namePosition: namePosition,
        additionalInfo: Object.entries(row)
            .filter(([key]) => key !== 'Name')
            .map(([key, value]) => `${key}: ${value}`),
        additionalInfoPositions: additionalInfoPositions
    }));
}
