# USA Archery Certificate Generator - Development Reference

## Project Overview

The USA Archery Certificate Generator is a sophisticated web application designed to create personalized certificates for USA Archery events. It provides a complete workflow from data import to PDF generation, with real-time preview and interactive editing capabilities.

### Core Purpose
- Generate bulk certificates for archery competitions and events
- Support multiple certificate layouts and themes
- Provide interactive editing with visual feedback
- Export professional-quality PDF certificates

### Key Features
- Excel data import with tab-separated value parsing
- Certificate background image upload with orientation detection
- Interactive drag-and-drop column selection
- Real-time preview with Swiper carousel
- Element positioning and styling controls
- Theme-based color management
- Professional PDF export with embedded fonts

## Architecture Overview

### Module Structure

The application follows a modular architecture with clear separation of concerns:

```
src/
├── app.js                          # Main application entry point
└── modules/
    ├── dataParsing.js             # Excel data processing
    ├── imageUpload.js             # Image handling and orientation
    ├── pdfGeneration.js           # PDF creation and export
    ├── uiRendering.js             # UI compatibility layer
    ├── element/
    │   ├── elementState.js        # Element state management
    │   ├── elementControls.js     # Interactive controls
    │   └── previewGenerator.js    # Preview generation
    ├── theme/
    │   └── themeManager.js        # Theme and color system
    ├── utils/
    │   └── domUtils.js            # DOM manipulation utilities
    └── interaction/
        └── dragAndDrop.js         # Drag-and-drop functionality
```

### Data Flow

1. **Data Input Phase**
   - Excel data → `dataParsing.js` → processed data structures
   - Background image → `imageUpload.js` → base64 + orientation detection

2. **Configuration Phase**
   - Column selection → drag-and-drop interface
   - Layout preset selection → automatic column configuration
   - Date selection → certificate dating

3. **Preview Phase**
   - Data + configuration → `previewGenerator.js` → Swiper carousel
   - Interactive editing → `elementControls.js` → real-time updates

4. **Export Phase**
   - Preview elements → `pdfGeneration.js` → scaled PDF with fonts

## Core Modules Documentation

### 1. Data Parsing Module (`modules/dataParsing.js`)

**Purpose**: Handles Excel data import and processing

**Key Variables**:
- `parsedData`: Processed data with combined Name field
- `originalHeaders`: Raw column headers from Excel
- `originalData`: Unmodified row data for table display

**Main Function**:
```javascript
parseExcelData(pastedData) // Returns filtered headers
```

**Data Processing**:
- Splits tab-separated values into rows/columns
- Combines "First Name" + "Last Name" → "Name" field
- Maintains original data for table display
- Filters headers for UI column selection

### 2. Image Upload Module (`modules/imageUpload.js`)

**Purpose**: Handles certificate background image processing

**Key Variables**:
- `uploadedImage`: Base64-encoded image data
- `imageOrientation`: 'landscape' or 'portrait'
- `imageWidth`, `imageHeight`: Actual image dimensions
- `imageAspectRatio`: Width/height ratio

**Main Functions**:
```javascript
handleImageUpload(file)         // Returns Promise<base64>
detectImageOrientation(base64)  // Returns orientation data
validateImageFile(file)         // Validates file types
```

**Supported Formats**: PNG, JPEG, JPG

### 3. PDF Generation Module (`modules/pdfGeneration.js`)

**Purpose**: Creates professional PDF certificates

**Key Features**:
- Custom font embedding (Poppins family)
- Multi-format image support
- Proper scaling from preview to PDF
- Concatenated element support with pipe separators
- Theme-based color system integration

**Main Functions**:
```javascript
generatePdfFromPreviews(previews, orientation, elementStates)
savePDF(pdfBytes, filename)
```

**Technical Details**:
- Uses PDFLib for PDF creation
- Embeds TTF fonts via fontkit
- Scales elements based on preview vs actual image dimensions
- Supports multi-colored text segments

### 4. Element State Management (`modules/element/elementState.js`)

