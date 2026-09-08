importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker.
firebase.initializeApp({
  apiKey: "AIzaSyDvSgXJlLNKlxOerFPQgyKdIHkBNhiLy_w",
  authDomain: "hadkarmeals.firebaseapp.com",
  projectId: "hadkarmeals",
  storageBucket: "hadkarmeals.firebasestorage.app",
  messagingSenderId: "1044669106918",
  appId: "1:1044669106918:web:502d97f33751da27710927"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || 'Hadkar Meals';
  const notificationOptions = {
    body: payload.notification?.body || 'New notification from Hadkar Meals',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      click_action: payload.data?.click_action || payload.fcmOptions?.link || '/'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data?.click_action || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
