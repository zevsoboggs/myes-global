import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { generateDigitalSignature, formatSignatureForDisplay, type CertificateData } from '../lib/digitalSignature';
import { Loader2, ArrowLeft, Download, Printer, ShieldCheck, Crown } from 'lucide-react';

interface SavedCertificate {
  id: string;
  certificate_number: string;
  issue_date: string;
  full_name: string;
  agency_name?: string;
  verification_level: string;
  digital_signature: string;
  signature_hash: string;
}

export function PartnerCertificatePage() {
  const navigate = useNavigate();
  const { profile, loading, user } = useAuth();
  const { t, language } = useLanguage();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [certificate, setCertificate] = useState<SavedCertificate | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Load existing certificate or generate new one
  useEffect(() => {
    if (!user || !profile) return;
    loadOrGenerateCertificate();
  }, [user, profile]);

  const loadOrGenerateCertificate = async () => {
    if (!user || !profile) return;

    try {
      console.log('🔍 Loading certificate for user:', user.id);

      // Try to load existing certificate
      const { data: existingCert, error } = await supabase
        .from('partner_certificates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log('📋 Certificate query result:', { data: existingCert, error });

      if (existingCert && !error) {
        console.log('✅ Found existing certificate');
        setCertificate(existingCert);
        return;
      }

      console.log('🆕 No certificate found, generating new one');
      // Generate new certificate if none exists
      await generateNewCertificate();
    } catch (err) {
      console.error('❌ Error loading certificate:', err);
      await generateNewCertificate();
    }
  };

  const generateNewCertificate = async () => {
    if (!user || !profile || isGenerating) return;

    setIsGenerating(true);
    try {
      // Generate certificate number in client
      const year = new Date().getFullYear().toString().slice(-2);
      const randomNum = Math.floor(Math.random() * 9999) + 1;
      const certNumber = `MG-${year}-${randomNum.toString().padStart(4, '0')}`;

      const certificateData: CertificateData = {
        certificateNumber: certNumber,
        fullName: profile.full_name || 'Unknown',
        agencyName: profile.agency_name || undefined,
        issueDate: new Date().toISOString(),
        verificationLevel: 'verified',
        userId: user.id
      };

      // Generate digital signature
      const digitalSignature = await generateDigitalSignature(certificateData);

      console.log('💾 Saving certificate to database:', {
        user_id: user.id,
        certificate_number: certNumber,
        full_name: certificateData.fullName
      });

      // Save to database
      const { data: savedCert, error } = await supabase
        .from('partner_certificates')
        .insert({
          user_id: user.id,
          certificate_number: certNumber,
          full_name: certificateData.fullName,
          agency_name: certificateData.agencyName,
          verification_level: certificateData.verificationLevel,
          digital_signature: digitalSignature,
          signature_hash: certificateData.certificateNumber + certificateData.fullName,
          issue_date: certificateData.issueDate
        })
        .select()
        .single();

      console.log('💾 Database save result:', { data: savedCert, error });

      if (error) throw error;

      console.log('✅ Certificate saved successfully');
      setCertificate(savedCert);
    } catch (err) {
      console.error('Error generating certificate:', err);
      alert(t('certificate.error') || 'Error generating certificate');
    } finally {
      setIsGenerating(false);
    }
  };

  const certificateId = certificate?.certificate_number || 'LOADING...';
  const issuedAt = certificate
    ? new Date(certificate.issue_date).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const printDoc = () => {
    // Add print styles to hide everything except certificate
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        @page {
          margin: 0.5in;
          size: A4;
        }
        body * {
          visibility: hidden;
        }
        .certificate-container, .certificate-container * {
          visibility: visible;
        }
        .certificate-container {
          position: absolute;
          left: 0;
          top: 0;
          width: 100% !important;
          height: auto !important;
          max-height: 95vh !important;
          margin: 0 !important;
          padding: 15px !important;
          box-shadow: none !important;
          border: none !important;
          border-radius: 0 !important;
          font-size: 0.85em !important;
          transform: scale(0.95);
          transform-origin: top left;
        }
        .certificate-container h1,
        .certificate-container h2,
        .certificate-container h3 {
          font-size: 0.9em !important;
          margin: 0.5em 0 !important;
        }
        .certificate-container .text-3xl {
          font-size: 1.5em !important;
        }
        .certificate-container .text-2xl {
          font-size: 1.3em !important;
        }
        .certificate-container .text-lg {
          font-size: 1em !important;
        }
        .certificate-container .mb-8,
        .certificate-container .mt-8,
        .certificate-container .py-6 {
          margin: 0.75em 0 !important;
          padding: 0.5em 0 !important;
        }
        .certificate-container .p-6 {
          padding: 0.75em !important;
        }
        .certificate-container .gap-8 {
          gap: 1em !important;
        }
        .print\\:hidden, .no-print {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);

    window.print();

    // Remove the style after printing
    setTimeout(() => {
      document.head.removeChild(style);
    }, 1000);
  };

  const ensureHtml2Pdf = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if ((window as any).html2pdf) return resolve();
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(language === 'ru' ? 'Не удалось загрузить генератор PDF' : 'Failed to load PDF generator'));
      document.body.appendChild(script);
    });
  };

  const downloadPdf = async () => {
    try {
      await ensureHtml2Pdf();
      const el = containerRef.current;
      if (!el) return printDoc();
      const filename = `myes_partner_certificate_${certificateId}.pdf`;
      const html2pdf = (window as any).html2pdf;
      const opt = {
        margin:       [0, 0, 0, 0],
        filename,
        image:        { type: 'jpeg', quality: 1.0 },
        html2canvas:  {
          scale: 3,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          letterRendering: true,
          allowTaint: false
        },
        jsPDF:        {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
          compress: true
        }
      };
      await html2pdf().set(opt).from(el).save();
    } catch {
      printDoc();
    }
  };

  if (loading || isGenerating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600">
            {isGenerating
              ? (t('certificate.generating') || 'Generating certificate...')
              : (t('common.loading') || 'Loading...')
            }
          </p>
        </div>
      </div>
    );
  }
  if (!profile) return <div className="min-h-screen flex items-center justify-center text-gray-700">{t('certificate.noAccess')}</div>;
  if (profile.role !== 'realtor' || !profile.is_verified) return <div className="min-h-screen flex items-center justify-center text-gray-700">{t('certificate.verifiedRealtorsOnly')}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header (hidden on print) */}
      <section className="relative overflow-hidden print:hidden no-print">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900 via-blue-800 to-cyan-900" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white/90 hover:bg-white/20"> <ArrowLeft className="w-4 h-4 inline mr-1" /> {t('certificate.back')}</button>
            <div className="flex items-center gap-2">
              <button onClick={printDoc} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20"><Printer className="w-4 h-4" /> {t('certificate.print')}</button>
              <button onClick={downloadPdf} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white text-blue-700 hover:bg-gray-100"><Download className="w-4 h-4" /> {t('certificate.download')}</button>
            </div>
          </div>
          <h1 className="mt-6 text-3xl md:text-4xl font-extrabold text-white">{t('certificate.title')}</h1>
          <div className="mt-2 text-white/90 text-sm">{t('certificate.platform')}</div>
        </div>
      </section>

      {/* Certificate */}
      <section className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-10">
        <div ref={containerRef} className="certificate-container bg-white rounded-2xl border border-gray-100 shadow-xl print:shadow-none print:border-0 p-8 md:p-12" style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: '2px solid #e2e8f0',
          fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif'
        }}>
          {/* Brand header */}
          <div className="flex items-start justify-between mb-8" style={{
            borderBottom: '3px solid #3b82f6',
            paddingBottom: '24px'
          }}>
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-bold text-sm" style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}>
                MYES.GLOBAL
              </div>
              <div className="mt-4 text-3xl font-black tracking-tight" style={{
                color: '#1e293b',
                fontWeight: '900',
                letterSpacing: '-0.025em'
              }}>
                {t('certificate.partnerCertificate')}
              </div>
              <div className="text-base font-medium" style={{ color: '#64748b' }}>
                {t('certificate.confirmation')}
              </div>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-white" style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}>
                <ShieldCheck className="w-4 h-4" /> {t('certificate.verified')}
              </div>
              <div className="mt-3 text-sm font-semibold" style={{ color: '#475569' }}>
                {t('certificate.certificateNumber')}: <span style={{ color: '#1e293b' }}>{certificateId}</span>
              </div>
              <div className="text-sm font-semibold" style={{ color: '#475569' }}>
                {t('certificate.issueDate')}: <span style={{ color: '#1e293b' }}>{issuedAt}</span>
              </div>
            </div>
          </div>

          {/* Holder */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start mb-8">
            <div className="md:col-span-2">
              <div className="text-sm font-bold uppercase tracking-wider mb-2" style={{
                color: '#64748b',
                letterSpacing: '0.1em'
              }}>
                {t('certificate.holder')}
              </div>
              <div className="text-3xl font-black flex items-center gap-3 mb-3" style={{
                color: '#0f172a',
                fontWeight: '900'
              }}>
                <span>{certificate?.full_name || profile.full_name}</span>
                <Crown className="w-6 h-6" style={{ color: '#f59e0b' }} />
              </div>
              {(certificate?.agency_name || profile.agency_name) && (
                <div className="text-base font-semibold mb-2" style={{ color: '#475569' }}>
                  {t('certificate.agency')}: <span style={{ color: '#1e293b' }}>{certificate?.agency_name || profile.agency_name}</span>
                </div>
              )}
              {profile.license_number && (
                <div className="text-base font-semibold mb-2" style={{ color: '#475569' }}>
                  {t('certificate.license')}: <span style={{ color: '#1e293b' }}>{profile.license_number}</span>
                </div>
              )}
              {profile.email && (
                <div className="text-base font-semibold" style={{ color: '#475569' }}>
                  {t('certificate.email')}: <span style={{ color: '#1e293b' }}>{profile.email}</span>
                </div>
              )}
            </div>
            <div>
              <div className="relative w-full h-32 rounded-xl border-2 flex items-center justify-center" style={{
                background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                borderColor: '#3b82f6',
                boxShadow: '0 8px 25px rgba(59, 130, 246, 0.15)'
              }}>
                <div className="text-lg font-black tracking-wide" style={{ color: '#1d4ed8' }}>
                  MYES.GLOBAL
                </div>
              </div>
            </div>
          </div>

          {/* Statement */}
          <div className="mb-8">
            <div className="p-6 rounded-xl" style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
              border: '1px solid #cbd5e1'
            }}>
              <div className="text-base font-medium leading-relaxed" style={{
                color: '#374151',
                lineHeight: '1.7'
              }}>
                {t('certificate.statement')}
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-8">
              <div className="p-4 rounded-lg" style={{
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                border: '1px solid #93c5fd'
              }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#1e40af' }}>
                  {t('certificate.uniqueId')}
                </div>
                <div className="text-lg font-black" style={{ color: '#0f172a' }}>
                  {certificateId}
                </div>
              </div>
              <div className="p-4 rounded-lg" style={{
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                border: '1px solid #93c5fd'
              }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#1e40af' }}>
                  {t('certificate.issueDate')}
                </div>
                <div className="text-lg font-black" style={{ color: '#0f172a' }}>
                  {issuedAt}
                </div>
              </div>
            </div>
          </div>

          {/* Footer sign */}
          <div className="pt-6" style={{
            borderTop: '2px solid #e2e8f0'
          }}>
            <div className="flex items-end justify-between mb-6">
              <div>
                <div className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: '#64748b' }}>
                  {t('certificate.electronicSignature')}
                </div>
                <div className="h-10 w-64 rounded-lg flex items-center justify-center" style={{
                  background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                  color: 'white',
                  fontFamily: 'cursive',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}>
                  MYES.GLOBAL Representative
                </div>
                <div className="text-sm font-medium mt-2" style={{ color: '#64748b' }}>
                  {t('certificate.representative')}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold uppercase tracking-wider" style={{ color: '#64748b' }}>
                  {t('certificate.platform')}
                </div>
                <div className="text-2xl font-black" style={{ color: '#1e293b' }}>
                  MYES.GLOBAL
                </div>
              </div>
            </div>

            {/* Digital Signature */}
            {certificate && (
              <div className="p-6 rounded-xl" style={{
                background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                border: '2px solid #cbd5e1'
              }}>
                <div className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: '#475569' }}>
                  Digital Signature (RSA-2048)
                </div>
                <div className="p-4 rounded-lg font-mono text-sm" style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#374151',
                  wordBreak: 'break-all'
                }}>
                  {formatSignatureForDisplay(certificate.digital_signature)}
                </div>
                <div className="text-sm font-medium mt-3" style={{ color: '#64748b' }}>
                  Certificate Hash: <span className="font-mono" style={{ color: '#374151' }}>{certificate.signature_hash?.substring(0, 16)}...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default PartnerCertificatePage;


