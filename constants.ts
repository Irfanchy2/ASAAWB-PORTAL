
import { User, UserRole, Transaction, TransactionStatus, PaymentMode, AttendanceRecord } from './types';

export const INITIAL_USERS: User[] = [
  { id: 'u1', name: 'jahed', role: UserRole.EMPLOYEE, balance: 500.00, avatar: 'https://ui-avatars.com/api/?name=Jahed&background=random', password: 'jahed123', baseSalary: 3500, otRate: 25 },
  { id: 'u2', name: 'jamir', role: UserRole.EMPLOYEE, balance: 750.00, avatar: 'https://ui-avatars.com/api/?name=Jamir&background=random', password: 'jamir123', baseSalary: 4000, otRate: 30 },
  { id: 'u3', name: 'shafiq', role: UserRole.EMPLOYEE, balance: 1000.00, avatar: 'https://ui-avatars.com/api/?name=Shafiq&background=random', password: 'shafiq123', baseSalary: 3800, otRate: 28 },
  { id: 'u4', name: 'irfan', role: UserRole.EMPLOYEE, balance: 500.00, avatar: 'https://ui-avatars.com/api/?name=Irfan&background=random', password: 'irfan', baseSalary: 3500, otRate: 25 },
  { id: 'admin', name: 'Admin', role: UserRole.ADMIN, balance: 0, password: 'admin', baseSalary: 0, otRate: 0 },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 't1',
    userId: 'u1',
    userName: 'jahed',
    date: '2024-05-20',
    vendor: 'Industrial Gas Co',
    amount: 150.00,
    status: TransactionStatus.APPROVED,
    paymentMode: PaymentMode.CASH,
    category: 'Welding Materials',
    type: 'EXPENSE'
  },
  {
    id: 't2',
    userId: 'u2',
    userName: 'jamir',
    date: '2024-05-19',
    vendor: 'ENOC Fuel',
    amount: 85.00,
    status: TransactionStatus.APPROVED,
    paymentMode: PaymentMode.CARD,
    cardLast4: '4455',
    category: 'Vehicle/Fuel',
    type: 'EXPENSE'
  }
];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'a1',
    userId: 'u1',
    date: '2024-05-20',
    checkIn: '2024-05-20T08:00:00Z',
    checkOut: '2024-05-20T18:00:00Z',
    totalHours: 10,
    overtimeHours: 2,
    status: 'APPROVED'
  }
];

export const CATEGORIES = [
  'Welding Materials',
  'Industrial Tools',
  'Safety Equipment',
  'Vehicle/Fuel',
  'Food & Dining',
  'Site/Maintenance',
  'Office Supplies',
  'Others'
];
