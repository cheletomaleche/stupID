import React, { useState, useRef, useCallback } from 'react';
import { 
  Columns2, 
  SplitSquareVertical, 
  Eye, 
  ArrowLeftRight, 
  RotateCcw, 
  Loader2,
  Sparkles,
  Maximize2
} from 'lucide-react';

interface BeforeAfterViewerProps {
  originalImage: string | null;
  currentImage: string | null;
  isProcessing: boolean;
  loadingMessage: string;
  onReset: () => void;
}

export type CompareMode = 'single' | 'split' | 'side-by-side';

const BeforeAfterViewer: React.FC<BeforeAfterViewerProps> = ({
  originalImage,
  currentImage,
  isProcessing,
  loadingMessage,
  onReset,
}) => {
  const [compareMode, setCompareMode] = useState<CompareMode>('split');
  const [sliderPos, setSliderPos] = useState<number>(50); // percentage 0-100
  const [isHoldingOriginal, setIsHoldingOriginal] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);

  // Check if current image has been edited
  const hasEdits = originalImage && currentImage && originalImage !== currentImage;

  // Handle dragging the split slider
  const updateSliderFromClientX = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percentage);
  }, []);

  const handlePointerDown = (clientX: number) => {
    isDraggingRef.current = true;
    updateSliderFromClientX(clientX);
  };

  const handlePointerMove = (clientX: number) => {
    if (!isDraggingRef.current) return;
    updateSliderFromClientX(clientX);
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  if (!currentImage) return null;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-2 sm:p-4 select-none">
      
      {/* Top Floating Comparison Control Bar */}
      <div className="absolute top-2 z-30 flex items-center gap-1.5 bg-grey-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-grey-700/80 shadow-xl max-w-[95%]">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 hidden xs:inline">
          View:
        </span>
        
        {/* Single View Button */}
        <button
          type="button"
          onClick={() => setCompareMode('single')}
          className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all ${
            compareMode === 'single'
              ? 'bg-gold-500 text-grey-950 shadow-md font-bold'
              : 'text-slate-300 hover:text-white hover:bg-grey-800'
          }`}
          title="Single edited portrait view"
        >
          <span>Single</span>
        </button>

        {/* Split Slider Button */}
        <button
          type="button"
          onClick={() => setCompareMode('split')}
          className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
            compareMode === 'split'
              ? 'bg-gold-500 text-grey-950 shadow-md font-bold'
              : 'text-slate-300 hover:text-white hover:bg-grey-800'
          }`}
          title="Split slider interactive comparison"
        >
          <SplitSquareVertical size={13} />
          <span>Split Slider</span>
        </button>

        {/* Side-by-Side Button */}
        <button
          type="button"
          onClick={() => setCompareMode('side-by-side')}
          className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
            compareMode === 'side-by-side'
              ? 'bg-gold-500 text-grey-950 shadow-md font-bold'
              : 'text-slate-300 hover:text-white hover:bg-grey-800'
          }`}
          title="Side-by-side comparison"
        >
          <Columns2 size={13} />
          <span className="hidden sm:inline">Side by Side</span>
          <span className="sm:hidden">Dual</span>
        </button>

        {/* Quick Hold to Compare Button in Single View */}
        {compareMode === 'single' && hasEdits && (
          <button
            type="button"
            onMouseDown={() => setIsHoldingOriginal(true)}
            onMouseUp={() => setIsHoldingOriginal(false)}
            onMouseLeave={() => setIsHoldingOriginal(false)}
            onTouchStart={() => setIsHoldingOriginal(true)}
            onTouchEnd={() => setIsHoldingOriginal(false)}
            className={`ml-1 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all border ${
              isHoldingOriginal
                ? 'bg-blue-600 border-blue-400 text-white shadow-lg'
                : 'bg-grey-800 border-grey-700 text-gold-400 hover:bg-grey-750'
            }`}
            title="Press and hold to temporarily preview original photo"
          >
            <Eye size={12} />
            <span>{isHoldingOriginal ? 'Original' : 'Hold for Original'}</span>
          </button>
        )}
      </div>

      {/* Floating Reset to Original button */}
      {hasEdits && (
        <button
          onClick={onReset}
          className="absolute top-2 right-2 sm:right-4 z-30 p-2 bg-grey-900/90 hover:bg-grey-800 text-slate-300 hover:text-gold-400 rounded-full border border-grey-700 backdrop-blur-md transition-all shadow-xl group"
          title="Reset to Original Photo"
        >
          <RotateCcw size={15} className="group-hover:-rotate-90 transition-transform duration-300" />
        </button>
      )}

      {/* Main Display Area */}
      <div className="w-full h-full flex items-center justify-center pt-8 pb-1">
        
        {/* MODE 1: SPLIT SLIDER COMPARISON */}
        {compareMode === 'split' && (
          <div
            ref={containerRef}
            className="relative shadow-2xl rounded overflow-hidden border-2 sm:border-4 border-slate-300/80 aspect-[3/4] h-full max-h-[460px] sm:max-h-[530px] w-auto bg-black/60 cursor-ew-resize select-none"
            onMouseDown={(e) => handlePointerDown(e.clientX)}
            onMouseMove={(e) => handlePointerMove(e.clientX)}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={(e) => {
              if (e.touches.length === 1) handlePointerDown(e.touches[0].clientX);
            }}
            onTouchMove={(e) => {
              if (e.touches.length === 1) handlePointerMove(e.touches[0].clientX);
            }}
            onTouchEnd={handlePointerUp}
          >
            {/* Background Layer: Edited Image (After) */}
            <img
              src={currentImage}
              alt="After AI Styling"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />

            {/* Foreground Layer: Original Image (Before) clipped by sliderPos */}
            {originalImage && (
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{ width: `${sliderPos}%` }}
              >
                <img
                  src={originalImage}
                  alt="Before Original"
                  className="absolute inset-0 h-full object-cover max-w-none"
                  style={{
                    width: containerRef.current
                      ? `${containerRef.current.clientWidth}px`
                      : '100%',
                    height: '100%',
                  }}
                />
              </div>
            )}

            {/* Split Divider Line & Draggable Handle */}
            <div
              className="absolute top-0 bottom-0 pointer-events-none z-20"
              style={{ left: `${sliderPos}%` }}
            >
              {/* Vertical Glowing Line */}
              <div className="absolute top-0 bottom-0 -left-px w-0.5 bg-gradient-to-b from-gold-300 via-gold-400 to-gold-500 shadow-[0_0_10px_rgba(204,164,59,0.9)]" />

              {/* Center Handle Button */}
              <div className="absolute top-1/2 -translate-y-1/2 -left-3.5 w-7 h-7 rounded-full bg-gold-400 text-grey-950 flex items-center justify-center shadow-[0_0_12px_rgba(0,0,0,0.8)] border-2 border-grey-900 pointer-events-auto cursor-ew-resize">
                <ArrowLeftRight size={13} className="font-bold" />
              </div>
            </div>

            {/* Label Badges */}
            <div className="absolute top-3 left-3 z-10 pointer-events-none bg-black/70 backdrop-blur-sm text-slate-200 text-[10px] font-bold px-2 py-0.5 rounded border border-white/20 uppercase tracking-wider">
              Original
            </div>
            <div className="absolute top-3 right-3 z-10 pointer-events-none bg-gold-500/90 backdrop-blur-sm text-grey-950 text-[10px] font-bold px-2 py-0.5 rounded border border-gold-300 uppercase tracking-wider shadow-md">
              AI Edited
            </div>

            {/* Hint overlay on initial appearance */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none bg-black/60 backdrop-blur-sm text-slate-300 text-[9px] px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1">
              <ArrowLeftRight size={10} className="text-gold-400" />
              <span>Drag slider to compare</span>
            </div>
          </div>
        )}

        {/* MODE 2: SIDE-BY-SIDE DUAL VIEW */}
        {compareMode === 'side-by-side' && (
          <div className="flex flex-row items-center justify-center gap-2 sm:gap-4 h-full max-h-[460px] sm:max-h-[530px] w-full max-w-4xl px-2">
            
            {/* Left: Original Card */}
            <div className="flex-1 flex flex-col items-center h-full max-w-[280px]">
              <div className="w-full flex items-center justify-between pb-1 px-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Original
                </span>
                <span className="text-[10px] text-slate-500">Unedited</span>
              </div>
              <div className="relative flex-1 w-full rounded overflow-hidden border-2 border-slate-600 shadow-xl aspect-[3/4] bg-black/50">
                <img
                  src={originalImage || currentImage}
                  alt="Original ID Photo"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Right: AI Edited Card */}
            <div className="flex-1 flex flex-col items-center h-full max-w-[280px]">
              <div className="w-full flex items-center justify-between pb-1 px-1">
                <span className="text-[11px] font-bold text-gold-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={11} /> AI Edited
                </span>
                <span className="text-[10px] text-gold-400/80">Current</span>
              </div>
              <div className="relative flex-1 w-full rounded overflow-hidden border-2 border-gold-400 shadow-xl aspect-[3/4] bg-black/50">
                <img
                  src={currentImage}
                  alt="Edited ID Photo"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        )}

        {/* MODE 3: SINGLE VIEW */}
        {compareMode === 'single' && (
          <div className="relative shadow-2xl rounded overflow-hidden border-2 sm:border-4 border-slate-300/80 aspect-[3/4] h-full max-h-[460px] sm:max-h-[530px] w-auto bg-black/40">
            <img
              src={isHoldingOriginal && originalImage ? originalImage : currentImage}
              alt="ID Preview"
              className="w-full h-full object-cover transition-opacity duration-150"
            />
            {/* Active Mode Pill */}
            <div className="absolute top-3 left-3 z-10 bg-black/60 backdrop-blur-sm text-[10px] font-semibold px-2 py-0.5 rounded border border-white/10 text-slate-200">
              {isHoldingOriginal ? 'Original Preview' : 'Edited Portrait'}
            </div>
          </div>
        )}

        {/* Loading Spinner Overlay during AI processing */}
        {isProcessing && (
          <div className="absolute inset-0 bg-grey-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-40 px-4 text-center">
            <Loader2 size={38} className="text-gold-400 animate-spin" />
            <p className="text-gold-400 font-medium text-sm animate-pulse tracking-wide">
              {loadingMessage}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BeforeAfterViewer;
