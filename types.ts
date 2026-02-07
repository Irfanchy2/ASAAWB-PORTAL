
export enum UserRole {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED'
}

export enum PaymentMode {
  CASH = 'CASH',
  CARD = 'CARD'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  balance: number;
  avatar?: string;
  password?: string; // Added password field
}

export interface LineItem {
  description: string;
  quantity: number;
  price: number;
}

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  date: string;
  vendor: string;
  amount: number;
  status: TransactionStatus;
  paymentMode: PaymentMode;
  cardLast4?: string;
  receiptUrl?: string;
  category?: string;
  items?: LineItem[];
  type: 'EXPENSE' | 'TOPUP';
}

export interface CompanyStats {
  totalCash: number;
  totalEmployeeOwed: number;
  monthlySpend: number;
  pendingApprovals: number;
}

export interface OCRResult {
  date: string;
  vendor: string;
  amount: number;
  currency: string;
  category: string;
  items: LineItem[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}
