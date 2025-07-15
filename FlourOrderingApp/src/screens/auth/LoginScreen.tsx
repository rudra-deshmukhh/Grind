import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput, Button, ActivityIndicator } from 'react-native-paper';
import Icon from '@expo/vector-icons/MaterialIcons';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Toast from 'react-native-toast-message';

import { useAuthStore } from '../../stores/authStore';
import { COLORS, SPACING, TYPOGRAPHY, VALIDATION, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../constants';
import { UserRole } from '../../types';

// Complete the auth session for Google
WebBrowser.maybeCompleteAuthSession();

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [isPhoneValid, setIsPhoneValid] = useState(false);

  const { login, googleLogin, resendOtp, isLoading, error, clearError } = useAuthStore();

  // Google OAuth configuration
  const [request, response, promptAsync] = AuthSession.useAuthRequest({
    clientId: 'your-google-client-id', // Replace with actual Google Client ID
    scopes: ['openid', 'profile', 'email'],
    redirectUri: AuthSession.makeRedirectUri({ useProxy: true }),
  });

  useEffect(() => {
    validatePhone(phone);
  }, [phone]);

  useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleLogin(response.authentication?.accessToken);
    }
  }, [response]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  useEffect(() => {
    if (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error,
      });
      clearError();
    }
  }, [error]);

  const validatePhone = (phoneNumber: string) => {
    const isValid = VALIDATION.PHONE.PATTERN.test(phoneNumber);
    setIsPhoneValid(isValid);
    return isValid;
  };

  const validateOtp = (otpValue: string) => {
    return VALIDATION.OTP.PATTERN.test(otpValue);
  };

  const handleSendOtp = async () => {
    if (!validatePhone(phone)) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Phone',
        text2: ERROR_MESSAGES.PHONE_INVALID,
      });
      return;
    }

    try {
      await resendOtp(phone);
      setShowOtpInput(true);
      setResendTimer(30);
      Toast.show({
        type: 'success',
        text1: 'OTP Sent',
        text2: SUCCESS_MESSAGES.OTP_SENT,
      });
    } catch (error) {
      console.error('Failed to send OTP:', error);
    }
  };

  const handleLogin = async () => {
    if (!validateOtp(otp)) {
      Toast.show({
        type: 'error',
        text1: 'Invalid OTP',
        text2: ERROR_MESSAGES.OTP_INVALID,
      });
      return;
    }

    try {
      await login({ phone, otp });
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: SUCCESS_MESSAGES.LOGIN_SUCCESS,
      });
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleGoogleLogin = async (accessToken?: string) => {
    if (!accessToken) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Google login failed',
      });
      return;
    }

    try {
      await googleLogin(accessToken);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: SUCCESS_MESSAGES.LOGIN_SUCCESS,
      });
    } catch (error) {
      console.error('Google login failed:', error);
    }
  };

  const handleResendOtp = async () => {
    try {
      await resendOtp(phone);
      setResendTimer(30);
      Toast.show({
        type: 'success',
        text1: 'OTP Sent',
        text2: SUCCESS_MESSAGES.OTP_SENT,
      });
    } catch (error) {
      console.error('Failed to resend OTP:', error);
    }
  };

  const navigateToRegister = () => {
    navigation.navigate('Register');
  };

  const navigateToRoleSelection = (role: UserRole) => {
    navigation.navigate('Register', { selectedRole: role });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Icon name="grain" size={60} color={COLORS.PRIMARY} />
              <Text style={styles.logoText}>FlourOrdering</Text>
            </View>
            <Text style={styles.subtitle}>Fresh flour delivered to your doorstep</Text>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Welcome Back</Text>

            {/* Phone Input */}
            <TextInput
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              mode="outlined"
              keyboardType="phone-pad"
              maxLength={10}
              placeholder="Enter your phone number"
              left={<TextInput.Icon icon="phone" />}
              style={styles.input}
              outlineColor={COLORS.BORDER}
              activeOutlineColor={COLORS.PRIMARY}
              disabled={showOtpInput || isLoading}
            />

            {/* Send OTP Button */}
            {!showOtpInput && (
              <Button
                mode="contained"
                onPress={handleSendOtp}
                disabled={!isPhoneValid || isLoading}
                style={styles.button}
                buttonColor={COLORS.PRIMARY}
                loading={isLoading}
              >
                Send OTP
              </Button>
            )}

            {/* OTP Input */}
            {showOtpInput && (
              <>
                <TextInput
                  label="Enter OTP"
                  value={otp}
                  onChangeText={setOtp}
                  mode="outlined"
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="Enter 6-digit OTP"
                  left={<TextInput.Icon icon="lock" />}
                  style={styles.input}
                  outlineColor={COLORS.BORDER}
                  activeOutlineColor={COLORS.PRIMARY}
                  disabled={isLoading}
                />

                {/* Login Button */}
                <Button
                  mode="contained"
                  onPress={handleLogin}
                  disabled={otp.length !== 6 || isLoading}
                  style={styles.button}
                  buttonColor={COLORS.PRIMARY}
                  loading={isLoading}
                >
                  Login
                </Button>

                {/* Resend OTP */}
                <TouchableOpacity
                  onPress={handleResendOtp}
                  disabled={resendTimer > 0 || isLoading}
                  style={styles.resendContainer}
                >
                  <Text style={styles.resendText}>
                    {resendTimer > 0
                      ? `Resend OTP in ${resendTimer}s`
                      : 'Resend OTP'
                    }
                  </Text>
                </TouchableOpacity>

                {/* Back to Phone */}
                <TouchableOpacity
                  onPress={() => setShowOtpInput(false)}
                  style={styles.backButton}
                >
                  <Icon name="arrow-back" size={20} color={COLORS.PRIMARY} />
                  <Text style={styles.backText}>Change Phone Number</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Login */}
            <Button
              mode="outlined"
              onPress={() => promptAsync()}
              disabled={!request || isLoading}
              style={styles.googleButton}
              buttonColor={COLORS.BACKGROUND}
              textColor={COLORS.TEXT_PRIMARY}
              icon="google"
            >
              Continue with Google
            </Button>

            {/* Register Link */}
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={navigateToRegister}>
                <Text style={styles.registerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Role Selection */}
          <View style={styles.roleContainer}>
            <Text style={styles.roleTitle}>Join as:</Text>
            <View style={styles.roleButtons}>
              <TouchableOpacity
                style={styles.roleButton}
                onPress={() => navigateToRoleSelection(UserRole.MILL)}
              >
                <Icon name="business" size={30} color={COLORS.PRIMARY} />
                <Text style={styles.roleButtonText}>Flour Mill</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.roleButton}
                onPress={() => navigateToRoleSelection(UserRole.DELIVERY)}
              >
                <Icon name="local-shipping" size={30} color={COLORS.PRIMARY} />
                <Text style={styles.roleButtonText}>Delivery Partner</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: SPACING.LG,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.XXL,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  logoText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.TITLE,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginTop: SPACING.SM,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.LG,
    marginBottom: SPACING.XL,
  },
  formTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.HEADING,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: SPACING.LG,
  },
  input: {
    marginBottom: SPACING.MD,
    backgroundColor: COLORS.BACKGROUND,
  },
  button: {
    marginTop: SPACING.SM,
    marginBottom: SPACING.MD,
  },
  resendContainer: {
    alignItems: 'center',
    marginVertical: SPACING.SM,
  },
  resendText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.PRIMARY,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.SM,
  },
  backText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.PRIMARY,
    marginLeft: SPACING.XS,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.LG,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.BORDER,
  },
  dividerText: {
    marginHorizontal: SPACING.MD,
    fontSize: TYPOGRAPHY.FONT_SIZE.SMALL,
    color: COLORS.TEXT_SECONDARY,
  },
  googleButton: {
    marginBottom: SPACING.MD,
    borderColor: COLORS.BORDER,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.SM,
  },
  registerText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_SECONDARY,
  },
  registerLink: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
  },
  roleContainer: {
    alignItems: 'center',
  },
  roleTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.LARGE,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  roleButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  roleButton: {
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.LG,
    minWidth: 120,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  roleButtonText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_PRIMARY,
    marginTop: SPACING.SM,
    textAlign: 'center',
  },
});

export default LoginScreen;