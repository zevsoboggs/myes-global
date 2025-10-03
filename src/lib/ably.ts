// @ts-ignore - пакет ably добавляется как зависимость в проекте
import * as Ably from 'ably';

const apiKey = import.meta.env.VITE_ABLY_API_KEY as string;
export const ably = apiKey ? new Ably.Realtime({ key: apiKey }) : null;

if (ably) {
  // Автовосстановление соединения
  ably.connection.on((stateChange) => {
    if (stateChange.current === 'closed' || stateChange.current === 'failed') {
      try { ably.connect(); } catch {}
    }
  });
}

export function getChannel(name: string) {
  if (!ably) throw new Error('Ably не инициализирован. Добавьте VITE_ABLY_API_KEY и установите пакет ably.');
  return ably.channels.get(name);
}