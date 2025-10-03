import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Megaphone,
  Plus,
  TrendingUp,
  Eye,
  Clock,
  DollarSign,
  Calendar,
  Target,
  BarChart3,
  ChevronRight,
  Play,
  Pause,
  Trash2,
  Edit,
  Settings,
  AlertCircle,
  CheckCircle,
  XCircle,
  Zap,
  Globe,
  Users,
  MapPin,
  CreditCard,
  Package,
  Star,
  ArrowUp,
  ArrowDown,
  Filter,
  Search,
  Download,
  Upload,
  RefreshCw,
  Info,
  Copy,
  Share2,
  Wallet
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import type { Property } from '../lib/supabase';

interface AdCampaign {
  id: string;
  property_id: string;
  realtor_id: string;
  title: string;
  status: 'draft' | 'pending' | 'active' | 'paused' | 'completed' | 'rejected';
  budget_usdt: number;
  spent_usdt: number;
  daily_budget_usdt?: number;
  start_date: string;
  end_date?: string;
  impressions: number;
  clicks: number;
  leads: number;
  targeting?: {
    locations?: string[];
    age_min?: number;
    age_max?: number;
    interests?: string[];
    device_types?: string[];
  };
  placement: 'feed' | 'premium' | 'both';
  creative_url?: string;
  creative_text?: string;
  cta_button?: string;
  created_at: string;
  updated_at: string;
  property?: Property;
}

