import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, ArrowLeft, CheckCircle, MapPin, User, Building2, Shield, Printer, Download } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export function SaleReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [sale, setSale] = useState<any | null>(null);
  const [invoice, setInvoice] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data: s } = await supabase
          .from('sales_requests')
          .select(`*,
            property:properties(id,title,address),
            buyer:profiles!sales_requests_buyer_id_fkey(id,full_name,email),
            realtor:profiles!sales_requests_realtor_id_fkey(id,full_name,email)
          `)
          .eq('id', id)
          .maybeSingle();
        setSale(s || null);

        const { data: inv } = await supabase
          .from('invoices')
          .select('*')
          .eq('sales_request_id', id)
          .maybeSingle();
        setInvoice(inv || null);

        if (s?.property?.id) {
          const { data: imgs } = await supabase
            .from('property_images')
            .select('image_url,is_primary')
            .eq('property_id', s.property.id)
            .order('is_primary', { ascending: false })
            .limit(1);
          if (imgs && imgs[0]?.image_url) setCoverUrl(imgs[0].image_url);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const paidAt = useMemo(() => {
    if (!invoice) return null;
    // Принимаем updated_at как дату оплаты, если статус paid
    return invoice.status === 'paid' ? (invoice.updated_at || invoice.created_at) : null;
  }, [invoice]);

  const shortId = (val?: string) => (val ? `#${String(val).slice(0, 8)}` : '—');

  const printReceipt = () => {
    window.print();
  };

  const ensureHtml2Pdf = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if ((window as any).html2pdf) return resolve();
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(t('common.error')));
      document.body.appendChild(script);
    });
  };

  const downloadPdf = async () => {
    try {
      await ensureHtml2Pdf();
      const el = containerRef.current;
      if (!el) return printReceipt();

      const filename = `MYES_Receipt_${sale?.id?.slice(0,8) || 'sale'}_${new Date().toISOString().slice(0,10)}.pdf`;
      const html2pdf = (window as any).html2pdf;

      const opt = {
        margin: [15, 15, 15, 15],
        filename,
        image: {
          type: 'jpeg',
          quality: 0.98
        },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
          compress: true
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await html2pdf().set(opt).from(el).save();
    } catch (e) {
      console.error('PDF generation failed:', e);
      printReceipt();
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-600"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!sale) return <div className="min-h-screen flex items-center justify-center text-gray-700">{t('receipt.dealNotFound')}</div>;
  if (!invoice || invoice.status !== 'paid') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => navigate(-1)} className="px-3 py-2 rounded-xl border bg-white text-gray-700 hover:bg-gray-50"><ArrowLeft className="w-4 h-4 inline mr-1" /> {t('receipt.back')}</button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-gray-800">
            <div className="text-xl font-semibold mb-2">{t('receipt.availableAfterPayment')}</div>
            <div className="text-sm text-gray-600">{t('receipt.invoiceStatus')}: {invoice ? invoice.status : '—'}</div>
            <div className="mt-4"><Link to={`/sales/${id}`} className="inline-flex items-center px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white">{t('receipt.openDealDetails')}</Link></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <section className="relative overflow-hidden print:hidden no-print">
        <div className="absolute inset-0">
          {coverUrl ? (
            <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.75) 70%, rgba(0,0,0,0.85) 100%), url(${coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900 via-blue-800 to-cyan-900" />
          )}
        </div>
        <div className="relative max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white/90 hover:bg-white/20"> <ArrowLeft className="w-4 h-4 inline mr-1" /> {t('receipt.back')}</button>
            <div className="flex items-center gap-2">
              <button onClick={printReceipt} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20"><Printer className="w-4 h-4" /> {t('receipt.print')}</button>
              <button onClick={downloadPdf} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white text-blue-700 hover:bg-gray-100"><Download className="w-4 h-4" /> {t('receipt.downloadPdf')}</button>
            </div>
          </div>
          <h1 className="mt-6 text-3xl md:text-4xl font-extrabold text-white">{t('receipt.title')}</h1>
          <div className="mt-2 text-white/90 text-sm">{t('receipt.platform')}</div>
        </div>
      </section>

      {/* Receipt body */}
      <section className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-10">
        <div ref={containerRef} className="receipt-document bg-white rounded-2xl border border-gray-100 shadow-xl print:shadow-none print:border-0 print:rounded-none p-6 md:p-8">
          {/* Top bar */}
          <div className="receipt-section flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border bg-gray-50 text-gray-700 text-xs">MYES.GLOBAL</div>
              <div className="mt-2 text-2xl font-extrabold tracking-tight text-gray-900">{t('receipt.paymentReceipt')}</div>
              <div className="text-sm text-gray-600">{t('receipt.documentConfirms')}</div>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border bg-emerald-50 text-emerald-700 border-emerald-200 font-medium"><CheckCircle className="w-3.5 h-3.5" /> {t('receipt.paid')}</div>
              <div className="mt-2 text-xs text-gray-600">{t('receipt.deal')}: {shortId(sale.id)}</div>
              <div className="text-xs text-gray-600">{t('receipt.invoice')}: {shortId(invoice.id)}</div>
              <div className="text-xs text-gray-600">{t('receipt.paymentDate')}: {paidAt ? new Date(paidAt).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              }) : '—'}</div>
            </div>
          </div>

          <div className="my-6 h-px bg-gray-100 receipt-section" />

          {/* Property */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 receipt-section">
            <div className="md:col-span-2">
              <div className="text-sm text-gray-600 mb-1 flex items-center gap-2"><Building2 className="w-4 h-4" /> {t('receipt.property')}</div>
              <div className="text-lg font-semibold text-gray-900">{sale.property?.title || t('common.noTitle')}</div>
              {sale.property?.address && (
                <div className="text-sm text-gray-700 mt-1 flex items-center gap-1"><MapPin className="w-4 h-4" /> {sale.property.address}</div>
              )}
            </div>
            <div>
              <div className="relative w-full h-28 bg-gray-100 rounded-xl overflow-hidden border">
                {coverUrl && <img src={coverUrl} alt="" className="w-full h-full object-cover" />}
              </div>
            </div>
          </div>

          <div className="my-6 h-px bg-gray-100 receipt-section" />

          {/* Parties */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 receipt-section">
            <div className="rounded-xl border border-gray-100 p-4">
              <div className="text-sm text-gray-600 mb-1">{t('receipt.buyer')}</div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold"><User className="w-4 h-4" /></div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{sale.buyer?.full_name || '—'}</div>
                  <div className="text-xs text-gray-600">{sale.buyer?.email}</div>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 p-4">
              <div className="text-sm text-gray-600 mb-1">{t('receipt.realtor')}</div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold"><Shield className="w-4 h-4" /></div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{sale.realtor?.full_name || '—'}</div>
                  <div className="text-xs text-gray-600">{sale.realtor?.email}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="my-6 h-px bg-gray-100 receipt-section" />

          {/* Payment */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 receipt-section">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="text-xs text-blue-700">{t('receipt.paymentAmount')}</div>
              <div className="text-2xl font-extrabold text-blue-900">{Number(invoice.amount_usdt).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
              })} USDT</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs text-gray-600">{t('receipt.method')}</div>
              <div className="text-sm font-semibold text-gray-900">{t('receipt.cryptoMethod')}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs text-gray-600">{t('receipt.platformLabel')}</div>
              <div className="text-sm font-semibold text-gray-900">MYES.GLOBAL</div>
            </div>
          </div>

          {invoice.payment_instructions && (
            <div className="mt-6 receipt-section">
              <div className="text-sm text-gray-700 mb-1">{t('receipt.note')}</div>
              <div className="text-sm text-gray-800 bg-white rounded-xl p-4 border border-gray-200 whitespace-pre-wrap">{invoice.payment_instructions}</div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between print:hidden no-print">
            <div className="text-xs text-gray-500">{t('receipt.autoGenerated')} {shortId(sale.id)}.</div>
            <div className="flex items-center gap-2">
              <button onClick={printReceipt} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-gray-700 hover:bg-gray-50"><Printer className="w-4 h-4" /> {t('receipt.print')}</button>
              <Link to={`/sales/${id}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white">{t('receipt.backToDeal')}</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default SaleReceiptPage;


