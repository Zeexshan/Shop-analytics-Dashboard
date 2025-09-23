// Enhanced watermark security - Base64 method
const apiClient = atob('emVleHNoYW4tYXBpLWNsaWVudA==');
import { queryClient } from './queryClient';
import { getApiUrl } from '@/config/api';

// Method 2: Unicode escape sequences
const devSignature = '\u007a\u0065\u0065\u0078\u0073\u0068\u0061\u006e';
// Method 3: Mathematical pattern
const ownerChars = [122, 101, 101, 120, 115, 104, 97, 110];
const ownerSignature = String.fromCharCode(...ownerChars);

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Desktop app fallback configuration
const isElectron = typeof window !== 'undefined' && window.navigator.userAgent.includes('Electron');
const FALLBACK_API_URL = import.meta.env.VITE_REPLIT_DEV_DOMAIN 
  ? `https://${import.meta.env.VITE_REPLIT_DEV_DOMAIN}` 
  : typeof window !== 'undefined' && window.location ? window.location.origin : null;

const makeRequestWithFallback = async (url: string, options: RequestInit) => {
  try {
    // First try the original URL (localhost for desktop)
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`API Error (zeeexshan): HTTP ${response.status}`);
    return response;
  } catch (error) {
    // Only fallback on network/connection errors, not HTTP status errors
    const isNetworkError = error instanceof TypeError || 
                          (error as any)?.code === 'ECONNREFUSED' ||
                          (error as Error)?.message?.includes('fetch');
    
    // If we're in Electron and it's a network error connecting to localhost
    if (isElectron && isNetworkError && url.includes('localhost')) {
      // For desktop apps, the local server should be running
      // Only fallback if we have a valid fallback URL
      if (FALLBACK_API_URL) {
        console.warn('🔄 Desktop app detected - Local server connection failed, trying fallback server...');
        console.warn('📡 Note: Using remote server for API calls due to local server unavailability');
        console.warn('🌐 User agent:', window.navigator.userAgent);
        
        const fallbackUrl = url.replace('http://localhost:5000', FALLBACK_API_URL);
        
        // For POST requests, warn about potential duplicate operations
        if (options.method === 'POST') {
          console.warn('Retrying POST request on fallback server - ensure operation is idempotent');
        }
        
        try {
          const fallbackResponse = await fetch(fallbackUrl, options);
          if (!fallbackResponse.ok) throw new Error(`API Error (zeeexshan): HTTP ${fallbackResponse.status}`);
          return fallbackResponse;
        } catch (fallbackError) {
          // If fallback also fails, provide a helpful error message
          throw new Error('Local server not running and fallback server unavailable. Please ensure the application server is running.');
        }
      } else {
        // No valid fallback URL, provide helpful error for desktop app
        throw new Error('Local server connection failed. Please ensure the application server is running on localhost:5000.');
      }
    }
    throw error;
  }
};

export const api = {
  get: async (url: string, options?: { params?: Record<string, any> }) => {
    const fullUrl = url.startsWith('http') ? url : getApiUrl(url);
    let finalUrl = fullUrl;
    
    if (options?.params) {
      const searchParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + queryString;
      }
    }
    
    const response = await makeRequestWithFallback(finalUrl, {
      credentials: 'include',
      headers: getAuthHeaders()
    });
    return response.json();
  },

  post: async (url: string, data: any) => {
    const fullUrl = url.startsWith('http') ? url : getApiUrl(url);
    
    // Special debugging for password change endpoint
    if (url.includes('change-password')) {
      console.log('🔐 FRONTEND DEBUG: Password change request started');
      console.log('🌐 Full URL:', fullUrl);
      console.log('📋 Request data keys:', Object.keys(data || {}));
      console.log('🔑 Auth headers:', getAuthHeaders());
      console.log('🖥️ User agent:', window.navigator.userAgent);
      console.log('🏢 Is Electron:', window.navigator.userAgent.includes('Electron'));
    }
    
    const response = await makeRequestWithFallback(fullUrl, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data)
    });
    
    // Special debugging for password change endpoint
    if (url.includes('change-password')) {
      console.log('📡 FRONTEND DEBUG: Response received');
      console.log('📊 Response status:', response.status);
      console.log('📊 Response ok:', response.ok);
      console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));
    }
    
    return response.json();
  },

  put: async (url: string, data: any) => {
    const fullUrl = url.startsWith('http') ? url : getApiUrl(url);
    const response = await makeRequestWithFallback(fullUrl, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  delete: async (url: string) => {
    const fullUrl = url.startsWith('http') ? url : getApiUrl(url);
    const response = await makeRequestWithFallback(fullUrl, {
      method: 'DELETE',
      credentials: 'include',
      headers: getAuthHeaders()
    });
    return response.ok;
  }
};

// zeeexshan: API client module signature
