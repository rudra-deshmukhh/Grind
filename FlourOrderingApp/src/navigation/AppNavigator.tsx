import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';

import { useAuthStore, selectIsAuthenticated, selectUserRole } from '../stores/authStore';
import { UserRole } from '../types';
import { COLORS, SPACING } from '../constants';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import OtpVerificationScreen from '../screens/auth/OtpVerificationScreen';

// Customer Screens
import CustomerHomeScreen from '../screens/customer/HomeScreen';
import ProductsScreen from '../screens/customer/ProductsScreen';
import ProductDetailsScreen from '../screens/customer/ProductDetailsScreen';
import CartScreen from '../screens/customer/CartScreen';
import OrdersScreen from '../screens/customer/OrdersScreen';
import OrderDetailsScreen from '../screens/customer/OrderDetailsScreen';
import CustomProductScreen from '../screens/customer/CustomProductScreen';
import SubscriptionsScreen from '../screens/customer/SubscriptionsScreen';
import TrackOrderScreen from '../screens/customer/TrackOrderScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';

// Mill Screens
import MillDashboardScreen from '../screens/mill/DashboardScreen';
import MillOrdersScreen from '../screens/mill/OrdersScreen';
import MillProfileScreen from '../screens/mill/ProfileScreen';

// Delivery Screens
import DeliveryDashboardScreen from '../screens/delivery/DashboardScreen';
import AvailableOrdersScreen from '../screens/delivery/AvailableOrdersScreen';
import MyDeliveriesScreen from '../screens/delivery/MyDeliveriesScreen';
import DeliveryTrackingScreen from '../screens/delivery/TrackingScreen';
import DeliveryProfileScreen from '../screens/delivery/ProfileScreen';

// Admin Screens
import AdminDashboardScreen from '../screens/admin/DashboardScreen';
import AdminOrdersScreen from '../screens/admin/OrdersScreen';
import AdminMillsScreen from '../screens/admin/MillsScreen';
import AdminCustomersScreen from '../screens/admin/CustomersScreen';
import AdminAnalyticsScreen from '../screens/admin/AnalyticsScreen';
import AdminProfileScreen from '../screens/admin/ProfileScreen';

// Shared Screens
import PaymentScreen from '../screens/shared/PaymentScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import SettingsScreen from '../screens/shared/SettingsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// Auth Navigator
const AuthNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: COLORS.BACKGROUND },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
    </Stack.Navigator>
  );
};

// Customer Tab Navigator
const CustomerTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Products':
              iconName = 'grain';
              break;
            case 'Cart':
              iconName = 'shopping-cart';
              break;
            case 'Orders':
              iconName = 'receipt';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            default:
              iconName = 'circle';
              break;
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.PRIMARY,
        tabBarInactiveTintColor: COLORS.TEXT_SECONDARY,
        tabBarStyle: {
          backgroundColor: COLORS.BACKGROUND,
          borderTopColor: COLORS.BORDER,
          paddingBottom: 5,
          height: 60,
        },
        headerStyle: {
          backgroundColor: COLORS.PRIMARY,
        },
        headerTintColor: COLORS.BACKGROUND,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen name="Home" component={CustomerHomeScreen} />
      <Tab.Screen name="Products" component={ProductsScreen} />
      <Tab.Screen name="Cart" component={CartScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

// Customer Stack Navigator
const CustomerNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.PRIMARY,
        },
        headerTintColor: COLORS.BACKGROUND,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="CustomerTabs" 
        component={CustomerTabNavigator} 
        options={{ headerShown: false }}
      />
      <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} />
      <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
      <Stack.Screen name="CustomProduct" component={CustomProductScreen} />
      <Stack.Screen name="Subscriptions" component={SubscriptionsScreen} />
      <Stack.Screen name="TrackOrder" component={TrackOrderScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
};

