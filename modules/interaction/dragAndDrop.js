// Drag and Drop Module
// Handles element click, selection, and drag operations

// Performance optimization: Cache container dimensions during drag
let cachedContainerDimensions = null;

// Drag state management
export let dragState = {
    isDragging: false,
    currentElement: null,
    startX: 0,
    startY: 0,
    elementType: null,
    initialOffsetX: 0,  // Offset from mouse to element position
    initialOffsetY: 0,  // Offset from mouse to element position
    initialElementX: 0, // Element's initial position
    initialElementY: 0, // Element's initial position
    animationFrameId: null, // For smooth updates
    hasMoved: false // Track if the mouse has actually moved during drag
};

// Get element type from DOM element
export function getElementTypeFromElement(element) {
    // Extract element type from ID (format: elementType-slideIndex)
    const id = element.id;
    if (id && id.includes('-')) {
        const lastDashIndex = id.lastIndexOf('-');
        return id.substring(0, lastDashIndex);
    }
    return null;
}

// Handle element click - determine if it's a click or a drag end
export function handleElementClick(event, dragStateRef) {
    // Only handle click if we didn't drag
    if (!dragStateRef.hasMoved) {
        event.stopPropagation();
        const elementType = getElementTypeFromElement(event.target);
        if (elementType) {
            return elementType; // Return element type for selection
        }
    }
    return null;
}

// Handle mouse down on element - start drag operation
export function handleElementMouseDown(
    event,
    selectElement,
    getElementState,
    updateDraggedElementPositionFn
) {
    const elementType = getElementTypeFromElement(event.target);
    
    // Select the element if it's not already selected
    if (elementType !== window.currentSelectedElement) {
        selectElement(elementType);
    }
    
    event.preventDefault();
    event.stopPropagation();
    
    const container = event.target.closest('.certificate-preview');
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const elementRect = event.target.getBoundingClientRect();
    
    // Cache container dimensions for performance
    cachedContainerDimensions = containerRect;
    
    // Calculate the mouse position relative to the container
    const mouseX = event.clientX - containerRect.left;
    const mouseY = event.clientY - containerRect.top;
    
    // Calculate the element's current center position
    const elementCenterX = elementRect.left + elementRect.width / 2 - containerRect.left;
    const elementCenterY = elementRect.top + elementRect.height / 2 - containerRect.top;
    
    // Calculate the offset between mouse and element center
    const offsetX = mouseX - elementCenterX;
    const offsetY = mouseY - elementCenterY;
    
    // Store drag state with offset information
    dragState.isDragging = true;
    dragState.currentElement = event.target;
    dragState.elementType = elementType;
    dragState.startX = event.clientX;
    dragState.startY = event.clientY;
    dragState.initialOffsetX = offsetX;
    dragState.initialOffsetY = offsetY;
    dragState.initialElementX = elementCenterX;
    dragState.initialElementY = elementCenterY;
    dragState.hasMoved = false; // Reset movement tracking
    
    // Add global event listeners
    document.addEventListener('mousemove', (e) => handleDragMove(e, getElementState, updateDraggedElementPositionFn));
    document.addEventListener('mouseup', (e) => handleDragEnd(e, updateDraggedElementPositionFn));
    
    // Add dragging class and disable transitions
    dragState.currentElement.classList.add('dragging');
    
    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
}