**Purpose**: Manages position, styling, and properties of certificate elements

**Element Types**:
- `name-element`: Recipient name
- `concatenated-element`: Combined data columns
- `date-element`: Certificate date
- `placement-element`: Competition placement
- `club-element`: Archery club name
- `{column}-element`: Individual data columns

**State Properties**:
```javascript
{
  xPercent: 0-100,           // Horizontal position (%)
  yPercent: 0-100,           // Vertical position (%)
  fontSize: 12-72,           // Font size (px)
  theme: 'usa-archery',      // Theme identifier
  color: 'red',              // Text color
  pipeColor: 'black',        // Pipe separator color
  lockHorizontal: false,     // Prevent horizontal movement
  lockVertical: false,       // Prevent vertical movement
  isVisible: true,           // Element visibility
  isUppercase: false,        // Text transformation
  lastUpdated: timestamp     // State modification time
}
```

### 5. Theme System (`modules/theme/themeManager.js`)

**Purpose**: Manages color themes and styling

**Available Themes**:
- **USA Archery**: Official brand colors
  - Red: #aa1e2e, Blue: #1c355e, Black: #000000, White: #ffffff
- **Classic**: Traditional certificate colors
- **Modern**: Contemporary palette

**Theme Structure**:
```javascript
{
  "usa-archery": {
    "name": "USA Archery",
    "description": "Official USA Archery brand colors",
    "colors": { red: "#aa1e2e", blue: "#1c355e", ... },
    "default": "black"
  }
}
```

### 6. UI Rendering System (`modules/uiRendering.js`)

**Purpose**: Compatibility layer for UI components

**Key Responsibilities**:
- Re-exports all modular functions
- Maintains backward compatibility
- Bridges legacy code with new architecture

## User Workflow

### 1. Data Input
- **Clipboard Paste**: Automatic clipboard reading (if supported)
- **Manual Paste**: Fallback text area input
- **Sample Data**: Pre-loaded test data
- **Table View**: Lightbox display of imported data

### 2. Layout Selection
- **Default**: Virtual competition focus
- **Achievement Certificate**: Recognition-based
- **In-Person Competition**: Physical event layout
- **Virtual Tournament**: Online event layout

### 3. Column Configuration
- **Drag-and-Drop Interface**: Visual column selection
- **Concatenation Zone**: Combine multiple columns
- **Order Matters**: Left-to-right concatenation
- **Auto-Configuration**: Layout presets auto-select columns

### 4. Image Upload
- **File Selection**: PNG, JPEG, JPG support
- **Orientation Detection**: Automatic landscape/portrait
- **Preview Button**: Lightbox image viewing
- **Validation**: File type and format checking

### 5. Preview Generation
- **Swiper Carousel**: Navigate through certificates
- **Interactive Elements**: Click-to-select editing
- **Real-Time Updates**: Immediate visual feedback
- **Element Controls**: Position, size, color, theme

### 6. PDF Export
- **Scaling**: Proper preview-to-PDF scaling
- **Font Embedding**: Professional typography
- **Multi-Page**: One certificate per page
- **Download**: Direct file download

## Technical Implementation Details

### Element Positioning System
- **Percentage-Based**: All positions stored as percentages (0-100%)
- **Container Relative**: Positions relative to certificate image
- **Scaling**: Automatic scaling between preview and PDF
- **Locking**: Horizontal/vertical position locks

### Preview System
- **Swiper Integration**: Professional carousel component
- **Dynamic Generation**: Creates slides from data
- **Responsive**: Adapts to different screen sizes
- **Interactive**: Click-to-edit functionality

### Drag-and-Drop System
- **Visual Feedback**: Drag states and hover effects
- **Constraint Handling**: Respect position locks
- **Real-Time Updates**: Immediate position feedback
- **Multi-Slide Sync**: Updates across all certificates

### Color Management
- **Theme-Based**: Colors organized by themes
- **Validation**: Ensure colors exist in selected theme
- **Pipe Colors**: Independent colors for separators
- **Fallbacks**: Default colors for missing values

