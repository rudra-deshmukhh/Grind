import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Grain, GrindingOption, OrderProduct, CustomProduct } from '../types';
import { STORAGE_KEYS, APP_CONFIG } from '../constants';

export interface CartItem {
  id: string;
  grain?: Grain;
  customProduct?: CustomProduct;
  quantity: number;
  grindingOption: GrindingOption;
  price: number;
  totalPrice: number;
  isSubscription?: boolean;
  subscriptionFrequency?: 'weekly' | 'biweekly' | 'monthly';
}

interface CartState {
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
  discount: number;
  finalAmount: number;
  isLoading: boolean;
  
  // Actions
  addItem: (item: Omit<CartItem, 'id' | 'totalPrice'>) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateGrindingOption: (itemId: string, grindingOption: GrindingOption) => void;
  toggleSubscription: (itemId: string, frequency?: 'weekly' | 'biweekly' | 'monthly') => void;
  clearCart: () => void;
  applyDiscount: (discount: number) => void;
  calculateTotals: () => void;
  getItemById: (itemId: string) => CartItem | undefined;
  isItemInCart: (grainId?: string, customProductId?: string) => boolean;
}

const calculateItemPrice = (
  basePrice: number,
  quantity: number,
  grindingOption: GrindingOption,
  isSubscription?: boolean,
  subscriptionFrequency?: string
): number => {
  let price = (basePrice + grindingOption.price) * quantity;
  
  // Apply subscription discount
  if (isSubscription && subscriptionFrequency) {
    const discountMap = {
      weekly: 0.05, // 5%
      biweekly: 0.08, // 8%
      monthly: 0.12, // 12%
    };
    const discountRate = discountMap[subscriptionFrequency as keyof typeof discountMap] || 0;
    price = price * (1 - discountRate);
  }
  
  return Math.round(price * 100) / 100; // Round to 2 decimal places
};

