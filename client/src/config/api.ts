// API Configuration for Desktop and Web compatibility
const isDevelopment = import.meta.env.MODE === 'development';
const isElectron = typeof window !== 'undefined' && window.navigator.userAgent.includes('Electron');
const isReplit = typeof window !== 'undefined' && (
  import.meta.env.VITE_REPLIT_DEV_DOMAIN || 
  window.location.hostname.includes('replit.dev') || 
  window.location.hostname.includes('repl.co') ||
  window.location.hostname.includes('pike.replit.dev')
);

export const API_BASE_URL = isElectron 
  ? 'http://localhost:5000' // Desktop mode - absolute URL (will fallback to remote if local fails)
  : isReplit
    ? window.location.origin // Replit mode - use current origin (includes protocol and port)
    : isDevelopment 
      ? 'http://localhost:5000' // Development mode
      : ''; // Production web mode - relative URLs

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