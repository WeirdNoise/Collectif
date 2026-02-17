import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Check, X, Wand2, RotateCcw, Crop as CropIcon } from 'lucide-react';

interface ImageEditorProps {
  imageSrc: string;
  onSave: (newImageSrc: string) => void;
  onCancel: () => void;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({ imageSrc, onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // States
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<CropArea>({ x: 0, y: 0, width: 0, height: 0 });
  const [scale, setScale] = useState(1); // Screen pixels to Image pixels ratio
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropStart, setCropStart] = useState<CropArea>({ x: 0, y: 0, width: 0, height: 0 });
  const [isCorrected, setIsCorrected] = useState(false);

  // Initialize Image
  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      setOriginalImage(img);
      // Initialize crop to 80% of the image centered
      const w = img.width;
      const h = img.height;
      const cropSize = Math.min(w, h) * 0.8;
      setCrop({
        x: (w - cropSize) / 2,
        y: (h - cropSize) / 2,
        width: cropSize,
        height: cropSize
      });
    };
  }, [imageSrc]);

  // Draw Image on Canvas
  useEffect(() => {
    if (!originalImage || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas to full resolution
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;

    // Draw original
    ctx.drawImage(originalImage, 0, 0);

    // Apply auto-correction if enabled
    if (isCorrected) {
      applyAutoCorrection(ctx, canvas.width, canvas.height);
    }

    // Update scale factor (Visual width vs Real width)
    const updateScale = () => {
      if (containerRef.current && originalImage) {
        // The image is contained, so we need to find the actual displayed dimensions
        const containerW = containerRef.current.clientWidth;
        // Since canvas is max-width: 100%, height: auto
        const displayedWidth = Math.min(containerW, originalImage.width); 
        // Logic simplification: We rely on standard CSS scaling
        setScale(originalImage.width / containerRef.current.clientWidth); 
      }
    };
    
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);

  }, [originalImage, isCorrected]);

  // --- Auto Correction Logic (Canvas API) ---
  const applyAutoCorrection = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    let r, g, b, avg;
    let colorSum = 0;

    // 1. Analysis: Calculate average brightness
    for (let x = 0, len = data.length; x < len; x += 4) {
      r = data[x];
      g = data[x + 1];
      b = data[x + 2];
      avg = Math.floor((r + g + b) / 3);
      colorSum += avg;
    }
    const brightness = Math.floor(colorSum / (width * height));

    // 2. Adjustments
    // If dark (<100), boost brightness. If washed out, boost contrast.
    // Simple linear adjustment
    const brightnessOffset = brightness < 110 ? (130 - brightness) : 0; // Target ~130
    const contrastFactor = 1.2; // 20% boost by default

    // Helper to clamp 0-255
    const truncate = (v: number) => Math.min(255, Math.max(0, v));

    // Formula for contrast: factor * (color - 128) + 128
    
    for (let i = 0; i < data.length; i += 4) {
      // Apply brightness
      data[i] += brightnessOffset;     // R
      data[i + 1] += brightnessOffset; // G
      data[i + 2] += brightnessOffset; // B

      // Apply contrast
      data[i] = truncate(contrastFactor * (data[i] - 128) + 128);
      data[i + 1] = truncate(contrastFactor * (data[i + 1] - 128) + 128);
      data[i + 2] = truncate(contrastFactor * (data[i + 2] - 128) + 128);
    }

    ctx.putImageData(imageData, 0, 0);
  };

  // --- Drag & Drop / Resize Logic ---

  const getClientPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if ('touches' in e) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent, handle: string) => {
    e.stopPropagation(); // Stop bubbling
    // Prevent default only if needed, but for touchstart it might block scrolling too early.
    // We usually preventDefault on move.
    
    setIsDragging(true);
    setDragHandle(handle);
    setDragStart(getClientPos(e));
    setCropStart({ ...crop });
  };

  const handleMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || !originalImage || !containerRef.current) return;

    // CRITICAL: Prevent scrolling on mobile while dragging crop tool
    if (e.type === 'touchmove') {
      e.preventDefault(); 
    }

    const currentPos = getClientPos(e);
    const deltaX = (currentPos.x - dragStart.x) * scale;
    const deltaY = (currentPos.y - dragStart.y) * scale;
    
    const maxW = originalImage.width;
    const maxH = originalImage.height;

    let newCrop = { ...cropStart };

    if (dragHandle === 'move') {
      newCrop.x = Math.max(0, Math.min(maxW - newCrop.width, cropStart.x + deltaX));
      newCrop.y = Math.max(0, Math.min(maxH - newCrop.height, cropStart.y + deltaY));
    } else {
      // Resizing logic
      if (dragHandle?.includes('w')) { // West
        const potentialWidth = cropStart.width - deltaX;
        const potentialX = cropStart.x + deltaX;
        if (potentialWidth > 50 && potentialX >= 0) {
           newCrop.x = potentialX;
           newCrop.width = potentialWidth;
        }
      }
      if (dragHandle?.includes('e')) { // East
        newCrop.width = Math.max(50, Math.min(maxW - newCrop.x, cropStart.width + deltaX));
      }
      if (dragHandle?.includes('n')) { // North
        const potentialHeight = cropStart.height - deltaY;
        const potentialY = cropStart.y + deltaY;
        if (potentialHeight > 50 && potentialY >= 0) {
          newCrop.y = potentialY;
          newCrop.height = potentialHeight;
        }
      }
      if (dragHandle?.includes('s')) { // South
        newCrop.height = Math.max(50, Math.min(maxH - newCrop.y, cropStart.height + deltaY));
      }
    }

    setCrop(newCrop);
  }, [isDragging, dragHandle, dragStart, cropStart, scale, originalImage]);

  const handleEnd = useCallback(() => {
    setIsDragging(false);
    setDragHandle(null);
  }, []);

  // Global event listeners for drag outside component
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove, { passive: false }); // passive: false needed for preventDefault
      window.addEventListener('touchend', handleEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, handleMove, handleEnd]);


  // --- Final Save ---
  const handleSaveInternal = () => {
    if (!canvasRef.current) return;
    
    // Create a temp canvas for the cropped result
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = crop.width;
    tempCanvas.height = crop.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (tempCtx) {
      // Draw from source canvas (which has corrections applied)
      tempCtx.drawImage(
        canvasRef.current,
        crop.x, crop.y, crop.width, crop.height, // Source
        0, 0, crop.width, crop.height            // Dest
      );
      
      onSave(tempCanvas.toDataURL('image/jpeg', 0.9));
    }
  };

  // Styles helpers
  // Convert Real Pixels to CSS Percentage for responsive display of the overlay
  const getOverlayStyle = () => {
    if (!originalImage) return {};
    return {
      left: `${(crop.x / originalImage.width) * 100}%`,
      top: `${(crop.y / originalImage.height) * 100}%`,
      width: `${(crop.width / originalImage.width) * 100}%`,
      height: `${(crop.height / originalImage.height) * 100}%`,
    };
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="h-16 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
        <button onClick={onCancel} className="text-slate-400 hover:text-white flex items-center">
          <X className="w-5 h-5 mr-2" /> Annuler
        </button>
        <h2 className="text-white font-bold hidden sm:block">Éditeur Photo</h2>
        <button onClick={handleSaveInternal} className="bg-domessin-primary text-white px-4 py-2 rounded-lg flex items-center font-semibold hover:bg-teal-700">
          <Check className="w-4 h-4 mr-2" /> Valider
        </button>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 overflow-hidden relative flex items-center justify-center p-4 bg-slate-950 touch-none">
         <div ref={containerRef} className="relative w-full max-w-2xl shadow-2xl">
            {/* The Canvas (Image Source) */}
            <canvas 
              ref={canvasRef} 
              className="block w-full h-auto pointer-events-none" // Disable pointer events on canvas, handle on overlay
            />

            {/* Crop Overlay */}
            {originalImage && (
              <>
                {/* Darken surrounding area */}
                <div className="absolute inset-0 bg-black/60 pointer-events-none"></div>
                
                {/* The Crop Box */}
                <div 
                  className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] cursor-move"
                  style={{
                    ...getOverlayStyle(),
                    touchAction: 'none' // Important for browser handling
                  }}
                  onMouseDown={(e) => handleStart(e, 'move')}
                  onTouchStart={(e) => handleStart(e, 'move')}
                >
                  {/* Grid lines (Rule of thirds) */}
                  <div className="absolute inset-0 flex flex-col justify-evenly opacity-30 pointer-events-none">
                    <div className="h-px bg-white w-full"></div>
                    <div className="h-px bg-white w-full"></div>
                  </div>
                  <div className="absolute inset-0 flex flex-row justify-evenly opacity-30 pointer-events-none">
                    <div className="w-px bg-white h-full"></div>
                    <div className="w-px bg-white h-full"></div>
                  </div>

                  {/* Corners Handles */}
                  {['nw', 'ne', 'sw', 'se'].map((pos) => (
                    <div
                      key={pos}
                      className={`absolute w-6 h-6 bg-domessin-primary border-2 border-white rounded-full z-10
                        ${pos.includes('n') ? '-top-3' : '-bottom-3'}
                        ${pos.includes('w') ? '-left-3' : '-right-3'}
                        cursor-${pos}-resize
                      `}
                      onMouseDown={(e) => handleStart(e, pos)}
                      onTouchStart={(e) => handleStart(e, pos)}
                    />
                  ))}
                </div>
              </>
            )}
         </div>
      </div>

      {/* Footer / Toolbar */}
      <div className="h-20 bg-slate-900 border-t border-slate-800 flex items-center justify-center space-x-6 shrink-0">
        <button 
          onClick={() => setIsCorrected(!isCorrected)}
          className={`flex flex-col items-center space-y-1 px-4 py-2 rounded-lg transition-colors ${isCorrected ? 'text-domessin-secondary bg-slate-800' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Wand2 className="w-6 h-6" />
          <span className="text-xs font-medium">Auto-Magic</span>
        </button>

        <div className="w-px h-10 bg-slate-700"></div>

        <button 
           onClick={() => {
              if (originalImage) {
                 const cropSize = Math.min(originalImage.width, originalImage.height) * 0.8;
                 setCrop({
                   x: (originalImage.width - cropSize) / 2,
                   y: (originalImage.height - cropSize) / 2,
                   width: cropSize,
                   height: cropSize
                 });
                 setIsCorrected(false);
              }
           }}
           className="flex flex-col items-center space-y-1 px-4 py-2 text-slate-400 hover:text-slate-200"
        >
          <RotateCcw className="w-6 h-6" />
          <span className="text-xs font-medium">Réinitialiser</span>
        </button>
      </div>
    </div>
  );
};
