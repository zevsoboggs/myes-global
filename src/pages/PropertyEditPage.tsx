import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Trash2,
  MapPin,
  Home as HomeIcon,
  Building2,
  Globe,
  Square,
  Bed,
  Bath,
  Coins,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Camera,
  Star,
} from 'lucide-react';
import { supabase, type Property } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useCrypto } from '../hooks/useCrypto';
import { LocationPicker } from '../components/LocationPicker';
import { useLanguage } from '../contexts/LanguageContext';

const getAvailableFeatures = (t: any) => [
  t('feature.parking'), t('feature.pool'), t('feature.garden'), t('feature.security'), 
  t('feature.gym'), t('feature.balcony'), t('feature.terrace'), t('feature.aircon'), 
  t('feature.fireplace'), t('feature.seaView'), t('feature.lift'), t('feature.internet'), 
  t('feature.furniture'), t('feature.appliances'), t('feature.laundry')
];

export function PropertyEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { prices } = useCrypto();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [property, setProperty] = useState<Property | null>(null);
  const [images, setImages] = useState<{ id: string; image_url: string; is_primary: boolean }[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [showLocation, setShowLocation] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    property_type: 'apartment',
    bedrooms: '',
    bathrooms: '',
    area_sqm: '',
    address: '',
    latitude: '',
    longitude: '',
    features: [] as string[],
    is_active: true,
    price_zar: '',
  });

  const zarPerUsd = useMemo(() => (prices ? prices.bitcoin.zar / prices.bitcoin.usd : 0), [prices]);
  const currentZarFromUsdt = useMemo(() => (property && zarPerUsd ? property.price_usdt * zarPerUsd : 0), [property, zarPerUsd]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from('properties')
          .select(`*, property_images (id, image_url, is_primary, created_at)`) // загружаем изображения
          .eq('id', id)
          .single();
        if (error) throw error;
        setProperty(data as Property);
        setImages((data as any).property_images || []);
        setForm({
          title: data.title,
          description: data.description,
          property_type: data.property_type,
          bedrooms: String(data.bedrooms ?? ''),
          bathrooms: String(data.bathrooms ?? ''),
          area_sqm: String(data.area_sqm ?? ''),
          address: data.address,
          latitude: String(data.latitude),
          longitude: String(data.longitude),
          features: data.features || [],
          is_active: !!data.is_active,
          price_zar: zarPerUsd ? String(Math.round((data.price_usdt * zarPerUsd) * 100) / 100) : '',
        });
      } catch (e: any) {
        setError(e.message || t('propertyEdit.loadError'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, zarPerUsd]);

  const refreshImages = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('property_images')
      .select('id, image_url, is_primary, created_at')
      .eq('property_id', id)
      .order('created_at', { ascending: true });
    setImages((data as any) || []);
  };

  const handleChange = (name: string, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleFeature = (feature: string) => {
    setForm((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }));
  };

  const computeUsdtFromZar = (zarStr: string) => {
    const zar = parseFloat(zarStr || '0');
    if (!prices || !zar || !zarPerUsd) return 0;
    const usd = zar / zarPerUsd;
    return usd;
  };

  const handleLocationSelect = (loc: { lat: number; lng: number; address: string }) => {
    setForm((prev) => ({
      ...prev,
      latitude: String(loc.lat),
      longitude: String(loc.lng),
      address: loc.address || prev.address,
    }));
  };

  const canEdit = user && property && user.id === property.realtor_id;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property || !canEdit) return;
    setSaving(true);
    setError('');
    try {
      const price_usdt = form.price_zar ? computeUsdtFromZar(form.price_zar) : property.price_usdt;
      const { error } = await supabase
        .from('properties')
        .update({
          title: form.title,
          description: form.description,
          property_type: form.property_type as Property['property_type'],
          bedrooms: parseInt(form.bedrooms) || 0,
          bathrooms: parseFloat(form.bathrooms) || 0,
          area_sqm: parseFloat(form.area_sqm) || 0,
          address: form.address,
          latitude: parseFloat(form.latitude),
          longitude: parseFloat(form.longitude),
          features: form.features,
          is_active: form.is_active,
          price_usdt: price_usdt || property.price_usdt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', property.id);
      if (error) throw error;
      navigate(`/properties/${property.id}`);
    } catch (e: any) {
      setError(e.message || 'Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!property || !canEdit) return;
    if (!confirm('Удалить объект? Действие нельзя отменить.')) return;
    try {
      const { error } = await supabase.from('properties').delete().eq('id', property.id);
      if (error) throw error;
      navigate('/dashboard');
    } catch (e: any) {
      alert(e.message || 'Ошибка при удалении');
    }
  };

  const onSelectNewImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const total = images.length + newImages.length + files.length;
    if (total > 10) {
      alert('Максимум 10 изображений на объект');
      return;
    }
    setNewImages((prev) => [...prev, ...files]);
    setNewPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
  };

  const uploadNewImages = async () => {
    if (!property || newImages.length === 0) return;
    setUploadingImages(true);
    try {
      for (let i = 0; i < newImages.length; i++) {
        const file = newImages[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${property.id}-${Date.now()}-${i}.${fileExt}`;
        const filePath = `property-images/${fileName}`;
        const { error: upErr } = await supabase.storage.from('properties').upload(filePath, file);
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from('properties').getPublicUrl(filePath);
        const { error: imgErr } = await supabase
          .from('property_images')
          .insert({ property_id: property.id, image_url: publicUrl, is_primary: images.length === 0 && i === 0 });
        if (imgErr) throw imgErr;
      }
      setNewImages([]);
      setNewPreviews([]);
      await refreshImages();
    } catch (e: any) {
      alert(e.message || 'Ошибка загрузки изображений');
    } finally {
      setUploadingImages(false);
    }
  };

  const parseStoragePath = (url: string) => {
    // ожидаемый вид: .../object/public/properties/<path>
    const marker = '/public/properties/';
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.substring(idx + marker.length);
  };

  const setPrimaryImage = async (imageId: string) => {
    if (!property) return;
    try {
      await supabase.from('property_images').update({ is_primary: false }).eq('property_id', property.id);
      await supabase.from('property_images').update({ is_primary: true }).eq('id', imageId);
      await refreshImages();
    } catch (e: any) {
      alert(e.message || t('propertyEdit.error'));
    }
  };

  const deleteImage = async (image: { id: string; image_url: string }) => {
    if (!confirm('Удалить изображение?')) return;
    try {
      const path = parseStoragePath(image.image_url);
      if (path) await supabase.storage.from('properties').remove([path]);
      await supabase.from('property_images').delete().eq('id', image.id);
      await refreshImages();
    } catch (e: any) {
      alert(e.message || t('propertyEdit.deleteError'));
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-6" />
          <p className="text-gray-600 text-lg">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (!canEdit) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-2">{t('propertyEdit.accessDenied')}</h2>
          <p className="text-gray-600 mb-4">{t('propertyEdit.ownerOnly')}</p>
          <Link to={`/properties/${id}`} className="text-blue-600 hover:underline">{t('propertyEdit.backToProperty')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
        {/* Заголовок */}
        <div className="mb-6 md:mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={`/properties/${id}`} className="p-2 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{t('propertyEdit.title')}</h1>
              <p className="text-gray-600">ID: {id}</p>
            </div>
          </div>
          <button onClick={onDelete} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-red-200 text-red-700 hover:bg-red-50 transition-all">
            <Trash2 className="w-4 h-4" /> {t('propertyEdit.delete')}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Основная форма */}
          <div className="lg:col-span-2 space-y-6 md:space-y-8">
            {/* Блок: Основное */}
            <div className="bg-white rounded-2xl shadow border border-gray-100 p-5 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('propertyEdit.propertyNameRequired')}</label>
                  <input value={form.title} onChange={(e) => handleChange('title', e.target.value)} required className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-600 focus:border-blue-600" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('propertyEdit.descriptionRequired')}</label>
                  <textarea value={form.description} onChange={(e) => handleChange('description', e.target.value)} required rows={5} className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 resize-y" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('propertyEdit.propertyTypeRequired')}</label>
                  <select value={form.property_type} onChange={(e) => handleChange('property_type', e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-600 focus:border-blue-600">
                    <option value="apartment">{t('propertyType.apartmentSingular')}</option>
                    <option value="house">{t('propertyType.houseSingular')}</option>
                    <option value="villa">{t('propertyType.villaSingular')}</option>
                    <option value="commercial">{t('propertyType.commercialSingular')}</option>
                    <option value="land">{t('propertyType.landSingular')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('propertyEdit.areaRequired')}</label>
                  <div className="relative">
                    <Square className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="number" value={form.area_sqm} onChange={(e) => handleChange('area_sqm', e.target.value)} required min={0} step={0.01} className="w-full pl-10 border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-600 focus:border-blue-600" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('propertyEdit.bedrooms')}</label>
                  <div className="relative">
                    <Bed className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="number" value={form.bedrooms} onChange={(e) => handleChange('bedrooms', e.target.value)} min={0} className="w-full pl-10 border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-600 focus:border-blue-600" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('propertyEdit.bathrooms')}</label>
                  <div className="relative">
                    <Bath className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="number" step={0.5} value={form.bathrooms} onChange={(e) => handleChange('bathrooms', e.target.value)} min={0} className="w-full pl-10 border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-600 focus:border-blue-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Блок: Местоположение */}
            <div className="bg-white rounded-2xl shadow border border-gray-100 p-5 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{t('propertyEdit.location')}</h3>
                </div>
                <button type="button" onClick={() => setShowLocation((s) => !s)} className="text-blue-600 hover:underline">
                  {showLocation ? t('propertyEdit.hideMap') : t('propertyEdit.editOnMap')}
                </button>
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('propertyEdit.addressRequired')}</label>
              <input value={form.address} onChange={(e) => handleChange('address', e.target.value)} required className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-600 focus:border-blue-600" />
              {showLocation && (
                <div className="mt-4">
                  <LocationPicker onLocationSelect={handleLocationSelect} initialLocation={{ lat: parseFloat(form.latitude || '0') || 0, lng: parseFloat(form.longitude || '0') || 0 }} />
                </div>
              )}
            </div>

            {/* Блок: Особенности */}
            <div className="bg-white rounded-2xl shadow border border-gray-100 p-5 md:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">{t('propertyEdit.features')}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {getAvailableFeatures(t).map((f) => (
                  <label key={f} className={`cursor-pointer px-3 py-2 rounded-xl border-2 transition-all ${form.features.includes(f) ? 'border-blue-500 bg-blue-50 text-gray-900' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                    <input type="checkbox" checked={form.features.includes(f)} onChange={() => toggleFeature(f)} className="hidden" />
                    {f}
                  </label>
                ))}
              </div>
            </div>

            {/* Блок: Фотографии */}
            <div className="bg-white rounded-2xl shadow border border-gray-100 p-5 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl flex items-center justify-center">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{t('propertyEdit.images')}</h3>
                </div>
                <div className="text-sm text-gray-500">{images.length} / 10</div>
              </div>

              {/* Текущее */}
              {images.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-300 p-6 text-center text-gray-500">{t('propertyEdit.noImages')}</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-4">
                  {images.map((img) => (
                    <div key={img.id} className="relative group rounded-xl overflow-hidden border border-gray-200">
                      <img src={img.image_url} alt="" className="w-full h-40 object-cover" />
                      {img.is_primary && (
                        <div className="absolute top-2 left-2 inline-flex items-center gap-1 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                          <Star className="w-3 h-3" /> {t('propertyEdit.mainImage')}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
                        <button type="button" onClick={() => setPrimaryImage(img.id)} className="px-2 py-1 text-xs rounded-lg bg-white/90 hover:bg-white text-gray-800 border">{t('propertyEdit.makeMain')}</button>
                        <button type="button" onClick={() => deleteImage(img)} className="px-2 py-1 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600">{t('propertyEdit.delete')}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Догрузка */}
              <div className="rounded-2xl border-2 border-dashed border-gray-300 p-6 text-center">
                <input id="add-photos" type="file" accept="image/*" multiple onChange={onSelectNewImages} className="hidden" />
                <label htmlFor="add-photos" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white cursor-pointer hover:from-blue-700 hover:to-cyan-700">
                  <Camera className="w-4 h-4" /> {t('propertyEdit.addPhotos')}
                </label>
                {newPreviews.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                    {newPreviews.map((src, i) => (
                      <div key={i} className="relative">
                        <img src={src} className="w-full h-28 object-cover rounded-xl border" />
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4">
                  <button type="button" disabled={uploadingImages || newImages.length === 0} onClick={uploadNewImages} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 disabled:opacity-50">
                    {uploadingImages ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-600 border-t-transparent" /> {t('propertyEdit.uploadingImages')}
                      </>
                    ) : (
                      <>{t('propertyEdit.uploadImages')}</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Боковая панель */}
          <div className="space-y-6 md:space-y-8">
            {/* Цена/Статус */}
            <div className="bg-white rounded-2xl shadow border border-gray-100 p-5 md:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{t('propertyEdit.priceAndStatus')}</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('propertyEdit.priceZAR')}</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="number" min={0} step={0.01} value={form.price_zar} onChange={(e) => handleChange('price_zar', e.target.value)} placeholder={prices ? String(Math.round(currentZarFromUsdt)) : ''} className="w-full pl-10 border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-600 focus:border-blue-600" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{t('propertyEdit.priceHint')}</p>
                </div>
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 border border-gray-200">
                  <span className="text-sm text-gray-700">{t('propertyEdit.status')}</span>
                  <label className="inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={form.is_active} onChange={(e) => handleChange('is_active', e.target.checked)} className="sr-only" />
                    <span className={`w-10 h-5 inline-block rounded-full transition-colors ${form.is_active ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`block w-4 h-4 bg-white rounded-full translate-x-1 transition-transform ${form.is_active ? 'translate-x-5' : ''}`} />
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow border border-gray-100 p-5 md:p-6">
              <button type="submit" disabled={saving} className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold py-3 md:py-4 rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50">
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    {t('propertyEdit.saving')}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> {t('propertyEdit.saveChanges')}
                  </>
                )}
              </button>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-5 md:p-6">
              <div className="flex items-center gap-2 mb-2"><CheckCircle className="w-4 h-4 text-green-600" /><span className="font-semibold text-green-800">{t('propertyEdit.hint')}</span></div>
              <p className="text-sm text-green-700">{t('propertyEdit.priceFormHint')}</p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 