// Centralized API Service for Desktop and Web compatibility
import { API_BASE_URL } from '@/config/api';

class ApiService {
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('auth_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      credentials: 'include',
    };
    
    const config: RequestInit = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    };
    
    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      // Desktop app fallback logic
      const isElectron = typeof window !== 'undefined' && window.navigator.userAgent.includes('Electron');
      const isNetworkError = error instanceof TypeError || 
                            (error as any)?.code === 'ECONNREFUSED' ||
                            (error as Error)?.message?.includes('fetch');
      
      if (isElectron && isNetworkError && url.includes('localhost')) {
        console.warn('ApiService: Local server connection failed, trying fallback server...');
        const FALLBACK_API_URL = import.meta.env.VITE_REPLIT_DEV_DOMAIN 
          ? `https://${import.meta.env.VITE_REPLIT_DEV_DOMAIN}` 
          : 'https://ca72fa78-84e4-428c-a8d1-d1917050d0fc-00-1scrwxd0h0we9.riker.replit.dev';
        
        const fallbackUrl = url.replace('http://localhost:5000', FALLBACK_API_URL);
        console.warn(`ApiService: Retrying with ${fallbackUrl}`);
        
        const fallbackResponse = await fetch(fallbackUrl, config);
        
        if (!fallbackResponse.ok) {
          throw new Error(`HTTP error! status: ${fallbackResponse.status}`);
        }
        
        return await fallbackResponse.json();
      }
      
      console.error('API request failed:', error);
      throw error;
    }
  }
  
  // Authentication methods
  async login(username: string, password: string) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }
  
  async logout() {
    return this.request('/api/auth/logout', {
      method: 'POST',
    });
  }

  async verifyAuth() {
    return this.request('/api/auth/verify');
  }
  
  // Dashboard methods
  async getDashboardKpis() {
    return this.request('/api/dashboard/kpis');
  }

  async getDashboardCharts() {
    return this.request('/api/dashboard/charts');
  }
  
  // Product methods
  async getProducts() {
    return this.request('/api/products');
  }
  
  async addProduct(productData: any) {
    return this.request('/api/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  }

  async updateProduct(id: string, productData: any) {
    return this.request(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
  }

  async deleteProduct(id: string) {
    return this.request(`/api/products/${id}`, {
      method: 'DELETE',
    });
  }
  
  // Sales methods
  async getSales() {
    return this.request('/api/sales');
  }

  async getRecentSales() {
    return this.request('/api/sales/recent');
  }
  
  async addSale(saleData: any) {
    return this.request('/api/sales', {
      method: 'POST',
      body: JSON.stringify(saleData),
    });
  }

  async updateSale(id: string, saleData: any) {
    return this.request(`/api/sales/${id}`, {
      method: 'PUT',
      body: JSON.stringify(saleData),
    });
  }

  async deleteSale(id: string) {
    return this.request(`/api/sales/${id}`, {
      method: 'DELETE',
    });
  }

  // Expense methods
  async getExpenses() {
    return this.request('/api/expenses');
  }

  async addExpense(expenseData: any) {
    return this.request('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData),
    });
  }

  async updateExpense(id: string, expenseData: any) {
    return this.request(`/api/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(expenseData),
    });
  }

  async deleteExpense(id: string) {
    return this.request(`/api/expenses/${id}`, {
      method: 'DELETE',
    });
  }

  // Goals methods
  async getGoals() {
    return this.request('/api/goals');
  }

  async addGoal(goalData: any) {
    return this.request('/api/goals', {
      method: 'POST',
      body: JSON.stringify(goalData),
    });
  }

  async updateGoal(id: string, goalData: any) {
    return this.request(`/api/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(goalData),
    });
  }

  async deleteGoal(id: string) {
    return this.request(`/api/goals/${id}`, {
      method: 'DELETE',
    });
  }
}

export default new ApiService();