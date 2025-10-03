import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Megaphone,
  Home,
  DollarSign,
  Calendar,
  Target,
  Image,
  Type,
  MapPin,
  Users,
  Smartphone,
  Globe,
  ChevronRight,
  Info,
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Zap,
  TrendingUp,
  Eye,
  Package
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import type { Property } from '../lib/supabase';

export function AdsCreatePage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [step, setStep] = useState(1);

  // Form data
  const [formData, setFormData] = useState({
    property_id: '',
    title: '',
    budget_usdt: 100,
    daily_budget_usdt: 10,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    placement: 'both' as 'feed' | 'premium' | 'both',
    creative_text: '',
    cta_button: 'Learn More',
    targeting: {
      locations: [] as string[],
      age_min: 18,
      age_max: 65,
      interests: [] as string[],
      device_types: ['mobile', 'desktop'] as string[]
    }
  });

  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

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

    // If user is a realtor, load properties
    if (profile && profile.role === 'realtor') {
      loadProperties();
    }
  }, [user, profile, authLoading, navigate]);

  const loadProperties = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*, property_images(*)')
        .eq('realtor_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error loading properties:', error);
    }
  };

  const handlePropertySelect = (property: Property) => {
    setSelectedProperty(property);
    setFormData(prev => ({
      ...prev,
      property_id: property.id,
      title: `${property.title} - ${property.location}`,
      creative_text: property.description || ''
    }));

    // Set primary image
    const primaryImage = property.property_images?.find(img => img.is_primary) || property.property_images?.[0];
    if (primaryImage) {
      setImageUrl(primaryImage.image_url);
    }
  };

  const validateStep = (stepNumber: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (stepNumber) {
      case 1:
        if (!formData.property_id) newErrors.property = t('ads.create.errors.selectProperty');
        break;
      case 2:
        if (!formData.title) newErrors.title = t('ads.create.errors.titleRequired');
        if (formData.title.length > 100) newErrors.title = t('ads.create.errors.titleTooLong');
        if (!formData.creative_text) newErrors.creative_text = t('ads.create.errors.textRequired');
        if (formData.creative_text.length > 500) newErrors.creative_text = t('ads.create.errors.textTooLong');
        break;
      case 3:
        if (formData.budget_usdt < 50) newErrors.budget = t('ads.create.errors.minBudget');
        if (formData.daily_budget_usdt < 5) newErrors.daily_budget = t('ads.create.errors.minDailyBudget');
        if (formData.daily_budget_usdt > formData.budget_usdt) newErrors.daily_budget = t('ads.create.errors.dailyExceedsTotal');
        if (!formData.start_date) newErrors.start_date = t('ads.create.errors.startDateRequired');
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ad_campaigns')
        .insert({
          realtor_id: user?.id,
          property_id: formData.property_id,
          title: formData.title,
          status: 'pending',
          budget_usdt: formData.budget_usdt,
          daily_budget_usdt: formData.daily_budget_usdt,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          placement: formData.placement,
          creative_text: formData.creative_text,
          creative_url: imageUrl,
          cta_button: formData.cta_button,
          targeting: formData.targeting,
          impressions: 0,
          clicks: 0,
          leads: 0,
          spent_usdt: 0
        })
        .select()
        .single();

      if (error) throw error;

      navigate('/ads', { state: { message: t('ads.create.success') } });
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert(t('ads.create.error'));
    } finally {
      setLoading(false);
    }
  };

  const placementOptions = [
    {
      id: 'feed',
      name: t('ads.create.placement.feed'),
      description: t('ads.create.placement.feedDesc'),
      price: '$5/day',
      icon: <Globe className="w-6 h-6" />
    },
    {
      id: 'premium',
      name: t('ads.create.placement.premium'),
      description: t('ads.create.placement.premiumDesc'),
      price: '$15/day',
      icon: <Zap className="w-6 h-6" />
    },
    {
      id: 'both',
      name: t('ads.create.placement.both'),
      description: t('ads.create.placement.bothDesc'),
      price: '$20/day',
      icon: <TrendingUp className="w-6 h-6" />,
      recommended: true
    }
  ];

  const interestOptions = [
    'Real Estate Investment',
    'Luxury Properties',
    'First Time Buyers',
    'Property Development',
    'Commercial Real Estate',
    'Vacation Homes',
    'Cryptocurrency',
    'International Properties'
  ];

  // Show loading while auth is loading
  if (authLoading) {
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/ads"
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('ads.create.title')}</h1>
                <p className="text-sm text-gray-600">{t('ads.create.subtitle')}</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {t('ads.create.step')} {step} {t('ads.create.of')} 4
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`flex-1 py-2 ${
                  s <= step ? 'bg-purple-600' : 'bg-gray-200'
                } ${s === 1 ? 'rounded-l' : ''} ${s === 4 ? 'rounded-r' : ''}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step 1: Select Property */}
        {step === 1 && (
          <div className="bg-white rounded-2xl p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">{t('ads.create.selectProperty')}</h2>
              <p className="text-gray-600">{t('ads.create.selectPropertyDesc')}</p>
            </div>

            {errors.property && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-700">{errors.property}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {properties.map((property) => (
                <div
                  key={property.id}
                  onClick={() => handlePropertySelect(property)}
                  className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                    selectedProperty?.id === property.id
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {property.property_images?.[0] && (
                      <img
                        src={property.property_images[0].image_url}
                        alt={property.title}
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{property.title}</h3>
                      <p className="text-sm text-gray-600">{property.location}</p>
                      <p className="text-sm font-medium text-purple-600 mt-1">
                        ${property.price_usdt.toLocaleString()}
                      </p>
                    </div>
                    {selectedProperty?.id === property.id && (
                      <CheckCircle className="w-5 h-5 text-purple-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={handleNext}
                disabled={!selectedProperty}
                className="px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('ads.create.next')} →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Creative Content */}
        {step === 2 && (
          <div className="bg-white rounded-2xl p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">{t('ads.create.creative')}</h2>
              <p className="text-gray-600">{t('ads.create.creativeDesc')}</p>
            </div>

            <div className="space-y-6">
              {/* Campaign Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('ads.create.campaignTitle')}
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    errors.title ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder={t('ads.create.titlePlaceholder')}
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                )}
              </div>

              {/* Ad Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('ads.create.preview')}
                </label>
                <div className="border rounded-xl p-4 bg-gray-50">
                  <div className="bg-white rounded-xl overflow-hidden">
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt="Ad preview"
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        {formData.title || t('ads.create.yourTitle')}
                      </h3>
                      <p className="text-gray-600 text-sm mb-3">
                        {formData.creative_text || t('ads.create.yourText')}
                      </p>
                      <button className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium">
                        {formData.cta_button}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ad Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('ads.create.adText')}
                </label>
                <textarea
                  value={formData.creative_text}
                  onChange={(e) => setFormData({...formData, creative_text: e.target.value})}
                  className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    errors.creative_text ? 'border-red-300' : 'border-gray-300'
                  }`}
                  rows={4}
                  placeholder={t('ads.create.textPlaceholder')}
                />
                {errors.creative_text && (
                  <p className="mt-1 text-sm text-red-600">{errors.creative_text}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  {formData.creative_text.length}/500 {t('ads.create.characters')}
                </p>
              </div>

              {/* CTA Button */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('ads.create.ctaButton')}
                </label>
                <select
                  value={formData.cta_button}
                  onChange={(e) => setFormData({...formData, cta_button: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Learn More">{t('ads.create.cta.learnMore')}</option>
                  <option value="View Property">{t('ads.create.cta.viewProperty')}</option>
                  <option value="Contact Agent">{t('ads.create.cta.contactAgent')}</option>
                  <option value="Schedule Tour">{t('ads.create.cta.scheduleTour')}</option>
                  <option value="Get Info">{t('ads.create.cta.getInfo')}</option>
                </select>
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={handleBack}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
              >
                ← {t('ads.create.back')}
              </button>
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700"
              >
                {t('ads.create.next')} →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Budget & Schedule */}
        {step === 3 && (
          <div className="bg-white rounded-2xl p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">{t('ads.create.budgetSchedule')}</h2>
              <p className="text-gray-600">{t('ads.create.budgetScheduleDesc')}</p>
            </div>

            <div className="space-y-6">
              {/* Placement */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {t('ads.create.placement.title')}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {placementOptions.map((option) => (
                    <div
                      key={option.id}
                      onClick={() => setFormData({...formData, placement: option.id as any})}
                      className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all ${
                        formData.placement === option.id
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {option.recommended && (
                        <span className="absolute -top-3 right-4 px-2 py-1 bg-purple-600 text-white text-xs rounded-full">
                          {t('ads.create.recommended')}
                        </span>
                      )}
                      <div className="flex items-start gap-3">
                        <div className="text-purple-600">{option.icon}</div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{option.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                          <p className="text-sm font-medium text-purple-600 mt-2">{option.price}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('ads.create.totalBudget')} (USDT)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      value={formData.budget_usdt}
                      onChange={(e) => setFormData({...formData, budget_usdt: Number(e.target.value)})}
                      className={`w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        errors.budget ? 'border-red-300' : 'border-gray-300'
                      }`}
                      min="50"
                    />
                  </div>
                  {errors.budget && (
                    <p className="mt-1 text-sm text-red-600">{errors.budget}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('ads.create.dailyBudget')} (USDT)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      value={formData.daily_budget_usdt}
                      onChange={(e) => setFormData({...formData, daily_budget_usdt: Number(e.target.value)})}
                      className={`w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        errors.daily_budget ? 'border-red-300' : 'border-gray-300'
                      }`}
                      min="5"
                    />
                  </div>
                  {errors.daily_budget && (
                    <p className="mt-1 text-sm text-red-600">{errors.daily_budget}</p>
                  )}
                </div>
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('ads.create.startDate')}
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      errors.start_date ? 'border-red-300' : 'border-gray-300'
                    }`}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {errors.start_date && (
                    <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('ads.create.endDate')} ({t('ads.create.optional')})
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    min={formData.start_date}
                  />
                </div>
              </div>

              {/* Estimated Reach */}
              <div className="bg-purple-50 rounded-xl p-4">
                <h4 className="font-semibold text-purple-900 mb-2">{t('ads.create.estimatedReach')}</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-purple-600">{t('ads.create.dailyReach')}</p>
                    <p className="font-semibold text-purple-900">5,000 - 10,000</p>
                  </div>
                  <div>
                    <p className="text-purple-600">{t('ads.create.totalReach')}</p>
                    <p className="font-semibold text-purple-900">
                      {Math.round((formData.budget_usdt / formData.daily_budget_usdt) * 7500).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-purple-600">{t('ads.create.duration')}</p>
                    <p className="font-semibold text-purple-900">
                      {Math.round(formData.budget_usdt / formData.daily_budget_usdt)} {t('ads.create.days')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={handleBack}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
              >
                ← {t('ads.create.back')}
              </button>
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700"
              >
                {t('ads.create.next')} →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Launch */}
        {step === 4 && (
          <div className="bg-white rounded-2xl p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">{t('ads.create.review')}</h2>
              <p className="text-gray-600">{t('ads.create.reviewDesc')}</p>
            </div>

            <div className="space-y-6">
              {/* Campaign Summary */}
              <div className="border rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-4">{t('ads.create.campaignSummary')}</h3>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('ads.create.property')}:</span>
                    <span className="font-medium">{selectedProperty?.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('ads.create.campaignTitle')}:</span>
                    <span className="font-medium">{formData.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('ads.create.placement.title')}:</span>
                    <span className="font-medium">
                      {placementOptions.find(p => p.id === formData.placement)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('ads.create.totalBudget')}:</span>
                    <span className="font-medium">${formData.budget_usdt}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('ads.create.dailyBudget')}:</span>
                    <span className="font-medium">${formData.daily_budget_usdt}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('ads.create.startDate')}:</span>
                    <span className="font-medium">{formData.start_date}</span>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">{t('ads.create.paymentInfo')}</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      {t('ads.create.paymentInfoDesc')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Terms */}
              <div className="border rounded-xl p-4">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    required
                  />
                  <span className="text-sm text-gray-600">
                    {t('ads.create.terms')}
                  </span>
                </label>
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={handleBack}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
              >
                ← {t('ads.create.back')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? t('ads.create.launching') : t('ads.create.launch')} →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}