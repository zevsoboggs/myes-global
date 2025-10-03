import { supabase } from './supabase';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export async function enableWebPush(userId: string): Promise<boolean> {
  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!publicKey) {
    throw new Error('Отсутствует VITE_VAPID_PUBLIC_KEY');
  }
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker не поддерживается в этом браузере');
  }
  if (!('PushManager' in window)) {
    throw new Error('Push API не поддерживается в этом браузере');
  }
  if (!window.isSecureContext) {
    // Разрешено на localhost, но на http в проде — нет
    const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!isLocalhost) throw new Error('Требуется защищённый контекст (HTTPS)');
  }
  const reg = await navigator.serviceWorker.register('/sw.js');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    throw new Error('Разрешение на уведомления не выдано');
  }
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
  const payload = sub.toJSON() as any;
  const endpoint = payload.endpoint;
  const p256dh = payload.keys?.p256dh;
  const auth = payload.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    throw new Error('Не удалось сформировать подписку');
  }
  const { error } = await supabase.from('webpush_subscriptions').upsert({ user_id: userId, endpoint, p256dh, auth });
  if (error) {
    // Дадим понятное сообщение — возможно, таблицы нет или RLS
    throw new Error('Ошибка сохранения подписки в БД');
  }
  return true;
}