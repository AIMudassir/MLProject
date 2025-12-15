import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { DrawingTool } from '../types';

interface CanvasBoardProps {
  tool: DrawingTool;
  onInteractStart?: () => void;
}

export interface CanvasRef {
  exportImage: () => string;
  clearCanvas: () => void;
  undo: () => void;
  redo: () => void;
  loadImage: (src: string) => void;
}

const CanvasBoard = forwardRef<CanvasRef, CanvasBoardProps>(({ tool, onInteractStart }, ref) => {
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const tempCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Use Refs for contexts to avoid stale closures in imperative handles
  const mainCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const tempCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);

  // History management
  const historyRef = useRef<ImageData[]>([]);
  const historyStep = useRef<number>(-1);

  const saveToHistory = (ctx: CanvasRenderingContext2D) => {
    if (!mainCanvasRef.current) return;
    
    // Discard future history if we are in the middle of the stack
    if (historyStep.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, historyStep.current + 1);
    }
    
    // Save full canvas state
    const imageData = ctx.getImageData(0, 0, mainCanvasRef.current.width, mainCanvasRef.current.height);
    historyRef.current.push(imageData);
    historyStep.current = historyRef.current.length - 1;

    // Limit history depth
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
      historyStep.current--;
    }
  };

  // Helper to apply history item regardless of dimensions
  const applyHistoryItem = (ctx: CanvasRenderingContext2D, imageData: ImageData) => {
      if (!mainCanvasRef.current) return;

      if (imageData.width === mainCanvasRef.current.width && imageData.height === mainCanvasRef.current.height) {
          ctx.putImageData(imageData, 0, 0);
      } else {
          // If dimensions mismatch (due to resize), scale the history item to fit
          const temp = document.createElement('canvas');
          temp.width = imageData.width;
          temp.height = imageData.height;
          const tCtx = temp.getContext('2d');
          if (tCtx) {
              tCtx.putImageData(imageData, 0, 0);
              ctx.save();
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, mainCanvasRef.current.width, mainCanvasRef.current.height);
              ctx.drawImage(temp, 0, 0, mainCanvasRef.current.width, mainCanvasRef.current.height);
              ctx.restore();
          }
      }
  };

  // Initialize Canvases
  useEffect(() => {
    if (mainCanvasRef.current && tempCanvasRef.current) {
      const mCtx = mainCanvasRef.current.getContext('2d', { willReadFrequently: true });
      const tCtx = tempCanvasRef.current.getContext('2d');

      if (mCtx && tCtx) {
        mainCtxRef.current = mCtx;
        tempCtxRef.current = tCtx;

        // Setup Main Context
        mCtx.lineCap = 'round';
        mCtx.lineJoin = 'round';
        mCtx.fillStyle = '#ffffff';
        mCtx.fillRect(0, 0, mainCanvasRef.current.width, mainCanvasRef.current.height);
        
        // Setup Temp Context
        tCtx.lineCap = 'round';
        tCtx.lineJoin = 'round';
        
        // Initial history save
        if (historyRef.current.length === 0) {
           saveToHistory(mCtx);
        }
      }
    }
  }, []);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const mCtx = mainCtxRef.current;
      const tCtx = tempCtxRef.current;

      if (containerRef.current && mainCanvasRef.current && tempCanvasRef.current && mCtx && tCtx) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        
        // Avoid resizing if dimensions match
        if (mainCanvasRef.current.width === width && mainCanvasRef.current.height === height) return;

        // 1. Snapshot current content
        const snapshot = document.createElement('canvas');
        snapshot.width = mainCanvasRef.current.width;
        snapshot.height = mainCanvasRef.current.height;
        const sCtx = snapshot.getContext('2d');
        if (sCtx) {
            sCtx.drawImage(mainCanvasRef.current, 0, 0);
        }
        
        // 2. Resize Canvas elements
        mainCanvasRef.current.width = width;
        mainCanvasRef.current.height = height;
        tempCanvasRef.current.width = width;
        tempCanvasRef.current.height = height;

        // 3. Restore content (Scaled to fit new dimensions)
        mCtx.fillStyle = '#ffffff';
        mCtx.fillRect(0, 0, width, height);
        mCtx.drawImage(snapshot, 0, 0, width, height);
        
        // Restore context settings
        mCtx.lineCap = 'round';
        mCtx.lineJoin = 'round';
        
        tCtx.lineCap = tool.shape;
        tCtx.lineJoin = tool.shape === 'round' ? 'round' : 'bevel';
      }
    };

    window.addEventListener('resize', handleResize);
    // Call once to ensure size is correct on mount
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [tool.shape]);

  // Update Temp Context Settings when tool changes
  useEffect(() => {
    const tCtx = tempCtxRef.current;
    if (tCtx) {
      tCtx.lineCap = tool.shape;
      tCtx.lineJoin = tool.shape === 'round' ? 'round' : 'bevel';
    }
  }, [tool]);

  // Expose API
  useImperativeHandle(ref, () => ({
    exportImage: () => {
      if (mainCanvasRef.current) {
        return mainCanvasRef.current.toDataURL('image/png');
      }
      return '';
    },
    clearCanvas: () => {
      // Get fresh context
      const ctx = mainCanvasRef.current?.getContext('2d');
      if (ctx && mainCanvasRef.current) {
        ctx.save();
        ctx.globalAlpha = 1; // Force opaque clear
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, mainCanvasRef.current.width, mainCanvasRef.current.height);
        ctx.restore();
        saveToHistory(ctx);
      }
      
      // Also clear temp canvas to be safe
      const tCtx = tempCanvasRef.current?.getContext('2d');
      if (tCtx && tempCanvasRef.current) {
         tCtx.clearRect(0, 0, tempCanvasRef.current.width, tempCanvasRef.current.height);
      }
    },
    undo: () => {
      const ctx = mainCanvasRef.current?.getContext('2d');
      if (historyStep.current > 0 && ctx) {
        historyStep.current--;
        const previousData = historyRef.current[historyStep.current];
        if (previousData) {
          applyHistoryItem(ctx, previousData);
        }
      }
    },
    redo: () => {
      const ctx = mainCanvasRef.current?.getContext('2d');
      if (historyStep.current < historyRef.current.length - 1 && ctx) {
        historyStep.current++;
        const nextData = historyRef.current[historyStep.current];
        if (nextData) {
          applyHistoryItem(ctx, nextData);
        }
      }
    },
    loadImage: (src: string) => {
      const img = new Image();
      img.onload = () => {
        const mCtx = mainCtxRef.current;
        if (mCtx && mainCanvasRef.current) {
          mCtx.save();
          // Clear current canvas
          mCtx.fillStyle = '#ffffff';
          mCtx.fillRect(0, 0, mainCanvasRef.current.width, mainCanvasRef.current.height);
          
          // Calculate Aspect Fit
          const canvasWidth = mainCanvasRef.current.width;
          const canvasHeight = mainCanvasRef.current.height;
          const imgRatio = img.width / img.height;
          const canvasRatio = canvasWidth / canvasHeight;

          let drawWidth = canvasWidth;
          let drawHeight = canvasHeight;
          let offsetX = 0;
          let offsetY = 0;

          if (imgRatio > canvasRatio) {
             // Image is wider
             drawHeight = canvasWidth / imgRatio;
             offsetY = (canvasHeight - drawHeight) / 2;
          } else {
             // Image is taller
             drawWidth = canvasHeight * imgRatio;
             offsetX = (canvasWidth - drawWidth) / 2;
          }

          mCtx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
          mCtx.restore();
          
          saveToHistory(mCtx);
        }
      };
      img.src = src;
    }
  }));

  // --- Drawing Handlers ---

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    if (!tempCanvasRef.current) return { offsetX: 0, offsetY: 0 };
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const rect = tempCanvasRef.current.getBoundingClientRect();
    return {
      offsetX: clientX - rect.left,
      offsetY: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    onInteractStart?.();
    setIsDrawing(true);
    const { offsetX, offsetY } = getCoordinates(e);
    
    const tCtx = tempCtxRef.current;
    if (tCtx) {
        tCtx.beginPath();
        tCtx.moveTo(offsetX, offsetY);
        tCtx.strokeStyle = tool.mode === 'eraser' ? '#ffffff' : tool.color;
        tCtx.lineWidth = tool.width;
        
        // Draw a dot for single click
        tCtx.lineTo(offsetX + 0.1, offsetY); // Small movement to force render
        tCtx.stroke();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { offsetX, offsetY } = getCoordinates(e);
    
    const tCtx = tempCtxRef.current;
    if (tCtx) {
      tCtx.lineTo(offsetX, offsetY);
      tCtx.stroke();
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    const mCtx = mainCtxRef.current;
    const tCtx = tempCtxRef.current;

    if (mCtx && tCtx && mainCanvasRef.current && tempCanvasRef.current) {
        // Commit temp canvas to main canvas
        mCtx.save();
        mCtx.globalAlpha = tool.mode === 'eraser' ? 1 : tool.opacity;
        mCtx.drawImage(tempCanvasRef.current, 0, 0);
        mCtx.restore();

        // Save History
        saveToHistory(mCtx);

        // Clear Temp Canvas
        tCtx.clearRect(0, 0, tempCanvasRef.current.width, tempCanvasRef.current.height);
        tCtx.beginPath(); // Reset path
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full bg-white rounded-lg shadow-inner overflow-hidden cursor-crosshair relative touch-none">
       {/* Instruction Label */}
      <div className="absolute top-2 left-2 text-xs text-gray-400 font-mono pointer-events-none select-none opacity-50 z-20">
        CANVAS // DRAW HERE
      </div>
      
      {/* Main Canvas: Holds the committed drawing */}
      <canvas
        ref={mainCanvasRef}
        className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none"
      />

      {/* Temp Canvas: Holds the current active stroke (Top Layer) */}
      <canvas
        ref={tempCanvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="absolute top-0 left-0 w-full h-full z-10"
        style={{ opacity: tool.mode === 'eraser' ? 1 : tool.opacity }}
      />
    </div>
  );
});

export default CanvasBoard;