import {
  AuthResponse,
  BillStatus,
  ClosureType,
  DashboardStats,
  ExtraCharge,
  Holiday,
  Hostel,
  KitchenSheet,
  LedgerTransaction,
  Meal,
  MenuItem,
  MonthlyBill,
  Notification,
  Order,
  OrderType,
  Payment,
  PaymentMethod,
  Student
} from '../types';

const envApiUrl = (import.meta as any).env?.VITE_API_URL;
const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_BASE = isLocalhost
  ? '/api'
  : (envApiUrl
      ? (envApiUrl.endsWith('/api') ? envApiUrl : `${envApiUrl.replace(/\/$/, '')}/api`)
      : '/api');

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/verify-otp')) {
      window.location.href = '/login';
    }
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  // Handle empty or void responses
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return {} as T;
  }

  return response.json();
}

export const api = {
  // Auth
  sendOtp: (phoneNumber: string) =>
    fetchApi<{
      message: string;
      whatsappUrl: string;
      cooldownSeconds: number;
      registered: boolean;
      isAdmin?: boolean;
      requiresPassword?: boolean;
    }>(
      '/auth/send-otp',
      { method: 'POST', body: JSON.stringify({ phoneNumber }) }
    ),

  verifyOtp: (phoneNumber: string, otp: string) =>
    fetchApi<AuthResponse>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, otp }),
    }),

  login: (identifier: string, password: string) =>
    fetchApi<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    }),

  adminLogin: (email: string, password: string) =>
    fetchApi<AuthResponse>('/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  registerWithOtp: (data: { phoneNumber: string; otp: string; fullName: string; hostelId: number; password?: string; email?: string }) =>
    fetchApi<AuthResponse>('/auth/register-with-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  resetClientPassword: (email: string, newPassword: string) =>
    fetchApi<{ message: string }>('/auth/reset-client-password', {
      method: 'POST',
      body: JSON.stringify({ email, newPassword }),
    }),

  getMe: () => fetchApi<AuthResponse>('/auth/me'),

  registerProfile: (fullName: string, hostelId: number) =>
    fetchApi<AuthResponse>('/auth/register-profile', {
      method: 'POST',
      body: JSON.stringify({ fullName, hostelId }),
    }),

  // Menus & Meals (Dinner Only)
  getTodayMenu: () => fetchApi<Meal[]>('/menus/today'),
  getMenuItems: () => fetchApi<MenuItem[]>('/menus/items'),
  createMenuItem: (data: { name: string; category: string; description?: string }) =>
    fetchApi<MenuItem>('/menus/items', { method: 'POST', body: JSON.stringify(data) }),
  updateMenuItem: (id: number, data: { name: string; category: string; description?: string }) =>
    fetchApi<MenuItem>(`/menus/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleMenuItem: (id: number) =>
    fetchApi<MenuItem>(`/menus/items/${id}/toggle`, { method: 'PATCH' }),
  deleteMenuItem: (id: number) =>
    fetchApi<void>(`/menus/items/${id}`, { method: 'DELETE' }),
  createMeal: (data: any) =>
    fetchApi<Meal>('/menus', { method: 'POST', body: JSON.stringify(data) }),
  publishMeal: (id: number, notifyStudents = true) =>
    fetchApi<Meal>(`/menus/${id}/publish?notifyStudents=${notifyStudents}`, { method: 'POST' }),
  deleteMeal: (id: number) =>
    fetchApi<void>(`/menus/${id}`, { method: 'DELETE' }),
  closeMeal: (id: number, reason?: string) =>
    fetchApi<Meal>(`/menus/${id}/close${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`, { method: 'POST' }),
  reopenMeal: (id: number) =>
    fetchApi<Meal>(`/menus/${id}/reopen`, { method: 'POST' }),

  // Orders
  placeOrder: (mealId: number, orderType: OrderType, selectedSabzi?: string, extraRotis = 0, halfTiffinChoice?: string, quantity = 1) =>
    fetchApi<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify({ mealId, orderType, selectedSabzi, extraRotis, halfTiffinChoice, quantity }),
    }),
  editOrder: (id: number, data: { mealId: number; orderType: OrderType; selectedSabzi?: string; extraRotis?: number; halfTiffinChoice?: string; quantity?: number }) =>
    fetchApi<Order>(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  cancelOrder: (id: number, reason?: string) =>
    fetchApi<Order>(`/orders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  adminCancelOrder: (id: number, reason: string) =>
    fetchApi<Order>(`/orders/${id}/admin-cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  deliverOrder: (id: number) =>
    fetchApi<Order>(`/orders/${id}/deliver`, {
      method: 'POST',
    }),
  deliverOrdersByHostel: (hostelId: number, date?: string) =>
    fetchApi<{ deliveredCount: number; message: string }>(`/orders/deliver-hostel/${hostelId}${date ? `?date=${date}` : ''}`, {
      method: 'POST',
    }),
  getMyOrders: () => fetchApi<Order[]>('/orders/my-orders'),
  getStudentOrdersAdmin: (studentId: number) =>
    fetchApi<Order[]>(`/orders/student/${studentId}`),
  getAllOrders: (date?: string) => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    return fetchApi<Order[]>(`/orders?${params.toString()}`);
  },

  // Kitchen Sheet (Dinner Preparation Sheet)
  getKitchenSheet: (date?: string) => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    return fetchApi<KitchenSheet>(`/kitchen/sheet?${params.toString()}`);
  },

  // Ledger & Balance
  getMyLedger: () => fetchApi<LedgerTransaction[]>('/ledger/my-ledger'),
  getMyBalance: () => fetchApi<{ studentId: number; balance: number }>('/ledger/balance'),
  getStudentLedgerAdmin: (studentId: number) =>
    fetchApi<{ balance: number; transactions: LedgerTransaction[] }>(`/ledger/student/${studentId}`),

  // Billing
  getBillingSheet: (month?: string, hostelId?: number, status?: BillStatus, search?: string) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (hostelId) params.append('hostelId', String(hostelId));
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    return fetchApi<MonthlyBill[]>(`/billing/sheet?${params.toString()}`);
  },
  generateAllBills: (month: string) =>
    fetchApi<MonthlyBill[]>('/billing/generate', {
      method: 'POST',
      body: JSON.stringify({ month }),
    }),
  markBillAsPaid: (billId: number) =>
    fetchApi<MonthlyBill>(`/billing/${billId}/mark-paid`, {
      method: 'POST',
    }),
  getMyBill: (month?: string) =>
    fetchApi<MonthlyBill>(`/billing/my-bill${month ? `?month=${month}` : ''}`),
  getMyBillHistory: () => fetchApi<MonthlyBill[]>('/billing/my-history'),
  downloadInvoicePdf: async (studentId: number, month: string) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/billing/pdf/${studentId}?month=${month}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) {
      throw new Error('Failed to generate PDF from server.');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HadkarMeals_Bill_${month}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // Payments
  recordPayment: (data: {
    studentId: number;
    amount: number;
    paymentMethod: PaymentMethod;
    paymentDate?: string;
    referenceNote?: string;
  }) => fetchApi<Payment>('/payments', { method: 'POST', body: JSON.stringify(data) }),
  getMyPayments: () => fetchApi<Payment[]>('/payments/my-payments'),
  getStudentPaymentsAdmin: (id: number) => fetchApi<Payment[]>(`/payments/student/${id}`),

  // Extra Charges
  addExtraCharge: (data: {
    studentId: number;
    itemDescription: string;
    quantity: number;
    unitPrice: number;
    chargeDate?: string;
    notes?: string;
  }) => fetchApi<ExtraCharge>('/charges', { method: 'POST', body: JSON.stringify(data) }),
  getMyCharges: () => fetchApi<ExtraCharge[]>('/charges/my-charges'),
  getStudentChargesAdmin: (id: number) => fetchApi<ExtraCharge[]>(`/charges/student/${id}`),

  // Service Status & Scheduled Holidays (No Emergency Closure)
  getCurrentServiceStatus: () =>
    fetchApi<{ serviceStatus: string; serviceBannerText: string; alerts: string[] }>(
      '/service-status/current'
    ),
  scheduleHoliday: (data: { holidayDate: string; title: string; description?: string; affectsMeal?: ClosureType }) =>
    fetchApi<Holiday>('/holidays', { method: 'POST', body: JSON.stringify(data) }),
  getHolidays: () => fetchApi<Holiday[]>('/holidays'),

  // Notifications
  getMyNotifications: () => fetchApi<Notification[]>('/notifications/my'),
  getUnreadNotificationsCount: () => fetchApi<{ unreadCount: number }>('/notifications/unread-count'),
  markNotificationRead: (id: number) =>
    fetchApi<{ message: string }>(`/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () =>
    fetchApi<{ message: string }>('/notifications/mark-all-read', { method: 'POST' }),
  broadcastNotification: (data: any) =>
    fetchApi<any>('/notifications/broadcast', { method: 'POST', body: JSON.stringify(data) }),
  sendClosingReminder: (minutesRemaining = 15) =>
    fetchApi<any>(
      `/notifications/send-closing-reminder?minutesRemaining=${minutesRemaining}`,
      { method: 'POST' }
    ),

  // Service Locations (Hostels)
  getHostels: () => fetchApi<Hostel[]>('/hostels'),
  createHostel: (data: { name: string; address?: string }) =>
    fetchApi<Hostel>('/hostels', { method: 'POST', body: JSON.stringify(data) }),
  updateHostel: (id: number, data: { name: string; address?: string }) =>
    fetchApi<Hostel>(`/hostels/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleHostel: (id: number) =>
    fetchApi<Hostel>(`/hostels/${id}/toggle`, { method: 'PATCH' }),
  deleteHostel: (id: number) =>
    fetchApi<void>(`/hostels/${id}`, { method: 'DELETE' }),

  // Students
  getStudents: (search?: string, hostelId?: number, active?: boolean) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (hostelId) params.append('hostelId', String(hostelId));
    if (active !== undefined) params.append('active', String(active));
    return fetchApi<Student[]>(`/students?${params.toString()}`);
  },
  updateStudentStatus: (id: number, active: boolean) =>
    fetchApi<Student>(`/students/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    }),

  // Reports & Logs
  getDashboardStats: () => fetchApi<DashboardStats>('/reports/dashboard'),
  getAuditLogs: () => fetchApi<any[]>('/audit-logs'),

  // Push Notifications (FCM)
  registerFcmToken: (token: string, deviceType = 'WEB') =>
    fetchApi<{ message: string }>('/notifications/register-token', {
      method: 'POST',
      body: JSON.stringify({ token, deviceType }),
    }),
  unregisterFcmToken: (token: string) =>
    fetchApi<{ message: string }>('/notifications/unregister-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
};