### Font System
- **Poppins Family**: Regular, SemiBold, Bold weights
- **Fallback**: Helvetica for compatibility
- **Embedding**: TTF fonts embedded in PDF
- **Scaling**: Proportional scaling between preview and PDF

## Known Issues and Improvements

Based on `.clinerules/bugs.md`:

### Current Issues
1. **General UI Updates**: Ongoing UI refinements needed
2. **Shelf UI**: Consider shelf-style element editor
3. **Preview Length**: Elements don't show longest item length
4. **Drag Bug**: Click and drag loading issues

### Improvement Areas
1. **Mobile Responsiveness**: Optimize for mobile devices
2. **Accessibility**: Improve keyboard navigation and screen reader support
3. **Performance**: Optimize preview generation for large datasets
4. **User Experience**: Streamline workflow and reduce complexity

## Development Guidelines

### Code Organization
- **Modular Structure**: Keep modules focused and independent
- **Clear Interfaces**: Well-defined function signatures
- **Documentation**: Comprehensive inline comments
- **Error Handling**: Graceful error handling with user feedback

### Testing Strategy
- **Manual Testing**: Use test files in `test-files/` directory
- **Cross-Browser**: Test clipboard API compatibility
- **Image Formats**: Verify PNG, JPEG, JPG support
- **PDF Generation**: Test with various data sizes

### Performance Considerations
- **Image Processing**: Optimize large image handling
- **DOM Updates**: Minimize DOM manipulation
- **Memory Management**: Clean up event listeners
- **PDF Generation**: Optimize font loading and reuse

## File Structure Reference

### Core Files
- `index.html`: Main application HTML
- `styles.css`: Application styling
- `themes.json`: Theme configuration
- `fonts/`: Custom font files (Poppins family)

### Layout Presets
- `layouts/default.json`: Default layout configuration
- `layouts/achievement-certificate.json`: Achievement layout
- `layouts/in-person-competition.json`: In-person event layout
- `layouts/virtual-tournament.json`: Virtual event layout

### Test Files
- `test-files/individual.xlsx`: Individual competition data
- `test-files/test-file.xlsx`: General test data
- `test-files/test-landscape.jpg`: Landscape orientation test
- `test-files/test-portrait.png`: Portrait orientation test

## API Reference

### Main Application Functions
```javascript
// Data handling
parseExcelData(pastedData)
handleImageUpload(file)

// Preview generation
generatePreviewSlider(selectedColumns, date, orientation, layout)
applyLayoutPreset(presetName)

// Element management
updateElementState(elementType, updates)
getElementState(elementType)
selectElement(elementType)

// PDF generation
generatePdfFromPreviews(previews, orientation, elementStates)
savePDF(pdfBytes, filename)
```

### Event Handlers
```javascript
// UI Events
handleClipboardPaste()
handleDataPaste()
handleGeneratePreview()
handleGeneratePdf()

// Element Events
handleElementClick(event)
handleElementMouseDown(event)
handleSliderChange(elementType, property, value)
```

## Configuration

### Theme Configuration (`themes.json`)
```json
{
  "themes": {
    "theme-name": {
      "name": "Display Name",
      "description": "Theme description",
      "colors": { "color-name": "#hex-code" },
      "default": "default-color-name"
    }
  },
  "defaultTheme": "theme-name"
}
```

### Layout Configuration (`layouts/*.json`)
```json
{
  "name": "Layout Name",
  "description": "Layout description",
  "expectedColumns": ["Column1", "Column2"],
  "elementStates": {
    "element-type": {
      "xPercent": 50,
      "yPercent": 60,
      "fontSize": 24,
      "theme": "usa-archery",
      "color": "red"
    }
  }
}
```

This reference document provides a comprehensive overview of the USA Archery Certificate Generator, covering architecture, implementation details, and development guidelines. It should serve as a complete guide for understanding and extending the application.
