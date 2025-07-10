import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

class AuthService {
  async login(email, password) {
    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });
      
      const { access_token, user } = response.data;
      
      // Store token and user info
      await AsyncStorage.setItem('authToken', access_token);
      await AsyncStorage.setItem('userInfo', JSON.stringify(user));
      
      return { success: true, user, token: access_token };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed',
      };
    }
  }

  async register(userData) {
    try {
      const response = await api.post('/auth/register', userData);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Registration failed',
      };
    }
  }

  async verifyOTP(email, otp) {
    try {
      const response = await api.post('/auth/verify-otp', {
        email,
        otp,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'OTP verification failed',
      };
    }
  }

  async logout() {
    try {
      await AsyncStorage.multiRemove(['authToken', 'userInfo']);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Logout failed' };
    }
  }

  async getCurrentUser() {
    try {
      const userInfo = await AsyncStorage.getItem('userInfo');
      return userInfo ? JSON.parse(userInfo) : null;
    } catch (error) {
      return null;
    }
  }

  async isAuthenticated() {
    try {
      const token = await AsyncStorage.getItem('authToken');
      return !!token;
    } catch (error) {
      return false;
    }
  }

  async refreshToken() {
    try {
      const response = await api.post('/auth/refresh-token');
      const { access_token } = response.data;
      await AsyncStorage.setItem('authToken', access_token);
      return { success: true, token: access_token };
    } catch (error) {
      return { success: false, error: 'Token refresh failed' };
    }
  }

  async forgotPassword(email) {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to send reset email',
      };
    }
  }

  async resetPassword(token, newPassword) {
    try {
      const response = await api.post('/auth/reset-password', {
        token,
        new_password: newPassword,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Password reset failed',
      };
    }
  }

  async updateProfile(profileData) {
    try {
      const response = await api.put('/auth/profile', profileData);
      const updatedUser = response.data;
      await AsyncStorage.setItem('userInfo', JSON.stringify(updatedUser));
      return { success: true, user: updatedUser };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Profile update failed',
      };
    }
  }

  async changePassword(currentPassword, newPassword) {
    try {
      const response = await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Password change failed',
      };
    }
  }
}

export default new AuthService();