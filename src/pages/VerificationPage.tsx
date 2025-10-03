import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  Clock, 
  XCircle,
  AlertCircle,
  Camera,
  X
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase as sb } from '../lib/supabase';

type VerificationRequest = {
  id: string;
  user_id: string;
  document_url: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  created_at: string;
  updated_at: string;
};

export function VerificationPage() {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [verificationRequest, setVerificationRequest] = useState<VerificationRequest | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    if (user) {
      fetchVerificationRequest();
    }
  }, [user]);

  const fetchVerificationRequest = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setVerificationRequest(data);
    } catch (error) {
      console.error('Ошибка загрузки запроса верификации:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка типа файла
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setError('Поддерживаются только изображения и PDF файлы');
      return;
    }

    // Проверка размера файла (максимум 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Размер файла не должен превышать 5MB');
      return;
    }

    setSelectedFile(file);
    setError('');

    // Создаем превью для изображений
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl('');
    }
  };

  const uploadDocument = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user!.id}/verification/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('verification-documents')
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('verification-documents')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !user) return;

    setUploading(true);
    setError('');

    try {
      // Загружаем документ
      const documentUrl = await uploadDocument(selectedFile);

      // Создаем запрос на верификацию
      const { error } = await supabase
        .from('verification_requests')
        .insert({
          user_id: user.id,
          document_url: documentUrl,
          status: 'pending'
        });

      if (error) throw error;

      setSuccess('Документы успешно загружены! Ожидайте проверки администратором.');
      setSelectedFile(null);
      setPreviewUrl('');
      
      // Обновляем данные
      await fetchVerificationRequest();
    } catch (error: any) {
      setError(error.message || 'Ошибка при загрузке документов');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl('');
  };

  const startVeriff = async () => {
    try {
      const token = (await sb.auth.getSession()).data.session?.access_token;
      const base = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
      const res = await fetch(`${base}/functions/v1/veriff-session`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token || ''}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (!data?.url) {
        throw new Error('Не удалось получить ссылку верификации');
      }
      // Open in popup and listen for completion
      const w = 480, h = 720;
      const y = window.top?.outerHeight ? Math.max(0, ((window.top!.outerHeight - h) / 2) + (window.top!.screenY || 0)) : 0;
      const x = window.top?.outerWidth ? Math.max(0, ((window.top!.outerWidth - w) / 2) + (window.top!.screenX || 0)) : 0;
      const popup = window.open(data.url, 'veriff_popup', `width=${w},height=${h},left=${x},top=${y},resizable=yes,scrollbars=yes`);
      const handler = (ev: MessageEvent) => {
        if (ev?.data?.type === 'veriff_complete') {
          window.removeEventListener('message', handler);
          fetchVerificationRequest();
        }
      };
      window.addEventListener('message', handler);
    } catch (e: any) {
      setError(e?.message || 'Ошибка старта Veriff');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return t('verification.statusPending');
      case 'approved':
        return t('verification.statusApproved');
      case 'rejected':
        return t('verification.statusRejected');
      default:
        return t('verification.statusUnknown');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Если пользователь уже верифицирован
  if (profile?.is_verified) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {t('verification.alreadyVerified')}
            </h1>
            <p className="text-gray-600 mb-6">
              {t('verification.verifiedMessage')}
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              {t('verification.backToDashboard')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="mb-8 relative overflow-hidden rounded-2xl border border-gray-200 bg-white/80 backdrop-blur p-6">
            <div className="absolute -top-16 -right-20 w-72 h-72 bg-blue-100 rounded-full" />
            <div className="absolute -bottom-20 -left-16 w-60 h-60 bg-cyan-100 rounded-full" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border bg-white text-xs text-gray-700 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> {t('kyc.badge')}
              </div>
              <h1 className="mt-2 text-3xl font-extrabold text-gray-900">{t('kyc.title')}</h1>
              <p className="text-gray-600 mt-1">{t('kyc.subtitle')}</p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-xl border bg-gradient-to-br from-blue-50 to-white p-4">
                  <div className="text-xs text-gray-600">1</div>
                  <div className="text-sm font-semibold text-gray-900">{t('kyc.step1.title')}</div>
                  <div className="text-xs text-gray-600 mt-1">{t('kyc.step1.desc')}</div>
                </div>
                <div className="rounded-xl border bg-gradient-to-br from-yellow-50 to-white p-4">
                  <div className="text-xs text-gray-600">2</div>
                  <div className="text-sm font-semibold text-gray-900">{t('kyc.step2.title')}</div>
                  <div className="text-xs text-gray-600 mt-1">{t('kyc.step2.desc')}</div>
                </div>
                <div className="rounded-xl border bg-gradient-to-br from-emerald-50 to-white p-4">
                  <div className="text-xs text-gray-600">3</div>
                  <div className="text-sm font-semibold text-gray-900">{t('kyc.step3.title')}</div>
                  <div className="text-xs text-gray-600 mt-1">{t('kyc.step3.desc')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Текущий статус верификации */}
          {verificationRequest && (
            <div className={`border rounded-lg p-4 mb-6 ${getStatusColor(verificationRequest.status)}`}>
              <div className="flex items-center space-x-3">
                {getStatusIcon(verificationRequest.status)}
                <div className="flex-1">
                  <h3 className="font-semibold">
                    {t('verification.status')} {getStatusText(verificationRequest.status)}
                  </h3>
                  <p className="text-sm opacity-80">
                    {t('verification.requestSubmitted')} {new Date(verificationRequest.created_at).toLocaleDateString()}
                  </p>
                  {verificationRequest.admin_notes && (
                    <p className="text-sm mt-2">
                      <strong>{t('verification.adminComment')}</strong> {verificationRequest.admin_notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* KYC карточка */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center">KYC</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-700">Проверка производится провайдером Veriff. Мы не храним ваши фото/видео, решение приходит по защищённому каналу.</div>
                <ul className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Паспорт/ID и селфи</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 3–5 минут</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Защищённое соединение</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Решение автоматически</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Только Veriff — без ручной загрузки */}
          <div className="flex justify-between items-center gap-4">
            <div className="text-sm text-gray-600">{t('kyc.step1.desc')}</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm"
              >
                {t('common.cancel')}
              </button>
              <button type="button" onClick={startVeriff} className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg hover:from-emerald-700 hover:to-green-700 transition-colors text-sm">{t('kyc.cta')}</button>
            </div>
          </div>

          {/* Кратко о процессе (актуальная информация) */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border bg-white p-4">
              <div className="text-xs text-gray-600">1</div>
              <div className="text-sm font-semibold text-gray-900">{t('kyc.step1.title')}</div>
              <div className="text-xs text-gray-600 mt-1">{t('kyc.step1.desc')}</div>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <div className="text-xs text-gray-600">2</div>
              <div className="text-sm font-semibold text-gray-900">{t('kyc.step2.title')}</div>
              <div className="text-xs text-gray-600 mt-1">{t('kyc.step2.desc')}</div>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <div className="text-xs text-gray-600">3</div>
              <div className="text-sm font-semibold text-gray-900">{t('kyc.step3.title')}</div>
              <div className="text-xs text-gray-600 mt-1">{t('kyc.step3.desc')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}