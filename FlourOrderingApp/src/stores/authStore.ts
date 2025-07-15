import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthResponse, UserRole } from '../types';
import { STORAGE_KEYS } from '../constants';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: { phone: string; otp: string }) => Promise<void>;
  googleLogin: (googleToken: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  refreshAuthToken: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  verifyOtp: (phone: string, otp: string) => Promise<void>;
  resendOtp: (phone: string) => Promise<void>;
}

// Mock API functions (replace with actual API calls)
const authApi = {
  login: async (credentials: { phone: string; otp: string }): Promise<AuthResponse> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock response
    return {
      user: {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: credentials.phone,
        role: UserRole.CUSTOMER,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      token: 'mock_token_' + Date.now(),
      refreshToken: 'mock_refresh_token_' + Date.now(),
    };
  },
  
  googleLogin: async (googleToken: string): Promise<AuthResponse> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      user: {
        id: '2',
        name: 'Google User',
        email: 'googleuser@example.com',
        phone: '9876543210',
        role: UserRole.CUSTOMER,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      token: 'google_token_' + Date.now(),
      refreshToken: 'google_refresh_token_' + Date.now(),
    };
  },
  
  register: async (userData: any): Promise<AuthResponse> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      user: {
        id: '3',
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        role: userData.role || UserRole.CUSTOMER,
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      token: 'register_token_' + Date.now(),
      refreshToken: 'register_refresh_token_' + Date.now(),
    };
  },
  
  verifyOtp: async (phone: string, otp: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return otp === '123456'; // Mock verification
  },
  
  resendOtp: async (phone: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
  },
  
  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      user: {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '9876543210',
        role: UserRole.CUSTOMER,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      token: 'refreshed_token_' + Date.now(),
      refreshToken: 'refreshed_refresh_token_' + Date.now(),
    };
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await authApi.login(credentials);
          
          set({
            user: response.user,
            token: response.token,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      googleLogin: async (googleToken) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await authApi.googleLogin(googleToken);
          
          set({
            user: response.user,
            token: response.token,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Google login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      register: async (userData) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await authApi.register(userData);
          
          set({
            user: response.user,
            token: response.token,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Registration failed',
            isLoading: false,
          });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      refreshAuthToken: async () => {
        try {
          const { refreshToken } = get();
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          const response = await authApi.refreshToken(refreshToken);
          
          set({
            user: response.user,
            token: response.token,
            refreshToken: response.refreshToken,
          });
        } catch (error) {
          // If refresh fails, logout the user
          get().logout();
          throw error;
        }
      },

      updateUser: (userData) => {
        const { user } = get();
        if (user) {
          set({
            user: { ...user, ...userData },
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      verifyOtp: async (phone, otp) => {
        try {
          set({ isLoading: true, error: null });
          
          const isValid = await authApi.verifyOtp(phone, otp);
          
          if (!isValid) {
            throw new Error('Invalid OTP');
          }
          
          // Update user verification status
          const { user } = get();
          if (user) {
            set({
              user: { ...user, isVerified: true },
              isLoading: false,
            });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'OTP verification failed',
            isLoading: false,
          });
          throw error;
        }
      },

      resendOtp: async (phone) => {
        try {
          set({ isLoading: true, error: null });
          
          await authApi.resendOtp(phone);
          
          set({ isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to resend OTP',
            isLoading: false,
          });
          throw error;
        }
      },
    }),
    {
      name: STORAGE_KEYS.USER_DATA,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Selectors for convenience
export const selectUser = (state: AuthState) => state.user;
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectUserRole = (state: AuthState) => state.user?.role;
export const selectIsLoading = (state: AuthState) => state.isLoading;
export const selectError = (state: AuthState) => state.error;