import { useEffect } from 'react';
import api from '../services/api';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  useEffect(() => {
    register();
  }, []);
}

async function register() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const reg = await navigator.serviceWorker.ready;

    // Fetch VAPID public key from backend
    const { data } = await api.get('/push/vapid-key');
    const appServerKey = urlBase64ToUint8Array(data.publicKey);

    const existing = await reg.pushManager.getSubscription();
    const subscription = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: appServerKey.buffer as ArrayBuffer,
    });

    await api.post('/push/subscribe', { subscription });
  } catch {
    // Silently fail — push is optional
  }
}
