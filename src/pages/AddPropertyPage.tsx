import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Upload, 
  Home, 
  Bed, 
  Bath, 
  Square, 
  DollarSign,
  Coins,
  Plus,
  X,
  Camera,
  ArrowLeft,
  MapPin,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Building2,
  Zap,
  Shield,
  Globe,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { LocationPicker } from '../components/LocationPicker';
import { CountrySelector } from '../components/CountrySelector';
import { useLanguage } from '../contexts/LanguageContext';
import { useCrypto } from '../hooks/useCrypto';
import { useCountries } from '../hooks/useCountries';
import { generatePropertyDescription } from '../lib/gemini';

const availableFeatures = [
  'feature.parking', 'feature.pool', 'feature.garden', 'feature.security', 'feature.gym', 'feature.balcony',
  'feature.terrace', 'feature.aircon', 'feature.fireplace', 'feature.seaView', 'feature.lift',
  'feature.internet', 'feature.furniture', 'feature.appliances', 'feature.laundry'
];

export function AddPropertyPage() {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const { prices } = useCrypto();
  const { selectedCountry, formatPrice, convertFromUSDT, exchangeRates } = useCountries();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [showCryptoInfo, setShowCryptoInfo] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const propertyTypes = [
    { value: 'apartment', label: t('propertyType.apartment'), icon: Home },
    { value: 'house', label: t('propertyType.house'), icon: Building2 },
    { value: 'villa', label: t('propertyType.villa'), icon: Home },
    { value: 'commercial', label: t('propertyType.commercial'), icon: Building2 },
    { value: 'land', label: t('propertyType.land'), icon: Globe },
  ];

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price_local: '',
    property_type: 'apartment',
    bedrooms: '',
    bathrooms: '',
    area_sqm: '',
    address: '',
    latitude: '',
    longitude: '',
    features: [] as string[],
    country_code: selectedCountry.code,
  });

  // Update country code when selected country changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      country_code: selectedCountry.code
    }));
  }, [selectedCountry.code]);

  // Local state to track current country for UI updates
  const [currentCountry, setCurrentCountry] = useState(selectedCountry);

  // Update current country when global selected country changes
  useEffect(() => {
    setCurrentCountry(selectedCountry);
  }, [selectedCountry]);

  // Handler for country change from CountrySelector
  const handleCountryChange = (country: any) => {
    setFormData(prev => ({
      ...prev,
      country_code: country.code
    }));
    // Update local country state for immediate UI update
    setCurrentCountry(country);
  };

  const computeConverted = () => {
    const priceLocal = parseFloat(formData.price_local || '0');
    if (!priceLocal || !exchangeRates[currentCountry.currency]) return { usdt: 0, btc: 0, eth: 0 };

    // Convert local currency to USDT
    const usdt = priceLocal / exchangeRates[currentCountry.currency];

    // Calculate crypto amounts
    const btc = prices?.bitcoin?.usd ? usdt / prices.bitcoin.usd : 0;
    const eth = prices?.ethereum?.usd ? usdt / prices.ethereum.usd : 0;

    return { usdt, btc, eth };
  };

  // Проверка авторизации
  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-6"></div>
          <p className="text-gray-600 text-lg">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Запрет для покупателей
  if (profile.role === 'buyer') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('addProperty.accessDenied')}</h1>
          <p className="text-gray-600 mb-6">{t('addProperty.buyerCantAdd')}</p>
          <div className="flex gap-3 justify-center">
            <Link to="/properties" className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white">{t('addProperty.toCatalog')}</Link>
            <Link to="/dashboard" className="px-5 py-3 rounded-xl border border-gray-200 text-gray-800 hover:bg-gray-50">{t('addProperty.toDashboard')}</Link>
          </div>
        </div>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFeatureToggle = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 10) {
      alert(t('addProperty.maxImages'));
      return;
    }
    
    const newImages = [...images, ...files];
    setImages(newImages);
    
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews([...imagePreviews, ...newPreviews]);
  };

  const handleLocationSelect = (location: { lat: number; lng: number; address: string }) => {
    setFormData(prev => ({
      ...prev,
      latitude: location.lat.toString(),
      longitude: location.lng.toString(),
      address: location.address
    }));
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  const uploadImages = async (propertyId: string) => {
    if (images.length === 0) return;

    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${propertyId}-${i}-${Date.now()}.${fileExt}`;
      const filePath = `property-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('properties')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('properties')
        .getPublicUrl(filePath);

      const { error: imageError } = await supabase
        .from('property_images')
        .insert({
          property_id: propertyId,
          image_url: publicUrl,
          is_primary: i === 0
        });

      if (imageError) throw imageError;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length === 0) {
      setError(t('addProperty.imageRequired'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const converted = computeConverted();
      
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .insert({
          realtor_id: user.id,
          title: formData.title,
          description: formData.description,
          price_usdt: converted.usdt,
          property_type: formData.property_type,
          bedrooms: parseInt(formData.bedrooms) || 0,
          bathrooms: parseFloat(formData.bathrooms) || 0,
          area_sqm: parseFloat(formData.area_sqm),
          address: formData.address,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          features: formData.features,
          country_code: currentCountry.code,
          is_active: true
        })
        .select()
        .single();

      if (propertyError) throw propertyError;

      await uploadImages(property.id);
      navigate('/dashboard');
    } catch (error: any) {
      setError(error.message || t('addProperty.createError'));
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, icon: Home },
    { id: 2, icon: Square },
    { id: 3, icon: MapPin },
    { id: 4, icon: CheckCircle },
    { id: 5, icon: Camera }
  ];

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 5));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Заголовок */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="p-2 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  {t('addProperty.title')}
                </h1>
                <p className="text-gray-600 mt-1">{t('addProperty.fillInfo')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Прогресс */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">{t('addProperty.stepCounter', { current: currentStep.toString(), total: '5' })}</h2>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" />
                <span className="text-sm text-gray-600">{t('addProperty.creating')}</span>
              </div>
            </div>
            
            {/* Прогресс бар */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div 
                className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / 5) * 100}%` }}
              ></div>
            </div>

            {/* Шаги */}
            <div className="grid grid-cols-5 gap-2 sm:gap-4">
              {steps.map((step, index) => (
                <div key={step.id} className="text-center">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 mx-auto rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${
                    step.id <= currentStep 
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' 
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    <step.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-gray-700 hidden sm:block">
                    {t(`addProperty.step${step.id}`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Основная форма */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                
                {/* Шаг 1: Основная информация */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <Home className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{t('addProperty.step1')}</h3>
                      <p className="text-gray-600">{t('addProperty.step1Description')}</p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('addProperty.propertyName')} *
                        </label>
                        <input
                          type="text"
                          name="title"
                          required
                          value={formData.title}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                          placeholder={t('addProperty.propertyNamePlaceholder')}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('addProperty.description')} *
                        </label>
                        <div className="space-y-2">
                        <textarea
                          name="description"
                          required
                            rows={5}
                          value={formData.description}
                          onChange={handleInputChange}
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                          placeholder={t('addProperty.descriptionPlaceholder')}
                        />
                          {profile?.role === 'realtor' && (
                            <button
                              type="button"
                              disabled={aiLoading}
                              onClick={async () => {
                                setAiLoading(true);
                                try {
                                  const desc = await generatePropertyDescription({
                                    title: formData.title,
                                    address: formData.address,
                                    property_type: formData.property_type,
                                    bedrooms: formData.bedrooms,
                                    bathrooms: formData.bathrooms,
                                    area_sqm: formData.area_sqm,
                                    features: formData.features,
                                  });
                                  setFormData((p) => ({ ...p, description: desc }));
                                } catch (e: any) {
                                  alert(e?.message || t('addProperty.aiError'));
                                } finally {
                                  setAiLoading(false);
                                }
                              }}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 text-sm"
                            >
                              {aiLoading ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" /> {t('addProperty.generating')}
                                </>
                              ) : (
                                <>
                                  {t('addProperty.generateAI')}
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      <CountrySelector
                        className="mb-4"
                        onCountryChange={handleCountryChange}
                      />

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('addProperty.propertyType')} *
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {propertyTypes.map(type => (
                            <label key={type.value} className="cursor-pointer">
                              <input
                                type="radio"
                                name="property_type"
                                value={type.value}
                                checked={formData.property_type === type.value}
                                onChange={handleInputChange}
                                className="hidden"
                              />
                              <div className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                                formData.property_type === type.value
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}>
                                <type.icon className="w-6 h-6 text-gray-600 mb-2" />
                                <p className="text-sm font-medium text-gray-700">{type.label}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Шаг 2: Характеристики */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <Square className="w-12 h-12 text-green-500 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{t('addProperty.step2')}</h3>
                      <p className="text-gray-600">{t('addProperty.step2Description')}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('addProperty.bedrooms')}
                        </label>
                        <div className="relative">
                          <Bed className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="number"
                            name="bedrooms"
                            min="0"
                            value={formData.bedrooms}
                            onChange={handleInputChange}
                            className="pl-10 w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                            placeholder={t('addProperty.bedroomsPlaceholder')}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('addProperty.bathrooms')}
                        </label>
                        <div className="relative">
                          <Bath className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="number"
                            name="bathrooms"
                            min="0"
                            step="0.5"
                            value={formData.bathrooms}
                            onChange={handleInputChange}
                            className="pl-10 w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                            placeholder={t('addProperty.bathroomsPlaceholder')}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('addProperty.area')} *
                        </label>
                        <div className="relative">
                          <Square className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="number"
                            name="area_sqm"
                            required
                            min="0"
                            step="0.01"
                            value={formData.area_sqm}
                            onChange={handleInputChange}
                            className="pl-10 w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                            placeholder={t('addProperty.areaPlaceholder')}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Шаг 3: Местоположение */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <MapPin className="w-12 h-12 text-purple-500 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{t('addProperty.step3')}</h3>
                      <p className="text-gray-600">{t('addProperty.step3Description')}</p>
                    </div>

                    <div className="space-y-4">
                      <LocationPicker
                        onLocationSelect={handleLocationSelect}
                        initialLocation={
                          formData.latitude && formData.longitude
                            ? { lat: parseFloat(formData.latitude), lng: parseFloat(formData.longitude) }
                            : undefined
                        }
                      />
                      
                      {formData.address && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('common.address')} ({t('addProperty.autoFilled')})
                          </label>
                          <input
                            type="text"
                            name="address"
                            required
                            value={formData.address}
                            onChange={handleInputChange}
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 transition-all duration-300"
                            placeholder={t('addProperty.addressPlaceholder')}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {t('addProperty.canEditAddress')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Шаг 4: Особенности */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <CheckCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{t('addProperty.step4')}</h3>
                      <p className="text-gray-600">{t('addProperty.step4Description')}</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {availableFeatures.map(feature => (
                        <label key={feature} className="cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.features.includes(feature)}
                            onChange={() => handleFeatureToggle(feature)}
                            className="hidden"
                          />
                          <div className={`p-3 rounded-xl border-2 transition-all duration-300 ${
                            formData.features.includes(feature)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}>
                            <p className="text-sm font-medium text-gray-700">{t(feature)}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Шаг 5: Фотографии */}
                {currentStep === 5 && (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <Camera className="w-12 h-12 text-pink-500 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{t('addProperty.step5')}</h3>
                      <p className="text-gray-600">{t('addProperty.step5Description')}</p>
                    </div>

                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-blue-400 transition-all duration-300">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="image-upload"
                        />
                        <label htmlFor="image-upload" className="cursor-pointer">
                          <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600 mb-2 font-medium">{t('addProperty.clickToUploadImages')}</p>
                          <p className="text-sm text-gray-500">{t('addProperty.maxImages')}</p>
                        </label>
                      </div>

                      {/* Превью изображений */}
                      {imagePreviews.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                          {imagePreviews.map((preview, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={preview}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-32 object-cover rounded-xl"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-all duration-300 opacity-0 group-hover:opacity-100"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              {index === 0 && (
                                <div className="absolute bottom-2 left-2 bg-blue-500 text-white px-2 py-1 rounded-lg text-xs">
                                  {t('addProperty.mainPhoto')}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Навигация по шагам */}
                <div className="flex justify-between pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('common.back')}
                  </button>
                  
                  {currentStep < 5 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 flex items-center gap-2"
                    >
                      {t('common.next')}
                      <ArrowLeft className="w-4 h-4 rotate-180" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          {t('addProperty.creating')}
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          {t('addProperty.create')}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Боковая панель */}
          <div className="space-y-6">
            {/* Цена и конвертация */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="text-center mb-4">
                <DollarSign className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <h3 className="text-lg font-bold text-gray-900">{t('addProperty.priceIn')} {currentCountry.currency}</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('addProperty.priceIn')} {currentCountry.currency} ({currentCountry.currencySymbol}) *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      name="price_local"
                      required
                      min="0"
                      step="0.01"
                      value={formData.price_local}
                      onChange={handleInputChange}
                      className="pl-10 w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                      placeholder={t('addProperty.enterPrice', { currency: currentCountry.currency })}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCryptoInfo(!showCryptoInfo)}
                  className="w-full bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-3 hover:from-blue-100 hover:to-cyan-100 transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-800">{t('addProperty.cryptoConversion')}</span>
                    <Coins className="w-4 h-4 text-blue-600" />
                  </div>
                </button>

                {showCryptoInfo && (
                  <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
                    {(() => {
                      const conv = computeConverted();
                      return (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">USDT</span>
                            <span className="font-semibold text-gray-900">
                              {new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(conv.usdt)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-sm text-gray-600">
                              <Coins className="w-4 h-4" /> BTC
                            </span>
                            <span className="font-semibold text-gray-900">
                              {conv.btc ? conv.btc.toFixed(6) : '0.000000'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-sm text-gray-600">
                              <Coins className="w-4 h-4" /> ETH
                            </span>
                            <span className="font-semibold text-gray-900">
                              {conv.eth ? conv.eth.toFixed(6) : '0.000000'}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Информация */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="text-center mb-4">
                <Shield className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <h3 className="text-lg font-bold text-gray-900">{t('addProperty.information')}</h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800">{t('addProperty.securePayments')}</p>
                    <p className="text-xs text-green-600">{t('addProperty.cryptoTransactions')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                  <Globe className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">{t('addProperty.globalPlatform')}</p>
                    <p className="text-xs text-blue-600">{t('addProperty.worldwideAccess')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                  <Zap className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-purple-800">{t('addProperty.fastDeals')}</p>
                    <p className="text-xs text-purple-600">{t('addProperty.instantTransfers')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-orange-800">{t('addProperty.profitablePrices')}</p>
                    <p className="text-xs text-orange-600">{t('addProperty.bestOffers')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}