import React, { useState, useRef } from 'react';
import { 
  AppTab, 
  AppState, 
  ProcessingState, 
  StylingOption,
  Gender
} from './types';
import { TAB_CONFIG } from './constants';
import ControlPanel from './components/ControlPanel';
import ComplianceModal from './components/ComplianceModal';
import ExportModal from './components/ExportModal';
import CropModal from './components/CropModal';
import * as geminiService from './services/geminiService';
import { 
  Upload, 
  Download, 
  RotateCcw, 
  ShieldCheck, 
  Loader2,
  Undo2,
  Home,
  Wand2,
  Sparkles,
  UserCircle,
  ImagePlus,
  AlertCircle,
  X,
  Camera,
  Crop
} from 'lucide-react';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    originalImage: null,
    currentImage: null,
    processingState: ProcessingState.IDLE,
    activeTab: AppTab.FACE,
    compliance: null,
    history: [],
    historyIndex: -1,
    gender: null,
    errorMessage: undefined,
  });

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Styling AI is working...');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const updateImage = (newImage: string) => {
    setState(prev => {
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      newHistory.push(newImage);
      return {
        ...prev,
        currentImage: newImage,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        processingState: ProcessingState.IDLE,
        errorMessage: undefined,
      };
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setState({
          originalImage: base64,
          currentImage: base64,
          history: [base64],
          historyIndex: 0,
          processingState: ProcessingState.IDLE,
          activeTab: AppTab.FACE,
          compliance: null,
          gender: null,
          errorMessage: undefined,
        });
        // Prompt crop on initial photo upload so users can frame the portrait
        setIsCropOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyCrop = (croppedBase64: string) => {
    setState(prev => {
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      newHistory.push(croppedBase64);
      return {
        ...prev,
        originalImage: prev.originalImage || croppedBase64,
        currentImage: croppedBase64,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        processingState: ProcessingState.IDLE,
        errorMessage: undefined,
      };
    });
    setIsCropOpen(false);
  };

  const handleUndo = () => {
    if (state.historyIndex > 0) {
      setState(prev => ({
        ...prev,
        historyIndex: prev.historyIndex - 1,
        currentImage: prev.history[prev.historyIndex - 1],
        errorMessage: undefined,
      }));
    }
  };

  const handleReset = () => {
    if (state.originalImage) {
      updateImage(state.originalImage);
    }
  };

  const handleStartOver = () => {
    setState({
      originalImage: null,
      currentImage: null,
      processingState: ProcessingState.IDLE,
      activeTab: AppTab.FACE,
      compliance: null,
      history: [],
      historyIndex: -1,
      gender: null,
      errorMessage: undefined,
    });
    setIsExportOpen(false);
    setIsCropOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  const processEdit = async (prompt: string, customMsg?: string) => {
    if (!state.currentImage) return;
    setLoadingMessage(customMsg || 'Applying AI portrait adjustment...');
    setState(prev => ({ ...prev, processingState: ProcessingState.PROCESSING, errorMessage: undefined }));
    try {
      const newImage = await geminiService.editIdPhoto(state.currentImage, prompt);
      updateImage(newImage);
    } catch (error: any) {
      console.error(error);
      const msg = error?.message || 'Failed to process image. Please try again.';
      setState(prev => ({
        ...prev,
        processingState: ProcessingState.IDLE,
        errorMessage: msg,
      }));
    }
  };

  const handleApplyStyle = (option: StylingOption) => {
    processEdit(option.prompt, `Applying ${option.label}...`);
  };

  const handleFaceEdit = (prompt: string) => {
    processEdit(prompt, 'Refining facial features...');
  };

  const checkCompliance = async () => {
    if (!state.currentImage) return;
    setLoadingMessage('Analyzing ID compliance with Gemini...');
    setState(prev => ({ ...prev, processingState: ProcessingState.CHECKING_COMPLIANCE, errorMessage: undefined }));
    try {
      const result = await geminiService.checkCompliance(state.currentImage);
      setState(prev => ({ ...prev, compliance: result, processingState: ProcessingState.IDLE }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        processingState: ProcessingState.IDLE,
        errorMessage: error?.message || 'Unable to complete compliance audit.',
      }));
    }
  };

  const selectGender = (gender: Gender) => {
    setState(prev => ({ ...prev, gender }));
  };

  // Quick Demo placeholder image generator for immediate testing
  const loadDemoPhoto = (type: 'male' | 'female') => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background: studio light gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 500);
    bgGrad.addColorStop(0, '#f1f5f9');
    bgGrad.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 400, 500);

    // Torso / shoulders
    ctx.fillStyle = type === 'male' ? '#1e293b' : '#334155';
    ctx.beginPath();
    ctx.ellipse(200, 480, 160, 140, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shirt collar
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(170, 360);
    ctx.lineTo(200, 420);
    ctx.lineTo(230, 360);
    ctx.fill();

    // Neck
    ctx.fillStyle = type === 'male' ? '#e2b39a' : '#f5cbba';
    ctx.fillRect(175, 300, 50, 70);

    // Head / Face
    ctx.fillStyle = type === 'male' ? '#eec1ab' : '#fdd8c7';
    ctx.beginPath();
    ctx.ellipse(200, 240, 75, 95, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    if (type === 'male') {
      ctx.ellipse(200, 175, 80, 55, 0, Math.PI, Math.PI * 2);
    } else {
      ctx.ellipse(200, 185, 85, 75, 0, 0, Math.PI * 2);
      ctx.fillRect(115, 185, 30, 140);
      ctx.fillRect(255, 185, 30, 140);
    }
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#292524';
    ctx.beginPath();
    ctx.ellipse(175, 235, 7, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(225, 235, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyebrows
    ctx.strokeStyle = '#292524';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(165, 222);
    ctx.lineTo(188, 222);
    ctx.moveTo(212, 222);
    ctx.lineTo(235, 222);
    ctx.stroke();

    // Nose
    ctx.strokeStyle = '#c49a84';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(200, 240);
    ctx.lineTo(196, 262);
    ctx.lineTo(204, 262);
    ctx.stroke();

    // Mouth / Smile
    ctx.strokeStyle = '#b91c1c';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(200, 280, 18, 0.1 * Math.PI, 0.9 * Math.PI, false);
    ctx.stroke();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setState({
      originalImage: dataUrl,
      currentImage: dataUrl,
      history: [dataUrl],
      historyIndex: 0,
      processingState: ProcessingState.IDLE,
      activeTab: AppTab.FACE,
      compliance: null,
      gender: type === 'male' ? Gender.MALE : Gender.FEMALE,
      errorMessage: undefined,
    });
  };

  return (
    <div className="h-screen w-full bg-grey-900 text-slate-200 relative overflow-hidden flex flex-col font-cambria">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
      <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="user" onChange={handleFileUpload} />

      {/* Floating Error Toast */}
      {state.errorMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md bg-red-950/95 border border-red-500/60 rounded-xl p-3 shadow-2xl backdrop-blur-md flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start gap-2.5 text-xs text-red-200">
            <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-100">Action Notice</p>
              <p className="text-red-300/90 mt-0.5">{state.errorMessage}</p>
            </div>
          </div>
          <button 
            onClick={() => setState(prev => ({ ...prev, errorMessage: undefined }))} 
            className="text-red-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 1. Welcome Screen */}
      {!state.currentImage && (
        <div className="flex-1 flex flex-col relative animate-in fade-in duration-500 overflow-y-auto">
          <div className="w-full p-6 flex justify-between items-center z-10">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              stup<span className="text-gold-400">ID</span> EASY
            </h1>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6 max-w-md mx-auto">
            <div className="w-24 h-24 bg-grey-800 rounded-full flex items-center justify-center shadow-[0_0_35px_rgba(204,164,59,0.25)] border border-gold-400/30 animate-pulse">
              <Wand2 size={40} className="text-gold-400" />
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-white tracking-tight">Smart Photos, Stupid Easy</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Your AI portrait stylist & passport compliance auditor. Transform any casual snapshot into an official ID photo in seconds.
              </p>
            </div>

            <div className="space-y-3 w-full max-w-xs pt-2">
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="w-full py-3.5 bg-gold-500 hover:bg-gold-400 text-grey-900 font-bold rounded-xl flex items-center justify-center gap-3 transition-transform active:scale-95 shadow-lg shadow-gold-500/20"
              >
                <Upload size={18} /> Upload Photo
              </button>

              <button 
                onClick={() => cameraInputRef.current?.click()} 
                className="w-full py-3 bg-grey-800 hover:bg-grey-700 text-slate-200 border border-grey-700 rounded-xl flex items-center justify-center gap-2.5 transition-all text-sm font-semibold"
              >
                <Camera size={16} className="text-gold-400" /> Take Selfie
              </button>

              <div className="pt-2 text-center">
                <span className="text-[11px] text-slate-500 uppercase tracking-wider block mb-2">Or quick test with demo:</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => loadDemoPhoto('male')}
                    className="flex-1 py-2 px-3 bg-grey-800/80 hover:bg-grey-700 text-xs text-slate-300 rounded-lg border border-grey-700 hover:border-gold-400/40 transition-all"
                  >
                    Demo Portrait (M)
                  </button>
                  <button 
                    onClick={() => loadDemoPhoto('female')}
                    className="flex-1 py-2 px-3 bg-grey-800/80 hover:bg-grey-700 text-xs text-slate-300 rounded-lg border border-grey-700 hover:border-gold-400/40 transition-all"
                  >
                    Demo Portrait (F)
                  </button>
                </div>
              </div>

              <div className="flex gap-4 items-center justify-center text-[11px] text-slate-500 pt-3">
                <span className="flex items-center gap-1.5"><ShieldCheck size={13} className="text-emerald-400" /> Official Standards</span>
                <span className="flex items-center gap-1.5"><Sparkles size={13} className="text-gold-400" /> AI Powered</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Gender Selection Screen */}
      {state.currentImage && !state.gender && (
        <div className="flex-1 flex flex-col relative animate-in slide-in-from-right duration-300">
          <div className="absolute top-0 left-0 w-full p-4 sm:p-6 flex justify-between items-center z-10">
            <button onClick={handleStartOver} className="text-xl font-bold tracking-tight text-white hover:opacity-80 flex items-center gap-2">
              <Home size={20} className="text-gold-400" /> stup<span className="text-gold-400">ID</span> EASY
            </button>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsCropOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-grey-800 text-slate-300 hover:text-gold-400 hover:bg-grey-700 transition-all border border-grey-700 hover:border-gold-400/30 text-xs font-semibold"
              >
                <Crop size={15} className="text-gold-400" />
                <span>Crop & Frame</span>
              </button>
              <button 
                onClick={handleStartOver} 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-grey-800 text-slate-300 hover:text-gold-400 hover:bg-grey-700 transition-all border border-grey-700 hover:border-gold-400/30 text-xs font-semibold"
              >
                <ImagePlus size={15} />
                <span>New Photo</span>
              </button>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
            <h2 className="text-2xl font-bold text-white">Who is this photo for?</h2>
            <p className="text-slate-400 text-sm max-w-xs">We customize hairstyle and apparel recommendations based on your choice.</p>
            <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
              <button 
                onClick={() => selectGender(Gender.MALE)} 
                className="w-full py-5 px-4 bg-grey-800 hover:bg-grey-700 hover:border-gold-400 border border-grey-700 rounded-xl flex items-center justify-start gap-4 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-grey-900 flex items-center justify-center group-hover:bg-gold-400 group-hover:text-grey-900 transition-colors">
                  <UserCircle size={28} />
                </div>
                <div className="text-left">
                  <span className="block text-base font-bold text-white">Male Styles</span>
                  <span className="text-xs text-slate-400">Suits, Classic Cuts, Beards</span>
                </div>
              </button>
              <button 
                onClick={() => selectGender(Gender.FEMALE)} 
                className="w-full py-5 px-4 bg-grey-800 hover:bg-grey-700 hover:border-gold-400 border border-grey-700 rounded-xl flex items-center justify-start gap-4 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-grey-900 flex items-center justify-center group-hover:bg-gold-400 group-hover:text-grey-900 transition-colors">
                  <UserCircle size={28} />
                </div>
                <div className="text-left">
                  <span className="block text-base font-bold text-white">Female Styles</span>
                  <span className="text-xs text-slate-400">Blazers, Updos, Blouses</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Editor Interface */}
      {state.currentImage && state.gender && (
        <div className="flex-1 flex flex-col h-full animate-in fade-in duration-300">
          <header className="h-16 flex items-center justify-between px-3 sm:px-4 border-b border-grey-700 bg-grey-900 z-20 flex-shrink-0">
            <button onClick={handleStartOver} className="text-lg font-bold text-white hover:opacity-80 transition-opacity flex items-center gap-2">
              <Home size={18} className="text-gold-400" />
              <span>stup<span className="text-gold-400">ID</span></span>
            </button>
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              <button 
                onClick={() => setIsCropOpen(true)} 
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-grey-800 text-slate-300 hover:text-gold-400 hover:bg-grey-700 transition-all border border-grey-700 text-xs font-semibold" 
                title="Crop and frame portrait ratio"
              >
                <Crop size={15} className="text-gold-400" />
                <span className="hidden sm:inline">Crop</span>
              </button>
              <button 
                onClick={handleStartOver} 
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-grey-800 text-slate-300 hover:text-gold-400 hover:bg-grey-700 transition-all border border-grey-700 text-xs font-semibold" 
                title="Upload New Photo"
              >
                <ImagePlus size={15} />
                <span className="hidden sm:inline">New</span>
              </button>
              <div className="h-5 w-px bg-grey-700 mx-0.5"></div>
              <button 
                disabled={state.historyIndex <= 0} 
                onClick={handleUndo} 
                className="p-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors" 
                title="Undo last edit"
              >
                <Undo2 size={18} />
              </button>
              <button 
                onClick={checkCompliance} 
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-grey-800 border border-grey-700 text-xs font-semibold text-slate-300 hover:border-gold-400 hover:text-gold-400 transition-all shadow-sm"
              >
                <ShieldCheck size={14} className="text-emerald-400" /> Audit
              </button>
              <button 
                onClick={() => setIsExportOpen(true)} 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold-500 hover:bg-gold-400 text-grey-900 font-bold text-xs transition-colors shadow-md" 
                title="Download formatted ID"
              >
                <Download size={15} /> Export
              </button>
            </div>
          </header>

          <main className="flex-1 relative overflow-hidden bg-grey-950 flex items-center justify-center p-3 sm:p-6">
            <div className="relative shadow-2xl rounded overflow-hidden border-2 sm:border-4 border-slate-300/80 aspect-[3/4] h-full max-h-[460px] sm:max-h-[540px] w-auto bg-black/40">
              <img src={state.currentImage} alt="ID Preview" className="w-full h-full object-cover" />
              {(state.processingState === ProcessingState.PROCESSING || state.processingState === ProcessingState.CHECKING_COMPLIANCE) && (
                <div className="absolute inset-0 bg-grey-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10 px-4 text-center">
                  <Loader2 size={36} className="text-gold-400 animate-spin" />
                  <p className="text-gold-400 font-medium text-sm animate-pulse">{loadingMessage}</p>
                </div>
              )}
            </div>
            <button 
              onClick={handleReset} 
              className="absolute top-4 right-4 p-2 bg-grey-800/90 rounded-full text-slate-400 hover:text-white hover:border-gold-400/50 border border-grey-700 backdrop-blur-md transition-all shadow-lg" 
              title="Reset to Original Photo"
            >
              <RotateCcw size={16} />
            </button>
          </main>

          <div className="bg-grey-900 border-t border-grey-800 flex flex-col flex-shrink-0">
            <div className="h-44 px-4 py-3">
              <ControlPanel 
                activeTab={state.activeTab} 
                onApplyStyle={handleApplyStyle} 
                onApplyFaceEdit={handleFaceEdit} 
                isProcessing={state.processingState !== ProcessingState.IDLE} 
                selectedGender={state.gender} 
              />
            </div>
            <nav className="h-18 border-t border-grey-800 flex items-center justify-around px-2 pb-safe bg-grey-950">
              {TAB_CONFIG.map((tab) => (
                <button 
                  key={tab.id} 
                  onClick={() => setState(prev => ({ ...prev, activeTab: tab.id }))} 
                  className={`flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-xl transition-all duration-200 ${
                    state.activeTab === tab.id 
                      ? 'text-grey-900 bg-gold-400 shadow-[0_0_15px_rgba(204,164,59,0.4)] font-bold' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-grey-800/50'
                  }`}
                >
                  {tab.icon}
                  <span className="text-[10px] tracking-tight">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {state.compliance && (
        <ComplianceModal 
          result={state.compliance} 
          onClose={() => setState(prev => ({ ...prev, compliance: null }))} 
        />
      )}
      {isExportOpen && (
        <ExportModal 
          imageBase64={state.currentImage} 
          onClose={() => setIsExportOpen(false)} 
          onReset={handleStartOver} 
        />
      )}
      <CropModal
        isOpen={isCropOpen}
        imageSrc={state.currentImage || state.originalImage}
        onApplyCrop={handleApplyCrop}
        onClose={() => setIsCropOpen(false)}
      />
    </div>
  );
};

export default App;