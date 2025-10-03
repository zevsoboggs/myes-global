import React from 'react';

export function MyesSystemPage() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="font-semibold text-gray-900 mb-3">Системная информация</div>
      <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
        <li>Версия фронтенда: Vite React</li>
        <li>Бэкенд: Supabase</li>
        <li>Реалтайм: Ably</li>
      </ul>
    </div>
  );
} 