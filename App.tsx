
import React, { useState, useMemo, useEffect } from 'react';
import { User, Transaction, TransactionStatus, UserRole, CompanyStats, PaymentMode, AttendanceRecord } from './types';
import { INITIAL_USERS, INITIAL_TRANSACTIONS, INITIAL_ATTENDANCE } from './constants';
import { AdminView } from './views/AdminView';
import { EmployeeView } from './views/EmployeeView';
import { ChatWidget } from './components/ChatWidget';
import { LogOut, Bell, Key, UserCircle, CheckCircle2, Wallet, Receipt, Trash2, ShieldCheck, Activity, Sun, Moon } from 'lucide-react';

const Logo: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`flex items-center gap-4 ${className}`}>
    <div className="relative w-14 h-14 shrink-0 flex items-center justify-center bg-emerald-950 rounded-2xl shadow-xl dark:shadow-emerald-900/10">
      <svg viewBox="0 0 100 100" className="w-8 h-8">
        <path d="M45,15 L55,15 L55,5 L45,5 Z M70,25 L78,20 L83,28 L75,33 Z M85,45 L95,45 L95,55 L85,55 Z M75,67 L83,72 L78,80 L70,75 Z M55,85 L55,95 L45,95 L45,85 Z M30,75 L22,80 L17,72 L25,67 Z M15,55 L5,55 L5,45 L15,45 Z M25,33 L17,28 L22,20 L30,25 Z" fill="#dc2626" />
        <path d="M50,15 A35,35 0 1,1 15,50 A35,35 0 0,1 50,15" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" />
      </svg>
    </div>
    <div className="flex flex-col">
      <h1 className="text-xl font-black text-emerald-950 dark:text-emerald-50 tracking-tighter leading-none">AL SAQR</h1>
      <p className="text-red-600 font-bold text-[7px] tracking-[0.3em] leading-tight mt-1">INDUSTRIAL WELDING</p>
    </div>
  </div>
);

