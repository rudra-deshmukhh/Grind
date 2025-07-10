import React, { useState, useEffect, useContext, createContext } from 'react';
import './App.css';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Service Worker Registration
const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available
                if (window.confirm('New version available! Reload to update?')) {
                  window.location.reload();
                }
              }
            });
          });
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }
};

// PWA Install Prompt
const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const installPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  };

  return { showInstallPrompt, installPWA };
};

// WebSocket Hook for Real-time Updates
const useWebSocket = (userId) => {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const wsUrl = `${BACKEND_URL.replace('http', 'ws')}/ws/${userId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setNotifications(prev => [...prev, data]);
        
        // Show browser notification if permission granted
        if (Notification.permission === 'granted') {
          new Notification(data.type === 'order_update' ? 'Order Update' : 'GrainCraft', {
            body: data.message,
            icon: '/logo192.png',
            tag: 'graincraft-notification'
          });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [userId]);

  const clearNotifications = () => setNotifications([]);

  return { socket, notifications, isConnected, clearNotifications };
};

// Context for user authentication
const AuthContext = createContext();

// Auth Provider Component
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize PWA and WebSocket
  const { showInstallPrompt, installPWA } = usePWAInstall();
  const { socket, notifications, isConnected, clearNotifications } = useWebSocket(user?.id);

  useEffect(() => {
    // Register service worker
    registerServiceWorker();

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Verify token and get user info
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      setUser(userData);
    }
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    clearNotifications();
  };

  const value = {
    user,
    login,
    logout,
    loading,
    showInstallPrompt,
    installPWA,
    notifications,
    isConnected,
    clearNotifications
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Notification Component
const NotificationBar = () => {
  const { notifications, clearNotifications } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (notifications.length > 0) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(clearNotifications, 300);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notifications, clearNotifications]);

  if (notifications.length === 0 || !visible) return null;

  const latestNotification = notifications[notifications.length - 1];

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
      visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className={`p-4 rounded-lg shadow-lg max-w-sm ${
        latestNotification.type === 'order_update' 
          ? 'bg-blue-500 text-white' 
          : latestNotification.type === 'payment_success'
          ? 'bg-green-500 text-white'
          : 'bg-amber-500 text-white'
      }`}>
        <div className="flex justify-between items-start">
          <div>
            <p className="font-medium">
              {latestNotification.type === 'order_update' ? 'Order Update' : 'Notification'}
            </p>
            <p className="text-sm mt-1">{latestNotification.message}</p>
          </div>
          <button 
            onClick={() => setVisible(false)}
            className="ml-2 text-white hover:text-gray-200"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
};

// PWA Install Prompt Component
const PWAInstallPrompt = () => {
  const { showInstallPrompt, installPWA } = useAuth();

  if (!showInstallPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-amber-600 text-white p-4 rounded-lg shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Install GrainCraft</p>
          <p className="text-sm opacity-90">Get the full app experience</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={installPWA}
            className="bg-white text-amber-600 px-4 py-2 rounded text-sm font-medium"
          >
            Install
          </button>
          <button
            onClick={() => {}} // Hide prompt logic
            className="text-white opacity-70 hover:opacity-100"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
};

// Connection Status Indicator
const ConnectionStatus = () => {
  const { isConnected } = useAuth();

  return (
    <div className="fixed top-4 left-4 z-40">
      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${
        isConnected 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        <div className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`}></div>
        <span>{isConnected ? 'Connected' : 'Offline'}</span>
      </div>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
    </div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <ConnectionStatus />
          <NotificationBar />
          <PWAInstallPrompt />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-otp" element={<OTPVerificationPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            
            {/* Customer Routes */}
            <Route path="/" element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/customer/*" element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerDashboard />
              </ProtectedRoute>
            } />
            
            {/* Grinding Store Routes */}
            <Route path="/grinding-store/*" element={
              <ProtectedRoute allowedRoles={['grinding_store']}>
                <GrindingStoreDashboard />
              </ProtectedRoute>
            } />
            
            {/* Admin Routes */}
            <Route path="/admin/*" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            
            {/* Delivery Boy Routes */}
            <Route path="/delivery/*" element={
              <ProtectedRoute allowedRoles={['delivery_boy']}>
                <DeliveryBoyDashboard />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

// Login Page Component
const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API}/auth/login`, {
        email,
        password
      });

      const { access_token, user } = response.data;
      login(user, access_token);
      
      // Navigate based on role
      switch (user.role) {
        case 'customer':
          navigate('/customer');
          break;
        case 'grinding_store':
          navigate('/grinding-store');
          break;
        case 'admin':
          navigate('/admin');
          break;
        case 'delivery_boy':
          navigate('/delivery');
          break;
        default:
          navigate('/');
      }
    } catch (error) {
      setError(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">G</span>
          </div>
          <h1 className="text-3xl font-bold text-amber-900">GrainCraft</h1>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-600 text-white py-2 px-4 rounded-md hover:bg-amber-700 disabled:opacity-50"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <button
              onClick={() => navigate('/register')}
              className="text-amber-600 hover:text-amber-700 font-medium"
            >
              Register here
            </button>
          </p>
        </div>

        <div className="mt-4 text-center text-sm text-gray-500">
          <p>Demo Accounts:</p>
          <p>Admin: admin@graincraft.com / admin123</p>
          <p>Customer: customer@demo.com / demo123</p>
        </div>
      </div>
    </div>
  );
};

// Register Page Component
const RegisterPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'customer'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.post(`${API}/auth/register`, formData);
      setSuccess('Registration successful! Please check your email for OTP verification.');
      setTimeout(() => {
        navigate('/verify-otp', { state: { email: formData.email } });
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">G</span>
          </div>
          <h1 className="text-3xl font-bold text-amber-900">Create Account</h1>
          <p className="text-gray-600 mt-2">Join GrainCraft today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="customer">Customer</option>
              <option value="grinding_store">Grinding Store Owner</option>
              <option value="delivery_boy">Delivery Boy</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          {success && (
            <div className="text-green-500 text-sm">{success}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-600 text-white py-2 px-4 rounded-md hover:bg-amber-700 disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-amber-600 hover:text-amber-700 font-medium"
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

// OTP Verification Page
const OTPVerificationPage = () => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.post(`${API}/auth/verify-otp`, {
        email,
        otp
      });
      alert('Email verified successfully! You can now log in.');
      navigate('/login');
    } catch (error) {
      setError(error.response?.data?.detail || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-amber-900">Verify Your Email</h1>
          <p className="text-gray-600 mt-2">Enter the OTP sent to {email}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OTP
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              maxLength="6"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-center text-lg"
              placeholder="123456"
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-600 text-white py-2 px-4 rounded-md hover:bg-amber-700 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Demo OTP: 123456</p>
        </div>
      </div>
    </div>
  );
};

// Unauthorized Page
const UnauthorizedPage = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Access Denied</h1>
        <p className="text-gray-600 mb-6">You don't have permission to access this page.</p>
        <div className="space-y-4">
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-amber-600 text-white py-2 px-4 rounded-md hover:bg-amber-700"
          >
            Go to Login
          </button>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

// Customer Dashboard Component
const CustomerDashboard = () => {
  const [activeTab, setActiveTab] = useState('catalog');
  const [grains, setGrains] = useState([]);
  const [grindOptions, setGrindOptions] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [mixBuilder, setMixBuilder] = useState({
    grains: [],
    grindOption: null
  });
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [grainsRes, grindOptionsRes, cartRes] = await Promise.all([
        axios.get(`${API}/grains`),
        axios.get(`${API}/grind-options`),
        axios.get(`${API}/cart`)
      ]);

      setGrains(grainsRes.data);
      setGrindOptions(grindOptionsRes.data);
      setCart(cartRes.data);

      // Fetch orders and subscriptions
      try {
        const ordersRes = await axios.get(`${API}/orders/my-orders`);
        setOrders(ordersRes.data);
      } catch (error) {
        console.log('Orders not available yet');
        setOrders([]);
      }

      try {
        const subscriptionsRes = await axios.get(`${API}/subscriptions/my-subscriptions`);
        setSubscriptions(subscriptionsRes.data);
      } catch (error) {
        console.log('Subscriptions not available yet');
        setSubscriptions([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showNotification('Error loading data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  const addToCart = async (item) => {
    try {
      await axios.post(`${API}/cart/add`, item);
      fetchData(); // Refresh cart
      showNotification('Added to cart!');
    } catch (error) {
      console.error('Error adding to cart:', error);
      showNotification('Error adding to cart');
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      await axios.delete(`${API}/cart/${itemId}`);
      fetchData(); // Refresh cart
      showNotification('Item removed from cart!');
    } catch (error) {
      console.error('Error removing from cart:', error);
      showNotification('Error removing item');
    }
  };

  const clearCart = async () => {
    try {
      await axios.delete(`${API}/cart`);
      fetchData(); // Refresh cart
      showNotification('Cart cleared!');
    } catch (error) {
      console.error('Error clearing cart:', error);
      showNotification('Error clearing cart');
    }
  };

  const createOrder = async (deliveryAddress, deliverySlot, deliveryDate) => {
    try {
      if (cart.length === 0) {
        showNotification('Cart is empty!');
        return;
      }

      const orderItems = cart.map(item => ({
        id: item.id,
        type: item.type,
        grain_id: item.grain_id,
        grain_name: item.grain_name,
        quantity_kg: item.quantity_kg,
        grains: item.grains,
        grind_option: item.grind_option,
        total_price: item.total_price
      }));

      const response = await axios.post(`${API}/orders`, {
        items: orderItems,
        delivery_address: deliveryAddress,
        delivery_slot: deliverySlot,
        delivery_date: deliveryDate
      });

      // Initialize Razorpay payment
      if (window.Razorpay) {
        const options = {
          key: response.data.key_id,
          amount: response.data.amount,
          currency: 'INR',
          order_id: response.data.razorpay_order_id,
          name: 'GrainCraft',
          description: 'Grain Order Payment',
          handler: async (paymentResponse) => {
            try {
              await axios.post(`${API}/orders/verify-payment`, {
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature
              });
              showNotification('Order placed successfully!');
              await clearCart();
              fetchData();
              setActiveTab('orders');
            } catch (error) {
              showNotification('Payment verification failed!');
            }
          },
          prefill: {
            name: `${user.first_name} ${user.last_name}`,
            email: user.email
          },
          theme: {
            color: '#D97706'
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        showNotification('Payment system not available');
      }
    } catch (error) {
      console.error('Order creation failed:', error);
      showNotification('Order creation failed!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-amber-800">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-amber-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">G</span>
              </div>
              <h1 className="text-2xl font-bold text-amber-900">GrainCraft</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-amber-700">
                Welcome, {user.first_name}!
              </span>
              <span className="text-sm text-amber-700">
                Cart: {cart.length} items
              </span>
              <button
                onClick={logout}
                className="text-red-600 hover:text-red-700 text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'catalog', label: 'Grain Catalog' },
              { id: 'mix', label: 'Mix Builder' },
              { id: 'cart', label: `Cart (${cart.length})` },
              { id: 'orders', label: 'My Orders' },
              { id: 'subscriptions', label: 'Subscriptions' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-amber-600 text-amber-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {notification}
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'catalog' && (
          <GrainCatalog
            grains={grains}
            grindOptions={grindOptions}
            onAddToCart={addToCart}
          />
        )}
        {activeTab === 'mix' && (
          <MixBuilder
            grains={grains}
            grindOptions={grindOptions}
            mixBuilder={mixBuilder}
            setMixBuilder={setMixBuilder}
            onAddToCart={addToCart}
          />
        )}
        {activeTab === 'cart' && (
          <CartView
            cart={cart}
            onRemoveFromCart={removeFromCart}
            onClearCart={clearCart}
            onCreateOrder={createOrder}
          />
        )}
        {activeTab === 'orders' && (
          <OrdersView orders={orders} />
        )}
        {activeTab === 'subscriptions' && (
          <SubscriptionsView subscriptions={subscriptions} />
        )}
      </main>
    </div>
  );
};

// Other dashboard components will be added in the next part...
// For now, let's create placeholder components

const GrindingStoreDashboard = () => {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/grinding-stores/orders`);
      setOrders(response.data.orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await axios.put(`${API}/orders/${orderId}/status`, { status });
      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <header className="bg-white shadow-sm border-b border-amber-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-amber-900">Grinding Store Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-amber-700">Welcome, {user.first_name}!</span>
              <button onClick={logout} className="text-red-600 hover:text-red-700 text-sm">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-6">Orders to Process</h2>
          {loading ? (
            <div className="text-center py-8">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8">No orders to process</div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">Order #{order.id.slice(-6)}</h3>
                      <p className="text-gray-600">Total: ₹{order.total_amount}</p>
                      <p className="text-sm text-gray-500">Status: {order.status}</p>
                    </div>
                    <div className="space-x-2">
                      <button
                        onClick={() => updateOrderStatus(order.id, 'grinding')}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                      >
                        Start Grinding
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'packing')}
                        className="bg-green-500 text-white px-3 py-1 rounded text-sm"
                      >
                        Move to Packing
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/admin/dashboard`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <header className="bg-white shadow-sm border-b border-amber-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-amber-900">Admin Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-amber-700">Welcome, {user.first_name}!</span>
              <button onClick={logout} className="text-red-600 hover:text-red-700 text-sm">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700">Total Orders</h3>
            <p className="text-3xl font-bold text-amber-600">{stats.total_orders || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700">Customers</h3>
            <p className="text-3xl font-bold text-amber-600">{stats.total_customers || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700">Grinding Stores</h3>
            <p className="text-3xl font-bold text-amber-600">{stats.total_grinding_stores || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700">Delivery Boys</h3>
            <p className="text-3xl font-bold text-amber-600">{stats.total_delivery_boys || 0}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Admin Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700">
              Add New Grain
            </button>
            <button className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700">
              Manage Grinding Stores
            </button>
            <button className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700">
              Manage Delivery Boys
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

const DeliveryBoyDashboard = () => {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/delivery/orders`);
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <header className="bg-white shadow-sm border-b border-amber-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-amber-900">Delivery Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-amber-700">Welcome, {user.first_name}!</span>
              <button onClick={logout} className="text-red-600 hover:text-red-700 text-sm">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-6">Delivery Orders</h2>
          {loading ? (
            <div className="text-center py-8">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8">No delivery orders assigned</div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold">Order #{order.id.slice(-6)}</h3>
                  <p className="text-gray-600">
                    Delivery Address: {order.delivery_address.address}
                  </p>
                  <p className="text-sm text-gray-500">Status: {order.status}</p>
                  <button className="mt-2 bg-green-500 text-white px-4 py-2 rounded text-sm">
                    View on Map
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// Placeholder components for customer features
const GrainCatalog = ({ grains, grindOptions, onAddToCart }) => {
  const [selectedGrain, setSelectedGrain] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedGrind, setSelectedGrind] = useState(null);

  const handleAddToCart = (grain) => {
    if (!selectedGrind) {
      alert('Please select a grind option');
      return;
    }

    const cartItem = {
      type: 'individual',
      grain_id: grain.id,
      quantity_kg: quantity,
      grind_option: selectedGrind
    };

    onAddToCart(cartItem);
    setSelectedGrain(null);
    setQuantity(1);
    setSelectedGrind(null);
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-amber-900 mb-8">Premium Grains</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {grains.map((grain) => (
          <div key={grain.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
            <img src={grain.image_url} alt={grain.name} className="w-full h-48 object-cover" />
            <div className="p-6">
              <h3 className="text-xl font-bold text-amber-900 mb-2">{grain.name}</h3>
              <p className="text-gray-600 mb-4">{grain.description}</p>
              <div className="text-2xl font-bold text-amber-600 mb-4">
                ₹{grain.price_per_kg}/kg
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity (kg)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseFloat(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grind Option
                  </label>
                  <select
                    value={selectedGrind?.type || ''}
                    onChange={(e) => {
                      const grind = grindOptions.find(g => g.type === e.target.value);
                      setSelectedGrind(grind);
                    }}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select grind option</option>
                    {grindOptions.map(grind => (
                      <option key={grind.type} value={grind.type}>
                        {grind.description} {grind.additional_cost > 0 && `(+₹${grind.additional_cost})`}
                      </option>
                    ))}
                  </select>
                </div>
                
                <button
                  onClick={() => handleAddToCart(grain)}
                  className="w-full bg-amber-600 text-white py-2 px-4 rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const MixBuilder = ({ grains, grindOptions, mixBuilder, setMixBuilder, onAddToCart }) => {
  const addToMix = (grain, quantity) => {
    if (!quantity || quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    const existingIndex = mixBuilder.grains.findIndex(g => g.grain_id === grain.id);
    
    if (existingIndex >= 0) {
      const updatedGrains = [...mixBuilder.grains];
      updatedGrains[existingIndex].quantity_kg = quantity;
      setMixBuilder({ ...mixBuilder, grains: updatedGrains });
    } else {
      setMixBuilder({
        ...mixBuilder,
        grains: [...mixBuilder.grains, {
          grain_id: grain.id,
          grain_name: grain.name,
          quantity_kg: quantity,
          price_per_kg: grain.price_per_kg
        }]
      });
    }
  };

  const removeFromMix = (grainId) => {
    setMixBuilder({
      ...mixBuilder,
      grains: mixBuilder.grains.filter(g => g.grain_id !== grainId)
    });
  };

  const handleAddMixToCart = () => {
    if (mixBuilder.grains.length === 0) {
      alert('Please add at least one grain to your mix!');
      return;
    }

    if (!mixBuilder.grindOption) {
      alert('Please select a grind option for your mix!');
      return;
    }

    const cartItem = {
      type: 'mix',
      grains: mixBuilder.grains,
      grind_option: mixBuilder.grindOption
    };

    onAddToCart(cartItem);
    setMixBuilder({ grains: [], grindOption: null });
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-amber-900 mb-8">Custom Mix Builder</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-xl font-semibold mb-4">Select Grains for Your Mix</h3>
          <div className="space-y-4">
            {grains.map((grain) => (
              <MixGrainSelector
                key={grain.id}
                grain={grain}
                onAddToMix={addToMix}
              />
            ))}
          </div>
        </div>
        <div>
          <MixPreview
            mixBuilder={mixBuilder}
            grindOptions={grindOptions}
            onRemoveFromMix={removeFromMix}
            onSelectGrind={(grind) => setMixBuilder({ ...mixBuilder, grindOption: grind })}
            onAddToCart={handleAddMixToCart}
          />
        </div>
      </div>
    </div>
  );
};

const MixGrainSelector = ({ grain, onAddToMix }) => {
  const [quantity, setQuantity] = useState('');

  const handleAdd = () => {
    if (quantity && parseFloat(quantity) > 0) {
      onAddToMix(grain, parseFloat(quantity));
      setQuantity('');
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow flex items-center space-x-4">
      <img
        src={grain.image_url}
        alt={grain.name}
        className="w-16 h-16 object-cover rounded-lg"
      />
      <div className="flex-1">
        <h4 className="font-semibold text-amber-900">{grain.name}</h4>
        <p className="text-sm text-gray-600">₹{grain.price_per_kg}/kg</p>
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="number"
          placeholder="kg"
          min="0.1"
          step="0.1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-20 p-2 border border-gray-300 rounded-md text-sm"
        />
        <button
          onClick={handleAdd}
          className="bg-amber-600 text-white px-4 py-2 rounded-md text-sm hover:bg-amber-700"
        >
          Add
        </button>
      </div>
    </div>
  );
};

const MixPreview = ({ mixBuilder, grindOptions, onRemoveFromMix, onSelectGrind, onAddToCart }) => {
  const calculateMixPrice = () => {
    const basePrice = mixBuilder.grains.reduce((sum, grain) => 
      sum + (grain.price_per_kg * grain.quantity_kg), 0);
    const grindCost = mixBuilder.grindOption?.additional_cost || 0;
    return basePrice + grindCost;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-xl font-semibold mb-4">Your Custom Mix</h3>
      
      {mixBuilder.grains.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No grains added yet</p>
      ) : (
        <div className="space-y-3 mb-6">
          {mixBuilder.grains.map((grain) => (
            <div key={grain.grain_id} className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
              <div>
                <span className="font-medium">{grain.grain_name}</span>
                <span className="text-sm text-gray-600 ml-2">
                  {grain.quantity_kg}kg × ₹{grain.price_per_kg}
                </span>
              </div>
              <button
                onClick={() => onRemoveFromMix(grain.grain_id)}
                className="text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      
      {mixBuilder.grains.length > 0 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Grind Option
            </label>
            <select
              value={mixBuilder.grindOption?.type || ''}
              onChange={(e) => {
                const grind = grindOptions.find(g => g.type === e.target.value);
                onSelectGrind(grind);
              }}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">Select grind option</option>
              {grindOptions.map(grind => (
                <option key={grind.type} value={grind.type}>
                  {grind.description} {grind.additional_cost > 0 && `(+₹${grind.additional_cost})`}
                </option>
              ))}
            </select>
          </div>
          
          <div className="bg-amber-100 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span>Total Weight:</span>
              <span>{mixBuilder.grains.reduce((sum, g) => sum + g.quantity_kg, 0).toFixed(1)}kg</span>
            </div>
            <div className="flex justify-between items-center font-bold text-lg">
              <span>Total Price:</span>
              <span>₹{calculateMixPrice().toFixed(2)}</span>
            </div>
          </div>
          
          <button
            onClick={onAddToCart}
            className="w-full bg-amber-600 text-white py-3 px-4 rounded-lg hover:bg-amber-700 transition-colors"
          >
            Add Mix to Cart
          </button>
        </div>
      )}
    </div>
  );
};

const CartView = ({ cart, onRemoveFromCart, onClearCart, onCreateOrder }) => {
  const [deliveryAddress, setDeliveryAddress] = useState({
    address: '123 Main Street, City, State',
    latitude: 0,
    longitude: 0
  });
  const [deliverySlot, setDeliverySlot] = useState('morning');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);

  const totalCartValue = cart.reduce((sum, item) => sum + item.total_price, 0);

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }
    onCreateOrder(deliveryAddress, deliverySlot, deliveryDate);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-amber-900">Shopping Cart</h2>
        {cart.length > 0 && (
          <button
            onClick={onClearCart}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
          >
            Clear Cart
          </button>
        )}
      </div>
      {cart.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">Your cart is empty</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cart.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              onRemove={() => onRemoveFromCart(item.id)}
            />
          ))}
          
          {/* Delivery Options */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Delivery Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Address
                </label>
                <input
                  type="text"
                  value={deliveryAddress.address}
                  onChange={(e) => setDeliveryAddress({...deliveryAddress, address: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Slot
                </label>
                <select
                  value={deliverySlot}
                  onChange={(e) => setDeliverySlot(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="morning">Morning (9AM-12PM)</option>
                  <option value="afternoon">Afternoon (12PM-4PM)</option>
                  <option value="evening">Evening (4PM-7PM)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Date
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          <div className="bg-amber-100 p-6 rounded-lg">
            <div className="flex justify-between items-center text-xl font-bold text-amber-900">
              <span>Total: ₹{totalCartValue.toFixed(2)}</span>
              <button 
                onClick={handleCheckout}
                className="bg-amber-600 text-white px-8 py-3 rounded-lg hover:bg-amber-700"
              >
                Checkout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CartItem = ({ item, onRemove }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          {item.type === 'individual' ? (
            <div>
              <h3 className="text-lg font-semibold text-amber-900">{item.grain_name}</h3>
              <p className="text-gray-600">Quantity: {item.quantity_kg}kg</p>
              {item.grind_option && (
                <p className="text-gray-600">Grind: {item.grind_option.description}</p>
              )}
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold text-amber-900">Custom Mix</h3>
              <div className="text-gray-600">
                {item.grains.map(grain => (
                  <div key={grain.grain_id}>
                    {grain.grain_name}: {grain.quantity_kg}kg
                  </div>
                ))}
              </div>
              {item.grind_option && (
                <p className="text-gray-600">Grind: {item.grind_option.description}</p>
              )}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-amber-600">₹{item.total_price.toFixed(2)}</div>
          <button
            onClick={onRemove}
            className="mt-2 text-red-500 hover:text-red-700"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
};

const OrdersView = ({ orders }) => (
  <div>
    <h2 className="text-3xl font-bold text-amber-900 mb-8">My Orders</h2>
    {orders.length === 0 ? (
      <div className="text-center py-16">
        <p className="text-gray-500 text-lg">No orders yet</p>
      </div>
    ) : (
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">Order #{order.id.slice(-6)}</h3>
                <p className="text-gray-600">Status: {order.status.replace('_', ' ')}</p>
                <p className="text-gray-600">Total: ₹{order.total_amount}</p>
                <p className="text-gray-600">
                  Created: {new Date(order.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-sm ${
                  order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                  order.status === 'out_for_delivery' ? 'bg-blue-100 text-blue-800' :
                  order.payment_status === 'paid' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {order.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const SubscriptionsView = ({ subscriptions }) => (
  <div>
    <h2 className="text-3xl font-bold text-amber-900 mb-8">My Subscriptions</h2>
    {subscriptions.length === 0 ? (
      <div className="text-center py-16">
        <p className="text-gray-500 text-lg">No subscriptions yet</p>
        <button className="mt-4 bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700">
          Create Subscription
        </button>
      </div>
    ) : (
      <div className="space-y-4">
        {subscriptions.map((subscription) => (
          <div key={subscription.id} className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold">Weekly Delivery</h3>
            <p className="text-gray-600">Status: {subscription.status}</p>
            <p className="text-gray-600">Amount: ₹{subscription.total_amount}</p>
            <p className="text-gray-600">
              Next Delivery: {new Date(subscription.next_delivery_date).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default App;