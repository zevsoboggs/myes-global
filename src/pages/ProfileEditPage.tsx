import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  User,
  Mail,
  Phone,
  Building,
  Shield,
  Camera,
  Upload,
  CheckCircle,
  AlertCircle,
  Crown,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Settings,
  PlusCircle,
  Heart,
  Scale,
  Search,
  MessageSquare,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

export function ProfileEditPage() {
  const { t } = useLanguage();
  const { user, profile, loading: authLoading, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalViews: 0,
    totalFavorites: 0
  });
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    agency_name: profile?.agency_name || '',
    license_number: profile?.license_number || '',
    bio: profile?.bio || '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    
    if (user && !authLoading) {
      fetchUserStats();
    }
  }, [user, authLoading, navigate]);

  const fetchUserStats = async () => {
    if (!user) return;

    try {
      // Получаем количество объектов пользователя
      const { count: propertiesCount } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('realtor_id', user.id)
        .eq('is_active', true);

      // Получаем общее количество просмотров
      const { data: properties } = await supabase
        .from('properties')
        .select('views_count')
        .eq('realtor_id', user.id)
        .eq('is_active', true);

      const totalViews = properties?.reduce((sum, prop) => sum + (prop.views_count || 0), 0) || 0;

      // Получаем количество избранных объектов пользователя
      const { count: favoritesCount } = await supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setStats({
        totalProperties: propertiesCount || 0,
        totalViews: totalViews,
        totalFavorites: favoritesCount || 0
      });
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Проверяем размер файла (максимум 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Файл слишком большой. Максимальный размер: 5MB');
        return;
      }

      // Проверяем тип файла
      if (!file.type.startsWith('image/')) {
        alert('Пожалуйста, выберите изображение');
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      let avatarUrl = profile?.avatar_url;

      // Загружаем аватар если выбран новый файл
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        // Удаляем старый аватар если есть
        if (profile?.avatar_url) {
          try {
            const oldPath = profile.avatar_url.split('/avatars/')[1];
            if (oldPath) {
              await supabase.storage.from('avatars').remove([oldPath]);
            }
          } catch (error) {
            console.log('Не удалось удалить старый аватар:', error);
          }
        }

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) {
          throw new Error(`Ошибка загрузки аватара: ${uploadError.message}`);
        }

        // Получаем публичный URL
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(uploadData.path);

        avatarUrl = urlData.publicUrl;
      }

      const updateData: any = {
        full_name: formData.full_name,
        phone: formData.phone,
        agency_name: formData.agency_name,
        license_number: formData.license_number,
        bio: formData.bio,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      };

      // Обновляем email если он изменился
      if (formData.email !== profile?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email
        });
        if (emailError) throw emailError;
      }

      // Обновляем пароль если указан
      if (formData.new_password && formData.new_password === formData.confirm_password) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: formData.new_password
        });
        if (passwordError) throw passwordError;
      }

      // Обновляем профиль
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      await updateProfile(updateData);
      await fetchUserStats(); // Обновляем статистику после сохранения

      // Сбрасываем состояние аватара
      setAvatarFile(null);
      setAvatarPreview(null);

      navigate('/dashboard');
    } catch (error) {
      console.error('Ошибка обновления профиля:', error);
      alert('Ошибка при обновлении профиля');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-6"></div>
          <p className="text-gray-600 text-lg">Проверка авторизации...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Заголовок */}
        <div className="mb-8">
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
                  {t('profileEdit.title')}
                </h1>
                <p className="text-gray-600 mt-1">{t('profileEdit.subtitle')}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Левая колонка - Аватар и основная информация */}
          <div className="lg:col-span-2 space-y-6">
            {/* Аватар */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                 <Camera className="w-5 h-5 text-blue-600" />
                 {t('profileEdit.avatar')}
              </h2>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl flex items-center justify-center border-2 border-blue-200 overflow-hidden">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                    ) : profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-blue-600 text-3xl sm:text-4xl font-bold">
                        {profile?.full_name?.charAt(0) || 'R'}
                      </span>
                    )}
                  </div>
                  {profile?.is_verified && (
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                      <Shield className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label className="cursor-pointer">
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 inline-flex items-center gap-2 font-medium">
                                             <Upload className="w-4 h-4" />
                       {t('profileEdit.uploadPhoto')}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                                     <p className="text-sm text-gray-600 mt-2">
                     {t('profileEdit.recommendedSize')}
                   </p>
                </div>
              </div>
            </div>

            {/* Основная информация */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-green-600" />
                {t('profileEdit.mainInfo')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('profileEdit.fullName')}
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    placeholder={t('profileEdit.fullNamePlaceholder')}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('profileEdit.email')}
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    placeholder={t('profileEdit.emailPlaceholder')}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('profileEdit.phone')}
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    placeholder={t('profileEdit.phonePlaceholder')}
                  />
                </div>
              </div>
            </div>

            {/* Роль-зависимая информация */}
            {profile?.role === 'realtor' && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Building className="w-5 h-5 text-blue-600" />
                  {t('profileEdit.realtorInfo')}
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profileEdit.agencyRequired')}
                    </label>
                    <input
                      type="text"
                      value={formData.agency_name}
                      onChange={(e) => handleInputChange('agency_name', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      placeholder={t('profileEdit.agencyRealtor')}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profileEdit.licenseRequired')}
                    </label>
                    <input
                      type="text"
                      value={formData.license_number}
                      onChange={(e) => handleInputChange('license_number', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      placeholder={t('profileEdit.realtorLicense')}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profileEdit.aboutServices')}
                    </label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none"
                      placeholder={t('profileEdit.aboutExperience')}
                    />
                  </div>
                </div>
              </div>
            )}

            {profile?.role === 'lawyer' && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-green-600" />
                  {t('profileEdit.lawyerInfo')}
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profileEdit.legalFirm')}
                    </label>
                    <input
                      type="text"
                      value={formData.agency_name}
                      onChange={(e) => handleInputChange('agency_name', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      placeholder={t('profileEdit.legalFirmPlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profileEdit.lawyerLicense')}
                    </label>
                    <input
                      type="text"
                      value={formData.license_number}
                      onChange={(e) => handleInputChange('license_number', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      placeholder={t('profileEdit.lawyerLicensePlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profileEdit.specialization')}
                    </label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none"
                      placeholder={t('profileEdit.aboutLegalExperience')}
                    />
                  </div>
                </div>
              </div>
            )}

            {profile?.role === 'buyer' && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-600" />
                  {t('profileEdit.additionalInfo')}
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profileEdit.aboutSelf')}
                    </label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none"
                      placeholder={t('profileEdit.aboutPreferences')}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Смена пароля */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-orange-600" />
{t('profileEdit.changePassword')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('profileEdit.newPassword')}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.new_password}
                      onChange={(e) => handleInputChange('new_password', e.target.value)}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      placeholder={t('profileEdit.newPasswordPlaceholder')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('profileEdit.confirmPassword')}
                  </label>
                  <input
                    type="password"
                    value={formData.confirm_password}
                    onChange={(e) => handleInputChange('confirm_password', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    placeholder={t('profileEdit.confirmPasswordPlaceholder')}
                  />
                </div>
              </div>
              {formData.new_password && formData.new_password !== formData.confirm_password && (
                <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {t('profileEdit.passwordMismatch')}
                </p>
              )}
            </div>
          </div>

          {/* Правая колонка - Навигация и статус */}
          <div className="space-y-6">
            {/* Быстрая навигация */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{t('profileEdit.quickNavigation')}</h3>
              <div className="space-y-2">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 transition-colors text-gray-700 hover:text-blue-700"
                >
                  <Settings className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('header.dashboard')}</span>
                </Link>

                {profile?.role === 'realtor' && (
                  <>
                    <Link
                      to="/properties/new"
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-green-50 transition-colors text-gray-700 hover:text-green-700"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">{t('header.addProperty')}</span>
                    </Link>
                    <Link
                      to="/analytics"
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-purple-50 transition-colors text-gray-700 hover:text-purple-700"
                    >
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm font-medium">{t('nav.analytics')}</span>
                    </Link>
                  </>
                )}

                {profile?.role === 'lawyer' && (
                  <Link
                    to="/deals"
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-green-50 transition-colors text-gray-700 hover:text-green-700"
                  >
                    <Scale className="w-4 h-4" />
                    <span className="text-sm font-medium">{t('nav.deals')}</span>
                  </Link>
                )}

                {profile?.role === 'buyer' && (
                  <>
                    <Link
                      to="/favorites"
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 transition-colors text-gray-700 hover:text-red-700"
                    >
                      <Heart className="w-4 h-4" />
                      <span className="text-sm font-medium">{t('nav.favorites')}</span>
                    </Link>
                    <Link
                      to="/saved-searches"
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-50 transition-colors text-gray-700 hover:text-indigo-700"
                    >
                      <Search className="w-4 h-4" />
                      <span className="text-sm font-medium">{t('nav.savedSearches')}</span>
                    </Link>
                  </>
                )}

                <Link
                  to="/chats"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-cyan-50 transition-colors text-gray-700 hover:text-cyan-700"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('nav.chats')}</span>
                </Link>

                {(profile?.role === 'realtor' || profile?.role === 'lawyer') && !profile?.is_verified && (
                  <Link
                    to="/verification"
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-yellow-50 transition-colors text-gray-700 hover:text-yellow-700"
                  >
                    <Shield className="w-4 h-4" />
                    <span className="text-sm font-medium">{t('nav.verification')}</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Статус профиля */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-600" />
{t('profileEdit.profileStatus')}
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">{t('profileEdit.profileActive')}</p>
                      <p className="text-sm text-green-600">{t('profileEdit.allFunctionsAvailable')}</p>
                    </div>
                  </div>
                </div>
                {profile?.is_verified ? (
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-800">{t('profileEdit.verified')}</p>
                        <p className="text-sm text-blue-600">{t('profileEdit.documentsVerified')}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                      <div>
                        <p className="font-medium text-yellow-800">{t('profileEdit.verificationRequired')}</p>
                        <p className="text-sm text-yellow-600">{t('profileEdit.uploadDocuments')}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Действия */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{t('profileEdit.actions')}</h3>
              <div className="space-y-3">
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 px-4 rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Сохранение...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {t('profileEdit.saveChanges')}
                    </>
                  )}
                </button>
                <Link
                  to="/verification"
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-4 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 font-medium flex items-center justify-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  {t('profileEdit.passVerification')}
                </Link>
                <Link
                  to="/dashboard"
                  className="w-full bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 py-3 px-4 rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all duration-300 font-medium flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('profileEdit.backToDashboard')}
                </Link>
              </div>
            </div>

            {/* Статистика */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                             <h3 className="text-lg font-bold text-gray-900 mb-4">{t('profileEdit.statistics')}</h3>
                             <div className="space-y-3">
                 <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl">
                   <span className="text-sm text-gray-600">{t('profileEdit.properties')}</span>
                   <span className="font-bold text-blue-600">{stats.totalProperties}</span>
                 </div>
                 <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                   <span className="text-sm text-gray-600">{t('profileEdit.views')}</span>
                   <span className="font-bold text-green-600">{stats.totalViews}</span>
                 </div>
                 <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                   <span className="text-sm text-gray-600">{t('profileEdit.inFavorites')}</span>
                   <span className="font-bold text-purple-600">{stats.totalFavorites}</span>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
