export type SaleStatus = 'pending' | 'invoice_issued' | 'payment_pending' | 'paid' | 'cancelled';
export type InvoiceStatus = 'created' | 'paid' | 'cancelled' | 'expired' | 'pending' | 'invoice_issued';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';
export type CommissionStatus = 'ready' | 'paid' | 'pending' | 'rejected';
export type PayoutStatus = 'approved' | 'paid' | 'rejected' | 'pending';
export type LeadStatus = 'new' | 'in_progress' | 'won' | 'lost' | 'pending' | 'cancelled';

export function getSaleStatusLabel(status?: string, t?: (key: string) => string): string {
  if (t && status) {
    const translationKey = `status.sale.${status}`;
    const translated = t(translationKey);
    // If translation exists and is different from the key, use it
    if (translated !== translationKey) {
      return translated;
    }
  }

  // Fallback to hardcoded Russian labels
  const map: Record<string, string> = {
    pending: 'Новая',
    invoice_issued: 'Счёт выставлен',
    payment_pending: 'Ожидает оплату',
    paid: 'Оплачено',
    cancelled: 'Отменена',
  };
  return status ? (map[status] || status) : '—';
}

export function getInvoiceStatusLabel(status?: string, t?: (key: string) => string): string {
  if (t && status) {
    const translationKey = `status.invoice.${status}`;
    const translated = t(translationKey);
    // If translation exists and is different from the key, use it
    if (translated !== translationKey) {
      return translated;
    }
  }

  // Fallback to hardcoded Russian labels
  const map: Record<string, string> = {
    created: 'Счёт выставлен',
    invoice_issued: 'Счёт выставлен',
    pending: 'Ожидает оплату',
    paid: 'Оплачено',
    cancelled: 'Отменён',
    expired: 'Просрочен',
  };
  return status ? (map[status] || status) : '—';
}

export function formatUsdt(amount?: number | null): string {
  if (typeof amount !== 'number' || !isFinite(amount)) return '—';
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(amount)} USDT`;
}

export function getVerificationStatusLabel(status?: string): string {
  const map: Record<string, string> = {
    pending: 'На рассмотрении',
    approved: 'Одобрено',
    rejected: 'Отклонено',
  };
  return status ? (map[status] || status) : '—';
}

export function getCommissionStatusLabel(status?: string): string {
  const map: Record<string, string> = {
    ready: 'Готово к выплате',
    paid: 'Выплачено',
    pending: 'Ожидает',
    rejected: 'Отклонено',
  };
  return status ? (map[status] || status) : '—';
}

export function getPayoutStatusLabel(status?: string): string {
  const map: Record<string, string> = {
    approved: 'Подтверждено',
    paid: 'Выплачено',
    rejected: 'Отклонено',
    pending: 'Ожидает',
  };
  return status ? (map[status] || status) : '—';
}

export function getLeadStatusLabel(status?: string): string {
  const map: Record<string, string> = {
    new: 'Новая',
    in_progress: 'В работе',
    won: 'Успешно',
    lost: 'Потеряно',
    pending: 'Ожидает',
    cancelled: 'Отменена',
  };
  return status ? (map[status] || status.replace(/_/g, ' ')) : '—';
}

// Заменяет известные технические статусы в тексте на понятные по-русски
export function translateStatusTokensInText(text: string): string {
  if (!text) return text;
  const replacements: Record<string, string> = {
    'paid': 'Оплачено',
    'created': 'Счёт выставлен',
    'invoice_issued': 'Счёт выставлен',
    'payment_pending': 'Ожидает оплату',
    'pending': 'Ожидает',
    'cancelled': 'Отменён',
    'expired': 'Просрочен',
    'approved': 'Подтверждено',
    'rejected': 'Отклонено',
    'ready': 'Готово к выплате',
  };
  return text.replace(/\b(paid|created|invoice_issued|payment_pending|pending|cancelled|expired|approved|rejected|ready)\b/g, (m) => replacements[m] || m);
}


