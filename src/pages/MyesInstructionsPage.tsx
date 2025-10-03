import React from 'react';

export function MyesInstructionsPage() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3 text-sm text-gray-800">
      <div className="font-semibold text-gray-900">Инструкции MYES Admin</div>
      <ul className="list-disc pl-5 space-y-1">
        <li>Обзор — ключевые метрики и быстрые ссылки.</li>
        <li>Пользователи — поиск, фильтры, просмотр профилей.</li>
        <li>Объекты — контроль каталога, статусов активности.</li>
        <li>Сделки/Счета — мониторинг статусов и сумм.</li>
        <li>Чаты/Уведомления — коммуникации и события.</li>
        <li>Аналитика — агрегированные метрики и выручка.</li>
        <li>Лиды — статусы лидов риелторов.</li>
        <li>Настройки/Система/Фичи — конфигурация и служебные разделы.</li>
      </ul>
    </div>
  );
} 