import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Check, X, Wand2, RotateCcw } from 'lucide-react';

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
      if (containerRef.current && originalImage && canvas) {
        // The image is contained, so we need to find the actual displayed dimensions
        // canvas.clientWidth gives the rendered width in CSS pixels
        const displayedWidth = canvas.clientWidth;
        if (displayedWidth > 0) {
           setScale(originalImage.width / displayedWidth); 
        }
      }
    };
    
    // Slight delay to ensure layout is done
    setTimeout(updateScale, 50);
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
    const brightnessOffset = brightness < 110 ? (130 - brightness) : 0; // Target ~130
    const contrastFactor = 1.2; // 20% boost by default

    const truncate = (v: number) => Math.min(255, Math.max(0, v));

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
    setIsDragging(true);
    setDragHandle(handle);
    setDragStart(getClientPos(e));
    setCropStart({ ...crop });
  };

  const handleMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || !originalImage || !containerRef.current) return;

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

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove, { passive: false });
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
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = crop.width;
    tempCanvas.height = crop.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (tempCtx) {
      tempCtx.drawImage(
        canvasRef.current,
        crop.x, crop.y, crop.width, crop.height,
        0, 0, crop.width, crop.height
      );
      onSave(tempCanvas.toDataURL('image/jpeg', 0.9));
    }
  };

  // Styles helpers
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
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      
      {/* Modal Container */}
      <div className="bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="h-14 bg-slate-800 border-b border-slate-700 px-4 flex items-center justify-between shrink-0">
          <button onClick={onCancel} className="text-slate-400 hover:text-white flex items-center transition-colors">
            <X className="w-5 h-5 mr-1" /> <span className="text-sm">Annuler</span>
          </button>
          <h2 className="text-white font-bold text-sm sm:text-base">Éditer la photo</h2>
          <button onClick={handleSaveInternal} className="bg-domessin-primary text-white px-3 py-1.5 rounded-lg flex items-center font-semibold text-sm hover:bg-teal-700 transition-colors shadow-lg">
            <Check className="w-4 h-4 mr-1" /> Valider
          </button>
        </div>

        {/* Workspace */}
        <div className="flex-1 bg-slate-950 relative overflow-hidden flex items-center justify-center p-4 touch-none select-none">
           <div ref={containerRef} className="relative shadow-2xl max-w-full max-h-full flex justify-center items-center">
              {/* Canvas with max dimensions to ensure it fits in modal */}
              <canvas 
                ref={canvasRef} 
                className="block max-w-full max-h-full object-contain pointer-events-none"
                style={{ maxHeight: 'calc(90vh - 8rem)' }}
              />

              {/* Crop Overlay */}
              {originalImage && (
                <>
                  <div className="absolute inset-0 bg-black/50 pointer-events-none"></div>
                  
                  <div 
                    className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] cursor-move"
                    style={{
                      ...getOverlayStyle(),
                      touchAction: 'none'
                    }}
                    onMouseDown={(e) => handleStart(e, 'move')}
                    onTouchStart={(e) => handleStart(e, 'move')}
                  >
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex flex-col justify-evenly opacity-40 pointer-events-none">
                      <div className="h-px bg-white w-full shadow-sm"></div>
                      <div className="h-px bg-white w-full shadow-sm"></div>
                    </div>
                    <div className="absolute inset-0 flex flex-row justify-evenly opacity-40 pointer-events-none">
                      <div className="w-px bg-white h-full shadow-sm"></div>
                      <div className="w-px bg-white h-full shadow-sm"></div>
                    </div>

                    {/* Corners Handles */}
                    {['nw', 'ne', 'sw', 'se'].map((pos) => (
                      <div
                        key={pos}
                        className={`absolute w-5 h-5 bg-domessin-primary border-2 border-white rounded-full z-10 shadow-sm
                          ${pos.includes('n') ? '-top-2.5' : '-bottom-2.5'}
                          ${pos.includes('w') ? '-left-2.5' : '-right-2.5'}
                          cursor-${pos}-resize hover:scale-110 transition-transform
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
        <div className="h-16 bg-slate-900 border-t border-slate-700 flex items-center justify-center space-x-8 shrink-0">
          <button 
            onClick={() => setIsCorrected(!isCorrected)}
            className={`flex flex-col items-center space-y-1 px-3 py-1 rounded-lg transition-colors ${isCorrected ? 'text-domessin-secondary' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Wand2 className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Retouche</span>
          </button>

          <div className="w-px h-8 bg-slate-800"></div>

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
             className="flex flex-col items-center space-y-1 px-3 py-1 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Reset</span>
          </button>
        </div>

      </div>
    </div>
  );
};