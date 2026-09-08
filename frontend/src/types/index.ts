export type Role = 'ROLE_SUPER_ADMIN' | 'ROLE_ADMIN' | 'ROLE_STUDENT';

export interface User {
  id: number;
  phoneNumber: string;
  email?: string;
  role: Role;
  active: boolean;
}

export interface Hostel {
  id: number;
  name: string;
  address?: string;
  active: boolean;
}

export interface Student {
  id: number;
  fullName: string;
  phoneNumber: string;
  hostel?: Hostel;
  active: boolean;
  createdAt?: string;
}

export type MealType = 'DINNER';
export type MealStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export type MenuItemCategory = 'SABZI' | 'DAL' | 'RICE' | 'ROTI' | 'SALAD' | 'DESSERT' | 'BEVERAGE' | 'EXTRA' | 'OTHER';

export interface MenuItem {
  id: number;
  name: string;
  category: MenuItemCategory;
  description?: string;
  active: boolean;
}

export interface Meal {
  id: number;
  mealDate: string;
  mealType: MealType;
  halfPrice: number;
  fullPrice: number;
  orderOpenTime: string;
  orderCutoffTime: string;
  status: MealStatus;
  menuItems: MenuItem[];
  cutoffReached?: boolean;
  open?: boolean;
  closedToday?: boolean;
  closureReason?: string;
  userActiveOrder?: Order;
  userActiveOrders?: Order[];
}

export type ClosureType = 'DINNER';

export interface Holiday {
  id: number;
  holidayDate: string;
  title: string;
  description?: string;
  affectsMeal: ClosureType;
  active: boolean;
}

export type OrderType = 'HALF' | 'FULL';
export type HalfTiffinChoice = 'SABZI_ROTI' | 'DAL_RICE';
export type OrderStatus = 'CONFIRMED' | 'DELIVERED' | 'CANCELLED' | 'CANCELLED_BY_ADMIN' | 'COMPLETED';

export interface Order {
  id: number;
  studentId: number;
  studentName?: string;
  studentPhone?: string;
  hostelName?: string;
  mealId: number;
  mealDate?: string;
  orderDate: string;
  mealType: MealType;
  orderType: OrderType;
  halfTiffinChoice?: string;
  selectedSabzi?: string;
  extraRotis?: number;
  quantity?: number;
  priceAtOrder: number;
  status: OrderStatus;
  cancellationReason?: string;
  cancelledAt?: string;
  createdAt: string;
  canCancel?: boolean;
}

export type TransactionType =
  | 'ORDER_CHARGE'
  | 'ORDER_REVERSAL'
  | 'EXTRA_CHARGE'
  | 'PAYMENT'
  | 'REFUND'
  | 'ADJUSTMENT'
  | 'PREVIOUS_BALANCE'
  | 'CREDIT';

export interface LedgerTransaction {
  id: number;
  studentId: number;
  studentName?: string;
  amount: number;
  type: TransactionType;
  description: string;
  referenceId?: string;
  createdBy?: string;
  createdAt: string;
}

export type PaymentMethod = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER';

export interface Payment {
  id: number;
  studentId?: number;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  referenceNote?: string;
  recordedBy?: string;
  createdAt?: string;
}

export interface ExtraCharge {
  id: number;
  itemDescription: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  chargeDate: string;
  notes?: string;
  active: boolean;
  createdAt?: string;
}

export type BillStatus = 'PAID' | 'UNPAID' | 'PENDING' | 'PARTIALLY_PAID' | 'OVERDUE';

export interface MonthlyBill {
  id: number;
  studentId: number;
  studentName: string;
  phoneNumber: string;
  hostelName: string;
  monthYear: string;
  foodCharges: number;
  extraCharges: number;
  previousBalance: number;
  totalAmount: number;
  paidAmount: number;
  outstandingBalance: number;
  status: BillStatus;
  dueDate?: string;
  generatedAt?: string;
  whatsappUrl?: string;
  whatsappMessage?: string;
}

export interface KitchenOrderItem {
  orderId: number;
  hostelName: string;
  studentName: string;
  studentPhone: string;
  orderType: OrderType;
  halfTiffinChoice?: string;
  selectedSabzi?: string;
  extraRotis?: number;
  quantity?: number;
  orderedAt: string;
}

export interface KitchenSheet {
  date: string;
  mealType: MealType;
  totalOrders: number;
  totalFull: number;
  totalHalf: number;
  totalRotis?: number;
  items: KitchenOrderItem[];
  hostelBreakdown: Record<string, { full: number; half: number; total: number }>;
  sabziBreakdown?: Record<string, number>;
}

export interface DashboardStats {
  todayOrdersCount: number;
  todayEstimatedRevenue: number;
  activeStudentsCount: number;
  pendingBillsCount: number;
  totalOutstandingAmount: number;
  dinner: {
    fullCount: number;
    halfCount: number;
    totalCount: number;
    status: string;
    cutoffTime: string;
    isPublished: boolean;
    isClosed: boolean;
  };
  serviceStatus: 'OPEN' | 'CLOSING_SOON' | 'CLOSED' | 'HOLIDAY';
  serviceBannerText: string;
  alerts: string[];
  recentOrders?: Order[];
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  channel: string;
  readStatus: boolean;
  sentStatus: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  role: Role;
  phoneNumber: string;
  email?: string;
  userId: number;
  studentId?: number;
  fullName?: string;
  hostelName?: string;
  active: boolean;
  profileComplete: boolean;
}

export interface PlaceOrderRequest {
  mealId: number;
  orderType: OrderType;
  selectedSabzi?: string;
  extraRotis?: number;
  quantity?: number;
  halfTiffinChoice?: HalfTiffinChoice;
}
