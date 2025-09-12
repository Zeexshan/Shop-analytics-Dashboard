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

export const api = {
  get: async (url: string) => {
    const fullUrl = url.startsWith('http') ? url : getApiUrl(url);
    const response = await fetch(fullUrl, {
      credentials: 'include',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error(`API Error (zeeexshan): HTTP ${response.status}`);
    return response.json();
  },

  post: async (url: string, data: any) => {
    const fullUrl = url.startsWith('http') ? url : getApiUrl(url);
    const response = await fetch(fullUrl, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`API Error (zeeexshan): HTTP ${response.status}`);
    return response.json();
  },

  put: async (url: string, data: any) => {
    const fullUrl = url.startsWith('http') ? url : getApiUrl(url);
    const response = await fetch(fullUrl, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`API Error (zeeexshan): HTTP ${response.status}`);
    return response.json();
  },

  delete: async (url: string) => {
    const fullUrl = url.startsWith('http') ? url : getApiUrl(url);
    const response = await fetch(fullUrl, {
      method: 'DELETE',
      credentials: 'include',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error(`API Error (zeeexshan): HTTP ${response.status}`);
    return response.ok;
  }
};

// zeeexshan: API client module signature