// Handle mouse move during drag
export function handleDragMove(event, getElementState, updateDraggedElementPositionFn) {
    if (!dragState.isDragging) return;
    
    // Mark that we've moved
    dragState.hasMoved = true;
    
    // Cancel any pending animation frame
    if (dragState.animationFrameId) {
        cancelAnimationFrame(dragState.animationFrameId);
    }
    
    // Use requestAnimationFrame for smooth updates
    dragState.animationFrameId = requestAnimationFrame(() => {
        const container = dragState.currentElement.closest('.certificate-preview');
        if (!container) return;
        
        // Use cached container dimensions for performance
        const containerRect = cachedContainerDimensions || container.getBoundingClientRect();
        
        // Calculate mouse position relative to container
        const mouseX = event.clientX - containerRect.left;
        const mouseY = event.clientY - containerRect.top;
        
        // Calculate new element center position by subtracting the stored offset
        const newElementCenterX = mouseX - dragState.initialOffsetX;
        const newElementCenterY = mouseY - dragState.initialOffsetY;
        
        // Convert to percentages
        let xPercent = (newElementCenterX / containerRect.width) * 100;
        let yPercent = (newElementCenterY / containerRect.height) * 100;
        
        // Get current state to check locks
        const currentState = getElementState(dragState.elementType);
        
        // If locked, use current position instead of calculated position
        if (currentState?.lockHorizontal) {
            xPercent = currentState.xPercent;
        }
        if (currentState?.lockVertical) {
            yPercent = currentState.yPercent;
        }
        
        // Clamp to valid range
        const clampedX = Math.max(0, Math.min(100, xPercent));
        const clampedY = Math.max(0, Math.min(100, yPercent));
        
        // Update position immediately for smooth dragging (optimized)
        updateDraggedElementPositionFn(dragState.elementType, clampedX, clampedY);
    });
}

// Handle mouse up - end drag operation
export function handleDragEnd(event, updateDraggedElementPositionFn) {
    if (!dragState.isDragging) return;
    
    // Cancel any pending animation frame
    if (dragState.animationFrameId) {
        cancelAnimationFrame(dragState.animationFrameId);
        dragState.animationFrameId = null;
    }
    
    // Remove global event listeners
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    
    // Remove dragging class
    dragState.currentElement.classList.remove('dragging');
    
    // Restore text selection
    document.body.style.userSelect = '';
    
    // Get the final element state for sync
    const syncCallback = updateDraggedElementPositionFn(dragState.elementType, null, null, true);
    
    // If a sync callback was returned, call it with the element type
    if (typeof syncCallback === 'function') {
        syncCallback(dragState.elementType);
    }
    
    // Clear cached container dimensions
    cachedContainerDimensions = null;
    
    // Reset drag state
    dragState.isDragging = false;
    dragState.currentElement = null;
    dragState.elementType = null;
    dragState.initialOffsetX = 0;
    dragState.initialOffsetY = 0;
    dragState.initialElementX = 0;
    dragState.initialElementY = 0;
}

// Update the position of a dragged element
export function updateDraggedElementPosition(
    elementType, 
    xPercent, 
    yPercent, 
    updateElementState,
    centerElementManually,
    percentToPixels,
    syncToSlides = false
) {
    // Special case for the end of drag when we just want to get the sync function
    if (xPercent === null && yPercent === null) {
        return updateElementState(elementType, {}, syncToSlides);
    }
    
    // Update state without syncing to all slides
    updateElementState(elementType, { xPercent, yPercent }, false);
    
    // Update only the currently dragged element
    const draggedElement = dragState.currentElement;
    if (draggedElement) {
        const container = draggedElement.closest('.certificate-preview');
        if (container) {
            const containerRect = cachedContainerDimensions || container.getBoundingClientRect();
            const pixelX = percentToPixels(xPercent, containerRect.width);
            const pixelY = percentToPixels(yPercent, containerRect.height);
            
            draggedElement.style.left = `${pixelX}px`;
            draggedElement.style.top = `${pixelY}px`;
            draggedElement.dataset.centerX = pixelX;
            draggedElement.dataset.centerY = pixelY;
            
            // Center the element manually
            centerElementManually(draggedElement);
        }
    }
}

// Handle document clicks for deselection
export function handleDocumentClick(event, dragStateRef, currentSelectedElement, clearElementSelection) {
    // Don't deselect during drag operations
    if (dragStateRef.isDragging) return;
    
    // Don't deselect if no element is currently selected
    if (!currentSelectedElement) return;
    
    // Check if click is specifically on the currently selected element
    const isClickOnSelectedElement = currentSelectedElement && 
        event.target.closest(`[id^="${currentSelectedElement}-"]`);
    
    // Check if click is on controls or buttons
    const isClickOnControls = event.target.closest('.element-control-panel') || event.target.closest('.element-selection');
    const isClickOnButton = event.target.closest('button');
    
    // Deselect if not clicking on selected element, controls, or buttons
    if (!isClickOnSelectedElement && !isClickOnControls && !isClickOnButton) {
        clearElementSelection();
    }
}
