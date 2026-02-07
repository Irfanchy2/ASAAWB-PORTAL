
import { User, UserRole, Transaction, TransactionStatus, PaymentMode } from './types';

export const INITIAL_USERS: User[] = [
  { id: 'u1', name: 'jahed', role: UserRole.EMPLOYEE, balance: 500.00, avatar: 'https://ui-avatars.com/api/?name=Jahed&background=random', password: 'jahed123' },
  { id: 'u2', name: 'jamir', role: UserRole.EMPLOYEE, balance: 750.00, avatar: 'https://ui-avatars.com/api/?name=Jamir&background=random', password: 'jamir123' },
  { id: 'u3', name: 'shafiq', role: UserRole.EMPLOYEE, balance: 1000.00, avatar: 'https://ui-avatars.com/api/?name=Shafiq&background=random', password: 'shafiq123' },
  { id: 'admin', name: 'Admin', role: UserRole.ADMIN, balance: 0, password: 'admin' },
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
  },
  {
    id: 't3',
    userId: 'u3',
    userName: 'shafiq',
    date: '2024-05-18',
    vendor: 'Hardware Store',
    amount: 320.00,
    status: TransactionStatus.PENDING,
    paymentMode: PaymentMode.CASH,
    category: 'Industrial Tools',
    type: 'EXPENSE',
    items: [
      { description: 'Welding Rods', quantity: 5, price: 64.00 }
    ]
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
