
import React, { useState, useMemo } from 'react';
import { User, Transaction, UserRole, TransactionStatus, CompanyStats, PaymentMode } from './types';
import { INITIAL_USERS, INITIAL_TRANSACTIONS } from './constants';
import { AdminView } from './views/AdminView';
import { EmployeeView } from './views/EmployeeView';
import { ChatWidget } from './components/ChatWidget';
import { LogOut, Bell, Key, UserCircle, CheckCircle2, Wallet, Receipt, Trash2 } from 'lucide-react';

const Logo: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Red Gear Outline */}
        <path 
          d="M45,15 L55,15 L55,5 L45,5 Z M70,25 L78,20 L83,28 L75,33 Z M85,45 L95,45 L95,55 L85,55 Z M75,67 L83,72 L78,80 L70,75 Z M55,85 L55,95 L45,95 L45,85 Z M30,75 L22,80 L17,72 L25,67 Z M15,55 L5,55 L5,45 L15,45 Z M25,33 L17,28 L22,20 L30,25 Z" 
          fill="#dc2626" 
        />
        <path 
          d="M50,15 A35,35 0 1,1 15,50 A35,35 0 0,1 50,15" 
          fill="none" 
          stroke="#dc2626" 
          strokeWidth="6" 
          strokeLinecap="round"
        />
        
        {/* Green Welding Torch */}
        <path 
          d="M40,35 L65,30 L66,34 L41,39 Z" 
          fill="#065f46" 
        />
        <circle cx="68" cy="32" r="2" fill="#065f46" />
        <line x1="68" y1="32" x2="75" y2="45" stroke="#065f46" strokeWidth="1" />
        
        {/* Green I-Beam */}
        <path 
          d="M45,48 L85,60 L85,75 L45,63 Z" 
          fill="#065f46" 
        />
        <path 
          d="M45,48 L85,60 L85,64 L45,52 Z" 
          fill="#064e3b" 
        />
        
        {/* Sparks */}
        <path d="M73,43 L77,41 M75,47 L79,49 M71,46 L68,50" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
    <div className="flex flex-col">
      <h1 className="text-xl font-black text-emerald-900 tracking-tighter leading-none">AL SAQR</h1>
      <p className="text-red-600 font-bold text-[8px] tracking-[0.2em] leading-tight">WELDING & BLACKSMITH LLC</p>
    </div>
  </div>
);

interface AppNotification {
  id: string;
  message: string;
  time: string;
  read: boolean;
  type: 'EXPENSE' | 'TOPUP';
}

