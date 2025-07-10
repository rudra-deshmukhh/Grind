import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useDispatch, useSelector } from 'react-redux';
import { StatusBar, View, ActivityIndicator } from 'react-native';

import AuthNavigator from './AuthNavigator';
import CustomerNavigator from './CustomerNavigator';
import StoreNavigator from './StoreNavigator';
import AdminNavigator from './AdminNavigator';
import DeliveryNavigator from './DeliveryNavigator';
import { loadUser } from '../store/slices/authSlice';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, user, loading } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(loadUser());
  }, [dispatch]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#D97706" />
      </View>
    );
  }

  const getRoleBasedNavigator = () => {
    if (!isAuthenticated || !user) {
      return <AuthNavigator />;
    }

    switch (user.role) {
      case 'customer':
        return <CustomerNavigator />;
      case 'grinding_store':
        return <StoreNavigator />;
      case 'admin':
        return <AdminNavigator />;
      case 'delivery_boy':
        return <DeliveryNavigator />;
      default:
        return <AuthNavigator />;
    }
  };

  return (
    <NavigationContainer>
      <StatusBar backgroundColor="#D97706" barStyle="light-content" />
      {getRoleBasedNavigator()}
    </NavigationContainer>
  );
};

export default AppNavigator;