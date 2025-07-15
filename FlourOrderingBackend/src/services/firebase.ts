import admin from 'firebase-admin';
import { config } from '@config/index';
import logger from '@utils/logger';

class FirebaseService {
  private static instance: FirebaseService;
  private adminApp: admin.app.App;

  private constructor() {
    try {
      // Initialize Firebase Admin SDK
      this.adminApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.firebase.projectId,
          privateKeyId: config.firebase.privateKeyId,
          privateKey: config.firebase.privateKey,
          clientEmail: config.firebase.clientEmail,
          clientId: config.firebase.clientId,
          authUri: config.firebase.authUri,
          tokenUri: config.firebase.tokenUri,
          authProviderX509CertUrl: config.firebase.authProviderX509CertUrl,
          clientX509CertUrl: config.firebase.clientX509CertUrl,
        }),
        projectId: config.firebase.projectId,
      });

      logger.info('Firebase Admin SDK initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Firebase Admin SDK:', error);
      throw error;
    }
  }

  public static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  /**
   * Verify Firebase ID token
   */
  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      logger.error('Failed to verify Firebase ID token:', error);
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Get user by Firebase UID
   */
  async getUserByUid(uid: string): Promise<admin.auth.UserRecord> {
    try {
      const userRecord = await admin.auth().getUser(uid);
      return userRecord;
    } catch (error) {
      logger.error(`Failed to get user by UID ${uid}:`, error);
      throw new Error('User not found');
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<admin.auth.UserRecord> {
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      return userRecord;
    } catch (error) {
      logger.error(`Failed to get user by email ${email}:`, error);
      throw new Error('User not found');
    }
  }

  /**
   * Get user by phone number
   */
  async getUserByPhone(phoneNumber: string): Promise<admin.auth.UserRecord> {
    try {
      const userRecord = await admin.auth().getUserByPhoneNumber(phoneNumber);
      return userRecord;
    } catch (error) {
      logger.error(`Failed to get user by phone ${phoneNumber}:`, error);
      throw new Error('User not found');
    }
  }

  /**
   * Create a new Firebase user
   */
  async createUser(userData: {
    email: string;
    phoneNumber?: string;
    displayName?: string;
    password?: string;
    emailVerified?: boolean;
    disabled?: boolean;
  }): Promise<admin.auth.UserRecord> {
    try {
      const userRecord = await admin.auth().createUser(userData);
      logger.info(`Created Firebase user: ${userRecord.uid}`);
      return userRecord;
    } catch (error) {
      logger.error('Failed to create Firebase user:', error);
      throw error;
    }
  }

  /**
   * Update Firebase user
   */
  async updateUser(
    uid: string,
    userData: {
      email?: string;
      phoneNumber?: string;
      displayName?: string;
      password?: string;
      emailVerified?: boolean;
      disabled?: boolean;
    }
  ): Promise<admin.auth.UserRecord> {
    try {
      const userRecord = await admin.auth().updateUser(uid, userData);
      logger.info(`Updated Firebase user: ${uid}`);
      return userRecord;
    } catch (error) {
      logger.error(`Failed to update Firebase user ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Delete Firebase user
   */
  async deleteUser(uid: string): Promise<void> {
    try {
      await admin.auth().deleteUser(uid);
      logger.info(`Deleted Firebase user: ${uid}`);
    } catch (error) {
      logger.error(`Failed to delete Firebase user ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Set custom claims for user
   */
  async setCustomClaims(uid: string, claims: Record<string, any>): Promise<void> {
    try {
      await admin.auth().setCustomUserClaims(uid, claims);
      logger.info(`Set custom claims for user: ${uid}`, claims);
    } catch (error) {
      logger.error(`Failed to set custom claims for user ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Generate custom token
   */
  async createCustomToken(uid: string, additionalClaims?: Record<string, any>): Promise<string> {
    try {
      const customToken = await admin.auth().createCustomToken(uid, additionalClaims);
      return customToken;
    } catch (error) {
      logger.error(`Failed to create custom token for user ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  async generatePasswordResetLink(email: string): Promise<string> {
    try {
      const link = await admin.auth().generatePasswordResetLink(email);
      logger.info(`Generated password reset link for: ${email}`);
      return link;
    } catch (error) {
      logger.error(`Failed to generate password reset link for ${email}:`, error);
      throw error;
    }
  }

  /**
   * Send email verification link
   */
  async generateEmailVerificationLink(email: string): Promise<string> {
    try {
      const link = await admin.auth().generateEmailVerificationLink(email);
      logger.info(`Generated email verification link for: ${email}`);
      return link;
    } catch (error) {
      logger.error(`Failed to generate email verification link for ${email}:`, error);
      throw error;
    }
  }

  /**
   * List users with pagination
   */
  async listUsers(maxResults: number = 1000, pageToken?: string): Promise<admin.auth.ListUsersResult> {
    try {
      const listUsersResult = await admin.auth().listUsers(maxResults, pageToken);
      return listUsersResult;
    } catch (error) {
      logger.error('Failed to list users:', error);
      throw error;
    }
  }

  /**
   * Send notification to user
   */
  async sendNotification(
    tokens: string | string[],
    payload: {
      title: string;
      body: string;
      data?: Record<string, string>;
      imageUrl?: string;
    }
  ): Promise<admin.messaging.BatchResponse | admin.messaging.MessagingDevicesResponse> {
    try {
      const message: admin.messaging.Message | admin.messaging.MulticastMessage = {
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data,
        android: {
          notification: {
            icon: 'stock_ticker_update',
            color: '#8B4513',
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      if (Array.isArray(tokens)) {
        const multicastMessage: admin.messaging.MulticastMessage = {
          ...message,
          tokens,
        };
        return await admin.messaging().sendMulticast(multicastMessage);
      } else {
        const singleMessage: admin.messaging.Message = {
          ...message,
          token: tokens,
        };
        await admin.messaging().send(singleMessage);
        return { successCount: 1, failureCount: 0, responses: [] } as admin.messaging.BatchResponse;
      }
    } catch (error) {
      logger.error('Failed to send notification:', error);
      throw error;
    }
  }

  /**
   * Send notification to topic
   */
  async sendNotificationToTopic(
    topic: string,
    payload: {
      title: string;
      body: string;
      data?: Record<string, string>;
      imageUrl?: string;
    }
  ): Promise<string> {
    try {
      const message: admin.messaging.Message = {
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data,
        topic,
        android: {
          notification: {
            icon: 'stock_ticker_update',
            color: '#8B4513',
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const messageId = await admin.messaging().send(message);
      logger.info(`Sent notification to topic ${topic}: ${messageId}`);
      return messageId;
    } catch (error) {
      logger.error(`Failed to send notification to topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe user to topic
   */
  async subscribeToTopic(tokens: string | string[], topic: string): Promise<admin.messaging.MessagingTopicManagementResponse> {
    try {
      const tokensArray = Array.isArray(tokens) ? tokens : [tokens];
      const response = await admin.messaging().subscribeToTopic(tokensArray, topic);
      logger.info(`Subscribed ${tokensArray.length} tokens to topic: ${topic}`);
      return response;
    } catch (error) {
      logger.error(`Failed to subscribe to topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe user from topic
   */
  async unsubscribeFromTopic(tokens: string | string[], topic: string): Promise<admin.messaging.MessagingTopicManagementResponse> {
    try {
      const tokensArray = Array.isArray(tokens) ? tokens : [tokens];
      const response = await admin.messaging().unsubscribeFromTopic(tokensArray, topic);
      logger.info(`Unsubscribed ${tokensArray.length} tokens from topic: ${topic}`);
      return response;
    } catch (error) {
      logger.error(`Failed to unsubscribe from topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Get Firebase app instance
   */
  getApp(): admin.app.App {
    return this.adminApp;
  }

  /**
   * Get Auth instance
   */
  getAuth(): admin.auth.Auth {
    return admin.auth(this.adminApp);
  }

  /**
   * Get Messaging instance
   */
  getMessaging(): admin.messaging.Messaging {
    return admin.messaging(this.adminApp);
  }
}

// Export singleton instance
const firebaseService = FirebaseService.getInstance();
export default firebaseService;