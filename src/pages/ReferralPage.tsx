import React, { useState, useEffect } from 'react';
import {
  Share2,
  Copy,
  Users,
  DollarSign,
  Gift,
  TrendingUp,
  CheckCircle,
  Clock,
  Crown,
  Award,
  Sparkles,
  ExternalLink,
  QrCode,
  MessageCircle,
  Mail,
  Twitter,
  Facebook,
  Linkedin,
  ArrowUpRight,
  Target,
  Wallet,
  UserPlus,
  Percent
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';

interface ReferralStats {
  user_id: string;
  full_name: string;
  total_referrals: number;
  referral_earnings_usdt: number;
  referral_code: string;
  code_uses: number;
  confirmed_referrals: number;
  paid_commissions: number;
  total_paid_commissions: number;
  pending_commissions: number;
}

interface ReferralCommission {
  id: string;
  referred_id: string;
  sale_id: string;
  commission_amount_usdt: number;
  status: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

export function ReferralPage() {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [commissions, setCommissions] = useState<ReferralCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (user && profile?.role === 'buyer') {
      fetchReferralData();
    } else {
      setLoading(false);
    }
  }, [user, profile]);

  const fetchReferralData = async () => {
    try {
      // Fetch referral stats
      const { data: statsData, error: statsError } = await supabase
        .from('referral_stats')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (statsError && statsError.code !== 'PGRST116') {
        throw statsError;
      }

      setStats(statsData);

      // Fetch recent commissions
      const { data: commissionsData, error: commissionsError } = await supabase
        .from('referral_commissions')
        .select(`
          *,
          profiles:referred_id (
            full_name
          )
        `)
        .eq('referrer_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (commissionsError) throw commissionsError;

      setCommissions(commissionsData || []);
    } catch (error) {
      console.error('Error fetching referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = async () => {
    if (!stats?.referral_code) return;

    const referralLink = `${window.location.origin}/auth?ref=${stats.referral_code}`;

    try {
      await navigator.clipboard.writeText(referralLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareViaWhatsApp = () => {
    if (!stats?.referral_code) return;
    const message = t('referral.share.whatsappMessage')
      .replace('{code}', stats.referral_code)
      .replace('{link}', `${window.location.origin}/auth?ref=${stats.referral_code}`);
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const shareViaEmail = () => {
    if (!stats?.referral_code) return;
    const subject = t('referral.share.emailSubject');
    const body = t('referral.share.emailBody')
      .replace('{code}', stats.referral_code)
      .replace('{link}', `${window.location.origin}/auth?ref=${stats.referral_code}`);
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  if (!user || profile?.role !== 'buyer') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl p-8 shadow-xl max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('referral.access.restricted')}</h2>
          <p className="text-gray-600">{t('referral.access.buyersOnly')}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('referral.loading')}</p>
        </div>
      </div>
    );
  }

  const referralLink = stats?.referral_code ? `${window.location.origin}/auth?ref=${stats.referral_code}` : '';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full mb-6">
            <Crown className="w-5 h-5 text-purple-600 mr-2" />
            <span className="text-sm font-semibold text-purple-800">{t('referral.vip.badge')}</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4">
            {t('referral.page.title.part1')} &amp; <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">{t('referral.page.title.part2')}</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('referral.page.subtitle')}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm text-gray-500 font-medium">{t('referral.stats.totalReferrals')}</span>
            </div>
            <div className="text-3xl font-black text-gray-900 mb-1">
              {stats?.total_referrals || 0}
            </div>
            <div className="text-sm text-gray-600">
              {stats?.confirmed_referrals || 0} {t('referral.stats.confirmed')}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm text-gray-500 font-medium">{t('referral.stats.totalEarnings')}</span>
            </div>
            <div className="text-3xl font-black text-gray-900 mb-1">
              ${stats?.referral_earnings_usdt?.toFixed(2) || '0.00'}
            </div>
            <div className="text-sm text-green-600 font-medium">USDT</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm text-gray-500 font-medium">{t('referral.stats.pending')}</span>
            </div>
            <div className="text-3xl font-black text-gray-900 mb-1">
              ${stats?.pending_commissions?.toFixed(2) || '0.00'}
            </div>
            <div className="text-sm text-purple-600 font-medium">USDT</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                <Percent className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm text-gray-500 font-medium">{t('referral.stats.commissionRate')}</span>
            </div>
            <div className="text-3xl font-black text-gray-900 mb-1">
              0.35%
            </div>
            <div className="text-sm text-orange-600 font-medium">{t('referral.stats.perSale')}</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Share Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <Share2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{t('referral.share.title')}</h2>
                  <p className="text-gray-600">{t('referral.share.subtitle')}</p>
                </div>
              </div>

              {/* Referral Code */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-700 mb-3">{t('referral.share.yourCode')}</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={stats?.referral_code || ''}
                      readOnly
                      className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 font-mono text-lg font-bold text-center focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                    />
                  </div>
                  <button
                    onClick={copyReferralLink}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                      copySuccess
                        ? 'bg-green-100 text-green-700 border-2 border-green-200'
                        : 'bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-600'
                    }`}
                  >
                    {copySuccess ? (
                      <>
                        <CheckCircle className="w-5 h-5 inline mr-2" />
                        {t('referral.share.copied')}
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5 inline mr-2" />
                        {t('referral.share.copyLink')}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Share Buttons */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={shareViaWhatsApp}
                  className="flex items-center justify-center gap-2 p-4 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl border-2 border-green-200 transition-all"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="font-semibold">WhatsApp</span>
                </button>

                <button
                  onClick={shareViaEmail}
                  className="flex items-center justify-center gap-2 p-4 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl border-2 border-gray-200 transition-all"
                >
                  <Mail className="w-5 h-5" />
                  <span className="font-semibold">Email</span>
                </button>

                <button
                  onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(t('referral.share.twitterMessage').replace('{code}', stats?.referral_code || '').replace('{link}', referralLink))}`, '_blank')}
                  className="flex items-center justify-center gap-2 p-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl border-2 border-blue-200 transition-all"
                >
                  <Twitter className="w-5 h-5" />
                  <span className="font-semibold">Twitter</span>
                </button>

                <button
                  onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`, '_blank')}
                  className="flex items-center justify-center gap-2 p-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl border-2 border-blue-200 transition-all"
                >
                  <Facebook className="w-5 h-5" />
                  <span className="font-semibold">Facebook</span>
                </button>
              </div>
            </div>

            {/* Commission History */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 mt-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{t('referral.history.title')}</h2>
                    <p className="text-gray-600">{t('referral.history.subtitle')}</p>
                  </div>
                </div>
              </div>

              {commissions.length > 0 ? (
                <div className="space-y-4">
                  {commissions.map((commission) => (
                    <div key={commission.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          commission.status === 'paid' ? 'bg-green-100' : 'bg-yellow-100'
                        }`}>
                          {commission.status === 'paid' ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <Clock className="w-5 h-5 text-yellow-600" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {commission.profiles?.full_name || 'Unknown User'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(commission.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">
                          ${commission.commission_amount_usdt.toFixed(2)} USDT
                        </div>
                        <div className={`text-sm font-medium ${
                          commission.status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                        }`}>
                          {commission.status === 'paid' ? t('referral.history.paid') : t('referral.history.pending')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('referral.history.noCommissions')}</h3>
                  <p className="text-gray-600">{t('referral.history.startReferring')}</p>
                </div>
              )}
            </div>
          </div>

          {/* How It Works */}
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 rounded-2xl p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
              <div className="relative">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-6">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-4">{t('referral.howItWorks.title')}</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-sm font-bold">1</span>
                    </div>
                    <div>
                      <div className="font-semibold">{t('referral.howItWorks.step1.title')}</div>
                      <div className="text-white/80 text-sm">{t('referral.howItWorks.step1.description')}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-sm font-bold">2</span>
                    </div>
                    <div>
                      <div className="font-semibold">{t('referral.howItWorks.step2.title')}</div>
                      <div className="text-white/80 text-sm">{t('referral.howItWorks.step2.description')}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-sm font-bold">3</span>
                    </div>
                    <div>
                      <div className="font-semibold">{t('referral.howItWorks.step3.title')}</div>
                      <div className="text-white/80 text-sm">{t('referral.howItWorks.step3.description')}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-sm font-bold">$</span>
                    </div>
                    <div>
                      <div className="font-semibold">{t('referral.howItWorks.step4.title')}</div>
                      <div className="text-white/80 text-sm">{t('referral.howItWorks.step4.description')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-6">
                <Target className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('referral.whyRefer.title')}</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">{t('referral.whyRefer.benefit1')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">{t('referral.whyRefer.benefit2')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">{t('referral.whyRefer.benefit3')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">{t('referral.whyRefer.benefit4')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}