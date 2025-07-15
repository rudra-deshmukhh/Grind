import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import AppNavigator from './src/navigation/AppNavigator';
import { COLORS } from './src/constants';

const theme = {
  colors: {
    primary: COLORS.PRIMARY,
    secondary: COLORS.SECONDARY,
    accent: COLORS.ACCENT,
    background: COLORS.BACKGROUND,
    surface: COLORS.SURFACE,
    text: COLORS.TEXT_PRIMARY,
    error: COLORS.ERROR,
    placeholder: COLORS.TEXT_SECONDARY,
    backdrop: 'rgba(0, 0, 0, 0.5)',
    onSurface: COLORS.TEXT_PRIMARY,
    disabled: COLORS.TEXT_MUTED,
    notification: COLORS.INFO,
  },
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <StatusBar style="auto" backgroundColor={COLORS.PRIMARY} />
          <AppNavigator />
          <Toast />
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
