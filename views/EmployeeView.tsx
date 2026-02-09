
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, Receipt, ArrowRight, DollarSign, Wallet, CreditCard, 
  ChevronRight, X as XIcon, HandCoins, Tag, Calendar, 
  Building2, CheckCircle2, ShieldCheck, Zap, AlertCircle, 
  Sparkles, FileEdit, PenTool, Timer, LogIn, LogOut, Briefcase, TrendingUp, Activity, Edit3, ArrowUpCircle,
  ShieldAlert, ChevronLeft, ChevronDown, Filter, Camera
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { User, Transaction, TransactionStatus, PaymentMode, OCRResult, AttendanceRecord, UserRole } from '../types';
import { performOCR } from '../services/geminiService';
import { CATEGORIES } from '../constants';

interface EmployeeViewProps {
  user: User;
  transactions: Transaction[];
  attendance: AttendanceRecord[];
  onAddTransaction: (t: Partial<Transaction>) => void;
  onPunchIn: () => void;
  onPunchOut: () => void;
  isAdminViewing?: boolean;
  onClosePreview?: () => void;
}

export const EmployeeView: React.FC<EmployeeViewProps> = ({ 
  user, transactions, attendance, onAddTransaction, onPunchIn, onPunchOut,
  isAdminViewing, onClosePreview
}) => {
  const [activeTab, setActiveTab] = useState<'EXPENSES' | 'WORK'>('WORK');
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanStep, setScanStep] = useState<'IDLE' | 'REVIEW' | 'SUCCESS' | 'TOPUP'>('IDLE');
  const [ocrData, setOcrData] = useState<OCRResult | null>(null);
  const [topupAmount, setTopupAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(PaymentMode.CASH);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [attendanceMonth, setAttendanceMonth] = useState(new Date().getMonth());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeShift = attendance.find(a => a.id === user.activeShiftId);

  useEffect(() => {
    let interval: any;
    if (activeShift) {
      interval = setInterval(() => {
        const start = new Date(activeShift.checkIn);
        const now = new Date();
        const diff = now.getTime() - start.getTime();
        const hrs = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setElapsedTime(`${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }, 1000);
    } else {
      setElapsedTime('00:00:00');
    }
    return () => clearInterval(interval);
  }, [activeShift]);

  const monthlyStats = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const records = attendance.filter(a => new Date(a.date).getMonth() === currentMonth);
    const totalOT = records.reduce((sum, r) => sum + (r.overtimeHours || 0), 0);
    const totalWorked = records.reduce((sum, r) => sum + (r.totalHours || 0), 0);
    const otPay = totalOT * (user.otRate || 0);
    
    const reimbursements = transactions
      .filter(t => t.userId === user.id && t.status === TransactionStatus.APPROVED && t.type === 'EXPENSE' && t.paymentMode === PaymentMode.CARD)
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    return {
      totalOT,
      totalWorked,
      earnings: (user.baseSalary || 0) + otPay + reimbursements
    };
  }, [attendance, user, transactions]);

  const filteredAttendance = useMemo(() => {
    return attendance
      .filter(a => 
        a.userId === user.id && 
        a.checkOut && 
        new Date(a.date).getMonth() === attendanceMonth
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendance, user.id, attendanceMonth]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setScanStep('REVIEW');
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setReceiptImage(base64);
        try {
          const result = await performOCR(base64);
          setOcrData(result);
        } catch (ocrErr) {
          setOcrData({
            date: new Date().toISOString().split('T')[0],
            vendor: '',
            amount: 0,
            currency: 'AED',
            category: 'Others',
            items: []
          });
        }
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setIsProcessing(false);
      setScanStep('IDLE');
    }
  };

  const startManualEntry = () => {
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
    setIsProcessing(false);
  };

  const handleExpenseSubmit = () => {
    if (!ocrData) return;
    onAddTransaction({
      userId: user.id,
      userName: user.name,
      date: ocrData.date,
      vendor: ocrData.vendor || 'Manual Expense Entry',
      amount: ocrData.amount || 0,
      category: ocrData.category || 'Others',
      paymentMode,
      status: TransactionStatus.PENDING,
      type: 'EXPENSE',
      receiptUrl: receiptImage || undefined,
    });
    setScanStep('SUCCESS');
    setTimeout(() => {
      setScanStep('IDLE');
      setOcrData(null);
    }, 1500);
  };

  const handleTopupSubmit = () => {
    const amountNum = parseFloat(topupAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;
    
    onAddTransaction({
      userId: user.id,
      userName: user.name,
      date: new Date().toISOString().split('T')[0],
      vendor: 'Personal Wallet Top-up',
      amount: amountNum,
      category: 'Top-up',
      paymentMode: PaymentMode.CASH,
      status: TransactionStatus.PENDING,
      type: 'TOPUP',
    });
    setScanStep('SUCCESS');
    setTopupAmount('');
    setTimeout(() => {
      setScanStep('IDLE');
    }, 1500);
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="max-w-md mx-auto bg-slate-50 dark:bg-zinc-950 min-h-screen pb-40 relative overflow-hidden flex flex-col transition-colors duration-300">
      {isAdminViewing && (
        <div className="bg-amber-500 text-white px-4 sm:px-6 py-3.5 sm:py-4 flex justify-between items-center shadow-xl z-[150] sticky top-0 animate-in slide-in-from-top-full duration-500">
          <div className="flex items-center gap-3">
            <ShieldAlert size={18} />
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest truncate max-w-[180px]">Admin View: {user.name}</span>
          </div>
          <button 
            onClick={onClosePreview}
            className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-xl font-bold text-[8px] sm:text-[9px] uppercase tracking-widest hover:bg-white/30 transition-all shrink-0"
          >
            <ChevronLeft size={14} /> Exit
          </button>
        </div>
      )}

      <div className="absolute top-[-5%] left-[-5%] w-[60%] h-[20%] bg-emerald-100/50 dark:bg-emerald-950/20 blur-[80px] rounded-full z-0" />
      
      <div className="relative z-10 flex-1 overflow-y-auto scrollbar-hide">
        {activeTab === 'WORK' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 sm:p-8 pb-12 sm:pb-16 bg-gradient-to-br from-emerald-900 via-emerald-950 to-black rounded-b-[3rem] sm:rounded-b-[4rem] text-white shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Activity size={100} />
               </div>
               
               <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6 sm:mb-8">
                    <div>
                      <p className="text-emerald-400 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">Session Active</p>
                      <h2 className="text-lg sm:text-xl font-bold mt-1">Industrial Portal</h2>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${activeShift ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                       <span className="text-[9px] font-bold uppercase tracking-wider">{activeShift ? 'Live' : 'Standby'}</span>
                    </div>
                  </div>

                  <div className="text-center mt-2 sm:mt-4">
                    <p className="text-emerald-200/60 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] mb-1 sm:mb-2">Monthly Accrued</p>
                    <h1 className="text-4xl sm:text-5xl font-black tracking-tighter tabular-nums">
                      {(monthlyStats.earnings || 0).toLocaleString()}
                      <span className="text-base sm:text-lg ml-2 font-medium opacity-40">AED</span>
                    </h1>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-8 sm:mt-10">
                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl sm:rounded-3xl backdrop-blur-sm">
                       <p className="text-[8px] sm:text-[9px] font-bold uppercase opacity-50 tracking-widest mb-1">Total Hrs</p>
                       <div className="flex items-center gap-2">
                          <Timer size={14} className="text-emerald-400" />
                          <p className="text-base sm:text-lg font-bold">{(monthlyStats.totalWorked || 0).toFixed(1)}</p>
                       </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl sm:rounded-3xl backdrop-blur-sm">
                       <p className="text-[8px] sm:text-[9px] font-bold uppercase opacity-50 tracking-widest mb-1">OT Bonus</p>
                       <div className="flex items-center gap-2">
                          <Zap size={14} className="text-amber-400" />
                          <p className="text-base sm:text-lg font-bold text-amber-400">{(monthlyStats.totalOT || 0).toFixed(1)}</p>
                       </div>
                    </div>
                  </div>
               </div>
            </div>

            <div className="px-5 sm:px-6 space-y-6 -mt-8 pb-10">
              <Card className="rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-10 flex flex-col items-center border-none shadow-2xl relative bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl">
                 <div className="w-full text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 rounded-full border border-slate-100 dark:border-zinc-700 mb-4">
                        <Calendar size={12} className="text-slate-400 dark:text-zinc-500" />
                        <span className="text-[9px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Shift Sync v2.5</span>
                    </div>
                    <div className={`text-5xl sm:text-6xl font-black tracking-tighter font-mono ${activeShift ? 'text-emerald-950 dark:text-emerald-50' : 'text-slate-300 dark:text-zinc-800'}`}>
                      {elapsedTime}
                    </div>
                 </div>

                 <div className="w-full mt-8 sm:mt-10">
                   {activeShift ? (
                     <button onClick={onPunchOut} className="w-full group relative overflow-hidden active:scale-95 transition-transform rounded-2xl sm:rounded-3xl">
                       <div className="absolute inset-0 bg-red-600 rounded-2xl sm:rounded-3xl transition-transform duration-300 group-hover:scale-105" />
                       <div className="relative py-6 sm:py-8 flex flex-col items-center gap-1 sm:gap-2 text-white">
                         <LogOut size={24} sm-size={28} className="animate-bounce" />
                         <span className="font-black text-base sm:text-lg uppercase tracking-[0.2em]">End Session</span>
                       </div>
                     </button>
                   ) : (
                     <button onClick={onPunchIn} className="w-full group relative overflow-hidden active:scale-95 transition-transform rounded-2xl sm:rounded-3xl">
                       <div className="absolute inset-0 bg-emerald-700 rounded-2xl sm:rounded-3xl transition-transform duration-300 group-hover:scale-105" />
                       <div className="relative py-6 sm:py-8 flex flex-col items-center gap-1 sm:gap-2 text-white">
                         <LogIn size={24} sm-size={28} className="group-hover:translate-x-1 transition-transform" />
                         <span className="font-black text-base sm:text-lg uppercase tracking-[0.2em]">Start Shift</span>
                       </div>
                     </button>
                   )}
                 </div>
              </Card>

              <div className="pb-10">
                <div className="flex justify-between items-center mb-4 px-2">
                   <h3 className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Recent Logs</h3>
                   <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1 rounded-lg">
                      <Filter size={10} />
                      <span className="text-[8px] font-black uppercase tracking-widest">{months[attendanceMonth]}</span>
                   </div>
                </div>

                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-4">
                  {months.map((m, i) => (
                    <button 
                      key={m}
                      onClick={() => setAttendanceMonth(i)}
                      className={`flex-shrink-0 px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${attendanceMonth === i ? 'bg-emerald-900 text-white shadow-md' : 'bg-white dark:bg-zinc-900 text-slate-400 dark:text-zinc-500 border border-slate-100 dark:border-zinc-800'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                   {filteredAttendance.length === 0 ? (
                     <div className="py-12 text-center bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-100 dark:border-zinc-800 border-dashed">
                        <p className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Empty</p>
                     </div>
                   ) : filteredAttendance.map(record => (
                     <div key={record.id} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3 min-w-0">
                           <div className="w-10 h-10 bg-slate-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-slate-400 dark:text-zinc-500 shrink-0">
                              <Calendar size={18} />
                           </div>
                           <div className="min-w-0">
                              <p className="text-xs font-black text-emerald-950 dark:text-emerald-50 uppercase truncate">
                                {new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </p>
                              <p className="text-[9px] text-slate-400 dark:text-zinc-500 uppercase font-bold">{(record.totalHours || 0).toFixed(1)}H</p>
                           </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest shrink-0 ${record.status === 'APPROVED' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'}`}>
                          {record.status === 'APPROVED' ? 'Verified' : 'Pending'}
                        </span>
                     </div>
                   ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 sm:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
             <div className="flex justify-between items-center">
                <div className="min-w-0 pr-4">
                  <h2 className="text-3xl sm:text-4xl font-black text-emerald-950 dark:text-emerald-50 tracking-tighter">FINANCE</h2>
                  <p className="text-slate-400 dark:text-zinc-500 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] mt-1">Wallet Ledger</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-400 tracking-tighter tabular-nums">{(user.balance || 0).toFixed(2)}</p>
                  <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">AED Credits</p>
                  <button 
                    onClick={() => setScanStep('TOPUP')}
                    className="mt-3 flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-wider hover:bg-emerald-200 dark:hover:bg-emerald-900/40 transition-all shadow-sm active:scale-90"
                  >
                    <Plus size={12} strokeWidth={3} />
                    Top-up
                  </button>
                </div>
             </div>

             <div className="pb-10">
                <h3 className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-4 px-2">History</h3>
                <div className="space-y-3">
                   {transactions.filter(t => t.userId === user.id).slice(0, 15).map(t => (
                     <div key={t.id} className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 dark:border-zinc-800 flex items-center gap-3 sm:gap-4 group hover:border-emerald-200 dark:hover:border-emerald-800 transition-all shadow-sm">
                       <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-colors shrink-0 ${t.type === 'TOPUP' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-50 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/30 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'}`}>
                         {t.type === 'TOPUP' ? <ArrowUpCircle size={22} /> : <Receipt size={22} />}
                       </div>
                       <div className="flex-1 min-w-0">
                         <p className="text-xs sm:text-sm font-bold text-emerald-950 dark:text-emerald-50 uppercase truncate tracking-tight">{t.vendor}</p>
                         <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase mt-0.5">{new Date(t.date).toLocaleDateString()}</p>
                       </div>
                       <div className="text-right shrink-0">
                         <p className={`font-black tracking-tighter text-base sm:text-lg tabular-nums ${t.type === 'TOPUP' ? 'text-emerald-700 dark:text-emerald-400' : 'text-emerald-950 dark:text-emerald-50'}`}>
                            {t.type === 'TOPUP' ? '+' : '-'}{(t.amount || 0).toFixed(0)}
                            <span className="text-[9px] ml-0.5 font-medium opacity-40">.{((t.amount || 0) % 1).toFixed(2).substring(2)}</span>
                         </p>
                         <span className={`text-[7px] sm:text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${t.status === TransactionStatus.APPROVED ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'}`}>
                            {t.status}
                         </span>
                       </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}
      </div>

      {/* FIXED ACTION CLUSTER - Optimized Placement */}
      {activeTab === 'EXPENSES' && scanStep === 'IDLE' && (
        <div className="fixed bottom-28 left-0 right-0 px-8 flex justify-center items-center gap-6 z-[120] pointer-events-none">
           <div className="pointer-events-auto flex flex-col items-center gap-2">
              <button 
                onClick={startManualEntry} 
                className="w-12 h-12 bg-white dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 text-emerald-900 dark:text-emerald-400 rounded-2xl shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                title="Manual Entry"
              >
                <FileEdit size={20} />
              </button>
              <span className="text-[7px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Manual</span>
           </div>

           <div className="pointer-events-auto flex flex-col items-center gap-2">
              <div className="relative group">
                 <div className="absolute inset-0 bg-emerald-500 rounded-3xl animate-ping opacity-20 group-hover:opacity-0 transition-opacity" />
                 <button 
                    onClick={() => fileInputRef.current?.click()} 
                    className="relative w-16 h-16 bg-emerald-900 dark:bg-emerald-700 text-white rounded-[1.75rem] shadow-[0_10px_40px_rgba(6,78,59,0.3)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all border-4 border-slate-50 dark:border-zinc-950"
                    title="Turbo Scan"
                 >
                   <Camera size={28} />
                 </button>
              </div>
              <span className="text-[8px] font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-[0.2em]">Turbo Scan</span>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
           </div>
        </div>
      )}

      {/* Modal Layers */}
      {scanStep !== 'IDLE' && (
        <div className="fixed inset-0 z-[200] bg-emerald-950/95 dark:bg-zinc-950/95 backdrop-blur-2xl flex flex-col p-6 sm:p-8 items-center justify-center animate-in fade-in duration-300">
          <button onClick={() => setScanStep('IDLE')} className="absolute top-6 right-6 sm:top-8 sm:right-8 text-white/40 dark:text-zinc-500 hover:text-white transition-colors">
            <XIcon size={32} />
          </button>
          
          {scanStep === 'TOPUP' ? (
            <div className="w-full max-w-sm animate-in zoom-in-95 duration-300">
               <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] sm:rounded-[3.5rem] p-8 sm:p-10 space-y-6 sm:space-y-8 shadow-2xl">
                  <div className="text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/20 rounded-full mb-3">
                         <ArrowUpCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
                         <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Injection</span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-emerald-950 dark:text-emerald-50 tracking-tighter uppercase">Wallet Top-up</h2>
                  </div>
                  <input type="number" value={topupAmount} onChange={e => setTopupAmount(e.target.value)} className="w-full px-6 py-6 sm:py-8 bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 rounded-2xl sm:rounded-[2.5rem] text-3xl sm:text-4xl font-black tracking-tighter text-emerald-900 dark:text-emerald-50 focus:border-emerald-600 outline-none text-center transition-all" placeholder="0.00" autoFocus />
                  <Button onClick={handleTopupSubmit} className="w-full py-5 rounded-2xl sm:rounded-[2rem] text-sm sm:text-base">Submit Request</Button>
               </div>
            </div>
          ) : scanStep === 'REVIEW' && ocrData ? (
             <div className="w-full max-w-sm animate-in slide-in-from-bottom-10 duration-500 overflow-y-auto max-h-[85vh] scrollbar-hide">
                <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] sm:rounded-[3.5rem] p-8 sm:p-10 space-y-6 sm:space-y-8 shadow-2xl relative">
                   <div className="text-center">
                      <h2 className="text-xl sm:text-2xl font-black text-emerald-950 dark:text-emerald-50 tracking-tighter uppercase">Verify Scan</h2>
                   </div>
                   <div className="space-y-4 sm:space-y-5">
                      <div className="space-y-1">
                         <label className="text-[8px] sm:text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-4">Merchant</label>
                         <input value={ocrData.vendor} onChange={e => setOcrData({...ocrData, vendor: e.target.value})} className="w-full px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 rounded-xl sm:rounded-2xl font-bold focus:border-emerald-600 outline-none transition-all text-emerald-950 dark:text-emerald-50 text-sm" placeholder="Vendor" />
                      </div>
                      <div className="space-y-1">
                         <label className="text-[8px] sm:text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-4">Amount (AED)</label>
                         <input type="number" value={ocrData.amount} onChange={e => setOcrData({...ocrData, amount: parseFloat(e.target.value) || 0})} className="w-full px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 rounded-xl sm:rounded-2xl font-bold focus:border-emerald-600 outline-none transition-all text-emerald-950 dark:text-emerald-50 text-sm" placeholder="0.00" />
                      </div>
                      <div className="space-y-1">
                         <label className="text-[8px] sm:text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-4">Payment Method</label>
                         <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setPaymentMode(PaymentMode.CASH)} className={`py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-[9px] sm:text-[10px] uppercase tracking-widest transition-all ${paymentMode === PaymentMode.CASH ? 'bg-emerald-800 text-white shadow-lg' : 'bg-slate-50 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 border border-slate-100 dark:border-zinc-700'}`}>Cash</button>
                            <button onClick={() => setPaymentMode(PaymentMode.CARD)} className={`py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-[9px] sm:text-[10px] uppercase tracking-widest transition-all ${paymentMode === PaymentMode.CARD ? 'bg-emerald-800 text-white shadow-lg' : 'bg-slate-50 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 border border-slate-100 dark:border-zinc-700'}`}>Card</button>
                         </div>
                      </div>
                   </div>
                   <Button onClick={handleExpenseSubmit} className="w-full py-5 rounded-2xl sm:rounded-[2rem] text-sm sm:text-base">Confirm Record</Button>
                </div>
             </div>
          ) : scanStep === 'SUCCESS' ? (
            <div className="text-center animate-in zoom-in-75 duration-300">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_50px_rgba(16,185,129,0.5)]">
                <CheckCircle2 size={40} sm-size={48} className="text-white" />
              </div>
              <p className="text-white text-2xl sm:text-3xl font-black uppercase tracking-tighter">Sync Complete</p>
            </div>
          ) : isProcessing ? (
            <div className="flex flex-col items-center">
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 mb-8 sm:mb-10">
                 <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full" />
                 <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                 <div className="absolute inset-4 sm:inset-6 flex items-center justify-center">
                    <Zap className="text-emerald-500 animate-pulse" size={32} />
                 </div>
              </div>
              <p className="text-emerald-400 font-black uppercase tracking-[0.4em] text-[10px] sm:text-xs">Processing Turbo OCR</p>
            </div>
          ) : null}
        </div>
      )}

      {/* Bottom Nav - Consistent Spacing */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-3xl border-t border-slate-100 dark:border-zinc-800 px-8 py-5 flex justify-around items-center rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.04)] z-[100] pb-8 transition-colors duration-300">
         <button onClick={() => setActiveTab('WORK')} className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'WORK' ? 'text-emerald-900 dark:text-emerald-400 scale-110' : 'text-slate-300 dark:text-zinc-700'}`}>
            <Briefcase size={22} />
            <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${activeTab === 'WORK' ? 'opacity-100' : 'opacity-40'}`}>Site</span>
         </button>
         <button onClick={() => setActiveTab('EXPENSES')} className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'EXPENSES' ? 'text-emerald-900 dark:text-emerald-400 scale-110' : 'text-slate-300 dark:text-zinc-700'}`}>
            <Wallet size={22} />
            <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${activeTab === 'EXPENSES' ? 'opacity-100' : 'opacity-40'}`}>Wallet</span>
         </button>
      </div>
    </div>
  );
};
