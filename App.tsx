
import React, { useState, useRef, useEffect } from 'react';
import CanvasBoard, { CanvasRef } from './components/CanvasBoard';
import ChatPanel from './components/ChatPanel';
import { ChatMessage, MessageRole, DrawingTool, ArtStyle, STYLES } from './types';
import { generateImageFromSketch } from './services/geminiService';

const App: React.FC = () => {
  // --- State ---
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<ArtStyle>('Realistic');
  const [currentTool, setCurrentTool] = useState<DrawingTool>({ 
    color: '#000000', 
    width: 3, 
    mode: 'brush',
    shape: 'round',
    opacity: 1
  });

  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const canvasRef = useRef<CanvasRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---

  const handleClearCanvas = () => {
    canvasRef.current?.clearCanvas();
  };

  const handleUndo = () => canvasRef.current?.undo();
  const handleRedo = () => canvasRef.current?.redo();

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDownloadSketch = () => {
    const data = canvasRef.current?.exportImage();
    if (data) {
      const link = document.createElement('a');
      link.href = data;
      link.download = `sketch-${Date.now()}.png`;
      link.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
            canvasRef.current?.loadImage(result);
        }
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Camera Handlers ---

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      setIsCameraOpen(true);
      // Wait for modal to render then attach stream
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please ensure you have granted camera permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = video.videoWidth;
      tempCanvas.height = video.videoHeight;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = tempCanvas.toDataURL('image/png');
        canvasRef.current.loadImage(dataUrl);
      }
      stopCamera();
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // --- Chat Handlers ---

  const handleSendMessage = async () => {
    if (isProcessing) return;
    
    const sketchData = canvasRef.current?.exportImage();
    if (!sketchData) return;
    
    const userText = inputPrompt.trim() || "Turn this sketch into a realistic image.";
    const messageId = Date.now().toString();

    // 1. Add User Message
    const newUserMsg: ChatMessage = {
      id: messageId,
      role: MessageRole.USER,
      text: userText,
      imageUrl: sketchData,
      isSketch: true,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInputPrompt('');
    setIsProcessing(true);

    try {
      // 2. Call Gemini
      const result = await generateImageFromSketch(sketchData, userText, selectedStyle);

      // 3. Add AI Response
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: MessageRole.MODEL,
        text: result.text || (result.imageUrl ? `Here is your ${selectedStyle.toLowerCase()} interpretation.` : "I couldn't generate an image."),
        imageUrl: result.imageUrl,
        timestamp: Date.now(),
        originalSketchUrl: sketchData, // Attach for comparison
        styleUsed: selectedStyle
      };

      setMessages(prev => [...prev, aiMsg]);

    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: MessageRole.SYSTEM,
        text: "Sorry, I encountered an error processing your sketch. Please try again.",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30 touch-none">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleFileChange} 
      />

      {/* Header */}
      <header className="h-12 lg:h-14 border-b border-white/5 flex items-center justify-between px-4 lg:px-6 bg-zinc-950/80 backdrop-blur-xl z-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 flex items-center justify-center group">
            <div className="absolute inset-0 bg-indigo-500 rounded-lg blur-md opacity-40 group-hover:opacity-60 transition-opacity"></div>
            <div className="relative w-full h-full bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center ring-1 ring-white/20">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </div>
          </div>
          <div>
            <h1 className="text-base lg:text-lg font-bold tracking-tight text-white">SketchRealism <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">AI</span></h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/5 text-zinc-400">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
             Gemini 2.5 Flash
           </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* Left: Workspace */}
        <section className="flex-1 flex flex-col min-w-0 bg-zinc-900/30 relative z-0">
          
          {/* Toolbar - Floating style on desktop, Scrollable row on mobile */}
          <div className="h-14 lg:h-16 border-b lg:border-b-0 border-white/5 bg-zinc-950/90 lg:bg-transparent flex items-center justify-start lg:justify-center px-2 lg:px-0 gap-2 overflow-x-auto scrollbar-hide shrink-0 z-20 lg:absolute lg:top-4 lg:left-1/2 lg:-translate-x-1/2 lg:w-auto lg:max-w-[95%]">
            
            <div className="flex items-center gap-2 lg:bg-zinc-950/80 lg:backdrop-blur-xl lg:border lg:border-white/10 lg:rounded-2xl lg:p-1.5 lg:shadow-2xl min-w-max">
              
              {/* Group: File & History */}
              <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/5">
                  <button type="button" onClick={handleUploadClick} className="p-2 hover:bg-white/10 rounded-lg text-indigo-400 transition-colors" title="Upload Sketch">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  </button>

                  <button type="button" onClick={startCamera} className="p-2 hover:bg-white/10 rounded-lg text-rose-400 transition-colors" title="Take Photo">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </button>
                  
                  <button type="button" onClick={handleDownloadSketch} className="p-2 hover:bg-white/10 rounded-lg text-emerald-400 transition-colors" title="Download Sketch">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  </button>

                  <div className="w-px h-4 bg-white/10 mx-1"></div>
                  
                  <button type="button" onClick={handleUndo} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors" title="Undo">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                  </button>
                  <button type="button" onClick={handleRedo} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors" title="Redo">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
                  </button>
              </div>

              {/* Group: Tools */}
              <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/5">
                <button 
                    type="button"
                    onClick={() => setCurrentTool(p => ({...p, mode: 'brush'}))}
                    className={`p-2 rounded-lg transition-all ${currentTool.mode === 'brush' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                    title="Brush"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button 
                    type="button"
                    onClick={() => setCurrentTool(p => ({...p, mode: 'eraser'}))}
                    className={`p-2 rounded-lg transition-all ${currentTool.mode === 'eraser' ? 'bg-zinc-700 text-white shadow-lg' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                    title="Eraser"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.25 21h13.5m-15.75-6.75l9.67-9.67a3.375 3.375 0 014.773 4.773l-9.67 9.67a3.375 3.375 0 01-4.773-4.773" /></svg>
                </button>
              </div>

              {/* Group: Settings */}
              <div className="flex items-center gap-4 bg-white/5 rounded-xl p-2 px-3 border border-white/5">
                {/* Size */}
                <div className="flex flex-col justify-center w-24 gap-1.5">
                    <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-bold text-zinc-500">
                        <span>Size</span>
                        <span className="text-zinc-300">{currentTool.width}px</span>
                    </div>
                    <input 
                      type="range" min="1" max="50"
                      value={currentTool.width}
                      onChange={(e) => setCurrentTool(p => ({...p, width: parseInt(e.target.value)}))}
                      className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>
                
                <div className="w-px h-6 bg-white/10"></div>

                {/* Opacity */}
                <div className="flex flex-col justify-center w-20 gap-1.5">
                    <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-bold text-zinc-500">
                        <span>Opacity</span>
                        <span className="text-zinc-300">{Math.round(currentTool.opacity * 100)}%</span>
                    </div>
                    <input 
                      type="range" min="0.1" max="1" step="0.1"
                      value={currentTool.opacity}
                      onChange={(e) => setCurrentTool(p => ({...p, opacity: parseFloat(e.target.value)}))}
                      className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>
              </div>

              {/* Group: Colors */}
              <div className="flex items-center gap-1.5 px-1">
                {['#000000', '#EF4444', '#22C55E', '#3B82F6', '#F59E0B', '#A855F7'].map(color => (
                    <button
                      type="button"
                      key={color}
                      onClick={() => setCurrentTool(p => ({...p, color, mode: 'brush'}))}
                      className={`w-6 h-6 rounded-full border border-white/10 transition-transform ${currentTool.color === color && currentTool.mode === 'brush' ? 'scale-125 ring-2 ring-indigo-500 ring-offset-2 ring-offset-zinc-900' : 'hover:scale-110'}`}
                      style={{ backgroundColor: color }}
                    />
                ))}
                 <div className="relative w-6 h-6 rounded-full overflow-hidden border border-white/10 hover:scale-110 transition-transform bg-gradient-to-tr from-yellow-400 via-red-500 to-blue-600">
                    <input
                      type="color"
                      value={currentTool.color}
                      onChange={(e) => setCurrentTool(p => ({...p, color: e.target.value, mode: 'brush'}))}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                 </div>
              </div>

              {/* Action: Clear */}
              <button
                type="button"
                onClick={handleClearCanvas}
                className="ml-2 p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                title="Clear Canvas"
              >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>

            </div>
          </div>

          {/* Canvas Container */}
          <div className="flex-1 bg-dot-pattern relative flex flex-col p-2 pt-2 lg:p-4 lg:pt-24">
             <div className="flex-1 relative shadow-2xl rounded-xl overflow-hidden bg-white ring-1 ring-white/5 mx-auto w-full max-w-5xl">
                <CanvasBoard ref={canvasRef} tool={currentTool} />
             </div>
          </div>
        </section>

        {/* Right: Sidebar */}
        <section className="h-[40vh] lg:h-auto lg:w-[400px] xl:w-[450px] flex flex-col bg-zinc-950 border-t lg:border-t-0 lg:border-l border-white/5 shadow-2xl z-10 shrink-0 relative">
          
          <ChatPanel messages={messages} isLoading={isProcessing} />
          
          {/* Input Area */}
          <div className="p-3 lg:p-4 border-t border-white/5 bg-zinc-950/80 backdrop-blur-md z-20 flex flex-col gap-3">
            
            {/* Style Selector */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
               {STYLES.map(style => (
                 <button
                   key={style}
                   type="button"
                   onClick={() => setSelectedStyle(style)}
                   className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                     selectedStyle === style 
                     ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-900/30' 
                     : 'bg-zinc-900 text-zinc-400 border-zinc-700/50 hover:bg-zinc-800 hover:text-zinc-200'
                   }`}
                 >
                   {style}
                 </button>
               ))}
            </div>

            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-violet-600 rounded-2xl opacity-20 group-hover:opacity-50 transition duration-500 blur"></div>
              <div className="relative flex items-center bg-zinc-900 rounded-xl">
                  <input
                    type="text"
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    onKeyDown={(e) => { if(e.key === 'Enter') handleSendMessage() }}
                    placeholder="Describe your vision..."
                    className="w-full bg-transparent text-white rounded-xl pl-4 pr-12 py-3.5 focus:outline-none placeholder-zinc-600 text-base lg:text-sm"
                    disabled={isProcessing}
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={isProcessing}
                    className={`absolute right-1.5 p-2 rounded-lg transition-all duration-200 ${
                        isProcessing 
                        ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 hover:scale-105 active:scale-95'
                    }`}
                  >
                     {isProcessing ? (
                         <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                     ) : (
                         <svg className="w-5 h-5 transform -rotate-45 translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                     )}
                  </button>
              </div>
            </div>
            <div className="flex justify-between items-center px-1">
                <p className="text-[10px] text-zinc-500 font-medium">
                    Powered by <span className="text-zinc-300">Gemini 2.5</span>
                </p>
            </div>
          </div>
        </section>

      </main>

      {/* Camera Modal Overlay */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="relative w-full max-w-lg bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col">
              <div className="relative bg-black flex-1 min-h-[50vh]">
                 <video 
                   ref={videoRef} 
                   autoPlay 
                   playsInline 
                   muted 
                   className="w-full h-full object-cover" 
                 />
                 <div className="absolute inset-0 pointer-events-none border border-white/20 m-4 rounded-xl border-dashed opacity-50"></div>
              </div>
              <div className="p-6 bg-zinc-900 flex justify-around items-center gap-4">
                  <button 
                    onClick={stopCamera}
                    className="px-6 py-2.5 rounded-xl text-zinc-400 hover:text-white font-medium hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={capturePhoto}
                    className="w-16 h-16 rounded-full bg-white border-4 border-zinc-300 shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center justify-center group"
                  >
                    <div className="w-12 h-12 rounded-full border-2 border-black/10 bg-white group-hover:bg-zinc-100"></div>
                  </button>
                   {/* Spacer to balance layout */}
                  <div className="w-20"></div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
