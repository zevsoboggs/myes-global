import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Loader2, CheckCircle, DollarSign, Phone, Mail, Image as ImageIcon, Search, ArrowUpDown, Download, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { getChannel } from '../lib/ably';
import { getSaleStatusLabel, getInvoiceStatusLabel, formatUsdt } from '../lib/status';

export function LovePayRequestsPage() {
  const { user, profile, loading } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = requests.find((r) => r.id === activeId) || (requests[0] || null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editInstr, setEditInstr] = useState<string>('');
  const [showGenerator, setShowGenerator] = useState(false);
  const [generatorAccount, setGeneratorAccount] = useState<string>('');
  const [generatorNetwork, setGeneratorNetwork] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [msgText, setMsgText] = useState('');

  // UI: фильтры/поиск/сортировка/страницы
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all'|'pending'|'invoice_issued'|'payment_pending'|'paid'|'cancelled'>('all');
  const [sortKey, setSortKey] = useState<'created_at'|'amount'|'status'|'invoice_status'>('created_at');
  const [sortDir, setSortDir] = useState<'desc'|'asc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const metrics = useMemo(() => {
    const total = requests.length;
    const sumAll = requests.reduce((s, r) => s + (Number(r.invoice?.amount_usdt || 0)), 0);
    const sumPaid = requests.filter(r => r.invoice?.status === 'paid').reduce((s, r) => s + (Number(r.invoice?.amount_usdt || 0)), 0);
    const pending = requests.filter(r => r.status === 'pending').length;
    const awaiting = requests.filter(r => r.status === 'payment_pending').length;
    return { total, sumAll, sumPaid, pending, awaiting };
  }, [requests]);

  useEffect(() => {
    if (!user || loading) return;
    (async () => {
      const { data, error } = await supabase
        .from('sales_requests')
        .select(`
          *,
          property:properties(
            id,title,address,property_type,bedrooms,bathrooms,area_sqm,
            property_images(id,image_url,is_primary)
          ),
          buyer:profiles!sales_requests_buyer_id_fkey(full_name,email,phone),
          realtor:profiles!sales_requests_realtor_id_fkey(full_name,email,phone,agency_name,commission_rate),
          invoice:invoices(*)
        `)
        .order('created_at', { ascending: false });
      if (!error) setRequests(data || []);
      setLoadingList(false);
    })();
  }, [user, loading]);

  useEffect(() => {
    if (!active) return;
    setEditAmount(active?.invoice?.amount_usdt ? String(active.invoice.amount_usdt) : '');
    setEditInstr(active?.invoice?.payment_instructions || '');
    setShowGenerator(false);
    (async () => {
      if (active.property && (!active.property.property_images || active.property.property_images.length === 0)) {
        const { data } = await supabase
          .from('property_images')
          .select('id,image_url,is_primary')
          .eq('property_id', active.property.id)
          .order('is_primary', { ascending: false });
        if (data && data.length) {
          setRequests((prev) => prev.map((r) => r.id === active.id ? { ...r, property: { ...r.property, property_images: data } } : r));
        }
      }
      if (active.property?.id && active.buyer && active.realtor) {
        const { data: conv } = await supabase
          .from('conversations')
          .select('id')
          .eq('buyer_id', active.buyer_id)
          .eq('realtor_id', active.realtor_id)
          .eq('property_id', active.property.id)
          .maybeSingle();
        let id = conv?.id;
        if (!id) {
          const { data: c2 } = await supabase
            .from('conversations')
            .insert({ buyer_id: active.buyer_id, realtor_id: active.realtor_id, property_id: active.property.id })
            .select('id')
            .single();
          id = c2?.id || null;
        }
        setConvId(id || null);
        if (id) {
          const { data: msgs } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', id)
            .order('created_at', { ascending: true });
          setMessages(msgs || []);
          try {
            const ch = getChannel(`conv:${id}`);
            const handler = (m: any) => {
              if (m?.name === 'message:new') {
                const mm = m.data;
                setMessages((prev) => (prev.some((x) => x.id === mm.id) ? prev : [...prev, mm]));
              }
            };
            ch.subscribe('message:new', handler);
          } catch {}
        }
      }
    })();
  }, [activeId, loadingList]);

  const sendMessage = async () => {
    if (!convId || !msgText.trim() || !user) return;
    const text = msgText.trim();
    if (text.length > 2000) { alert('Слишком длинное сообщение'); return; }
    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: convId, sender_id: user.id, content: text })
      .select('*')
      .single();
    if (!error && data) {
      setMsgText('');
      try {
        const ch = getChannel(`conv:${convId}`);
        ch.publish('message:new', data);
      } catch {}
    }
  };

  const generateInstructions = () => {
    if (!generatorAccount.trim() || !generatorNetwork || !editAmount) {
      alert('Заполните все поля для генерации инструкций');
      return;
    }

    const amount = editAmount;
    const account = generatorAccount.trim();
    const network = generatorNetwork;

    const getNetworkName = (network: string, lang: 'ru' | 'en') => {
      const networks = {
        'trc20': lang === 'ru' ? 'TRC20 (Tron)' : 'TRC20 (Tron)',
        'erc20': lang === 'ru' ? 'ERC20 (Ethereum)' : 'ERC20 (Ethereum)',
        'bep20': lang === 'ru' ? 'BEP20 (BSC)' : 'BEP20 (BSC)',
        'polygon': lang === 'ru' ? 'Polygon' : 'Polygon',
        'arbitrum': lang === 'ru' ? 'Arbitrum' : 'Arbitrum'
      } as any;
      return networks[network] || network;
    };

    // Generate instructions for Russian
    const ruInstructions = `Инструкции по оплате

Сумма к оплате: ${amount} USDT
Сеть: ${getNetworkName(network, 'ru')}

Адрес для перевода:
${account}

Пошаговая инструкция:
1. Откройте ваш криптокошелек или биржу
2. Выберите сеть ${getNetworkName(network, 'ru')}
3. Отправьте точно ${amount} USDT на указанный адрес
4. Дождитесь подтверждения транзакции
5. Сохраните хеш транзакции для подтверждения

ВАЖНО:
• Обязательно используйте сеть ${getNetworkName(network, 'ru')}
• Отправьте точную сумму ${amount} USDT
• Проверьте адрес перед отправкой
• Учитывайте комиссии сети при переводе

При возникновении вопросов обращайтесь в поддержку.`;

    // Generate instructions for English
    const enInstructions = `Payment Instructions

Amount to pay: ${amount} USDT
Network: ${getNetworkName(network, 'en')}

Transfer address:
${account}

Step-by-step instructions:
1. Open your crypto wallet or exchange
2. Select ${getNetworkName(network, 'en')} network
3. Send exactly ${amount} USDT to the specified address
4. Wait for transaction confirmation
5. Save the transaction hash for confirmation

IMPORTANT:
• Make sure to use ${getNetworkName(network, 'en')} network
• Send the exact amount ${amount} USDT
• Double-check the address before sending
• Consider network fees when transferring

Contact support if you have any questions.`;

    const combined = `🇷🇺 РУССКИЙ:

${ruInstructions}

${'='.repeat(50)}

🇺🇸 ENGLISH:

${enInstructions}`;

    setEditInstr(combined);
    alert('Инструкции сгенерированы!');
  };

  const issueOrSaveInvoice = async () => {
    if (!active) return;
    const amount = Number(editAmount);
    const instr = editInstr.trim();
    if (!amount || amount <= 0 || !Number.isFinite(amount)) { alert('Некорректная сумма'); return; }
    if (!instr) { alert('Заполните инструкции оплаты'); return; }
    setSaving(true);
    try {
      if (!active.invoice) {
        await supabase.from('invoices').insert({ sales_request_id: active.id, amount_usdt: amount, payment_instructions: instr });
        await supabase.from('sales_requests').update({ status: 'invoice_issued' }).eq('id', active.id);
      } else {
        if (active.invoice.status === 'paid') { alert('Оплаченный счет нельзя изменить'); return; }
        await supabase.from('invoices').update({ amount_usdt: amount, payment_instructions: instr }).eq('id', active.invoice.id);
      }
      const { data } = await supabase
        .from('sales_requests')
        .select(`*, property:properties(id,title,address,property_type,bedrooms,bathrooms,area_sqm, property_images(id,image_url,is_primary)), buyer:profiles!sales_requests_buyer_id_fkey(full_name,email,phone), realtor:profiles!sales_requests_realtor_id_fkey(full_name,email,phone,agency_name,commission_rate), invoice:invoices(*)`)
        .order('created_at', { ascending: false });
      setRequests(data || []);
    } finally {
      setSaving(false);
    }
  };

  const cancelInvoice = async () => {
    if (!active || !active.invoice) return;
    if (active.invoice.status === 'paid') { alert('Оплаченный счет нельзя отменить'); return; }
    setSaving(true);
    try {
      await supabase.from('invoices').update({ status: 'cancelled' }).eq('id', active.invoice.id);
      await supabase.from('sales_requests').update({ status: 'cancelled' }).eq('id', active.id);
      const { data } = await supabase
        .from('sales_requests')
        .select(`*, property:properties(id,title,address,property_type,bedrooms,bathrooms,area_sqm, property_images(id,image_url,is_primary)), buyer:profiles!sales_requests_buyer_id_fkey(full_name,email,phone), realtor:profiles!sales_requests_realtor_id_fkey(full_name,email,phone,agency_name,commission_rate), invoice:invoices(*)`)
        .order('created_at', { ascending: false });
      setRequests(data || []);
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async () => {
    if (!active || !active.invoice) return;
    if (active.invoice.status === 'paid') return;
    setSaving(true);
    try {
      await supabase.from('invoices').update({ status: 'paid' }).eq('id', active.invoice.id);
      await supabase.from('sales_requests').update({ status: 'paid' }).eq('id', active.id);
      const { data } = await supabase
        .from('sales_requests')
        .select(`*, property:properties(id,title,address,property_type,bedrooms,bathrooms,area_sqm, property_images(id,image_url,is_primary)), buyer:profiles!sales_requests_buyer_id_fkey(full_name,email,phone), realtor:profiles!sales_requests_realtor_id_fkey(full_name,email,phone,agency_name,commission_rate), invoice:invoices(*)`)
        .order('created_at', { ascending: false });
      setRequests(data || []);
    } finally {
      setSaving(false);
    }
  };

  const markInvoiceExpired = async () => {
    if (!active || !active.invoice) return;
    if (active.invoice.status === 'paid') { alert('Оплаченный счет нельзя пометить просроченным'); return; }
    setSaving(true);
    try {
      await supabase.from('invoices').update({ status: 'expired' }).eq('id', active.invoice.id);
      const { data } = await supabase
        .from('sales_requests')
        .select(`*, property:properties(id,title,address,property_type,bedrooms,bathrooms,area_sqm, property_images(id,image_url,is_primary)), buyer:profiles!sales_requests_buyer_id_fkey(full_name,email,phone), realtor:profiles!sales_requests_realtor_id_fkey(full_name,email,phone,agency_name,commission_rate), invoice:invoices(*)`)
        .order('created_at', { ascending: false });
      setRequests(data || []);
    } finally {
      setSaving(false);
    }
  };

  const setSaleStatus = async (status: 'pending'|'invoice_issued'|'payment_pending'|'paid'|'cancelled') => {
    if (!active) return;
    if (active.invoice?.status === 'paid' && status !== 'paid') { alert('Нельзя менять статус оплаченной сделки'); return; }
    setSaving(true);
    try {
      await supabase.from('sales_requests').update({ status }).eq('id', active.id);
      const { data } = await supabase
        .from('sales_requests')
        .select(`*, property:properties(id,title,address,property_type,bedrooms,bathrooms,area_sqm, property_images(id,image_url,is_primary)), buyer:profiles!sales_requests_buyer_id_fkey(full_name,email,phone), realtor:profiles!sales_requests_realtor_id_fkey(full_name,email,phone,agency_name,commission_rate), invoice:invoices(*)`)
        .order('created_at', { ascending: false });
      setRequests(data || []);
    } finally {
      setSaving(false);
    }
  };

  // список/фильтры/сортировка/страницы
  const viewRequests = useMemo(() => {
    let arr = [...requests];
    if (statusFilter !== 'all') arr = arr.filter(r => r.status === statusFilter);
    if (dateFrom) { const ts = new Date(dateFrom).getTime(); arr = arr.filter(r => new Date(r.created_at).getTime() >= ts); }
    if (dateTo) { const ts = new Date(dateTo + 'T23:59:59').getTime(); arr = arr.filter(r => new Date(r.created_at).getTime() <= ts); }
    const q = searchText.trim().toLowerCase();
    if (q) {
      arr = arr.filter(r =>
        (r.property?.title || '').toLowerCase().includes(q) ||
        (r.property?.address || '').toLowerCase().includes(q) ||
        (r.buyer?.full_name || '').toLowerCase().includes(q) ||
        (r.realtor?.full_name || '').toLowerCase().includes(q) ||
        (r.id || '').toLowerCase().includes(q)
      );
    }
    const statusOrder: Record<string, number> = { pending: 1, invoice_issued: 2, payment_pending: 3, paid: 4, cancelled: 5 };
    arr.sort((a, b) => {
      let va: any = 0; let vb: any = 0;
      if (sortKey === 'created_at') { va = new Date(a.created_at).getTime(); vb = new Date(b.created_at).getTime(); }
      else if (sortKey === 'amount') { va = a.invoice?.amount_usdt || 0; vb = b.invoice?.amount_usdt || 0; }
      else if (sortKey === 'status') { va = statusOrder[a.status] || 99; vb = statusOrder[b.status] || 99; }
      else if (sortKey === 'invoice_status') { va = (a.invoice?.status || '').localeCompare(b.invoice?.status || ''); vb = 0; }
      const d = va > vb ? 1 : va < vb ? -1 : 0;
      return sortDir === 'asc' ? d : -d;
    });
    return arr;
  }, [requests, statusFilter, searchText, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(viewRequests.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return viewRequests.slice(start, start + pageSize);
  }, [viewRequests, currentPage, pageSize]);

  const exportCSV = () => {
    const headers = ['id','status','created_at','property_title','buyer','realtor','invoice_status','amount_usdt'];
    const rows = viewRequests.map(r => [
      r.id,
      r.status,
      r.created_at,
      r.property?.title || '',
      r.buyer?.full_name || '',
      r.realtor?.full_name || '',
      r.invoice?.status || '',
      r.invoice?.amount_usdt ?? ''
    ]);
    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      const escaped = str.replace(/"/g, '""');
      return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
    };
    const csv = [headers.join(','), ...rows.map(r => r.map(escapeCsv).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lovepay_requests_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || loadingList) return <div className="p-6 text-gray-600 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  if (!profile || profile.role !== 'lovepay') return <div className="p-6 text-gray-700">Нет доступа</div>;

  return (
    <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
      {/* Список */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-100 shadow-sm w-full">
        {/* Метрики */}
        <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2 border-b">
          <div className="rounded-xl border bg-gray-50 px-3 py-2">
            <div className="text-[11px] text-gray-600">Всего</div>
            <div className="text-sm font-semibold text-gray-900">{metrics.total}</div>
          </div>
          <div className="rounded-xl border bg-gray-50 px-3 py-2">
            <div className="text-[11px] text-gray-600">Счета, USDT</div>
            <div className="text-sm font-semibold text-gray-900">{metrics.sumAll}</div>
          </div>
          <div className="rounded-xl border bg-gray-50 px-3 py-2">
            <div className="text-[11px] text-gray-600">Оплачено, USDT</div>
            <div className="text-sm font-semibold text-gray-900">{metrics.sumPaid}</div>
          </div>
          <div className="rounded-xl border bg-gray-50 px-3 py-2">
            <div className="text-[11px] text-gray-600">Ожидание оплаты</div>
            <div className="text-sm font-semibold text-gray-900">{metrics.awaiting}</div>
          </div>
        </div>
        <div className="p-3 border-b font-semibold text-gray-900 flex items-center justify-between">
          <span>Запросы на продажу</span>
          <span className="text-xs text-gray-500">{viewRequests.length} найдено</span>
        </div>
        <div className="p-3 space-y-2">
          {/* Фильтр по статусам: перенос по строкам, без горизонтального скролла */}
          <div className="w-full">
            <div className="flex flex-wrap items-center gap-2">
              {(['all','pending','invoice_issued','payment_pending','paid','cancelled'] as const).map(st => (
                <button key={st} onClick={() => { setStatusFilter(st); setPage(1); }} className={`px-3 py-1.5 rounded-xl text-xs border whitespace-nowrap ${statusFilter===st? 'bg-blue-50 text-blue-700 border-blue-200' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>{st}</button>
              ))}
            </div>
          </div>
          {/* Ряд: поиск, сортировка, экспорт */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 border rounded-xl px-3 py-1.5 w-full md:w-auto md:flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-gray-500" />
              <input value={searchText} onChange={(e)=>{ setSearchText(e.target.value); setPage(1); }} placeholder="Поиск по объекту, id, участникам…" className="bg-transparent outline-none w-full" />
            </div>
            <div className="flex items-center gap-2 border rounded-xl px-3 py-1.5 flex-none min-w-[190px]">
              <ArrowUpDown className="w-4 h-4 text-gray-500" />
              <select value={sortKey} onChange={(e)=>setSortKey(e.target.value as any)} className="bg-transparent outline-none">
                <option value="created_at">По дате</option>
                <option value="amount">По сумме</option>
                <option value="status">По статусу</option>
                <option value="invoice_status">По статусу счета</option>
              </select>
              <button onClick={()=>setSortDir(d=> d==='asc'?'desc':'asc')} className="ml-1 px-2 py-0.5 rounded-lg border">{sortDir==='asc'?'ASC':'DESC'}</button>
            </div>
            <div className="ml-auto">
              <button onClick={exportCSV} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white">Экспорт</button>
            </div>
          </div>
        </div>
        {visibleRequests.length === 0 ? (
          <div className="p-6 text-gray-600">Ничего не найдено</div>
        ) : (
          <ul className="divide-y">
            {visibleRequests.map((r) => (
              <li key={r.id}>
                <button onClick={() => setActiveId(r.id)} className={`w-full text-left px-4 py-3 ${active?.id === r.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                      {(() => {
                        const imgs = r.property?.property_images || [];
                        const primary = imgs.find((i: any) => i.is_primary) || imgs[0];
                        return primary ? <img src={primary.image_url} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-gray-400" />;
                      })()}
                    </div>
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="font-semibold text-gray-900 truncate">{r.property?.title || 'Объект'}</div>
                      <div className="text-xs text-gray-600 truncate">{r.property?.address}</div>
                      <div className="text-xs text-gray-600 mt-1 flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">{getSaleStatusLabel(r.status)}</span>
                        {r.invoice && <span className="px-2 py-0.5 rounded-full border bg-yellow-50 text-yellow-700 border-yellow-200">Счёт: {getInvoiceStatusLabel(r.invoice.status)}</span>}
                        {typeof r.invoice?.amount_usdt === 'number' && (
                          <span className="px-2 py-0.5 rounded-full border bg-gray-50 text-gray-700 border-gray-200">{formatUsdt(r.invoice.amount_usdt)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="p-3 flex items-center justify-between text-sm text-gray-600">
          <div>Страница {currentPage} из {totalPages}</div>
          <div className="flex items-center gap-2">
            <button onClick={()=>setPage(p=> Math.max(1, p-1))} disabled={currentPage===1} className="px-2 py-1 rounded-lg border disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={()=>setPage(p=> Math.min(totalPages, p+1))} disabled={currentPage===totalPages} className="px-2 py-1 rounded-lg border disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
            <select value={pageSize} onChange={(e)=>{ setPageSize(Number(e.target.value)); setPage(1); }} className="ml-2 border rounded-lg px-2 py-1">
              {[10,20,50].map(n=> <option key={n} value={n}>{n}/стр</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Детали */}
      <div className="lg:col-span-7">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          {!active ? (
            <div className="text-gray-600">Выберите запрос</div>
          ) : (
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">Объект</div>
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-12 md:col-span-7">
                    <div className="relative h-48 md:h-64 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
                      {(() => {
                        const imgs = active.property?.property_images || [];
                        const primary = imgs.find((i: any) => i.is_primary) || imgs[0];
                        return primary ? (
                          <img src={primary.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex items-center gap-2 text-gray-400"><ImageIcon className="w-5 h-5" /> Нет фото</div>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="col-span-12 md:col-span-5">
                    <div className="font-semibold text-gray-900">{active.property?.title || '—'}</div>
                    {active.property?.address && (
                      <div className="text-sm text-gray-700 mt-1">{active.property.address}</div>
                    )}
                    <div className="text-xs text-gray-600 mt-2">
                      {active.property?.property_type && <span>{active.property.property_type}</span>}
                      {typeof active.property?.bedrooms === 'number' && (
                        <span> • {active.property.bedrooms} спал.</span>
                      )}
                      {typeof active.property?.bathrooms === 'number' && (
                        <span> • {active.property.bathrooms} ванн.</span>
                      )}
                      {active.property?.area_sqm && (
                        <span> • {active.property.area_sqm} м²</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-200 p-4">
                  <div className="text-sm text-gray-600 mb-1">Покупатель</div>
                  <div className="font-semibold text-gray-900">{active.buyer?.full_name || '—'}</div>
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    {active.buyer?.phone && <a href={`tel:${active.buyer.phone}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border"><Phone className="w-4 h-4" /> Позвонить</a>}
                    {active.buyer?.email && <button onClick={()=>{ const subject = encodeURIComponent(`Сделка ${active.id}`); const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(active.buyer.email)}&su=${subject}`; const win = window.open(gmail, '_blank'); if (!win) { window.location.href = `mailto:${active.buyer.email}?subject=${subject}`; } }} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border"><Mail className="w-4 h-4" /> Написать</button>}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 p-4">
                  <div className="text-sm text-gray-600 mb-1">Риелтор</div>
                  <div className="font-semibold text-gray-900">{active.realtor?.full_name || '—'}</div>
                  <div className="text-xs text-gray-600">{active.realtor?.agency_name}</div>
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    {active.realtor?.phone && <a href={`tel:${active.realtor.phone}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border"><Phone className="w-4 h-4" /> Позвонить</a>}
                    {active.realtor?.email && <button onClick={()=>{ const subject = encodeURIComponent(`Сделка ${active.id}`); const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(active.realtor.email)}&su=${subject}`; const win = window.open(gmail, '_blank'); if (!win) { window.location.href = `mailto:${active.realtor.email}?subject=${subject}`; } }} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border"><Mail className="w-4 h-4" /> Написать</button>}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <div className="text-sm text-gray-600 mb-2">Статус сделки</div>
                <div className="flex flex-wrap items-center gap-2">
                  {(['pending','invoice_issued','payment_pending','paid','cancelled'] as const).map((st) => (
                    <button key={st} onClick={() => setSaleStatus(st)} disabled={saving} className={`px-3 py-2 rounded-xl border text-sm ${active.status === st ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}`}>{st}</button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-gray-600">Счет</div>
                  {active.invoice && active.invoice.status !== 'paid' && (
                    <button onClick={markPaid} disabled={saving} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-sm"><CheckCircle className="w-4 h-4" /> Отметить оплачено</button>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-gray-700">Сумма (USDT)</label>
                      <input value={editAmount} onChange={(e)=>setEditAmount(e.target.value)} type="number" min="0" className="w-full px-3 py-2 rounded-xl border border-gray-200" />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={() => setShowGenerator(!showGenerator)}
                        className="px-4 py-2 rounded-xl border border-purple-200 text-purple-700 hover:bg-purple-50 text-sm"
                      >
                        {showGenerator ? 'Скрыть генератор' : 'Автогенерация инструкций'}
                      </button>
                    </div>
                  </div>

                  {showGenerator && (
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-purple-800 mb-3">
                        <Copy className="w-4 h-4" />
                        Генератор инструкций оплаты
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm text-gray-700 mb-1 block">Счет для перевода</label>
                          <input
                            value={generatorAccount}
                            onChange={(e)=>setGeneratorAccount(e.target.value)}
                            placeholder="Введите адрес кошелька"
                            className="w-full px-3 py-2 rounded-lg border border-gray-200"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-700 mb-1 block">Сеть</label>
                          <select
                            value={generatorNetwork}
                            onChange={(e)=>setGeneratorNetwork(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200"
                          >
                            <option value="">Выберите сеть</option>
                            <option value="trc20">TRC20 (Tron)</option>
                            <option value="erc20">ERC20 (Ethereum)</option>
                            <option value="bep20">BEP20 (BSC)</option>
                            <option value="polygon">Polygon</option>
                            <option value="arbitrum">Arbitrum</option>
                          </select>
                        </div>
                      </div>
                      <button
                        onClick={generateInstructions}
                        disabled={!generatorAccount.trim() || !generatorNetwork || !editAmount}
                        className="w-full px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        Сгенерировать инструкции (РУ + EN)
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="text-sm text-gray-700">Инструкции оплаты</label>
                    <textarea
                      value={editInstr}
                      onChange={(e)=>setEditInstr(e.target.value)}
                      rows={editInstr.includes('=====') ? 8 : 3}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                      placeholder="Инструкции оплаты будут сгенерированы автоматически"
                    />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button onClick={issueOrSaveInvoice} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-blue-200 text-blue-700 hover:bg-blue-50 text-sm"><DollarSign className="w-4 h-4" /> {active.invoice ? 'Сохранить счет' : 'Выставить счет'}</button>
                  {active.invoice && active.invoice.status!=='paid' && (
                    <>
                      <button onClick={markInvoiceExpired} disabled={saving} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-amber-200 text-amber-700 hover:bg-amber-50 text-sm">Пометить просроченным</button>
                      <button onClick={cancelInvoice} disabled={saving} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 text-sm">Отменить счет</button>
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <div className="text-sm text-gray-600 mb-2">Онлайн-чат по сделке</div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {['Счет выставлен, проверьте инструкции.','Оплата получена, спасибо!','Напомните, пожалуйста, статус оплаты.','Инструкции оплаты обновлены.'].map((txt)=> (
                    <button key={txt} onClick={()=>setMsgText(prev => prev ? prev + '\n' + txt : txt)} className="px-2 py-1 rounded-lg border text-xs text-gray-700 hover:bg-gray-50">{txt}</button>
                  ))}
                </div>
                {!convId ? (
                  <div className="text-gray-600">Чат недоступен</div>
                ) : (
                  <div className="flex flex-col h-64">
                    <div className="flex-1 overflow-auto space-y-2 pr-1">
                      {messages.map((m) => (
                        <div key={m.id} className={`max-w-[80%] rounded-xl px-3 py-2 ${m.sender_id === user!.id ? 'bg-blue-600 text-white ml-auto' : 'bg-gray-100 text-gray-900'}`}>
                          <div className="text-sm whitespace-pre-wrap break-words">{m.content}</div>
                          <div className={`text-[10px] opacity-70 mt-1 ${m.sender_id === user!.id ? 'text-white' : 'text-gray-600'}`}>{new Date(m.created_at).toLocaleTimeString()}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <input value={msgText} onChange={(e)=>setMsgText(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendMessage(); } }} placeholder="Напишите сообщение…" className="flex-1 px-3 py-2 rounded-xl border border-gray-200" />
                      <button onClick={sendMessage} className="px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white">Отправить</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 