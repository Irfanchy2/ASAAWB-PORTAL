
import React, { useState, useMemo } from 'react';
import { 
  Users, 
  DollarSign, 
  Clock, 
  BarChart3, 
  CheckCircle2, 
  XCircle, 
  Download, 
  Search,
  Receipt,
  Wallet,
  Plus,
  Filter,
  ChevronDown,
  ChevronUp,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Key,
  List,
  FileSpreadsheet,
  FileCode
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { User, Transaction, TransactionStatus, CompanyStats, UserRole, PaymentMode } from '../types';
import { CATEGORIES } from '../constants';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AdminViewProps {
  users: User[];
  transactions: Transaction[];
  stats: CompanyStats;
  onUpdateTransaction: (id: string, status: TransactionStatus) => void;
  onTopUp: (userId: string, amount: number) => void;
  onAddEmployee: (name: string, balance: number, pass: string) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ users, transactions, stats, onUpdateTransaction, onTopUp, onAddEmployee }) => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'APPROVALS' | 'RECORDS' | 'EMPLOYEES'>('DASHBOARD');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterPaymentMode, setFilterPaymentMode] = useState<string>('All');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showReviewItems, setShowReviewItems] = useState(false);
  const [expandedRecordItems, setExpandedRecordItems] = useState<Record<string, boolean>>({});

  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpBalance, setNewEmpBalance] = useState('0');
  const [newEmpPass, setNewEmpPass] = useState('');

  const pendingTransactions = transactions.filter(t => t.status === TransactionStatus.PENDING);
  const archivedTransactions = transactions.filter(t => 
    (t.status === TransactionStatus.APPROVED || t.status === TransactionStatus.REJECTED || t.status === TransactionStatus.COMPLETED) && t.type === 'EXPENSE'
  );
  
  const filteredPendingTransactions = useMemo(() => {
    return pendingTransactions.filter(t => 
      filterCategory === 'All' || t.category === filterCategory
    );
  }, [pendingTransactions, filterCategory]);

  const currentApproval = filteredPendingTransactions[currentIndex];

  const filteredArchivedTransactions = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return archivedTransactions.filter(t => {
      const matchesCategoryFilter = filterCategory === 'All' || t.category === filterCategory;
      const matchesSearch = 
        t.userName.toLowerCase().includes(query) || 
        t.vendor.toLowerCase().includes(query) ||
        (t.items?.some(it => it.description.toLowerCase().includes(query)));
      return matchesCategoryFilter && matchesSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [archivedTransactions, filterCategory, searchQuery]);

  const handleDecision = (id: string, status: TransactionStatus) => {
    onUpdateTransaction(id, status);
    setShowReviewItems(false);
    if (currentIndex >= filteredPendingTransactions.length - 1 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const employees = users.filter(u => u.role === UserRole.EMPLOYEE);
  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName || !newEmpPass) return;
    onAddEmployee(newEmpName, parseFloat(newEmpBalance) || 0, newEmpPass);
    setIsAddingEmployee(false);
    setNewEmpName('');
    setNewEmpBalance('0');
    setNewEmpPass('');
  };

  const chartData = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => ({
      name: `Day ${i + 1}`,
      spend: Math.floor(Math.random() * 500) + 100,
    }));
  }, []);

  const exportToExcel = () => {
    // Basic CSV implementation for Excel compatibility
    const headers = ['Date', 'Employee', 'Vendor', 'Category', 'Amount (AED)', 'Status', 'Payment Mode', 'Items Purchased'];
    const rows = filteredArchivedTransactions.map(t => [
      t.date,
      t.userName,
      t.vendor,
      t.category || 'General',
      t.amount.toFixed(2),
      t.status,
      t.paymentMode,
      t.items?.map(i => `${i.description} (x${i.quantity})`).join('; ') || 'N/A'
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AlSaqr_Records_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const exportToTally = () => {
    const approved = transactions.filter(t => t.status === TransactionStatus.APPROVED);
    const xml = `<?xml version="1.0"?>
<ENVELOPE>
  <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC>
      <REQUESTDATA>
        ${approved.map(t => `
        <TALLYMESSAGE>
          <VOUCHER VCHTYPE="Payment" ACTION="Create">
            <DATE>${t.date.replace(/-/g, '')}</DATE>
            <NARRATION>AL SAQR: ${t.vendor} spent by ${t.userName}. Items: ${t.items?.map(it => it.description).join(', ') || 'N/A'}</NARRATION>
            <PARTYLEDGERNAME>${t.paymentMode === PaymentMode.CASH ? 'Cash' : 'Bank Account'}</PARTYLEDGERNAME>
            <AMOUNT>${t.amount}</AMOUNT>
          </VOUCHER>
        </TALLYMESSAGE>`).join('')}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
    const blob = new Blob([xml], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `AlSaqr_Tally_${new Date().toISOString().split('T')[0]}.xml`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const toggleRecordExpand = (id: string) => {
    setExpandedRecordItems(prev => ({...prev, [id]: !prev[id]}));
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-emerald-900 tracking-tighter uppercase">PORTAL HUB</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">AL SAQR WELDING & BLACKSMITH LLC</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl overflow-x-auto scrollbar-hide">
          {(['DASHBOARD', 'APPROVALS', 'RECORDS', 'EMPLOYEES'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-400 hover:text-slate-800'}`}
            >
              {tab}
              {tab === 'APPROVALS' && pendingTransactions.length > 0 && (
                <span className="ml-2 bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-full">{pendingTransactions.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'DASHBOARD' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-emerald-900 text-white border-none shadow-xl shadow-emerald-900/20">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-white/10 rounded-xl"><DollarSign size={20} /></div>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Company Cash Pool</span>
              </div>
              <h3 className="text-3xl font-black">{stats.totalCash.toLocaleString()} AED</h3>
              <p className="text-emerald-200 text-[10px] font-bold mt-1 uppercase tracking-widest">Available Funds</p>
            </Card>

            <Card className="border-l-4 border-l-red-600">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Clock size={20} /></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Claims Pending</span>
              </div>
              <h3 className="text-3xl font-black text-slate-800">{stats.totalEmployeeOwed.toLocaleString()} AED</h3>
              <p className="text-slate-400 text-[10px] font-bold mt-1 uppercase tracking-widest">Needs Review</p>
            </Card>

            <Card>
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl"><BarChart3 size={20} /></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Approved Spend</span>
              </div>
              <h3 className="text-3xl font-black text-slate-800">{stats.monthlySpend.toLocaleString()} AED</h3>
              <p className="text-slate-400 text-[10px] font-bold mt-1 uppercase tracking-widest">Validated Total</p>
            </Card>

            <Card>
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-red-50 text-red-600 rounded-xl"><Receipt size={20} /></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Records</span>
              </div>
              <h3 className="text-3xl font-black text-slate-800">{transactions.length}</h3>
              <p className="text-slate-400 text-[10px] font-bold mt-1 uppercase tracking-widest">History Count</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-emerald-900 uppercase text-xs tracking-widest">Daily Spend Velocity</h3>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#065f46" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#065f46" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                    <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                    <Area type="monotone" dataKey="spend" stroke="#065f46" strokeWidth={4} fillOpacity={1} fill="url(#colorSpend)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-emerald-900 uppercase text-xs tracking-widest">Live Queue</h3>
              </div>
              <div className="space-y-4">
                {pendingTransactions.slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-center gap-3 p-4 rounded-3xl bg-slate-50 border border-transparent hover:border-emerald-100 transition-colors">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400">
                      <Receipt size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{t.vendor}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">{t.userName} • {t.amount} AED</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}

      {activeTab === 'APPROVALS' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black text-emerald-900 uppercase tracking-tighter">Review Feed</h2>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">AL SAQR INTERNAL VERIFICATION</p>
            </div>
            {filteredPendingTransactions.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Record {currentIndex + 1} of {filteredPendingTransactions.length}</span>
                <div className="flex gap-1">
                   <button disabled={currentIndex === 0} onClick={() => { setCurrentIndex(prev => prev - 1); setShowReviewItems(false); }} className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm disabled:opacity-30"><ChevronLeft size={18} /></button>
                   <button disabled={currentIndex === filteredPendingTransactions.length - 1} onClick={() => { setCurrentIndex(prev => prev + 1); setShowReviewItems(false); }} className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm disabled:opacity-30"><ChevronRight size={18} /></button>
                </div>
              </div>
            )}
          </div>

          {currentApproval ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Card className="p-0 overflow-hidden flex flex-col md:flex-row min-h-[520px] shadow-2xl border-emerald-100 ring-8 ring-emerald-50/20">
                <div className="md:w-3/5 bg-slate-100 flex items-center justify-center p-6 border-r border-slate-200">
                  {currentApproval.receiptUrl ? (
                    <img src={currentApproval.receiptUrl} alt="Receipt" className="max-h-full max-w-full rounded shadow-xl object-contain border-4 border-white" />
                  ) : (
                    <div className="text-slate-300 flex flex-col items-center">
                      <Receipt size={80} className="mb-4 opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Verification Manual</p>
                    </div>
                  )}
                </div>

                <div className="md:w-2/5 p-8 flex flex-col bg-white overflow-y-auto max-h-[700px] scrollbar-hide">
                  <div className="space-y-6 flex-1">
                    <div>
                      <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full mb-3 inline-block">
                        {currentApproval.category || 'General'}
                      </span>
                      <h3 className="text-2xl font-black text-emerald-900 uppercase tracking-tighter">{currentApproval.vendor}</h3>
                      <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{new Date(currentApproval.date).toLocaleDateString(undefined, { dateStyle: 'full' })}</p>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-3xl space-y-4 border border-slate-100">
                       <div className="flex justify-between items-center pb-3 border-b border-slate-200/50">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</span>
                          <span className="text-sm font-black text-emerald-900">{currentApproval.userName}</span>
                       </div>
                       <div className="flex justify-between items-center pb-3 border-b border-slate-200/50">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Value</span>
                          <span className="text-xl font-black text-emerald-800">{currentApproval.amount.toFixed(2)} AED</span>
                       </div>
                       <div className="flex justify-between items-center pb-3 border-b border-slate-200/50">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Mode</span>
                          <span className="text-xs font-black text-red-700 uppercase tracking-widest bg-red-50 px-2 py-1 rounded">
                            {currentApproval.paymentMode} {currentApproval.cardLast4 && `(••••${currentApproval.cardLast4})`}
                          </span>
                       </div>

                       {currentApproval.items && currentApproval.items.length > 0 && (
                         <div className="pt-2">
                            <button 
                              onClick={() => setShowReviewItems(!showReviewItems)}
                              className="flex items-center justify-between w-full text-[10px] font-black text-emerald-700 uppercase tracking-widest hover:text-emerald-900 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <List size={14} />
                                <span>Items ({currentApproval.items.length})</span>
                              </div>
                              {showReviewItems ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            
                            {showReviewItems && (
                              <div className="mt-4 space-y-3 animate-in slide-in-from-top-1 duration-200 max-h-64 overflow-y-auto pr-2 scrollbar-hide">
                                {currentApproval.items.map((item, idx) => (
                                  <div key={idx} className="flex flex-col gap-1 p-3 bg-white rounded-2xl border border-slate-200/50">
                                    <span className="text-xs font-black text-emerald-950 uppercase tracking-tight leading-tight">{item.description}</span>
                                    <div className="flex justify-between items-end">
                                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Qty: {item.quantity} × {item.price.toFixed(2)}</span>
                                      <span className="text-xs font-black text-emerald-800">{(item.quantity * item.price).toFixed(2)} AED</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                         </div>
                       )}
                    </div>
                  </div>

                  <div className="flex gap-4 pt-8 sticky bottom-0 bg-white">
                    <Button variant="danger" className="flex-1 py-5 text-xs font-black uppercase tracking-widest shadow-xl shadow-red-100" onClick={() => handleDecision(currentApproval.id, TransactionStatus.REJECTED)}>Reject</Button>
                    <Button variant="success" className="flex-1 py-5 text-xs font-black uppercase tracking-widest shadow-xl shadow-emerald-100" onClick={() => handleDecision(currentApproval.id, TransactionStatus.APPROVED)}>Authorize</Button>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            <div className="py-32 text-center bg-white rounded-[48px] border-4 border-dashed border-emerald-50">
               <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                 <CheckCircle2 size={40} />
               </div>
               <h3 className="text-xl font-black text-emerald-900 uppercase tracking-widest tracking-tighter">Review Clear</h3>
               <p className="text-slate-400 text-[10px] font-black uppercase mt-2 tracking-widest">All current claims have been processed.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'RECORDS' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h2 className="text-2xl font-black text-emerald-900 uppercase tracking-tighter">System Records</h2>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Comprehensive Purchase Audit</p>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-80">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" placeholder="Search employee, vendor or items..." value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase pl-12 pr-4 py-4 focus:ring-4 focus:ring-emerald-500/10 outline-none"
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Button onClick={exportToExcel} variant="secondary" className="flex-1 md:w-auto text-[9px] font-black uppercase tracking-widest py-4 px-6 bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                  <FileSpreadsheet size={16} /> Excel CSV
                </Button>
                <Button onClick={exportToTally} variant="secondary" className="flex-1 md:w-auto text-[9px] font-black uppercase tracking-widest py-4 px-6 bg-slate-50 text-slate-700 hover:bg-slate-200">
                  <FileCode size={16} /> Tally XML
                </Button>
              </div>
            </div>
          </div>

          <Card className="p-0 overflow-hidden shadow-2xl border-slate-100 rounded-[32px]">
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Employee</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Vendor / Items</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Category</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Amount (AED)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredArchivedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <Receipt size={40} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No matching records found</p>
                      </td>
                    </tr>
                  ) : filteredArchivedTransactions.map(t => (
                    <React.Fragment key={t.id}>
                      <tr className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => toggleRecordExpand(t.id)}>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-emerald-800 text-[10px] border-2 border-white shadow-sm overflow-hidden shrink-0">
                               {users.find(u => u.id === t.userId)?.avatar ? (
                                 <img src={users.find(u => u.id === t.userId)?.avatar} className="w-full h-full object-cover" alt={t.userName} />
                               ) : t.userName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-black text-emerald-950 uppercase tracking-tighter">{t.userName}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase">{t.date}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                           <div>
                             <p className="text-sm font-black text-emerald-900 uppercase tracking-tight">{t.vendor}</p>
                             <div className="flex items-center gap-1.5 mt-1">
                               <p className="text-[9px] font-bold text-slate-400 uppercase">{t.items?.length || 0} items purchased</p>
                               {t.items && t.items.length > 0 && (
                                 <span className="text-[8px] p-0.5 bg-slate-100 rounded text-slate-500"><ChevronDown size={10} className={expandedRecordItems[t.id] ? 'rotate-180 transition-transform' : 'transition-transform'} /></span>
                               )}
                             </div>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">{t.category || 'General'}</span>
                        </td>
                        <td className="px-8 py-6">
                           <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded ${
                             t.status === TransactionStatus.APPROVED ? 'bg-emerald-50 text-emerald-700' :
                             t.status === TransactionStatus.REJECTED ? 'bg-red-50 text-red-700' :
                             'bg-slate-50 text-slate-500'
                           }`}>{t.status}</span>
                        </td>
                        <td className="px-8 py-6 text-right font-black text-emerald-900 text-base">
                           {t.amount.toFixed(2)}
                        </td>
                      </tr>
                      {expandedRecordItems[t.id] && t.items && t.items.length > 0 && (
                        <tr className="bg-slate-50/30">
                          <td colSpan={5} className="px-8 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-2">
                               {t.items.map((item, idx) => (
                                 <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-4 flex justify-between items-center shadow-sm">
                                   <div>
                                     <p className="text-[10px] font-black text-emerald-950 uppercase tracking-tight">{item.description}</p>
                                     <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{item.quantity} x {item.price.toFixed(2)} AED</p>
                                   </div>
                                   <p className="text-xs font-black text-emerald-800">{(item.quantity * item.price).toFixed(2)}</p>
                                 </div>
                               ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'EMPLOYEES' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-emerald-900 uppercase tracking-tighter">EMPLOYEE LEDGER</h2>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">DIGITAL WALLET & CREDENTIAL MANAGEMENT</p>
            </div>
            <div className="flex gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" placeholder="Filter team..." value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase focus:ring-4 focus:ring-emerald-500/10 w-full md:w-56 shadow-sm outline-none"
                />
              </div>
              <Button onClick={() => setIsAddingEmployee(true)} className="bg-emerald-800 text-white rounded-2xl px-6 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-900/10">
                <Plus size={16} /> Add Employee
              </Button>
            </div>
          </div>

          <Card className="p-0 overflow-hidden shadow-2xl border-slate-100 rounded-[32px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Profile</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Wallet Bal</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Portal Key (Password)</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Fund Allocation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredEmployees.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <img src={e.avatar} className="w-10 h-10 rounded-2xl border-2 border-white shadow-sm" alt={e.name} />
                          <span className="font-black text-emerald-900 uppercase text-sm tracking-tighter">{e.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 font-black text-emerald-700 text-base">
                        {e.balance.toFixed(2)} <span className="text-[10px] text-slate-400">AED</span>
                      </td>
                      <td className="px-8 py-5">
                         <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl w-fit">
                            <Key size={14} className="text-slate-400" />
                            <span className="text-[10px] font-mono font-bold text-slate-500">{e.password}</span>
                         </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex gap-2 justify-end">
                           <Button variant="ghost" className="text-[10px] font-black uppercase px-4 hover:bg-emerald-50 hover:text-emerald-700" onClick={() => onTopUp(e.id, 500)}>+500</Button>
                           <Button variant="ghost" className="text-[10px] font-black uppercase px-4 hover:bg-emerald-50 hover:text-emerald-700" onClick={() => onTopUp(e.id, 1000)}>+1000</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {isAddingEmployee && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-md" onClick={() => setIsAddingEmployee(false)}></div>
           <div className="bg-white w-full max-w-md rounded-[48px] shadow-2xl relative z-10 overflow-hidden border border-emerald-100 animate-in zoom-in-95 duration-200">
             <div className="p-10 space-y-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users size={32} />
                  </div>
                  <h2 className="text-2xl font-black text-emerald-900 uppercase tracking-tighter">NEW EMPLOYEE</h2>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Portal Access Provisioning</p>
                </div>

                <form onSubmit={handleAddSubmit} className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                    <input type="text" required value={newEmpName} onChange={e => setNewEmpName(e.target.value)} placeholder="Full Name" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-emerald-700 transition-all font-bold text-slate-800 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Initial Balance (AED)</label>
                    <input type="number" required value={newEmpBalance} onChange={e => setNewEmpBalance(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-emerald-900 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Set Portal Password</label>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="text" required value={newEmpPass} onChange={e => setNewEmpPass(e.target.value)} placeholder="Portal Password" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none" />
                    </div>
                  </div>
                  <div className="pt-4 flex gap-4">
                    <button type="button" onClick={() => setIsAddingEmployee(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px]">Cancel</button>
                    <button type="submit" className="flex-1 py-4 bg-emerald-800 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-900/20 active:scale-95">Confirm Provision</button>
                  </div>
                </form>
             </div>
             <div className="bg-red-50 p-4 border-t border-red-100 flex items-center gap-3">
               <ShieldAlert className="text-red-700 shrink-0" size={18} />
               <p className="text-[10px] font-bold text-red-800 uppercase tracking-tight">Access credentials should be kept confidential.</p>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};
