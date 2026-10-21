import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Check, 
  RotateCw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Sparkles,
  Info,
  ScanFace
} from 'lucide-react';

export interface AspectRatioOption {
  id: string;
  label: string;
  sublabel: string;
  ratio: number | null; // width / height, or null for original
}

export const CROP_RATIOS: AspectRatioOption[] = [
  { id: '3:4', label: '3:4', sublabel: '35×45mm Global ID', ratio: 3 / 4 },
  { id: '1:1', label: '1:1', sublabel: '2×2" US Passport', ratio: 1 },
  { id: '5:7', label: '5:7', sublabel: 'License / 1-inch', ratio: 5 / 7 },
  { id: '4:5', label: '4:5', sublabel: 'Standard Portrait', ratio: 4 / 5 },
  { id: 'original', label: 'Original', sublabel: 'Preserve Ratio', ratio: null },
];

interface CropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onApplyCrop: (croppedBase64: string) => void;
  onClose: () => void;
  title?: string;
}

const CropModal: React.FC<CropModalProps> = ({
  isOpen,
  imageSrc,
  onApplyCrop,
  onClose,
  title = 'Crop & Frame Portrait',
}) => {
  const [selectedRatioId, setSelectedRatioId] = useState<string>('3:4');
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showBiometricGuide, setShowBiometricGuide] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Load image when imageSrc changes
  useEffect(() => {
    if (!imageSrc || !isOpen) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      // Reset transformations
      setScale(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      draw();
    };
    img.src = imageSrc;
  }, [imageSrc, isOpen]);

  // Compute active ratio
  const getActiveRatio = useCallback((): number => {
    const selected = CROP_RATIOS.find((r) => r.id === selectedRatioId);
    if (selected && selected.ratio !== null) {
      return selected.ratio;
    }
    // Fallback to original image aspect ratio
    if (imgRef.current && imgRef.current.width > 0) {
      const isRotated90or270 = rotation % 180 !== 0;
      const w = isRotated90or270 ? imgRef.current.height : imgRef.current.width;
      const h = isRotated90or270 ? imgRef.current.width : imgRef.current.height;
      return w / h;
    }
    return 3 / 4;
  }, [selectedRatioId, rotation]);

  // Main canvas draw function
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const targetRatio = getActiveRatio();

    // Determine canvas display dimensions fitting container
    const maxW = 320;
    const maxH = 400;

    let targetW = maxW;
    let targetH = targetW / targetRatio;
    if (targetH > maxH) {
      targetH = maxH;
      targetW = targetH * targetRatio;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(targetW * dpr);
    canvas.height = Math.round(targetH * dpr);
    canvas.style.width = `${Math.round(targetW)}px`;
    canvas.style.height = `${Math.round(targetH)}px`;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Fill background
    ctx.fillStyle = '#1c1c18';
    ctx.fillRect(0, 0, targetW, targetH);

    // Center point of canvas
    ctx.translate(targetW / 2 + pan.x, targetH / 2 + pan.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);

    // Calculate base scale so image fills the crop box by default (cover mode)
    const isRotated90or270 = rotation % 180 !== 0;
    const imgW = isRotated90or270 ? img.height : img.width;
    const imgH = isRotated90or270 ? img.width : img.height;

    const baseFitScale = Math.max(targetW / imgW, targetH / imgH);
    const drawW = img.width * baseFitScale;
    const drawH = img.height * baseFitScale;

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

    ctx.restore();
  }, [getActiveRatio, pan, rotation, scale]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Mouse & Touch Dragging Handlers
  const handlePointerDown = (clientX: number, clientY: number) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: clientX, y: clientY };
    panStartRef.current = { ...pan };
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDraggingRef.current) return;
    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleResetTransforms = () => {
    setScale(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  // High-Resolution Export
  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;

    const targetRatio = getActiveRatio();
    // High-resolution output canvas
    const outputH = 1600;
    const outputW = Math.round(outputH * targetRatio);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = outputW;
    outCanvas.height = outputH;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) return;

    // Smooth image rendering
    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = 'high';

    outCtx.fillStyle = '#ffffff';
    outCtx.fillRect(0, 0, outputW, outputH);

    // Compute preview dimensions matching canvasRef
    const previewCanvas = canvasRef.current;
    const previewW = previewCanvas ? parseFloat(previewCanvas.style.width) : 300;
    const previewH = previewCanvas ? parseFloat(previewCanvas.style.height) : 400;

    const ratioScale = outputW / previewW;

    outCtx.save();
    outCtx.translate(outputW / 2 + pan.x * ratioScale, outputH / 2 + pan.y * ratioScale);
    outCtx.rotate((rotation * Math.PI) / 180);
    outCtx.scale(scale * ratioScale, scale * ratioScale);

    const isRotated = rotation % 180 !== 0;
    const imgW = isRotated ? img.height : img.width;
    const imgH = isRotated ? img.width : img.height;
    const baseFitScale = Math.max(previewW / imgW, previewH / imgH);

    const drawW = img.width * baseFitScale;
    const drawH = img.height * baseFitScale;

    outCtx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    outCtx.restore();

    const croppedBase64 = outCanvas.toDataURL('image/jpeg', 0.95);
    onApplyCrop(croppedBase64);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-4">
      <div className="bg-grey-900 border border-grey-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-grey-800 flex items-center justify-between flex-shrink-0 bg-grey-950">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ScanFace size={20} className="text-gold-400" />
              {title}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Align head and shoulders to match passport & ID standards
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-grey-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 flex flex-col items-center">
          
          {/* Aspect Ratio Selector Pills */}
          <div className="w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2 px-1">
              Select Standard ID Ratio
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {CROP_RATIOS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedRatioId(item.id)}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-center transition-all ${
                    selectedRatioId === item.id
                      ? 'border-gold-400 bg-gold-400/10 text-gold-300 font-bold shadow-[0_0_12px_rgba(204,164,59,0.25)]'
                      : 'border-grey-700 bg-grey-800/80 text-slate-300 hover:border-slate-500 hover:bg-grey-700'
                  }`}
                >
                  <span className="text-xs">{item.label}</span>
                  <span className="text-[9px] text-slate-400 opacity-80 leading-tight mt-0.5 truncate w-full px-1">
                    {item.sublabel}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Canvas Viewport */}
          <div 
            ref={containerRef}
            className="relative flex items-center justify-center p-2 rounded-xl bg-grey-950 border border-grey-800 shadow-inner w-full overflow-hidden select-none"
            style={{ minHeight: '340px' }}
          >
            <div
              className="relative cursor-move overflow-hidden rounded border-2 border-gold-400 shadow-[0_0_20px_rgba(0,0,0,0.8)]"
              onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
              onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={(e) => {
                if (e.touches.length === 1) {
                  handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
                }
              }}
              onTouchMove={(e) => {
                if (e.touches.length === 1) {
                  handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
                }
              }}
              onTouchEnd={handlePointerUp}
            >
              <canvas ref={canvasRef} className="block pointer-events-none" />

              {/* 3x3 Rule-of-Thirds Grid Overlay */}
              {showGrid && (
                <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-b border-white/20" />
                  <div className="border-r border-white/20" />
                  <div className="border-r border-white/20" />
                  <div />
                </div>
              )}

              {/* Biometric Passport Head Outline Overlay */}
              {showBiometricGuide && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  {/* Oval head guide */}
                  <div 
                    className="border-2 border-dashed border-gold-400/70 rounded-[50%] w-[58%] h-[68%] -mt-4 shadow-[0_0_10px_rgba(204,164,59,0.3)] relative"
                  >
                    {/* Eye line (approx 55% from top of head) */}
                    <div className="absolute top-[48%] left-0 right-0 border-t border-dashed border-emerald-400/60" />
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] text-gold-400/90 font-mono tracking-wider bg-grey-900/80 px-1 rounded">
                      TOP OF HEAD
                    </span>
                    <span className="absolute top-[43%] right-1 text-[8px] text-emerald-400 font-mono tracking-wider bg-grey-900/80 px-1 rounded">
                      EYE LINE
                    </span>
                    <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-gold-400/90 font-mono tracking-wider bg-grey-900/80 px-1 rounded">
                      CHIN LEVEL
                    </span>
                  </div>
                </div>
              )}

              {/* Drag indicator hint */}
              <div className="absolute bottom-2 left-2 pointer-events-none bg-black/60 backdrop-blur-sm text-[10px] text-slate-300 px-2 py-0.5 rounded-md border border-white/10">
                Drag to center
              </div>
            </div>
          </div>

          {/* Quick Adjustment Controls (Zoom, Rotate, Toggles) */}
          <div className="w-full bg-grey-800/60 p-3 rounded-xl border border-grey-700/60 space-y-3">
            
            {/* Zoom Slider */}
            <div className="flex items-center gap-3">
              <ZoomOut size={16} className="text-slate-400 flex-shrink-0" />
              <input
                type="range"
                min="0.8"
                max="2.5"
                step="0.05"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-grey-700 rounded-lg appearance-none cursor-pointer accent-gold-400"
              />
              <ZoomIn size={16} className="text-slate-400 flex-shrink-0" />
              <span className="text-[11px] font-mono text-gold-400 w-10 text-right">
                {Math.round(scale * 100)}%
              </span>
            </div>

            {/* Quick action buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-grey-700/40">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRotate}
                  className="px-2.5 py-1.5 rounded-lg bg-grey-700 hover:bg-grey-600 text-slate-200 text-xs flex items-center gap-1.5 transition-colors border border-grey-600"
                  title="Rotate 90 degrees clockwise"
                >
                  <RotateCw size={14} className="text-gold-400" />
                  <span>Rotate 90°</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetTransforms}
                  className="px-2 py-1.5 rounded-lg bg-grey-700/60 hover:bg-grey-600 text-slate-400 hover:text-slate-200 text-xs transition-colors"
                >
                  Reset
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBiometricGuide(!showBiometricGuide)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1.5 border transition-all ${
                    showBiometricGuide
                      ? 'bg-gold-500/20 border-gold-400/60 text-gold-300 font-medium'
                      : 'bg-grey-800 border-grey-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ScanFace size={13} />
                  <span>Face Guide</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowGrid(!showGrid)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1 border transition-all ${
                    showGrid
                      ? 'bg-blue-500/20 border-blue-400/60 text-blue-300 font-medium'
                      : 'bg-grey-800 border-grey-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>Grid</span>
                </button>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 px-1 self-start">
            <Info size={13} className="text-gold-400 flex-shrink-0" />
            <span>Cropping to standard ID proportions ensures high AI generation accuracy.</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-grey-950 border-t border-grey-800 flex items-center justify-between gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-grey-800 hover:bg-grey-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors border border-grey-700"
          >
            Skip / Keep Original
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2.5 px-5 rounded-xl bg-gold-500 hover:bg-gold-400 text-grey-900 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-gold-500/20 active:scale-95"
          >
            <Check size={16} />
            <span>Apply Crop & Continue</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CropModal;
