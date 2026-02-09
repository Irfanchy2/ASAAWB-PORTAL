
import React, { useState, useMemo } from 'react';
import { 
  Users, DollarSign, Clock, BarChart3, CheckCircle2, XCircle, 
  Download, Search, Receipt, Wallet, Plus, Filter, 
  ChevronDown, ChevronUp, CreditCard, ChevronLeft, ChevronRight, 
  ShieldAlert, Key, List, FileSpreadsheet, FileCode, Edit3, 
  CheckSquare, Square, AlertTriangle, Zap, Calendar, Briefcase, 
  TrendingUp, MapPin, Printer, CreditCard as CardIcon, LayoutGrid, X,
  Check, Trash2, ArrowUpCircle, Info, ExternalLink, Eye, ImageIcon, FileText,
  UserPlus, Settings2, Menu, ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { User, Transaction, TransactionStatus, CompanyStats, UserRole, PaymentMode, AttendanceRecord } from '../types';
import { CATEGORIES } from '../constants';

interface AdminViewProps {
  users: User[];
  transactions: Transaction[];
  attendance: AttendanceRecord[];
  stats: CompanyStats;
  onUpdateTransaction: (id: string, status: TransactionStatus) => void;
  onUpdateAttendance: (id: string, status: AttendanceRecord['status']) => void;
  onAddEmployee: (name: string, balance: number, pass: string, salary: number, otRate: number) => void;
  onUpdateEmployee: (id: string, updates: Partial<User>) => void;
  onViewAsEmployee: (user: User) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ 
  users, transactions, attendance, stats, 
  onUpdateTransaction, onUpdateAttendance, onAddEmployee, onUpdateEmployee,
  onViewAsEmployee
}) => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'APPROVALS' | 'RECORDS' | 'EMPLOYEES' | 'PAYROLL'>('DASHBOARD');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [expandedTxIds, setExpandedTxIds] = useState<string[]>([]);

  // Form states
  const [formName, setFormName] = useState('');
  const [formBalance, setFormBalance] = useState<number>(0);
  const [formPassword, setFormPassword] = useState('');
  const [formSalary, setFormSalary] = useState<number>(3000);
  const [formOTRate, setFormOTRate] = useState<number>(20);

  const pendingTransactions = useMemo(() => 
    transactions.filter(t => t.status === TransactionStatus.PENDING),
    [transactions]
  );

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.role === UserRole.EMPLOYEE && 
      u.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  const filteredRecords = useMemo(() => {
    return transactions.filter(t => 
      t.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.userName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [transactions, searchQuery]);

  const payrollData = useMemo(() => {
    return users.filter(u => u.role === UserRole.EMPLOYEE).map(u => {
      const userAttendance = attendance.filter(a => a.userId === u.id && new Date(a.date).getMonth() === selectedMonth);
      const otHours = userAttendance.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);
      const otPay = otHours * (u.otRate || 0);
      
      const reimbursements = transactions.filter(t => 
        t.userId === u.id && 
        t.status === TransactionStatus.APPROVED && 
        t.type === 'EXPENSE' && 
        t.paymentMode === PaymentMode.CARD &&
        new Date(t.date).getMonth() === selectedMonth
      ).reduce((sum, t) => sum + (t.amount || 0), 0);

      const cashAdvances = transactions.filter(t => 
        t.userId === u.id && 
        t.type === 'TOPUP' && 
        t.status === TransactionStatus.APPROVED &&
        new Date(t.date).getMonth() === selectedMonth
      ).reduce((sum, t) => sum + (t.amount || 0), 0);

      const netPay = ((u.baseSalary || 0) + otPay + reimbursements) - cashAdvances;

      return {
        ...u,
        otHours,
        otPay,
        reimbursements,
        cashAdvances,
        netPay: netPay < 0 ? 0 : netPay
      };
    });
  }, [users, attendance, transactions, selectedMonth]);

  const handleOpenAdd = () => {
    setFormName('');
    setFormBalance(0);
    setFormPassword('');
    setFormSalary(3000);
    setFormOTRate(20);
    setIsAddingUser(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormBalance(user.balance || 0);
    setFormPassword(user.password || '');
    setFormSalary(user.baseSalary || 0);
    setFormOTRate(user.otRate || 0);
  };

  const handleSaveEdit = () => {
    if (editingUser) {
      onUpdateEmployee(editingUser.id, {
        name: formName,
        balance: formBalance,
        password: formPassword,
        baseSalary: formSalary,
        otRate: formOTRate
      });
      setEditingUser(null);
    }
  };

  const handleAddUser = () => {
    if (!formName.trim()) return;
    onAddEmployee(formName, formBalance, formPassword, formSalary, formOTRate);
    setIsAddingUser(false);
  };

  const exportTallyPayroll = () => {
    const headers = ['Employee Name', 'Base Salary', 'OT Pay', 'Reimbursements', 'Deductions', 'Net Pay'];
    const rows = payrollData.map(p => [p.name, p.baseSalary, p.otPay, p.reimbursements, p.cashAdvances, p.netPay]);
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `AlSaqr_Payroll_${selectedMonth + 1}.csv`);
    link.click();
  };

  const toggleTxSelection = (id: string) => {
    setSelectedTxIds(prev => prev.includes(id) ? prev.filter(txId => txId !== id) : [...prev, id]);
  };

  const toggleTxExpansion = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTxIds(prev => prev.includes(id) ? prev.filter(txId => txId !== id) : [...prev, id]);
  };

  const handleBulkAction = (status: TransactionStatus) => {
    selectedTxIds.forEach(id => onUpdateTransaction(id, status));
    setSelectedTxIds([]);
  };

  const toggleSelectAll = () => {
    if (selectedTxIds.length === pendingTransactions.length) {
      setSelectedTxIds([]);
    } else {
      setSelectedTxIds(pendingTransactions.map(t => t.id));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-10 space-y-6 sm:space-y-10 animate-in fade-in duration-700">
      {/* Header & Tabs */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <div className="w-8 h-8 bg-emerald-900 rounded-xl flex items-center justify-center text-white shrink-0">
                <LayoutGrid size={18} />
             </div>
             <h1 className="text-2xl sm:text-3xl font-black text-emerald-950 dark:text-emerald-50 tracking-tighter uppercase">CONTROL HUB</h1>
          </div>
          <p className="text-slate-400 dark:text-zinc-500 font-bold text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] ml-11">Enterprise Finance Engine v4.0</p>
        </div>
        
        {/* Responsive Tab Switcher */}
        <div className="w-full lg:w-auto flex gap-1 bg-white dark:bg-zinc-900 p-1 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-x-auto scrollbar-hide">
          {(['DASHBOARD', 'APPROVALS', 'RECORDS', 'EMPLOYEES', 'PAYROLL'] as const).map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)} 
              className={`whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab ? 'bg-emerald-900 text-white shadow-md' : 'text-slate-400 dark:text-zinc-500 hover:text-emerald-900 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-zinc-800'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'DASHBOARD' && (
        <div className="space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <Card className="bg-gradient-to-br from-emerald-900 to-emerald-950 text-white border-none relative overflow-hidden p-6 sm:p-8">
              <div className="absolute top-0 right-0 p-4 opacity-5 translate-x-4 -translate-y-4">
                 <DollarSign size={100} />
              </div>
              <div className="relative z-10">
                 <div className="bg-white/10 w-10 h-10 rounded-xl flex items-center justify-center mb-6">
                    <DollarSign size={20} className="text-emerald-300" />
                 </div>
                 <h3 className="text-2xl sm:text-3xl font-black tracking-tight mb-1">{stats.totalCash.toLocaleString()} <span className="text-xs sm:text-sm font-medium opacity-40">AED</span></h3>
                 <p className="text-[9px] sm:text-[10px] uppercase font-bold text-emerald-300/60 tracking-[0.2em]">Liquid Assets</p>
              </div>
            </Card>
            <Card className="border-none shadow-xl group hover:border-red-100 dark:hover:border-red-900/30 border border-transparent p-6 sm:p-8">
               <div className="bg-red-50 dark:bg-red-950/20 w-10 h-10 rounded-xl flex items-center justify-center mb-6 text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all">
                  <Clock size={20} />
               </div>
               <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-950 dark:text-emerald-50 mb-1">{stats.pendingApprovals}</h3>
               <p className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-[0.2em]">Awaiting Verification</p>
            </Card>
            <Card className="border-none shadow-xl p-6 sm:p-8">
               <div className="bg-emerald-50 dark:bg-emerald-950/20 w-10 h-10 rounded-xl flex items-center justify-center mb-6 text-emerald-700 dark:text-emerald-400">
                  <Briefcase size={20} />
               </div>
               <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-950 dark:text-emerald-50 mb-1">{stats.monthlyPayrollEstimate.toLocaleString()} <span className="text-xs sm:text-sm font-medium opacity-40">AED</span></h3>
               <p className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-[0.2em]">Payroll Liability</p>
            </Card>
            <Card className="border-none shadow-xl p-6 sm:p-8">
               <div className="bg-slate-50 dark:bg-zinc-800 w-10 h-10 rounded-xl flex items-center justify-center mb-6 text-slate-600 dark:text-zinc-400">
                  <Users size={20} />
               </div>
               <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-950 dark:text-emerald-50 mb-1">{users.length - 1}</h3>
               <p className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-[0.2em]">Personnel Count</p>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'RECORDS' && (
        <div className="space-y-6 sm:space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-emerald-950 dark:text-emerald-50 tracking-tighter uppercase">Global Ledger</h2>
                <p className="text-slate-400 dark:text-zinc-500 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] mt-1">Transaction History & Verification</p>
              </div>
              <div className="relative w-full md:w-80 lg:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" size={16} />
                <input 
                  type="text" 
                  placeholder="Search vendor or employee..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-6 py-3.5 sm:py-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl font-bold focus:border-emerald-500 outline-none shadow-sm transition-all text-sm text-emerald-950 dark:text-emerald-50"
                />
              </div>
           </div>

           <Card className="p-0 overflow-hidden shadow-2xl border-none bg-white dark:bg-zinc-900 rounded-[1.5rem] sm:rounded-[2rem]">
              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full text-left min-w-[700px]">
                  <thead className="bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-100 dark:border-zinc-800">
                    <tr>
                      <th className="px-6 sm:px-8 py-5 sm:py-6 text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Type</th>
                      <th className="px-6 sm:px-8 py-5 sm:py-6 text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Transaction Info</th>
                      <th className="px-6 sm:px-8 py-5 sm:py-6 text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Receipt</th>
                      <th className="px-6 sm:px-8 py-5 sm:py-6 text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Amount</th>
                      <th className="px-6 sm:px-8 py-5 sm:py-6 text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-zinc-800">
                    {filteredRecords.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="px-6 sm:px-8 py-5 sm:py-6">
                           <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${t.type === 'TOPUP' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500'}`}>
                              {t.type === 'TOPUP' ? <ArrowUpCircle size={18} /> : <Receipt size={18} />}
                           </div>
                        </td>
                        <td className="px-6 sm:px-8 py-5 sm:py-6">
                          <div className="min-w-[150px]">
                            <p className="font-black text-emerald-950 dark:text-emerald-50 uppercase tracking-tight text-sm">{t.vendor}</p>
                            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">{t.userName} • {t.date}</p>
                          </div>
                        </td>
                        <td className="px-6 sm:px-8 py-5 sm:py-6">
                           {t.receiptUrl ? (
                             <div 
                                onClick={() => setViewingImage(t.receiptUrl!)}
                                className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 shadow-sm cursor-pointer group"
                             >
                                <img src={t.receiptUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt="receipt" />
                                <div className="absolute inset-0 bg-emerald-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                   <Eye size={16} className="text-white" />
                                </div>
                             </div>
                           ) : (
                             <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-800 flex items-center justify-center text-slate-200 dark:text-zinc-700">
                                <ImageIcon size={20} />
                             </div>
                           )}
                        </td>
                        <td className="px-6 sm:px-8 py-5 sm:py-6">
                           <p className="font-black text-emerald-950 dark:text-emerald-50 text-base sm:text-lg tabular-nums whitespace-nowrap">
                              {t.amount.toLocaleString()}
                              <span className="text-[9px] sm:text-[10px] font-medium opacity-30 ml-1">AED</span>
                           </p>
                        </td>
                        <td className="px-6 sm:px-8 py-5 sm:py-6">
                           <span className={`px-2.5 py-1 rounded-full text-[7px] sm:text-[8px] font-black uppercase tracking-widest inline-block whitespace-nowrap ${
                             t.status === TransactionStatus.APPROVED ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' :
                             t.status === TransactionStatus.REJECTED ? 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400' :
                             'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                           }`}>
                             {t.status}
                           </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
           </Card>
        </div>
      )}

      {activeTab === 'EMPLOYEES' && (
        <div className="space-y-6 sm:space-y-8 animate-in slide-in-from-bottom-4 duration-500">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-emerald-950 dark:text-emerald-50 tracking-tighter uppercase">Personnel Directory</h2>
                <p className="text-slate-400 dark:text-zinc-500 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] mt-1">Managed Workforce Records</p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
                 <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search credentials..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-11 pr-6 py-3 sm:py-3.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-emerald-950 dark:text-emerald-50"
                    />
                 </div>
                 <Button onClick={handleOpenAdd} className="h-11 sm:h-12 px-6">
                    <Plus size={16} /> Deploy New Staff
                 </Button>
              </div>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredUsers.map(u => (
                <Card key={u.id} className="p-6 sm:p-8 border-none shadow-xl group hover:border-emerald-100 dark:hover:border-emerald-900/40 border transition-all relative rounded-[1.5rem] sm:rounded-[2rem]">
                   <div className="flex items-center gap-4 sm:gap-5 mb-6 sm:mb-8">
                      <div className="relative shrink-0">
                         <img src={u.avatar} className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl shadow-md grayscale group-hover:grayscale-0 transition-all" alt={u.name} />
                         <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 border-white dark:border-zinc-900 ${u.activeShiftId ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-zinc-700'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                         <h4 className="text-lg sm:text-xl font-black text-emerald-950 dark:text-emerald-50 uppercase tracking-tight truncate">{u.name}</h4>
                         <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest truncate">{u.role} • 0x{u.id}</p>
                      </div>
                      <button 
                        onClick={() => onViewAsEmployee(u)}
                        className="p-2.5 sm:p-3 bg-slate-50 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-xl transition-all"
                        title="Open Employee Portal"
                      >
                         <ExternalLink size={18} />
                      </button>
                   </div>

                   <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
                      <div className="bg-slate-50 dark:bg-zinc-800 p-3 sm:p-4 rounded-2xl">
                         <p className="text-[8px] sm:text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Wallet</p>
                         <p className="text-base sm:text-lg font-black text-emerald-950 dark:text-emerald-50 tabular-nums">{(u.balance || 0).toFixed(2)}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-zinc-800 p-3 sm:p-4 rounded-2xl">
                         <p className="text-[8px] sm:text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Base</p>
                         <p className="text-base sm:text-lg font-black text-emerald-950 dark:text-emerald-50 tabular-nums">{(u.baseSalary || 0).toLocaleString()}</p>
                      </div>
                   </div>

                   <button 
                    onClick={() => handleOpenEdit(u)}
                    className="w-full flex items-center justify-center gap-2 py-3.5 sm:py-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all active:scale-[0.98]"
                   >
                      <Edit3 size={16} /> Edit Profile
                   </button>
                </Card>
              ))}
           </div>
        </div>
      )}

      {activeTab === 'PAYROLL' && (
        <div className="space-y-6 sm:space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-emerald-950 dark:text-emerald-50 tracking-tighter uppercase">Payroll Ledger</h2>
                <p className="text-slate-400 dark:text-zinc-500 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] mt-1">Verification Phase 3/3</p>
              </div>
              <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                 <button 
                  onClick={() => window.print()}
                  className="flex-1 sm:flex-none px-4 sm:px-6 h-11 sm:h-12 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-zinc-400 flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all shadow-sm"
                 >
                    <Printer size={16} /> Print
                 </button>
                 <Button onClick={exportTallyPayroll} className="flex-1 sm:flex-none h-11 sm:h-12 px-6 sm:px-8">
                    <FileCode size={16} /> Export
                 </Button>
              </div>
           </div>

           <Card className="p-0 overflow-hidden shadow-2xl border-none rounded-[1.5rem] sm:rounded-[2.5rem] bg-white dark:bg-zinc-900">
              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full text-left min-w-[800px]">
                   <thead className="bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-100 dark:border-zinc-800">
                      <tr>
                         <th className="px-6 sm:px-10 py-6 sm:py-8 text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Member</th>
                         <th className="px-6 sm:px-10 py-6 sm:py-8 text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Base Rate</th>
                         <th className="px-6 sm:px-10 py-6 sm:py-8 text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">OT Comp</th>
                         <th className="px-6 sm:px-10 py-6 sm:py-8 text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Refunds</th>
                         <th className="px-6 sm:px-10 py-6 sm:py-8 text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Deductions</th>
                         <th className="px-6 sm:px-10 py-6 sm:py-8 text-[10px] font-black text-emerald-950 dark:text-emerald-50 uppercase tracking-[0.2em] text-right">Net Liquidation</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50 dark:divide-zinc-800">
                      {payrollData.length === 0 ? (
                        <tr><td colSpan={6} className="py-20 text-center text-slate-400 dark:text-zinc-600 font-black uppercase tracking-widest">No Active Records</td></tr>
                      ) : payrollData.map(p => (
                        <tr key={p.id} className="hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 transition-colors group">
                          <td className="px-6 sm:px-10 py-5 sm:py-6">
                             <div className="flex items-center gap-3 sm:gap-4 min-w-[150px]">
                                <img src={p.avatar} className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl grayscale group-hover:grayscale-0 transition-all shrink-0" alt={p.name} />
                                <span className="font-black text-emerald-950 dark:text-emerald-50 uppercase tracking-tight text-sm">{p.name}</span>
                             </div>
                          </td>
                          <td className="px-6 sm:px-10 py-5 sm:py-6 font-bold text-slate-500 dark:text-zinc-500 tabular-nums">{p.baseSalary.toLocaleString()}</td>
                          <td className="px-6 sm:px-10 py-5 sm:py-6">
                             <div className="flex flex-col">
                                <span className="font-bold text-emerald-700 dark:text-emerald-400">+{p.otPay.toLocaleString()}</span>
                                <span className="text-[8px] sm:text-[9px] opacity-40 font-black uppercase">{p.otHours.toFixed(1)}H Logged</span>
                             </div>
                          </td>
                          <td className="px-6 sm:px-10 py-5 sm:py-6 font-bold text-emerald-700 dark:text-emerald-400">+{p.reimbursements.toLocaleString()}</td>
                          <td className="px-6 sm:px-10 py-5 sm:py-6 font-bold text-red-500 dark:text-red-400">-{p.cashAdvances.toLocaleString()}</td>
                          <td className="px-6 sm:px-10 py-5 sm:py-6 text-right">
                             <span className="text-lg sm:text-xl font-black text-emerald-950 dark:text-emerald-50 tracking-tighter tabular-nums">{p.netPay.toLocaleString()} <span className="text-[9px] sm:text-[10px] font-medium opacity-30">AED</span></span>
                          </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
              </div>
           </Card>
        </div>
      )}

      {activeTab === 'APPROVALS' && (
        <div className="space-y-6 sm:space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-32 px-1">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
             <div>
                <h2 className="text-2xl sm:text-3xl font-black text-emerald-950 dark:text-emerald-50 uppercase tracking-tighter">FINANCE VERIFICATION</h2>
                <div className="flex items-center gap-3 sm:gap-4 mt-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-100 dark:border-amber-900/30">
                        <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400" />
                        <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Audit Required • {pendingTransactions.length}</span>
                    </div>
                </div>
             </div>
             {pendingTransactions.length > 0 && (
                <button onClick={toggleSelectAll} className="w-full sm:w-auto px-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-400 flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all shadow-sm">
                   {selectedTxIds.length === pendingTransactions.length ? <CheckSquare size={16} className="text-emerald-600" /> : <Square size={16} />}
                   {selectedTxIds.length === pendingTransactions.length ? 'Clear Selection' : 'Select All Pending'}
                </button>
             )}
           </div>

           {selectedTxIds.length > 0 && (
             <div className="fixed bottom-6 sm:bottom-10 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[160] bg-emerald-950 text-white dark:bg-zinc-950 px-6 sm:px-10 py-5 sm:py-6 rounded-2xl sm:rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.4)] flex flex-col sm:flex-row items-center gap-4 sm:gap-6 animate-in slide-in-from-bottom-20 duration-500 border border-emerald-900 dark:border-zinc-800">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-500 rounded-full flex items-center justify-center text-emerald-950 font-black shrink-0">
                    {selectedTxIds.length}
                  </div>
                  <span className="text-[11px] sm:text-sm font-black uppercase tracking-widest">Batch Actions Active</span>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                   <button onClick={() => handleBulkAction(TransactionStatus.APPROVED)} className="flex-1 sm:flex-none px-6 sm:px-8 py-3.5 sm:py-4 bg-emerald-500 text-emerald-950 rounded-xl sm:rounded-2xl font-black uppercase text-[9px] sm:text-[10px] tracking-widest hover:bg-emerald-400 transition-all active:scale-95 shadow-lg">Approve</button>
                   <button onClick={() => handleBulkAction(TransactionStatus.REJECTED)} className="flex-1 sm:flex-none px-6 sm:px-8 py-3.5 sm:py-4 bg-red-600 text-white rounded-xl sm:rounded-2xl font-black uppercase text-[9px] sm:text-[10px] tracking-widest hover:bg-red-500 transition-all active:scale-95 shadow-lg">Reject</button>
                </div>
             </div>
           )}
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 relative pb-20">
              {pendingTransactions.length === 0 ? (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-300 dark:text-zinc-800">
                   <CheckCircle2 size={64} className="mb-4 opacity-20" />
                   <p className="font-black uppercase tracking-widest text-xs sm:text-sm">All Clear</p>
                </div>
              ) : pendingTransactions.map(t => (
                <Card 
                  key={t.id} 
                  onClick={() => toggleTxSelection(t.id)} 
                  className={`p-6 sm:p-8 border-2 transition-all relative overflow-hidden group rounded-[1.5rem] sm:rounded-[2rem] ${selectedTxIds.includes(t.id) ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-transparent'}`}
                >
                   <div className="flex justify-between items-start relative z-10">
                      <div className="flex items-center gap-4 sm:gap-6">
                         <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl border-2 flex items-center justify-center transition-all shrink-0 ${selectedTxIds.includes(t.id) ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 dark:border-zinc-800 group-hover:border-emerald-300'}`}>
                            {selectedTxIds.includes(t.id) ? <CheckSquare size={14} strokeWidth={3} /> : <Square size={14} className="opacity-10" />}
                         </div>

                         <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-slate-400 dark:text-zinc-500 group-hover:bg-white dark:group-hover:bg-zinc-700 group-hover:shadow-inner transition-all shrink-0">
                            {t.type === 'TOPUP' ? <ArrowUpCircle size={24} className="text-emerald-600 dark:text-emerald-400" /> : <Receipt size={24} />}
                         </div>
                         <div className="min-w-0">
                            <p className="text-base sm:text-lg font-black text-emerald-950 dark:text-emerald-50 uppercase tracking-tight truncate max-w-[120px] sm:max-w-[150px]">{t.vendor}</p>
                            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest truncate">{t.userName} • {t.date}</p>
                         </div>
                      </div>
                      <div className="text-right shrink-0">
                         <p className="text-xl sm:text-2xl font-black text-emerald-900 dark:text-emerald-400 tracking-tighter tabular-nums">{t.amount.toLocaleString()}</p>
                         <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">AED {t.type}</p>
                      </div>
                   </div>

                   {/* Extracted Items Section */}
                   {t.items && t.items.length > 0 && (
                     <div className="mt-6 border-t border-slate-100 dark:border-zinc-800 pt-4">
                        <button 
                          onClick={(e) => toggleTxExpansion(t.id, e)}
                          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-400 hover:text-emerald-600 transition-colors"
                        >
                           {expandedTxIds.includes(t.id) ? <ChevronDown size={14} /> : <ChevronRightIcon size={14} />}
                           {expandedTxIds.includes(t.id) ? 'Hide Item Details' : `Show ${t.items.length} Items Detected`}
                        </button>

                        {expandedTxIds.includes(t.id) && (
                          <div className="mt-4 space-y-3 animate-in slide-in-from-top-2 duration-300">
                             <div className="grid grid-cols-12 gap-2 text-[8px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest px-2">
                                <div className="col-span-6">Description</div>
                                <div className="col-span-2 text-center">Qty</div>
                                <div className="col-span-4 text-right">Unit Price</div>
                             </div>
                             {t.items.map((item, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50/50 dark:bg-zinc-800/40 p-3 rounded-xl border border-slate-100 dark:border-zinc-800">
                                   <div className="col-span-6 font-bold text-emerald-950 dark:text-emerald-50 text-[10px] truncate">{item.description}</div>
                                   <div className="col-span-2 text-center font-black text-emerald-800 dark:text-emerald-400 text-[10px]">{item.quantity}</div>
                                   <div className="col-span-4 text-right font-black text-emerald-950 dark:text-emerald-50 text-[10px] tabular-nums">{(item.price || 0).toLocaleString()} <span className="text-[8px] font-normal opacity-40">AED</span></div>
                                </div>
                             ))}
                          </div>
                        )}
                     </div>
                   )}

                   {selectedTxIds.includes(t.id) && (
                     <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Check size={80} strokeWidth={4} />
                     </div>
                   )}
                </Card>
              ))}
           </div>
        </div>
      )}

      {/* Responsive MODALS */}
      {(editingUser || isAddingUser) && (
        <div className="fixed inset-0 z-[200] bg-emerald-950/95 dark:bg-zinc-950/95 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
           <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-[2rem] sm:rounded-[3rem] p-8 sm:p-10 shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-hide">
              <button onClick={() => { setEditingUser(null); setIsAddingUser(false); }} className="absolute top-6 right-6 sm:top-8 sm:right-8 text-slate-300 dark:text-zinc-600 hover:text-slate-500 transition-colors">
                 <X size={24} />
              </button>
              <div className="mb-6 sm:mb-8 text-center">
                 <h2 className="text-xl sm:text-2xl font-black text-emerald-950 dark:text-emerald-50 tracking-tighter uppercase">{isAddingUser ? 'Deploy New Staff' : 'Modify Record'}</h2>
                 <p className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mt-1">Tier-1 Access Control</p>
              </div>
              <div className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-4">Full Name</label>
                    <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 rounded-2xl font-bold focus:border-emerald-500 outline-none text-sm text-emerald-950 dark:text-emerald-50" placeholder="Enter Full Name" />
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-4">Monthly Salary (AED)</label>
                        <input type="number" value={formSalary} onChange={(e) => setFormSalary(parseFloat(e.target.value) || 0)} className="w-full px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 rounded-2xl font-bold focus:border-emerald-500 outline-none text-sm text-emerald-950 dark:text-emerald-50" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-4">OT Rate /Hr</label>
                        <input type="number" value={formOTRate} onChange={(e) => setFormOTRate(parseFloat(e.target.value) || 0)} className="w-full px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 rounded-2xl font-bold focus:border-emerald-500 outline-none text-sm text-emerald-950 dark:text-emerald-50" />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-4">Initial Wallet (AED)</label>
                    <input type="number" value={formBalance} onChange={(e) => setFormBalance(parseFloat(e.target.value) || 0)} className="w-full px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 rounded-2xl font-bold focus:border-emerald-500 outline-none text-sm text-emerald-950 dark:text-emerald-50" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-4">Access Code</label>
                    <input type="text" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} className="w-full px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 rounded-2xl font-bold focus:border-emerald-500 outline-none text-sm text-emerald-950 dark:text-emerald-50" placeholder="Access Passcode" />
                 </div>
                 <Button onClick={isAddingUser ? handleAddUser : handleSaveEdit} className="w-full py-5 rounded-[2rem] mt-4 shadow-xl text-xs sm:text-sm">
                   {isAddingUser ? 'Authorize Deployment' : 'Synchronize Record'}
                 </Button>
              </div>
           </div>
        </div>
      )}

      {/* Fullscreen Image Preview */}
      {viewingImage && (
        <div 
          className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4 sm:p-10 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setViewingImage(null)}
        >
          <img src={viewingImage} className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain animate-in zoom-in-95 duration-500" alt="Full receipt" />
          <button className="absolute top-6 right-6 sm:top-10 sm:right-10 text-white/50 hover:text-white transition-colors">
            <X size={32} />
          </button>
        </div>
      )}
    </div>
  );
};
