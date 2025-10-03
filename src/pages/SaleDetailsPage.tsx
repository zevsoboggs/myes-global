import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, ArrowLeft, Building2, Shield, DollarSign, User, MapPin, CheckCircle, MessageSquare, Scale } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getSaleStatusLabel, getInvoiceStatusLabel, formatUsdt } from '../lib/status';
import { useLanguage } from '../contexts/LanguageContext';

export function SaleDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const [sale, setSale] = useState<any | null>(null);
  const [invoice, setInvoice] = useState<any | null>(null);
  const [realtorProfile, setRealtorProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data: s, error: sErr } = await supabase
          .from('sales_requests')
          .select(`
            *,
            property:properties(title,is_active,id,address),
            buyer:profiles!sales_requests_buyer_id_fkey(id,full_name,email),
            realtor:profiles!sales_requests_realtor_id_fkey(id,full_name,commission_rate,email),
            lawyer:profiles!sales_requests_lawyer_id_fkey(id,full_name,email,commission_rate,agency_name)
          `)
          .eq('id', id)
          .maybeSingle();
        if (sErr) throw sErr;
        setSale(s || null);
        if (s?.realtor) setRealtorProfile(s.realtor);
        const { data: inv, error: iErr } = await supabase
          .from('invoices')
          .select('*')
          .eq('sales_request_id', id)
          .maybeSingle();
        if (iErr) throw iErr;
        setInvoice(inv || null);
        // подгрузить обложку объекта
        if (s?.property?.id) {
          const { data: imgs } = await supabase
            .from('property_images')
            .select('image_url,is_primary')
            .eq('property_id', s.property.id)
            .order('is_primary', { ascending: false })
            .limit(1);
          if (imgs && imgs[0]?.image_url) setCoverUrl(imgs[0].image_url);
        }
      } catch (e) {
        console.error('Load sale error:', e);
        setSale(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center text-gray-600"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!user || !sale) return <div className="min-h-screen flex items-center justify-center text-gray-700">{t('saleDetails.dealNotFound')}</div>;

  const isParticipant = user.id === sale.buyer_id || user.id === sale.realtor_id;
  if (!isParticipant && profile?.role !== 'lovepay') {
    return <div className="min-h-screen flex items-center justify-center text-gray-700">{t('saleDetails.noAccess')}</div>;
  }

  const commissionRate = realtorProfile?.commission_rate ?? 0.01;
  const commissionUSDT = invoice ? Number(invoice.amount_usdt || 0) * commissionRate : null;

  const statusChip = (text: string, color: 'blue'|'yellow'|'emerald'|'gray' = 'blue') => {
    const map: any = {
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      gray: 'bg-gray-50 text-gray-700 border-gray-200',
    };
    return <span className={`px-2.5 py-1 rounded-full text-[11px] border ${map[color]}`}>{text}</span>;
  };

  const dealColor: any = {
    pending: 'blue',
    invoice_issued: 'yellow',
    payment_pending: 'yellow',
    paid: 'emerald',
    cancelled: 'gray',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          {coverUrl ? (
            <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.65) 60%, rgba(0,0,0,0.8) 100%), url(${coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900 via-blue-800 to-cyan-900" />
          )}
          <div className="absolute -top-16 -left-16 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-16 -right-16 w-96 h-96 rounded-full bg-cyan-400/10 blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => navigate(-1)} className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white/90 hover:bg-white/20"> <ArrowLeft className="w-4 h-4 inline mr-1" /> {t('saleDetails.back')}</button>
            <div className="flex items-center gap-2">
              {statusChip(`${t('saleDetails.deal')}: ${getSaleStatusLabel(sale.status, t)}`, dealColor[sale.status] || 'blue')}
              {invoice && statusChip(`${t('saleDetails.invoice')}: ${getInvoiceStatusLabel(invoice.status, t)}`, invoice.status==='paid'?'emerald': invoice.status==='created'?'yellow':'blue')}
              {(invoice?.status === 'paid' || sale.status === 'paid') && (
                <Link to={`/sales/${id}/receipt`} className="ml-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 text-sm">{t('saleDetails.receipt')}</Link>
              )}
            </div>
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold text-white leading-tight">{sale.property?.title || t('saleDetails.dealDetails')}</h1>
          {sale.property?.address && (
            <div className="mt-2 text-white/90 text-sm flex items-center gap-2"><MapPin className="w-4 h-4" /> {sale.property.address}</div>
          )}
        </div>
      </section>

      {/* CONTENT */}
      <section className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 -mt-8 md:-mt-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Основное */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Building2 className="w-4 h-4" /> {t('saleDetails.object')}
              </div>
              <div className="text-lg font-semibold text-gray-900">{sale.property?.title || t('common.noTitle')}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {statusChip(`${t('saleDetails.dealStatus')}: ${getSaleStatusLabel(sale.status, t)}`, dealColor[sale.status] || 'blue')}
                {invoice && statusChip(`${t('saleDetails.invoiceStatus')}: ${getInvoiceStatusLabel(invoice.status, t)}`, invoice.status==='paid'?'emerald': invoice.status==='created'?'yellow':'blue')}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Shield className="w-4 h-4" /> {t('saleDetails.account')}
              </div>
              {invoice ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                      <div className="text-xs text-blue-700">{t('saleDetails.amount')}</div>
                      <div className="text-lg font-bold text-blue-900">{formatUsdt(invoice.amount_usdt)}</div>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <div className="text-xs text-gray-600">{t('saleDetails.invoiceStatus')}</div>
                      <div className="text-sm font-semibold text-gray-900">{getInvoiceStatusLabel(invoice.status, t)}</div>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <div className="text-xs text-emerald-700">{t('saleDetails.realtorCommission')}</div>
                      <div className="text-sm font-semibold text-emerald-900">{commissionUSDT ? `${commissionUSDT.toFixed(2)} USDT` : '—'}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-700 mb-2">{t('saleDetails.paymentInstructions')}</div>
                    <div className="text-sm text-gray-800 bg-white rounded-xl p-4 border border-gray-200 whitespace-pre-wrap">{invoice.payment_instructions}</div>
                  </div>
                  {(invoice.status === 'paid' || sale.status === 'paid') && (
                    <div className="pt-2">
                      <Link to={`/sales/${id}/receipt`} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow hover:shadow-md">{t('saleDetails.openReceipt')}</Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-600">{t('saleDetails.invoiceNotIssued')}</div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <User className="w-4 h-4" /> {t('saleDetails.participants')}
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">{sale.buyer?.full_name?.charAt(0) || 'B'}</div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{sale.buyer?.full_name || t('saleDetails.buyer')}</div>
                    <div className="text-xs text-gray-600 truncate">{sale.buyer?.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">{sale.realtor?.full_name?.charAt(0) || 'R'}</div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{sale.realtor?.full_name || t('saleDetails.realtor')}</div>
                    <div className="text-xs text-gray-600 truncate">{sale.realtor?.email}</div>
                  </div>
                </div>
                {sale.lawyer && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                      <Scale className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{sale.lawyer.full_name || t('saleDetails.lawyer')}</div>
                      <div className="text-xs text-gray-600 truncate">{sale.lawyer.email}</div>
                      {sale.lawyer.agency_name && (
                        <div className="text-xs text-gray-500 truncate">{sale.lawyer.agency_name}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <DollarSign className="w-4 h-4" /> {t('saleDetails.realtorCommission')}
              </div>
              <div className="text-sm text-gray-800">{t('saleDetails.commissionRate')}: {(commissionRate * 100).toFixed(2)}%</div>
              <div className="text-sm text-gray-800">{t('saleDetails.commissionEstimate')}: {invoice ? `${commissionUSDT?.toFixed(2)} USDT` : '—'}</div>
            </div>
            {sale.lawyer && sale.lawyer.commission_rate !== undefined && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <Scale className="w-4 h-4" /> {t('saleDetails.lawyerCommission')}
                </div>
                <div className="text-sm text-gray-800">{t('saleDetails.commissionRate')}: {(sale.lawyer.commission_rate * 100).toFixed(2)}%</div>
                <div className="text-sm text-gray-800">
                  {t('saleDetails.commissionEstimate')}: {invoice ? `${(invoice.amount_usdt * sale.lawyer.commission_rate).toFixed(2)} USDT` : '—'}
                </div>
              </div>
            )}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="text-xs text-gray-500">{t('saleDetails.dealId')}: {sale.id}</div>
              {invoice && <div className="text-xs text-gray-500">{t('saleDetails.invoiceId')}: {invoice.id}</div>}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <Link to="/chats" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow hover:shadow-md"> <MessageSquare className="w-4 h-4" /> {t('saleDetails.openChats')}</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
} 