
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User as UserIcon, Minus } from 'lucide-react';
import { chatWithAssistant } from '../services/geminiService';
import { ChatMessage } from '../types';

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', parts: [{ text: input }] };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatWithAssistant(messages, input);
      const botMsg: ChatMessage = { role: 'model', parts: [{ text: response || "I'm sorry, I couldn't process that." }] };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      const errMsg: ChatMessage = { role: 'model', parts: [{ text: "Error connecting to AI assistant." }] };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`fixed bottom-6 right-4 sm:right-6 z-[200] flex flex-col items-end ${isOpen ? 'inset-x-4 sm:inset-x-auto bottom-6' : ''}`}>
      {isOpen && (
        <div className="mb-4 w-full sm:w-[350px] h-[500px] max-h-[70vh] bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-zinc-800 overflow-hidden flex flex-col transition-all animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-emerald-900 dark:bg-emerald-950 p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-2 rounded-xl">
                <Bot size={18} />
              </div>
              <div>
                <h3 className="font-bold text-xs uppercase tracking-widest">Al Saqr AI</h3>
                <p className="text-[8px] opacity-60 uppercase tracking-widest">Finance Intelligence</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-2 rounded-xl">
              <Minus size={20} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-zinc-950 scrollbar-hide">
            {messages.length === 0 && (
              <div className="text-center mt-12 px-6">
                <Bot size={40} className="mx-auto text-emerald-100 dark:text-emerald-900 mb-4" />
                <p className="text-[10px] text-slate-400 dark:text-zinc-600 font-black uppercase tracking-widest leading-relaxed">Ask me about payroll, site expenses, or UAE labor regulations.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3.5 rounded-2xl text-xs font-medium leading-relaxed ${
                  m.role === 'user' 
                    ? 'bg-emerald-900 dark:bg-emerald-700 text-white rounded-tr-none' 
                    : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 shadow-sm border border-slate-100 dark:border-zinc-700 rounded-tl-none'
                }`}>
                  {m.parts[0].text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-zinc-800 p-3.5 rounded-2xl rounded-tl-none border border-slate-100 dark:border-zinc-700 shadow-sm">
                  <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 bg-emerald-300 dark:bg-emerald-600 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-emerald-300 dark:bg-emerald-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-emerald-300 dark:bg-emerald-600 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 bg-white dark:bg-zinc-900 border-t border-slate-50 dark:border-zinc-800 flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type message..."
              className="flex-1 bg-slate-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-2.5 text-xs text-emerald-950 dark:text-emerald-50 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="bg-emerald-900 dark:bg-emerald-700 text-white p-2.5 rounded-xl disabled:opacity-30 active:scale-90 transition-transform"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-emerald-900 dark:bg-emerald-700 hover:bg-emerald-950 dark:hover:bg-emerald-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform active:scale-90 border-4 border-white dark:border-zinc-950"
      >
        <MessageSquare size={24} />
      </button>
    </div>
  );
};
