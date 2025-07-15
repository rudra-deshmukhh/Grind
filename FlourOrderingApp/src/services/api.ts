import { API_CONFIG } from '../constants';
import { useAuthStore } from '../store/authStore';

// API Response type
interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

// API Configuration
const API_BASE_URL = API_CONFIG.BASE_URL;

class ApiService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const { user } = useAuthStore.getState();
    
    // Get Firebase ID token
    let idToken = '';
    if (user?.idToken) {
      idToken = user.idToken;
    }

    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      ...(idToken && { Authorization: `Bearer ${idToken}` }),
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // Authentication APIs
  async register(userData: {
    firebase_uid: string;
    email: string;
    phone: string;
    name: string;
    role: string;
  }) {
    return this.makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(firebase_uid: string) {
    return this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ firebase_uid }),
    });
  }

  async getProfile() {
    return this.makeRequest('/auth/profile');
  }

  async updateProfile(userData: {
    name?: string;
    phone?: string;
    profile_image?: string;
  }) {
    return this.makeRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async checkAvailability(data: { email?: string; phone?: string }) {
    return this.makeRequest('/auth/check-availability', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async refreshProfile() {
    return this.makeRequest('/auth/refresh', {
      method: 'POST',
    });
  }

  // Grains APIs
  async getGrains(params?: {
    category?: string;
    mill_id?: string;
    available_only?: boolean;
    min_price?: number;
    max_price?: number;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const queryString = params ? new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString() : '';

    const endpoint = `/grains${queryString ? `?${queryString}` : ''}`;
    return this.makeRequest(endpoint);
  }

  async getGrainById(id: string) {
    return this.makeRequest(`/grains/${id}`);
  }

  async getFeaturedGrains(limit: number = 10) {
    return this.makeRequest(`/grains/featured?limit=${limit}`);
  }

  async getPopularGrains(limit: number = 10) {
    return this.makeRequest(`/grains/popular?limit=${limit}`);
  }

  async getCategorySummary() {
    return this.makeRequest('/grains/categories');
  }

  async createGrain(grainData: {
    name: string;
    description: string;
    category: string;
    price_per_kg: number;
    image_url?: string;
    nutritional_info?: any;
  }) {
    return this.makeRequest('/grains', {
      method: 'POST',
      body: JSON.stringify(grainData),
    });
  }

  async updateGrain(id: string, grainData: any) {
    return this.makeRequest(`/grains/${id}`, {
      method: 'PUT',
      body: JSON.stringify(grainData),
    });
  }

  async deleteGrain(id: string) {
    return this.makeRequest(`/grains/${id}`, {
      method: 'DELETE',
    });
  }

  async toggleGrainAvailability(id: string) {
    return this.makeRequest(`/grains/${id}/toggle-availability`, {
      method: 'POST',
    });
  }

  // Users APIs (placeholder)
  async getUsers(params?: { page?: number; limit?: number; role?: string }) {
    const queryString = params ? new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString() : '';

    const endpoint = `/users${queryString ? `?${queryString}` : ''}`;
    return this.makeRequest(endpoint);
  }

  // Orders APIs (placeholder)
  async getOrders(params?: { 
    page?: number; 
    limit?: number; 
    status?: string;
    start_date?: string;
    end_date?: string;
  }) {
    const queryString = params ? new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString() : '';

    const endpoint = `/orders${queryString ? `?${queryString}` : ''}`;
    return this.makeRequest(endpoint);
  }

  async createOrder(orderData: {
    mill_id: string;
    items: Array<{
      grain_id?: string;
      custom_product_id?: string;
      grinding_option_id: string;
      quantity_kg: number;
    }>;
    delivery_address_id: string;
    payment_method: string;
    notes?: string;
  }) {
    return this.makeRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async getOrderById(id: string) {
    return this.makeRequest(`/orders/${id}`);
  }

  async updateOrderStatus(id: string, data: {
    status: string;
    message?: string;
    location?: any;
  }) {
    return this.makeRequest(`/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Health check
  async healthCheck() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
export default apiService;