const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [viewingUserAsAdmin, setViewingUserAsAdmin] = useState<User | null>(null);
  const [companyCashPool, setCompanyCashPool] = useState(250000); 
  
  // Persistent Theme Logic
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const companyStats: CompanyStats = useMemo(() => {
    const totalEmployeeOwed = transactions
      .filter(t => t.status === TransactionStatus.PENDING && t.type === 'EXPENSE')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const monthlySpend = transactions
      .filter(t => t.status === TransactionStatus.APPROVED && t.type === 'EXPENSE')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const pendingApprovals = transactions.filter(t => t.status === TransactionStatus.PENDING).length;

    const basePayroll = users.reduce((sum, u) => sum + (u.baseSalary || 0), 0);
    const otPayroll = attendance
      .filter(a => a.status === 'APPROVED')
      .reduce((sum, a) => {
        const user = users.find(u => u.id === a.userId);
        return sum + ((a.overtimeHours || 0) * (user?.otRate || 0));
      }, 0);

    return {
      totalCash: companyCashPool,
      totalEmployeeOwed,
      monthlySpend,
      pendingApprovals,
      monthlyPayrollEstimate: basePayroll + otPayroll
    };
  }, [transactions, companyCashPool, users, attendance]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => 
      (u.name.toLowerCase() === loginId.toLowerCase()) && 
      (u.password === password)
    );
    if (user) {
      setCurrentUser(user);
      setLoginError('');
      setPassword('');
      setLoginId('');
    } else {
      setLoginError('Authentication Failed. Check credentials.');
    }
  };

  const handlePunchIn = () => {
    const userToEffect = viewingUserAsAdmin || currentUser;
    if (!userToEffect) return;
    
    navigator.geolocation.getCurrentPosition((pos) => {
      const newRecord: AttendanceRecord = {
        id: `a${Date.now()}`,
        userId: userToEffect.id,
        date: new Date().toISOString().split('T')[0],
        checkIn: new Date().toISOString(),
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        totalHours: 0,
        overtimeHours: 0,
        status: 'PENDING_APPROVAL'
      };
      setAttendance(prev => [...prev, newRecord]);
      setUsers(prev => prev.map(u => u.id === userToEffect.id ? { ...u, activeShiftId: newRecord.id } : u));
      if (!viewingUserAsAdmin) {
        setCurrentUser(prev => prev ? { ...prev, activeShiftId: newRecord.id } : null);
      } else {
        setViewingUserAsAdmin(prev => prev ? { ...prev, activeShiftId: newRecord.id } : null);
      }
    }, (err) => {
      alert("Terminal access requires location verification.");
    });
  };

  const handlePunchOut = () => {
    const userToEffect = viewingUserAsAdmin || currentUser;
    if (!userToEffect || !userToEffect.activeShiftId) return;
    const now = new Date();
    setAttendance(prev => prev.map(a => {
      if (a.id === userToEffect.activeShiftId) {
        const checkInTime = new Date(a.checkIn);
        const diffMs = now.getTime() - checkInTime.getTime();
        const totalHours = Math.max(0, diffMs / (1000 * 60 * 60));
        const overtimeHours = Math.max(0, totalHours - 8);
        return { ...a, checkOut: now.toISOString(), totalHours, overtimeHours, status: 'PENDING_APPROVAL' };
      }
      return a;
    }));
    setUsers(prev => prev.map(u => u.id === userToEffect.id ? { ...u, activeShiftId: undefined } : u));
    if (!viewingUserAsAdmin) {
      setCurrentUser(prev => prev ? { ...prev, activeShiftId: undefined } : null);
    } else {
      setViewingUserAsAdmin(prev => prev ? { ...prev, activeShiftId: undefined } : null);
    }
  };

  const handleUpdateTransaction = (id: string, status: TransactionStatus) => {
    setTransactions(prev => prev.map(t => {
      if (t.id === id) {
        if (status === TransactionStatus.APPROVED) {
          if (t.type === 'TOPUP') {
            updateUserBalance(t.userId, t.amount);
          } else if (t.type === 'EXPENSE' && t.paymentMode === PaymentMode.CASH) {
            updateUserBalance(t.userId, -t.amount);
          }
        }
        return { ...t, status };
      }
      return t;
    }));
  };

  const handleAddTransaction = (t: Partial<Transaction>) => {
    const newTransaction: Transaction = {
      id: `t${Date.now()}`,
      userId: t.userId!,
      userName: t.userName!,
      date: t.date!,
      vendor: t.vendor || 'Manual Ledger Entry',
      amount: t.amount || 0,
      status: t.status!,
      paymentMode: t.paymentMode || PaymentMode.CASH,
      cardLast4: t.cardLast4,
      category: t.category || 'Others',
      items: t.items || [],
      type: t.type as 'EXPENSE' | 'TOPUP',
      receiptUrl: t.receiptUrl,
    };
    setTransactions(prev => [newTransaction, ...prev]);
  };

  const updateUserBalance = (userId: string, delta: number) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, balance: (u.balance || 0) + delta } : u));
    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, balance: (prev.balance || 0) + delta } : null);
    }
    if (viewingUserAsAdmin?.id === userId) {
      setViewingUserAsAdmin(prev => prev ? { ...prev, balance: (prev.balance || 0) + delta } : null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans selection:bg-emerald-100 selection:text-emerald-900 transition-colors duration-300">
      {!currentUser ? (
        <div className="min-h-screen bg-slate-100 dark:bg-[#0a0f0d] flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-500">
          {/* Theme Toggle on Sign In Interface */}
          <div className="absolute top-6 right-8 z-20">
            <button 
              onClick={toggleTheme}
              className="w-12 h-12 rounded-2xl bg-white/10 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 dark:text-white/50 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-white/10 transition-all active:scale-90 shadow-xl backdrop-blur-md"
              aria-label="Toggle Theme"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>

          <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[50%] bg-emerald-900/10 dark:bg-emerald-900/20 blur-[120px] rounded-full" />
          
          <div className="max-w-md w-full bg-white dark:bg-white/5 backdrop-blur-2xl p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[3.5rem] shadow-2xl border border-slate-200 dark:border-white/10 relative z-10 animate-in fade-in zoom-in-95 duration-700">
            <div className="flex flex-col items-center mb-8 sm:mb-12">
              <Logo className="mb-6 scale-110" />
              <h2 className="text-xl sm:text-2xl font-black text-emerald-950 dark:text-white tracking-tighter uppercase">PORTAL ACCESS</h2>
            </div>
            
            {loginError && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 px-4 py-3 rounded-2xl mb-6 flex items-center gap-3">
                <ShieldCheck className="text-red-500 shrink-0" size={16} />
                <p className="text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest">{loginError}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6">
              <div className="relative group">
                <UserCircle className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 dark:text-white/20 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 transition-colors" size={20} />
                <input 
                  type="text" 
                  value={loginId} 
                  onChange={(e) => setLoginId(e.target.value)} 
                  placeholder="Employee Name" 
                  className="w-full pl-14 pr-6 py-4 sm:py-5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl focus:border-emerald-500/50 dark:focus:border-emerald-500/50 outline-none text-emerald-950 dark:text-white font-bold transition-all placeholder:text-slate-300 dark:placeholder:text-white/10" 
                  required 
                />
              </div>
              <div className="relative group">
                <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 dark:text-white/20 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 transition-colors" size={20} />
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="Access Code" 
                  className="w-full pl-14 pr-6 py-4 sm:py-5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl focus:border-emerald-500/50 dark:focus:border-emerald-500/50 outline-none text-emerald-950 dark:text-white font-bold transition-all placeholder:text-slate-300 dark:placeholder:text-white/10" 
                  required 
                />
              </div>
              <button 
                type="submit" 
                className="w-full bg-emerald-900 dark:bg-emerald-600 hover:bg-emerald-950 dark:hover:bg-emerald-500 text-white py-5 sm:py-6 rounded-3xl font-black text-base sm:text-lg shadow-2xl shadow-emerald-900/20 transition-all active:scale-[0.98] uppercase tracking-[0.2em]"
              >
                Enter Terminal
              </button>
            </form>
          </div>
        </div>
      ) : (
        <>
          <nav className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-zinc-800 px-6 sm:px-8 py-4 sm:py-5 transition-colors duration-300">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <Logo />
              <div className="flex items-center gap-4 sm:gap-8">
                {/* Persistent Toggle in Nav Bar */}
                <button 
                  onClick={toggleTheme}
                  className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all active:scale-90"
                  aria-label="Toggle Theme"
                >
                  {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <div className="flex items-center gap-4 sm:gap-6 pl-4 sm:pl-8 border-l border-slate-200 dark:border-zinc-800">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-black text-emerald-950 dark:text-emerald-50 tracking-tighter uppercase">{currentUser.name}</p>
                    <p className="text-[9px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-widest">{currentUser.role} ACCESS</p>
                  </div>
                  <button onClick={() => setCurrentUser(null)} className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 flex items-center justify-center text-slate-400 dark:text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all active:scale-95">
                    <LogOut size={20} />
                  </button>
                </div>
              </div>
            </div>
          </nav>
          
          <main className="pb-24">
            {currentUser.role === UserRole.ADMIN && !viewingUserAsAdmin ? (
              <AdminView 
                users={users} 
                transactions={transactions} 
                attendance={attendance}
                stats={companyStats}
                onUpdateTransaction={handleUpdateTransaction}
                onUpdateAttendance={(id, status) => setAttendance(prev => prev.map(a => a.id === id ? {...a, status} : a))}
                onAddEmployee={(name, bal, pass, salary, otRate) => setUsers(prev => [...prev, { 
                  id: `u${Date.now()}`, 
                  name, 
                  balance: bal || 0, 
                  password: pass, 
                  role: UserRole.EMPLOYEE, 
                  baseSalary: salary || 3000, 
                  otRate: otRate || 20,       
                  avatar: `https://ui-avatars.com/api/?name=${name}&background=random`
                }])}
                onUpdateEmployee={(id, updates) => setUsers(prev => prev.map(u => u.id === id ? {...u, ...updates} : u))}
                onViewAsEmployee={(u) => setViewingUserAsAdmin(u)}
              />
            ) : (
              <EmployeeView 
                user={viewingUserAsAdmin || currentUser} 
                transactions={transactions}
                attendance={attendance}
                onAddTransaction={handleAddTransaction}
                onPunchIn={handlePunchIn}
                onPunchOut={handlePunchOut}
                isAdminViewing={!!viewingUserAsAdmin}
                onClosePreview={() => setViewingUserAsAdmin(null)}
              />
            )}
          </main>
          <ChatWidget />
        </>
      )}
    </div>
  );
};

export default App;