const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [companyCashPool, setCompanyCashPool] = useState(250000); 
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const companyStats: CompanyStats = useMemo(() => {
    const totalEmployeeOwed = transactions
      .filter(t => t.status === TransactionStatus.PENDING && t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const monthlySpend = transactions
      .filter(t => t.status === TransactionStatus.APPROVED && t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    const pendingApprovals = transactions.filter(t => t.status === TransactionStatus.PENDING).length;

    return {
      totalCash: companyCashPool,
      totalEmployeeOwed,
      monthlySpend,
      pendingApprovals
    };
  }, [transactions, companyCashPool]);

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
      setLoginError('Incorrect credentials. Please try again.');
    }
  };

  const handleAddEmployee = (name: string, balance: number, pass: string) => {
    const newUser: User = {
      id: `u${Date.now()}`,
      name,
      balance,
      password: pass,
      role: UserRole.EMPLOYEE,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
    };
    setUsers(prev => [...prev, newUser]);
  };

  const handleUpdateTransaction = (id: string, status: TransactionStatus) => {
    setTransactions(prev => prev.map(t => {
      if (t.id === id) {
        if (status === TransactionStatus.APPROVED && t.paymentMode === PaymentMode.CASH) {
          updateUserBalance(t.userId, -t.amount);
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
      vendor: t.vendor!,
      amount: t.amount!,
      status: t.status!,
      paymentMode: t.paymentMode!,
      cardLast4: t.cardLast4,
      category: t.category,
      items: t.items,
      type: t.type as 'EXPENSE' | 'TOPUP',
      receiptUrl: t.receiptUrl,
    };
    setTransactions(prev => [newTransaction, ...prev]);
    
    if (newTransaction.type === 'TOPUP') {
      if (newTransaction.status === TransactionStatus.COMPLETED) {
        updateUserBalance(newTransaction.userId, newTransaction.amount);
        setCompanyCashPool(prev => prev - newTransaction.amount);
      }
      const newNotif: AppNotification = {
        id: `n${Date.now()}`,
        message: `${newTransaction.userName} was given ${newTransaction.amount} AED`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false,
        type: 'TOPUP'
      };
      setNotifications(prev => [newNotif, ...prev]);
    } else if (newTransaction.type === 'EXPENSE') {
      const newNotif: AppNotification = {
        id: `n${Date.now()}`,
        message: `${newTransaction.userName} spent ${newTransaction.amount} AED at ${newTransaction.vendor}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false,
        type: 'EXPENSE'
      };
      setNotifications(prev => [newNotif, ...prev]);
    }
  };

  const updateUserBalance = (userId: string, delta: number) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, balance: u.balance + delta } : u));
  };

  const handleTopUp = (userId: string, amount: number) => {
    handleAddTransaction({
      userId,
      userName: users.find(u => u.id === userId)?.name || 'Unknown',
      date: new Date().toISOString().split('T')[0],
      vendor: 'Direct Top-up',
      amount,
      status: TransactionStatus.COMPLETED,
      paymentMode: PaymentMode.CASH,
      type: 'TOPUP'
    });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white p-10 rounded-[48px] shadow-2xl border border-slate-200">
          <div className="flex flex-col items-center mb-10">
            <Logo className="mb-4 scale-125" />
            <div className="h-0.5 w-12 bg-red-600 rounded-full mb-4"></div>
            <h2 className="text-2xl font-black text-emerald-900 tracking-tighter uppercase leading-none">EXPENSE PORTAL</h2>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Username / Name</label>
              <div className="relative">
                <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="e.g. Admin or jahed"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-700 transition-all font-bold text-slate-800 outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Secure Password</label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-700 transition-all font-bold text-slate-800 outline-none"
                  required
                />
              </div>
            </div>

            {loginError && <p className="text-red-600 text-[11px] font-black text-center bg-red-50 p-3 rounded-xl border border-red-100 uppercase tracking-tight">{loginError}</p>}

            <button 
              type="submit"
              className="w-full bg-emerald-800 hover:bg-emerald-900 text-white py-5 rounded-2xl font-black text-lg transition-all active:scale-[0.98] shadow-xl shadow-emerald-900/20 uppercase tracking-widest"
            >
              Enter Portal
            </button>
          </form>

          <div className="mt-12 text-center border-t border-slate-100 pt-6">
            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.2em]">Secure Access Controlled</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Logo />

          <div className="flex items-center gap-6">
            {currentUser.role === UserRole.ADMIN && (
              <div className="relative">
                <button 
                  onClick={() => setShowNotifMenu(!showNotifMenu)}
                  className={`relative p-2 rounded-full transition-colors ${showNotifMenu ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-red-600'}`}
                >
                  <Bell size={22} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
                
                {showNotifMenu && (
                  <div className="absolute right-0 mt-4 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                      <h3 className="font-black text-emerald-900 uppercase text-[10px] tracking-widest">Recent Activity</h3>
                      <button 
                        onClick={() => {
                          setNotifications([]);
                          setShowNotifMenu(false);
                        }}
                        className="text-[9px] font-black text-red-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                      >
                        <Trash2 size={10} /> Clear All
                      </button>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
                      {notifications.length === 0 ? (
                        <div className="p-10 text-center">
                          <CheckCircle2 size={32} className="mx-auto text-slate-200 mb-2" />
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No New Alerts</p>
                        </div>
                      ) : (
                        notifications.map(n => (
                          <div 
                            key={n.id} 
                            onClick={() => setNotifications(prev => prev.map(p => p.id === n.id ? {...p, read: true} : p))}
                            className={`p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer flex gap-3 ${n.read ? 'opacity-60' : ''}`}
                          >
                            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${n.type === 'TOPUP' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                              {n.type === 'TOPUP' ? <Wallet size={14} /> : <Receipt size={14} />}
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-bold text-slate-800 leading-tight">{n.message}</p>
                              <p className="text-[9px] font-black text-slate-400 uppercase mt-1 tracking-widest">{n.time}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center gap-4 pl-6 border-l border-slate-100">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-emerald-900">{currentUser.name}</p>
                <p className="text-[10px] text-red-600 font-bold uppercase tracking-widest">{currentUser.role} ACCESS</p>
              </div>
              <button onClick={() => setCurrentUser(null)} className="p-2 text-slate-400 hover:text-red-600 transition-colors">
                <LogOut size={22} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="pb-20">
        {currentUser.role === UserRole.ADMIN ? (
          <AdminView 
            users={users} 
            transactions={transactions} 
            stats={companyStats}
            onUpdateTransaction={handleUpdateTransaction}
            onTopUp={handleTopUp}
            onAddEmployee={handleAddEmployee}
          />
        ) : (
          <EmployeeView 
            user={currentUser} 
            transactions={transactions}
            onAddTransaction={handleAddTransaction}
          />
        )}
      </main>

      <ChatWidget />
    </div>
  );
};

export default App;
