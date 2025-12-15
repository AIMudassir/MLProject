
import React, { useRef, useEffect, useState } from 'react';
import { ChatMessage, MessageRole } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

const ImageWithComparison: React.FC<{ generatedUrl: string; sketchUrl?: string; alt: string }> = ({ generatedUrl, sketchUrl, alt }) => {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div className="relative group rounded-xl overflow-hidden ring-1 ring-white/10 bg-black cursor-crosshair">
       <img 
         src={isHovering && sketchUrl ? sketchUrl : generatedUrl} 
         alt={alt}
         onMouseEnter={() => setIsHovering(true)}
         onMouseLeave={() => setIsHovering(false)}
         onTouchStart={() => setIsHovering(true)}
         onTouchEnd={() => setIsHovering(false)}
         onTouchCancel={() => setIsHovering(false)}
         className="w-full max-h-96 object-contain bg-black transition-opacity duration-200"
       />
       
       {/* Comparison Hint Badge */}
       {sketchUrl && (
         <div className={`absolute top-2 left-2 pointer-events-none transition-opacity duration-300 ${isHovering ? 'opacity-0' : 'opacity-100'}`}>
            <span className="bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-md border border-white/10 shadow-sm flex items-center gap-1">
               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
               HOLD TO COMPARE
            </span>
         </div>
       )}

       {/* State Badge */}
       {isHovering && sketchUrl && (
         <div className="absolute top-2 left-2 bg-indigo-600/90 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-md border border-white/10 shadow-sm animate-in fade-in zoom-in-95 duration-200">
           ORIGINAL SKETCH
         </div>
       )}

       {/* Download Button */}
       <a 
          href={generatedUrl} 
          download={`generated-${Date.now()}.png`}
          className="absolute bottom-3 right-3 bg-black/60 hover:bg-black text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 backdrop-blur-xl border border-white/20 hover:scale-105 z-10"
          title="Download Result"
          onClick={(e) => e.stopPropagation()} // Prevent download when clicking image if wrapper handles comparison
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        </a>
    </div>
  );
};

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, isLoading }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-8 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-zinc-500 px-6 text-center">
           <div className="w-20 h-20 bg-zinc-900/50 rounded-3xl flex items-center justify-center mb-6 shadow-inner ring-1 ring-white/5">
             <svg className="w-8 h-8 text-indigo-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
             </svg>
           </div>
           <h3 className="text-base font-medium text-zinc-200 mb-2">Ready to Sketch</h3>
           <p className="text-sm text-zinc-500 max-w-xs leading-relaxed">Draw on the canvas and describe your idea. Our AI will transform your lines into reality.</p>
        </div>
      )}

      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex flex-col ${msg.role === MessageRole.USER ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}
        >
          <div
            className={`max-w-[90%] rounded-2xl p-4 shadow-sm border relative overflow-hidden ${
              msg.role === MessageRole.USER
                ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 border-indigo-500 text-white rounded-br-none'
                : 'bg-zinc-900 border-white/5 text-zinc-200 rounded-bl-none'
            }`}
          >
            {/* Header for Bot */}
            {msg.role === MessageRole.MODEL && (
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                </div>
                <span className="text-xs font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300">Gemini</span>
                {msg.styleUsed && (
                   <span className="ml-auto text-[10px] uppercase tracking-wider font-bold text-zinc-500 border border-zinc-700/50 px-1.5 py-0.5 rounded bg-zinc-800/50">
                     {msg.styleUsed}
                   </span>
                )}
              </div>
            )}

            {/* Content */}
            {msg.text && <p className="whitespace-pre-wrap text-sm leading-relaxed font-normal">{msg.text}</p>}
            
            {/* Images */}
            {msg.imageUrl && (
              <div className="mt-4">
                 {msg.isSketch ? (
                   // User sketches are simple images
                   <div className="relative group rounded-xl overflow-hidden ring-1 ring-white/10 bg-white">
                      <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-md border border-white/10">INPUT SKETCH</div>
                      <img src={msg.imageUrl} alt="Sketch" className="w-full max-h-60 object-contain p-4" />
                   </div>
                 ) : (
                   // Model results have comparison logic
                   <ImageWithComparison generatedUrl={msg.imageUrl} sketchUrl={msg.originalSketchUrl} alt="Generated Art" />
                 )}
              </div>
            )}
          </div>
          <span className="text-[10px] text-zinc-600 mt-2 px-1">
             {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      ))}

      {isLoading && (
        <div className="flex justify-start animate-in fade-in duration-700">
           <div className="bg-zinc-900 rounded-2xl rounded-bl-none p-4 border border-white/5 flex items-center gap-3 shadow-lg">
              <div className="flex space-x-1.5">
                 <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                 <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                 <div className="w-2 h-2 bg-fuchsia-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span className="text-zinc-400 text-xs font-medium tracking-wide">Processing sketch...</span>
           </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
};

export default ChatPanel;
