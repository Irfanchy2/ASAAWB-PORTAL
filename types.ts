
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

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  checkIn: string; // ISO string
  checkOut?: string; // ISO string
  lat?: number;
  lng?: number;
  totalHours: number;
  overtimeHours: number;
  status: 'PRESENT' | 'PENDING_APPROVAL' | 'APPROVED';
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  balance: number;
  avatar?: string;
  password?: string;
  baseSalary: number; // Monthly base
  otRate: number; // Multiplier or fixed rate per hour
  activeShiftId?: string;
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
  monthlyPayrollEstimate: number;
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