// Mill Tab Navigator
const MillTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Dashboard':
              iconName = 'dashboard';
              break;
            case 'Orders':
              iconName = 'receipt';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            default:
              iconName = 'circle';
              break;
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.PRIMARY,
        tabBarInactiveTintColor: COLORS.TEXT_SECONDARY,
        tabBarStyle: {
          backgroundColor: COLORS.BACKGROUND,
          borderTopColor: COLORS.BORDER,
        },
        headerStyle: {
          backgroundColor: COLORS.PRIMARY,
        },
        headerTintColor: COLORS.BACKGROUND,
      })}
    >
      <Tab.Screen name="Dashboard" component={MillDashboardScreen} />
      <Tab.Screen name="Orders" component={MillOrdersScreen} />
      <Tab.Screen name="Profile" component={MillProfileScreen} />
    </Tab.Navigator>
  );
};

// Mill Navigator
const MillNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.PRIMARY,
        },
        headerTintColor: COLORS.BACKGROUND,
      }}
    >
      <Stack.Screen 
        name="MillTabs" 
        component={MillTabNavigator} 
        options={{ headerShown: false }}
      />
      <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
};

// Delivery Tab Navigator
const DeliveryTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Dashboard':
              iconName = 'dashboard';
              break;
            case 'Available':
              iconName = 'assignment';
              break;
            case 'MyDeliveries':
              iconName = 'local-shipping';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            default:
              iconName = 'circle';
              break;
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.PRIMARY,
        tabBarInactiveTintColor: COLORS.TEXT_SECONDARY,
        tabBarStyle: {
          backgroundColor: COLORS.BACKGROUND,
          borderTopColor: COLORS.BORDER,
        },
        headerStyle: {
          backgroundColor: COLORS.PRIMARY,
        },
        headerTintColor: COLORS.BACKGROUND,
      })}
    >
      <Tab.Screen name="Dashboard" component={DeliveryDashboardScreen} />
      <Tab.Screen name="Available" component={AvailableOrdersScreen} />
      <Tab.Screen name="MyDeliveries" component={MyDeliveriesScreen} />
      <Tab.Screen name="Profile" component={DeliveryProfileScreen} />
    </Tab.Navigator>
  );
};

// Delivery Navigator
const DeliveryNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.PRIMARY,
        },
        headerTintColor: COLORS.BACKGROUND,
      }}
    >
      <Stack.Screen 
        name="DeliveryTabs" 
        component={DeliveryTabNavigator} 
        options={{ headerShown: false }}
      />
      <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
      <Stack.Screen name="Tracking" component={DeliveryTrackingScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
};

// Admin Drawer Navigator
const AdminDrawerNavigator = () => {
  return (
    <Drawer.Navigator
      screenOptions={{
        drawerStyle: {
          backgroundColor: COLORS.BACKGROUND,
        },
        drawerActiveTintColor: COLORS.PRIMARY,
        drawerInactiveTintColor: COLORS.TEXT_SECONDARY,
        headerStyle: {
          backgroundColor: COLORS.PRIMARY,
        },
        headerTintColor: COLORS.BACKGROUND,
      }}
    >
      <Drawer.Screen 
        name="Dashboard" 
        component={AdminDashboardScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="dashboard" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Orders" 
        component={AdminOrdersScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="receipt" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Mills" 
        component={AdminMillsScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="business" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Customers" 
        component={AdminCustomersScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="people" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Analytics" 
        component={AdminAnalyticsScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="analytics" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Profile" 
        component={AdminProfileScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="person" size={size} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
};

// Admin Navigator
const AdminNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.PRIMARY,
        },
        headerTintColor: COLORS.BACKGROUND,
      }}
    >
      <Stack.Screen 
        name="AdminDrawer" 
        component={AdminDrawerNavigator} 
        options={{ headerShown: false }}
      />
      <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
};

// Main App Navigator
const AppNavigator = () => {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const userRole = useAuthStore(selectUserRole);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Simulate app initialization
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
      </View>
    );
  }

  const getRoleBasedNavigator = () => {
    if (!isAuthenticated) {
      return <AuthNavigator />;
    }

    switch (userRole) {
      case UserRole.CUSTOMER:
        return <CustomerNavigator />;
      case UserRole.MILL:
        return <MillNavigator />;
      case UserRole.DELIVERY:
        return <DeliveryNavigator />;
      case UserRole.ADMIN:
        return <AdminNavigator />;
      default:
        return <AuthNavigator />;
    }
  };

  return (
    <NavigationContainer>
      {getRoleBasedNavigator()}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
  },
});

export default AppNavigator;