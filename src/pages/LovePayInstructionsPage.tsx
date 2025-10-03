import React from 'react';

export function LovePayInstructionsPage() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5 text-sm text-gray-800">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Инструкции по работе Love&Pay</h2>
        <p>Этот раздел описывает ключевые процессы и где их выполнять.</p>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900">1) Заявки и счета</h3>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li>Фильтруйте заявки по статусу и дате, ищите по объектам/участникам.</li>
          <li>Выставляйте/редактируйте счета (USDT) и инструкции оплаты.</li>
          <li>Отмечайте «Оплачено», «Просрочен» или «Отменить» счёт.</li>
          <li>Используйте встроенный чат с быстрыми шаблонами сообщений.</li>
          <li>Экспортируйте список заявок в CSV.</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900">2) CRM</h3>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li>Следите за статусами сделок в канбане: pending → invoice_issued → payment_pending → paid.</li>
          <li>SLA-подсветка показывает просроченные по времени стадии (24/48/72ч).</li>
          <li>Быстрые действия под картой перемещают сделку по стадиям.</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900">3) Комиссии</h3>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li>Комиссии создаются автоматически после «Оплачено».</li>
          <li>Фильтр/поиск/сортировка, отметка «Оплачено», экспорт в CSV.</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900">4) Выплаты</h3>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li>Обрабатывайте заявки на вывод: Одобрить → Выплачено, либо Отклонить.</li>
          <li>Проверяйте метод и реквизиты выплат на карточке.</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900">5) Верификации</h3>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li>Просматривайте очередь запросов, Одобрить/Отклонить.</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900">6) Настройки</h3>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li>Задайте комиссию по умолчанию (%), шаблон инструкций оплаты.</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900">7) Аудит</h3>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li>Сводный лог последних изменений по заявкам/счетам/выплатам.</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900">Точки входа</h3>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li>Вход сотрудника: /lovepay/login</li>
          <li>Раздел: /lovepay/* (Заявки, CRM, Комиссии, Выплаты, Верификации, Настройки, Аудит)</li>
        </ul>
      </div>
    </div>
  );
} 