const generateCartItemId = (
  grainId?: string,
  customProductId?: string,
  grindingOptionId?: string
): string => {
  const baseId = grainId || customProductId || 'unknown';
  const grindingId = grindingOptionId || 'default';
  return `${baseId}_${grindingId}_${Date.now()}`;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      totalItems: 0,
      totalAmount: 0,
      discount: 0,
      finalAmount: 0,
      isLoading: false,

      addItem: (newItem) => {
        const { items } = get();
        
        // Check if cart is at maximum capacity
        if (items.length >= APP_CONFIG.MAX_CART_ITEMS) {
          throw new Error(`Maximum ${APP_CONFIG.MAX_CART_ITEMS} items allowed in cart`);
        }

        // Generate unique ID for the cart item
        const id = generateCartItemId(
          newItem.grain?.id,
          newItem.customProduct?.id,
          newItem.grindingOption.id
        );

        // Calculate total price
        const basePrice = newItem.grain?.pricePerKg || newItem.customProduct?.totalPrice || 0;
        const totalPrice = calculateItemPrice(
          basePrice,
          newItem.quantity,
          newItem.grindingOption,
          newItem.isSubscription,
          newItem.subscriptionFrequency
        );

        const cartItem: CartItem = {
          ...newItem,
          id,
          totalPrice,
        };

        set((state) => {
          const newItems = [...state.items, cartItem];
          const newState = { ...state, items: newItems };
          
          // Recalculate totals
          const calculatedState = calculateTotalsHelper(newState);
          return calculatedState;
        });
      },

      removeItem: (itemId) => {
        set((state) => {
          const newItems = state.items.filter(item => item.id !== itemId);
          const newState = { ...state, items: newItems };
          
          // Recalculate totals
          const calculatedState = calculateTotalsHelper(newState);
          return calculatedState;
        });
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }

        set((state) => {
          const newItems = state.items.map(item => {
            if (item.id === itemId) {
              const basePrice = item.grain?.pricePerKg || item.customProduct?.totalPrice || 0;
              const totalPrice = calculateItemPrice(
                basePrice,
                quantity,
                item.grindingOption,
                item.isSubscription,
                item.subscriptionFrequency
              );
              
              return {
                ...item,
                quantity,
                totalPrice,
              };
            }
            return item;
          });
          
          const newState = { ...state, items: newItems };
          
          // Recalculate totals
          const calculatedState = calculateTotalsHelper(newState);
          return calculatedState;
        });
      },

      updateGrindingOption: (itemId, grindingOption) => {
        set((state) => {
          const newItems = state.items.map(item => {
            if (item.id === itemId) {
              const basePrice = item.grain?.pricePerKg || item.customProduct?.totalPrice || 0;
              const totalPrice = calculateItemPrice(
                basePrice,
                item.quantity,
                grindingOption,
                item.isSubscription,
                item.subscriptionFrequency
              );
              
              return {
                ...item,
                grindingOption,
                totalPrice,
              };
            }
            return item;
          });
          
          const newState = { ...state, items: newItems };
          
          // Recalculate totals
          const calculatedState = calculateTotalsHelper(newState);
          return calculatedState;
        });
      },

      toggleSubscription: (itemId, frequency) => {
        set((state) => {
          const newItems = state.items.map(item => {
            if (item.id === itemId) {
              const isSubscription = !item.isSubscription;
              const subscriptionFrequency = isSubscription ? (frequency || 'monthly') : undefined;
              
              const basePrice = item.grain?.pricePerKg || item.customProduct?.totalPrice || 0;
              const totalPrice = calculateItemPrice(
                basePrice,
                item.quantity,
                item.grindingOption,
                isSubscription,
                subscriptionFrequency
              );
              
              return {
                ...item,
                isSubscription,
                subscriptionFrequency,
                totalPrice,
              };
            }
            return item;
          });
          
          const newState = { ...state, items: newItems };
          
          // Recalculate totals
          const calculatedState = calculateTotalsHelper(newState);
          return calculatedState;
        });
      },

      clearCart: () => {
        set({
          items: [],
          totalItems: 0,
          totalAmount: 0,
          discount: 0,
          finalAmount: 0,
        });
      },

      applyDiscount: (discount) => {
        set((state) => {
          const newState = { ...state, discount };
          const calculatedState = calculateTotalsHelper(newState);
          return calculatedState;
        });
      },

      calculateTotals: () => {
        set((state) => {
          const calculatedState = calculateTotalsHelper(state);
          return calculatedState;
        });
      },

      getItemById: (itemId) => {
        const { items } = get();
        return items.find(item => item.id === itemId);
      },

      isItemInCart: (grainId, customProductId) => {
        const { items } = get();
        return items.some(item => 
          (grainId && item.grain?.id === grainId) ||
          (customProductId && item.customProduct?.id === customProductId)
        );
      },
    }),
    {
      name: STORAGE_KEYS.CART_ITEMS,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        items: state.items,
        discount: state.discount,
      }),
      onRehydrateStorage: () => (state) => {
        // Recalculate totals after rehydration
        if (state) {
          const calculatedState = calculateTotalsHelper(state);
          Object.assign(state, calculatedState);
        }
      },
    }
  )
);

// Helper function to calculate totals
const calculateTotalsHelper = (state: CartState): CartState => {
  const totalItems = state.items.reduce((total, item) => total + item.quantity, 0);
  const totalAmount = state.items.reduce((total, item) => total + item.totalPrice, 0);
  const finalAmount = Math.max(0, totalAmount - state.discount);
  
  return {
    ...state,
    totalItems,
    totalAmount: Math.round(totalAmount * 100) / 100,
    finalAmount: Math.round(finalAmount * 100) / 100,
  };
};

// Selectors for convenience
export const selectCartItems = (state: CartState) => state.items;
export const selectTotalItems = (state: CartState) => state.totalItems;
export const selectTotalAmount = (state: CartState) => state.totalAmount;
export const selectFinalAmount = (state: CartState) => state.finalAmount;
export const selectDiscount = (state: CartState) => state.discount;
export const selectIsCartEmpty = (state: CartState) => state.items.length === 0;
export const selectSubscriptionItems = (state: CartState) => 
  state.items.filter(item => item.isSubscription);
export const selectRegularItems = (state: CartState) => 
  state.items.filter(item => !item.isSubscription);