// API Configuration for Desktop and Web compatibility
const isElectron = typeof window !== 'undefined' && window.navigator.userAgent.includes('Electron');

export const API_BASE_URL = isElectron
  ? 'http://localhost:5000' // Desktop mode - local server
  : ''; // Web mode - relative URLs (same origin, works in dev and production)

export const API_ENDPOINTS = {
  // Authentication
  login: `${API_BASE_URL}/api/auth/login`,
  logout: `${API_BASE_URL}/api/auth/logout`,
  verify: `${API_BASE_URL}/api/auth/verify`,
  
  // Dashboard
  dashboardKpis: `${API_BASE_URL}/api/dashboard/kpis`,
  dashboardCharts: `${API_BASE_URL}/api/dashboard/charts`,
  
  // Products
  products: `${API_BASE_URL}/api/products`,
  
  // Sales
  sales: `${API_BASE_URL}/api/sales`,
  recentSales: `${API_BASE_URL}/api/sales/recent`,
  
  // Expenses
  expenses: `${API_BASE_URL}/api/expenses`,
  
  // Goals
  goals: `${API_BASE_URL}/api/goals`,
  
  // Reports
  reports: `${API_BASE_URL}/api/reports`
};

export const getApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};
