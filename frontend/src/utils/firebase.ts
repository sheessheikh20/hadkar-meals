import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { api } from '../api/client';

// Firebase Web configuration for Hadkar Meals
const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || "AIzaSyDvSgXJlLNKlxOerFPQgyKdIHkBNhiLy_w",
  authDomain: "hadkarmeals.firebaseapp.com",
  projectId: "hadkarmeals",
  storageBucket: "hadkarmeals.firebasestorage.app",
  messagingSenderId: "1044669106918",
  appId: "1:1044669106918:web:502d97f33751da27710927",
  measurementId: "G-S11P12SFM3"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let messaging: Messaging | null = null;
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
  try {
    messaging = getMessaging(app);
  } catch (err) {
    console.warn('Firebase Messaging not supported on this device/browser:', err);
  }
}

/**
 * Request Notification Permission and send FCM token to Spring Boot backend
 */
export async function requestNotificationPermission(): Promise<string | null> {
  if (!messaging) {
    console.warn('FCM messaging is not initialized');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Push notification permission denied by user');
      return null;
    }

    // Register service worker if not already registered
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    const vapidKey = (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY
      || "BNEptrVy-0z5-6mgMx9xsP8_2hAFcmrvurjwgO0JXwcf1rMAOxPZegFleeMRBcYVBqsB6UuaB5FwohV4FcZkfF0";
    const token = await getToken(messaging, {
      serviceWorkerRegistration: registration,
      vapidKey,
    });

    if (token) {
      console.log('✅ FCM Web Token generated:', token);
      localStorage.setItem('fcm_token', token);

      // Send token to backend if logged in
      try {
        await api.registerFcmToken(token, 'WEB');
      } catch (e) {
        console.warn('Could not register token on server yet (might be logged out):', e);
      }
      return token;
    }
    return null;
  } catch (error) {
    console.error('Error generating FCM token:', error);
    return null;
  }
}

/**
 * Foreground message listener (when the website is actively open)
 */
export function onForegroundMessage(callback: (payload: any) => void) {
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    console.log('📩 Foreground push notification received:', payload);
    callback(payload);

    // Also trigger native desktop notification if permitted
    if (Notification.permission === 'granted') {
      new Notification(payload.notification?.title || 'Hadkar Meals', {
        body: payload.notification?.body,
        icon: '/icon-192.png'
      });
    }
  });
}
