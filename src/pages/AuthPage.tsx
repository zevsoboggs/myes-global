import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Building, Shield, MessageSquare, Sparkles, Gift, CheckCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';

export function AuthPage() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  
  const [mode, setMode] = useState<'login' | 'register'>(
    searchParams.get('mode') === 'register' ? 'register' : 'login'
  );
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [referralCode, setReferralCode] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    agencyName: '',
    licenseNumber: '',
    role: 'buyer' as 'buyer' | 'realtor' | 'lawyer',
  });

  // Check for referral code in URL
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setReferralCode(refCode);
      setMode('register'); // Auto-switch to register mode if referral code is present
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        const { data, error } = await signIn(formData.email, formData.password);
        if (error) throw error;
        const uid = data?.user?.id;
        if (uid) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', uid)
            .single();
          if (prof?.role === 'lovepay') {
            await supabase.auth.signOut();
            throw new Error(t('auth.lovepayOnlyLogin'));
          }
        }
        navigate('/dashboard');
      } else {
        const { error } = await signUp(
          formData.email,
          formData.password,
          formData.fullName,
          formData.role,
          formData.phone || undefined,
          formData.agencyName || undefined,
          formData.licenseNumber || undefined,
        );
        if (error) throw error;

        // Create referral code for new buyers and apply referral if provided
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Create referral code for new buyers
          if (formData.role === 'buyer') {
            try {
              const { data: createdCode, error: createError } = await supabase.rpc('create_referral_code_for_user', {
                user_id_param: user.id
              });

              if (createError) {
                console.warn('Failed to create referral code:', createError);
              } else if (createdCode) {
                console.log('Referral code created successfully:', createdCode);
              }
            } catch (createError) {
              console.warn('Referral code creation failed:', createError);
            }
          }

          // Apply referral code if provided and user is a buyer
          if (referralCode && formData.role === 'buyer') {
            try {
              const { data, error: refError } = await supabase.rpc('apply_referral_code', {
                p_user_id: user.id,
                p_referral_code: referralCode
              });

              if (refError) {
                console.warn('Failed to apply referral code:', refError);
              } else if (data) {
                console.log('Referral code applied successfully');
              }
            } catch (refError) {
              console.warn('Referral code application failed:', refError);
            }
          }
        }

        navigate('/dashboard');
      }
    } catch (error: any) {
      setError(error.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* gradient bg */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-white to-violet-50" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        {/* Header/Hero */}
        <div className="mb-8 md:mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-white shadow-sm">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-gray-700">Crypto Real Estate</span>
          </div>
          <h1 className="mt-3 text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            {mode === 'login' ? t('auth.login') : t('auth.createAccount')}
          </h1>
          <p className="mt-2 text-gray-600">
            {mode === 'login' ? t('auth.loginSubtitle') : t('auth.registerSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Info card */}
          <div className="order-2 lg:order-1 bg-white/90 backdrop-blur border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8">
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">{t('auth.platformBenefits')}</h3>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-blue-500" /> {t('auth.fixedCommission')}</li>
              <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-green-500" /> {t('auth.secureDeals')}</li>
              <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-yellow-500" /> {t('auth.realtorVerification')}</li>
              <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-purple-500" /> {t('auth.advancedAnalytics')}</li>
            </ul>
            <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-800 text-sm flex items-start gap-2">
              <Shield className="w-4 h-4 mt-0.5" />
              <div>
                <div className="font-semibold">{t('profile.role.realtor')}</div>
                {t('auth.verificationRequired')}
              </div>
            </div>
          </div>

          {/* Auth card */}
          <div className="order-1 lg:order-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8">
            <div className="flex items-center justify-between mb-5">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border bg-gray-50">
                <Building className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-gray-700 font-medium">{t('header.dashboard')}</span>
              </div>
              <button
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>
            )}

            {mode === 'register' && (
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('auth.role')} *</label>
                  <div className="grid grid-cols-3 gap-2">
                    <label className={`px-3 py-2 rounded-xl border text-center cursor-pointer ${formData.role==='buyer'?'border-blue-500 bg-blue-50':'border-gray-300 hover:border-gray-400'}`}>
                      <input type="radio" name="role" value="buyer" className="hidden" checked={formData.role==='buyer'} onChange={() => setFormData((p)=>({...p, role: 'buyer'}))} />
                      {t('profile.role.buyer')}
                    </label>
                    <label className={`px-3 py-2 rounded-xl border text-center cursor-pointer ${formData.role==='realtor'?'border-blue-500 bg-blue-50':'border-gray-300 hover:border-gray-400'}`}>
                      <input type="radio" name="role" value="realtor" className="hidden" checked={formData.role==='realtor'} onChange={() => setFormData((p)=>({...p, role: 'realtor'}))} />
                      {t('profile.role.realtor')}
                    </label>
                    <label className={`px-3 py-2 rounded-xl border text-center cursor-pointer ${formData.role==='lawyer'?'border-blue-500 bg-blue-50':'border-gray-300 hover:border-gray-400'}`}>
                      <input type="radio" name="role" value="lawyer" className="hidden" checked={formData.role==='lawyer'} onChange={() => setFormData((p)=>({...p, role: 'lawyer'}))} />
                      {t('profile.role.lawyer')}
                    </label>
                  </div>
                </div>
              )}

              {mode === 'register' && (
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">{t('auth.fullName')} *</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input id="fullName" name="fullName" required value={formData.fullName} onChange={handleChange} className="pl-10 w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder={t('auth.fullNamePlaceholder')} />
                </div>
              </div>
            )}

            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">{t('auth.email')} *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input id="email" name="email" type="email" required value={formData.email} onChange={handleChange} className="pl-10 w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder={t('auth.emailPlaceholder')} />
              </div>
            </div>

            <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">{t('auth.password')} *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input id="password" name="password" type={showPassword ? 'text' : 'password'} required value={formData.password} onChange={handleChange} className="pl-10 pr-10 w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder={mode === 'register' ? t('auth.passwordRegisterPlaceholder') : t('auth.passwordPlaceholder')} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <>
                {/* Referral Code Display */}
                {referralCode && (
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                        <Gift className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-purple-900">Referral Code Applied!</div>
                        <div className="text-sm text-purple-700">You'll earn benefits from this referral</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white/50 rounded-lg p-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="font-mono font-bold text-purple-900">{referralCode}</span>
                    </div>
                  </div>
                )}

                <div>
                    <label htmlFor="phone" className="block text_sm font-medium text-gray-700 mb-2">{t('auth.phone')}</label>
                    <input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder={t('auth.phonePlaceholder')} />
                </div>

                  {formData.role === 'realtor' && (
                    <>
                <div>
                        <label htmlFor="agencyName" className="block text-sm font-medium text-gray-700 mb-2">{t('auth.agencyName')}</label>
                        <input id="agencyName" name="agencyName" type="text" value={formData.agencyName} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder={t('auth.agencyPlaceholder')} />
                </div>
                <div>
                        <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 mb-2">{t('auth.licenseNumber')}</label>
                        <input id="licenseNumber" name="licenseNumber" type="text" value={formData.licenseNumber} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder={t('auth.licensePlaceholder')} />
                </div>
                      <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-yellow-800 text-sm">
                        <strong>{t('auth.importantNote')}</strong> {t('auth.verificationRequired')}
                </div>
                    </>
                  )}
              </>
            )}

              <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-colors disabled:opacity-50">
              {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> {t('auth.processing')}
                </div>
              ) : (
                mode === 'login' ? t('auth.login') : t('auth.register')
              )}
            </button>

              <div className="text-center text-sm">
                <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} type="button" className="text-blue-600 hover:text-blue-800 font-medium">
                  {mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}
            </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}