export function AdsPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'create' | 'analytics'>('overview');
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Statistics
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalSpent: 0,
    totalImpressions: 0,
    totalClicks: 0,
    totalLeads: 0,
    avgCtr: 0,
    avgCpl: 0
  });

  useEffect(() => {
    // Don't do anything while auth is loading
    if (authLoading) return;

    // If auth is done loading and there's no user, redirect to auth
    if (!user) {
      navigate('/auth');
      return;
    }

    // If user exists but profile is not a realtor, redirect to dashboard
    if (profile && profile.role !== 'realtor') {
      navigate('/dashboard');
      return;
    }

    // If user is a realtor and data hasn't been loaded yet, load data
    if (profile && profile.role === 'realtor' && !dataLoaded) {
      loadData();
    }
  }, [user, profile, authLoading, navigate, dataLoaded]);

  const loadData = async () => {
    if (!user) return;

    setDataLoading(true);
    try {
      // Load campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('ad_campaigns')
        .select(`
          *,
          property:properties(*)
        `)
        .eq('realtor_id', user.id)
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;
      setCampaigns(campaignsData || []);

      // Load properties for creating new campaigns
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .eq('realtor_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (propertiesError) throw propertiesError;
      setProperties(propertiesData || []);

      // Calculate stats
      if (campaignsData) {
        const active = campaignsData.filter(c => c.status === 'active').length;
        const totalSpent = campaignsData.reduce((sum, c) => sum + (c.spent_usdt || 0), 0);
        const totalImpressions = campaignsData.reduce((sum, c) => sum + (c.impressions || 0), 0);
        const totalClicks = campaignsData.reduce((sum, c) => sum + (c.clicks || 0), 0);
        const totalLeads = campaignsData.reduce((sum, c) => sum + (c.leads || 0), 0);
        const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
        const avgCpl = totalLeads > 0 ? totalSpent / totalLeads : 0;

        setStats({
          totalCampaigns: campaignsData.length,
          activeCampaigns: active,
          totalSpent,
          totalImpressions,
          totalClicks,
          totalLeads,
          avgCtr,
          avgCpl
        });
      }
    } catch (error) {
      console.error('Error loading ads data:', error);
    } finally {
      setDataLoading(false);
      setDataLoaded(true);
    }
  };

  const handleStatusChange = async (campaignId: string, newStatus: 'active' | 'paused') => {
    try {
      const { error } = await supabase
        .from('ad_campaigns')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', campaignId);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error updating campaign status:', error);
      alert(t('ads.errorUpdatingStatus'));
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm(t('ads.confirmDelete'))) return;

    try {
      const { error } = await supabase
        .from('ad_campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      alert(t('ads.errorDeleting'));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> {t('ads.status.active')}
        </span>;
      case 'paused':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium flex items-center gap-1">
          <Pause className="w-3 h-3" /> {t('ads.status.paused')}
        </span>;
      case 'completed':
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> {t('ads.status.completed')}
        </span>;
      case 'pending':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1">
          <Clock className="w-3 h-3" /> {t('ads.status.pending')}
        </span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1">
          <XCircle className="w-3 h-3" /> {t('ads.status.rejected')}
        </span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
          {t('ads.status.draft')}
        </span>;
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    if (filter !== 'all' && campaign.status !== filter) return false;
    if (searchQuery && !campaign.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Show loading while auth or data is loading
  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600 mt-4">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Megaphone className="w-8 h-8" />
                {t('ads.title')}
              </h1>
              <p className="mt-2 text-purple-100">{t('ads.subtitle')}</p>
            </div>
            <Link
              to="/ads/create"
              className="bg-white text-purple-600 px-6 py-3 rounded-xl font-medium hover:bg-purple-50 transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              {t('ads.createCampaign')}
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {['overview', 'campaigns', 'analytics'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-all ${
                  activeTab === tab
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t(`ads.tabs.${tab}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t('ads.stats.activeCampaigns')}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activeCampaigns}</p>
                    <p className="text-xs text-gray-500 mt-1">{t('ads.stats.of')} {stats.totalCampaigns}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Play className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t('ads.stats.totalSpent')}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">${stats.totalSpent.toFixed(2)}</p>
                    <p className="text-xs text-green-600 mt-1 flex items-center">
                      <ArrowUp className="w-3 h-3 mr-1" /> 12% {t('ads.stats.thisMonth')}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t('ads.stats.totalImpressions')}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {stats.totalImpressions > 1000000
                        ? `${(stats.totalImpressions / 1000000).toFixed(1)}M`
                        : stats.totalImpressions > 1000
                        ? `${(stats.totalImpressions / 1000).toFixed(1)}K`
                        : stats.totalImpressions}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">CTR: {stats.avgCtr.toFixed(2)}%</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Eye className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t('ads.stats.totalLeads')}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalLeads}</p>
                    <p className="text-xs text-gray-500 mt-1">CPL: ${stats.avgCpl.toFixed(2)}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link
                to="/ads/create"
                className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white hover:shadow-xl transition-all"
              >
                <Plus className="w-8 h-8 mb-3" />
                <h3 className="text-xl font-bold mb-2">{t('ads.quickActions.newCampaign')}</h3>
                <p className="text-purple-100">{t('ads.quickActions.newCampaignDesc')}</p>
              </Link>

              <div
                onClick={() => setActiveTab('campaigns')}
                className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer"
              >
                <CreditCard className="w-8 h-8 mb-3 text-blue-600" />
                <h3 className="text-xl font-bold mb-2 text-gray-900">{t('ads.quickActions.billing')}</h3>
                <p className="text-gray-600">{t('ads.quickActions.billingDesc')}</p>
              </div>

              <div
                onClick={() => setActiveTab('analytics')}
                className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer"
              >
                <BarChart3 className="w-8 h-8 mb-3 text-green-600" />
                <h3 className="text-xl font-bold mb-2 text-gray-900">{t('ads.quickActions.analytics')}</h3>
                <p className="text-gray-600">{t('ads.quickActions.analyticsDesc')}</p>
              </div>
            </div>

            {/* Recent Campaigns */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">{t('ads.recentCampaigns')}</h2>
                <button
                  onClick={() => setActiveTab('campaigns')}
                  className="text-purple-600 hover:text-purple-700 font-medium text-sm"
                >
                  {t('ads.viewAll')} →
                </button>
              </div>

              {campaigns.length === 0 ? (
                <div className="text-center py-12">
                  <Megaphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">{t('ads.noCampaigns')}</p>
                  <Link
                    to="/ads/create"
                    className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('ads.createFirst')}
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.slice(0, 3).map((campaign) => (
                    <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                          <Megaphone className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{campaign.title}</h3>
                          <p className="text-sm text-gray-600">{campaign.property?.title}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {getStatusBadge(campaign.status)}
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">${campaign.spent_usdt.toFixed(2)}</p>
                          <p className="text-xs text-gray-500">{t('ads.of')} ${campaign.budget_usdt.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Campaigns Tab */}
        {activeTab === 'campaigns' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('ads.searchCampaigns')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">{t('ads.filter.all')}</option>
                  <option value="active">{t('ads.filter.active')}</option>
                  <option value="paused">{t('ads.filter.paused')}</option>
                  <option value="completed">{t('ads.filter.completed')}</option>
                </select>
              </div>
              <button className="px-4 py-2 border rounded-xl hover:bg-gray-50 flex items-center gap-2">
                <Download className="w-4 h-4" />
                {t('ads.export')}
              </button>
            </div>

            {/* Campaigns List */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('ads.table.campaign')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('ads.table.status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('ads.table.budget')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('ads.table.performance')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('ads.table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredCampaigns.map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{campaign.title}</p>
                          <p className="text-sm text-gray-600">{campaign.property?.title}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(campaign.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">${campaign.spent_usdt.toFixed(2)}</p>
                          <p className="text-sm text-gray-600">{t('ads.of')} ${campaign.budget_usdt.toFixed(2)}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Eye className="w-4 h-4 text-gray-400" />
                            <span>{campaign.impressions}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Target className="w-4 h-4 text-gray-400" />
                            <span>{campaign.clicks} clicks</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {campaign.status === 'active' ? (
                            <button
                              onClick={() => handleStatusChange(campaign.id, 'paused')}
                              className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg"
                            >
                              <Pause className="w-4 h-4" />
                            </button>
                          ) : campaign.status === 'paused' ? (
                            <button
                              onClick={() => handleStatusChange(campaign.id, 'active')}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          ) : null}
                          <Link
                            to={`/ads/${campaign.id}`}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDeleteCampaign(campaign.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Performance Overview */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">{t('ads.performance.title')}</h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{stats.totalImpressions.toLocaleString()}</div>
                  <div className="text-gray-600 text-sm mt-1">{t('ads.performance.impressions')}</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{stats.totalClicks.toLocaleString()}</div>
                  <div className="text-gray-600 text-sm mt-1">{t('ads.performance.clicks')}</div>
                  <div className="text-xs text-gray-500 mt-1">CTR: {stats.avgCtr}%</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{stats.totalLeads}</div>
                  <div className="text-gray-600 text-sm mt-1">{t('ads.stats.totalLeads')}</div>
                  <div className="text-xs text-gray-500 mt-1">CPL: ${stats.avgCpl}</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">${stats.totalSpent.toFixed(2)}</div>
                  <div className="text-gray-600 text-sm mt-1">{t('ads.performance.spend')}</div>
                </div>
              </div>

              {/* Chart Placeholder */}
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8">
                <div className="flex items-center justify-center">
                  <BarChart3 className="w-12 h-12 text-gray-300 mr-4" />
                  <div>
                    <p className="text-gray-600 font-medium">{t('ads.analytics.comingSoon')}</p>
                    <p className="text-gray-400 text-sm mt-1">График эффективности кампаний</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Billing Section */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">{t('ads.billing.title')}</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">{t('ads.billing.balance')}</span>
                    <Wallet className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">$0.00 USDT</div>
                  <button className="mt-3 text-blue-600 text-sm font-medium hover:text-blue-700">
                    {t('ads.billing.addFunds')} →
                  </button>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">{t('ads.billing.method')}</span>
                    <CreditCard className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="text-lg font-medium text-gray-900">Криптовалюта</div>
                  <div className="text-sm text-gray-500 mt-1">USDT (TRC-20)</div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">{t('ads.stats.thisMonth')}</span>
                    <Calendar className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">${stats.totalSpent.toFixed(2)}</div>
                  <div className="text-sm text-green-600 mt-1">↑ 12%</div>
                </div>
              </div>

              <div className="mt-6 border-t pt-6">
                <h3 className="font-medium text-gray-900 mb-4">{t('ads.billing.history')}</h3>
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Нет транзакций</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}