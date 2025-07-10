import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import grainSlice from './slices/grainSlice';
import cartSlice from './slices/cartSlice';
import orderSlice from './slices/orderSlice';
import subscriptionSlice from './slices/subscriptionSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    grains: grainSlice,
    cart: cartSlice,
    orders: orderSlice,
    subscriptions: subscriptionSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;