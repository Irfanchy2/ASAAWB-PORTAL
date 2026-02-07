
import React, { useState, useRef } from 'react';
import { Plus, Receipt, ArrowRight, DollarSign, Wallet, CreditCard, ChevronRight, X as XIcon, HandCoins, Tag, Calendar, Building2, CheckCircle2, ShieldCheck, Zap, AlertCircle, Sparkles, FileEdit, PenTool } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { User, Transaction, TransactionStatus, PaymentMode, OCRResult } from '../types';
import { performOCR } from '../services/geminiService';
import { CATEGORIES } from '../constants';

interface EmployeeViewProps {
  user: User;
  transactions: Transaction[];
  onAddTransaction: (t: Partial<Transaction>) => void;
}

/**
 * Resizes an image to speed up API processing and reduce upload time.
 */
const resizeImage = (file: File, maxWidth = 1000): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width *= maxWidth / height;
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8)); // 0.8 quality JPEG
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

export const EmployeeView: React.FC<EmployeeViewProps> = ({ user, transactions, onAddTransaction }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanStep, setScanStep] = useState<'IDLE' | 'CAMERA' | 'REVIEW' | 'ADD_FUNDS' | 'SUCCESS'>('IDLE');
  const [ocrData, setOcrData] = useState<OCRResult | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(PaymentMode.CASH);
  const [cardLast4, setCardLast4] = useState('');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [fundAmount, setFundAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const myTransactions = transactions
    .filter(t => t.userId === user.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsProcessing(true);
    setScanStep('CAMERA');
    
    try {
      const compressedBase64 = await resizeImage(file);
      setReceiptImage(compressedBase64);
      const result = await performOCR(compressedBase64);
      setOcrData(result);
      setScanStep('REVIEW');
    } catch (err) {
      console.error("OCR Error:", err);
      setError("Rapid scan failed. Please check your internet or entry details.");
      setOcrData({
        date: new Date().toISOString().split('T')[0],
        vendor: '',
        amount: 0,
        currency: 'AED',
        category: 'Others',
        items: []
      });
      setScanStep('REVIEW');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualEntry = () => {
    setOcrData({
      date: new Date().toISOString().split('T')[0],
      vendor: '',
      amount: 0,
      currency: 'AED',
      category: 'Others',
      items: []
    });
    setReceiptImage(null);
    setScanStep('REVIEW');
  };

  const handleSubmit = () => {
    if (!ocrData) return;
    
    onAddTransaction({
      userId: user.id,
      userName: user.name,
      date: ocrData.date,
      vendor: ocrData.vendor || 'AL SAQR Purchase',
      amount: ocrData.amount,
      category: ocrData.category,
      items: ocrData.items,
      paymentMode,
      cardLast4: paymentMode === PaymentMode.CARD ? cardLast4 : undefined,
      status: TransactionStatus.PENDING,
      type: 'EXPENSE',
      receiptUrl: receiptImage || undefined,
    });
    
    setScanStep('SUCCESS');
    setTimeout(() => {
      setScanStep('IDLE');
      setOcrData(null);
      setReceiptImage(null);
      setPaymentMode(PaymentMode.CASH);
      setCardLast4('');
      setError(null);
    }, 1200);
  };

  const handleLogFunds = () => {
    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0) return;

    onAddTransaction({
      userId: user.id,
      userName: user.name,
      date: new Date().toISOString().split('T')[0],
      vendor: 'Cash Top-up Request',
      amount: amount,
      status: TransactionStatus.PENDING, 
      paymentMode: PaymentMode.CASH,
      type: 'TOPUP',
    });

    setFundAmount('');
    setScanStep('SUCCESS');
    setTimeout(() => setScanStep('IDLE'), 1200);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white pb-40 font-sans">
      <div className="bg-emerald-900 p-10 rounded-b-[64px] text-center shadow-2xl relative overflow-hidden border-b-8 border-red-700">
        <div className="absolute top-0 right-0 p-6 opacity-20">
           <ShieldCheck size={120} className="text-white" />
        </div>
        
        <div className="relative z-10">
          <p className="text-emerald-200 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Available Balance</p>
          <h1 className="text-6xl font-black text-white mb-2 tracking-tighter">
            {user.balance.toFixed(2)} <span className="text-2xl font-bold opacity-60">AED</span>
          </h1>
          <div className="flex items-center justify-center gap-2 mt-6">
             <button 
              onClick={() => setScanStep('ADD_FUNDS')}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all font-black text-[10px] uppercase tracking-widest backdrop-blur-md border border-white/20"
            >
              <HandCoins size={14} /> Request Top-up
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 mt-10">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-black text-emerald-900 uppercase tracking-tight">Records</h2>
          <button className="text-red-700 text-[10px] font-black uppercase tracking-widest hover:underline">History</button>
        </div>

        <div className="space-y-4">
          {myTransactions.map(t => (
            <div key={t.id} className="flex items-center gap-4 p-5 rounded-[32px] bg-white border border-slate-100 hover:shadow-xl hover:border-emerald-100 transition-all group">
              <div className={`p-4 rounded-2xl shrink-0 ${t.type === 'TOPUP' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                {t.type === 'TOPUP' ? <Wallet size={24} /> : (t.paymentMode === PaymentMode.CARD ? <CreditCard size={24} /> : <Receipt size={24} />)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-emerald-950 truncate text-sm uppercase tracking-tight">{t.vendor}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  {t.paymentMode} • {t.date}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={`font-black text-lg ${t.type === 'TOPUP' ? 'text-emerald-600' : 'text-slate-800'}`}>
                  {t.type === 'TOPUP' ? '+' : '-'}{t.amount.toFixed(2)}
                </p>
                <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-[0.1em] ${
                  t.status === TransactionStatus.APPROVED || t.status === TransactionStatus.COMPLETED ? 'bg-emerald-50 text-emerald-700' :
                  t.status === TransactionStatus.PENDING ? 'bg-amber-50 text-amber-700' :
                  t.status === TransactionStatus.REJECTED ? 'bg-red-50 text-red-700' :
                  'bg-slate-50 text-slate-400'
                }`}>
                  {t.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Enhanced Floating Action Area */}
      <div className="fixed bottom-0 left-0 right-0 p-8 flex flex-col items-center gap-4 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none">
        <div className="flex gap-6 pointer-events-auto items-end">
          {/* Eye-Catchy Manual Entry Button */}
          <button 
            onClick={handleManualEntry}
            className="group relative flex flex-col items-center justify-center p-6 rounded-[32px] shadow-[0_15px_35px_rgba(15,23,42,0.2)] transition-all hover:scale-105 active:scale-95 w-24 h-24 overflow-hidden"
          >
            {/* Dark industrial background */}
            <div className="absolute inset-0 bg-slate-900 group-hover:bg-slate-800 transition-colors" />
            {/* Brand Red Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600" />
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative z-10 flex flex-col items-center text-white">
              <div className="p-2 bg-white/10 rounded-xl mb-1 group-hover:rotate-12 transition-transform">
                <FileEdit size={24} strokeWidth={2.5} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.1em]">Manual</span>
            </div>
            
            {/* Subtle glow effect */}
            <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-red-600/20 blur-xl group-hover:bg-red-600/30 transition-all rounded-full" />
          </button>

          {/* Scan Button (Primary) */}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="relative group overflow-hidden bg-emerald-800 hover:bg-emerald-900 text-white flex flex-col items-center justify-center p-10 rounded-full shadow-[0_20px_50px_rgba(6,95,70,0.3)] transition-all hover:scale-110 active:scale-95 w-28 h-28 ring-8 ring-white"
          >
            <div className="relative z-10 flex flex-col items-center">
              <Plus size={36} strokeWidth={4} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] mt-1">Scan</span>
            </div>
            {/* Animated Scanning Line */}
            <div className="absolute inset-0 flex items-center justify-center">
               <div className="w-full h-1 bg-emerald-400/30 blur-sm animate-[bounce_2s_infinite] opacity-0 group-hover:opacity-100" />
            </div>
          </button>
        </div>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
      </div>

      {/* Overlays / Modals */}
      {scanStep !== 'IDLE' && (
        <div className="fixed inset-0 z-50 bg-emerald-950/95 backdrop-blur-xl flex flex-col items-center justify-start p-6 overflow-y-auto scrollbar-hide">
          {scanStep !== 'SUCCESS' && (
            <div className="w-full flex justify-end mb-4 shrink-0 max-w-sm">
              <button onClick={() => setScanStep('IDLE')} className="text-white/60 hover:text-white p-3 bg-white/10 rounded-full transition-colors">
                <XIcon size={24} />
              </button>
            </div>
          )}

          {isProcessing ? (
            <div className="text-center my-auto flex flex-col items-center p-8 animate-in fade-in duration-300">
              <div className="relative mb-6">
                <div className="w-16 h-16 border-4 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-emerald-400">
                   <Zap size={20} className="animate-pulse" />
                </div>
              </div>
              <h2 className="text-white text-xl font-black uppercase tracking-tighter mb-1">Turbo Scan...</h2>
              <p className="text-emerald-200/40 font-bold text-[8px] uppercase tracking-[0.4em]">Gemini Flash Active</p>
            </div>
          ) : scanStep === 'REVIEW' && ocrData ? (
            <div className="w-full max-w-sm bg-white rounded-[40px] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 mb-12 shrink-0">
              <div className="p-8 space-y-8">
                <div className="text-center">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    {receiptImage ? <Sparkles size={24} className="text-emerald-600" /> : <FileEdit size={24} className="text-emerald-600" />}
                  </div>
                  <h2 className="text-xl font-black text-emerald-900 uppercase tracking-tighter">{receiptImage ? 'Record Found' : 'Manual Expense'}</h2>
                  <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-1">{receiptImage ? 'Audit AI Detection' : 'Fill Entry Details'}</p>
                </div>

                {error && (
                  <div className="bg-amber-50 border border-amber-100 p-3 rounded-2xl flex gap-3 items-start">
                    <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[9px] font-bold text-amber-700 leading-tight uppercase tracking-tight">{error}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="relative">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1.5 ml-1">Vendor / Description</label>
                    <input 
                      type="text" 
                      value={ocrData.vendor} 
                      placeholder="e.g. Workers Meal"
                      onChange={e => setOcrData(prev => prev ? {...prev, vendor: e.target.value} : null)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-black text-emerald-950 uppercase text-xs focus:ring-4 focus:ring-emerald-500/10 outline-none" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1.5 ml-1">Amount (AED)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={ocrData.amount || ''} 
                        placeholder="0.00"
                        onChange={e => setOcrData(prev => prev ? {...prev, amount: parseFloat(e.target.value) || 0} : null)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-black text-emerald-950 text-xs focus:ring-4 focus:ring-emerald-500/10 outline-none" 
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1.5 ml-1">Entry Date</label>
                      <input 
                        type="date" 
                        value={ocrData.date} 
                        onChange={e => setOcrData(prev => prev ? {...prev, date: e.target.value} : null)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-black text-emerald-950 text-xs focus:ring-4 focus:ring-emerald-500/10 outline-none" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1.5 ml-1">Business Category</label>
                    <select 
                      value={ocrData.category} 
                      onChange={e => setOcrData(prev => prev ? {...prev, category: e.target.value} : null)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-black text-emerald-950 text-xs appearance-none focus:ring-4 focus:ring-emerald-500/10 outline-none"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1.5 ml-1">Settlement</label>
                    <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                      <button 
                        onClick={() => setPaymentMode(PaymentMode.CASH)}
                        className={`flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${paymentMode === PaymentMode.CASH ? 'bg-white shadow-sm text-emerald-800' : 'text-slate-400'}`}
                      >
                        Cash
                      </button>
                      <button 
                        onClick={() => setPaymentMode(PaymentMode.CARD)}
                        className={`flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${paymentMode === PaymentMode.CARD ? 'bg-white shadow-sm text-emerald-800' : 'text-slate-400'}`}
                      >
                        Card
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-6 pb-2">
                  <Button 
                    disabled={!ocrData.vendor || ocrData.amount <= 0}
                    onClick={handleSubmit} 
                    className="w-full py-4 bg-emerald-800 text-white rounded-xl font-black uppercase tracking-widest text-sm shadow-xl shadow-emerald-900/40 hover:bg-emerald-900 active:scale-95"
                  >
                    Authorize Claim <ArrowRight size={18} />
                  </Button>
                </div>
              </div>
            </div>
          ) : scanStep === 'ADD_FUNDS' ? (
            <div className="w-full max-w-sm bg-white rounded-[40px] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 my-auto p-10 space-y-8 shrink-0">
                <div className="text-center">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <HandCoins size={32} />
                  </div>
                  <h2 className="text-2xl font-black text-emerald-900 uppercase tracking-tighter">Request Funds</h2>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Wallet Protocol</p>
                </div>

                <div className="space-y-6">
                  <input 
                    type="number" 
                    autoFocus
                    placeholder="0.00"
                    value={fundAmount}
                    onChange={e => setFundAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-6 text-4xl font-black text-emerald-950 text-center focus:ring-4 focus:ring-emerald-500/10 outline-none" 
                  />
                </div>

                <Button onClick={handleLogFunds} className="w-full py-5 bg-emerald-800 text-white rounded-2xl font-black uppercase tracking-widest text-base shadow-xl shadow-emerald-900/20">
                  Send Request
                </Button>
            </div>
          ) : scanStep === 'SUCCESS' ? (
            <div className="text-center my-auto animate-in zoom-in duration-300 flex flex-col items-center">
               <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/50">
                 <CheckCircle2 size={40} strokeWidth={4} />
               </div>
               <h2 className="text-white text-2xl font-black uppercase tracking-tighter mb-1">Success</h2>
               <p className="text-emerald-200 font-bold text-[8px] uppercase tracking-[0.4em]">Ledger Updated</p>
            </div>
          ) : null}
          
          <div className="h-24 w-full shrink-0" />
        </div>
      )}
    </div>
  );
};
