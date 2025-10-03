import React, { useCallback, useMemo, useState } from 'react';
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useCountries } from '../hooks/useCountries';
import { Property } from '../lib/supabase';

type MapProps = {
  properties: Property[];
  selectedProperty?: Property | null;
  onPropertySelect?: (property: Property) => void;
  height?: string;
};

// Default centers for different regions
const DEFAULT_CENTERS = {
  ZA: { lat: -33.9249, lng: 18.4241 }, // Cape Town
  TH: { lat: 13.7563, lng: 100.5018 }, // Bangkok
  EG: { lat: 30.0444, lng: 31.2357 }, // Cairo
  GR: { lat: 39.0742, lng: 21.8243 }, // Athens
  VN: { lat: 14.0583, lng: 108.2772 }, // Central Vietnam
  ID: { lat: -6.2088, lng: 106.8456 }, // Jakarta
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  gestureHandling: 'cooperative',
  backgroundColor: '#f3f4f6',
};

export function Map({ properties, selectedProperty, onPropertySelect, height = '400px' }: MapProps) {
  const { t } = useLanguage();
  const { selectedCountry, formatPrice } = useCountries();
  const [infoWindowProperty, setInfoWindowProperty] = useState<Property | null>(null);
  
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places'],
  });

  const mapContainerStyle = useMemo(() => ({
    width: '100%',
    height: height
  }), [height]);

  const center = useMemo(() => {
    if (selectedProperty && typeof selectedProperty.latitude === 'number' && typeof selectedProperty.longitude === 'number') {
      return { lat: selectedProperty.latitude, lng: selectedProperty.longitude };
    }
    const validProperties = properties.filter(p => typeof p.latitude === 'number' && typeof p.longitude === 'number');
    if (validProperties.length > 0) {
      const avgLat = validProperties.reduce((sum, p) => sum + (p.latitude || 0), 0) / validProperties.length;
      const avgLng = validProperties.reduce((sum, p) => sum + (p.longitude || 0), 0) / validProperties.length;
      return { lat: avgLat, lng: avgLng };
    }
    return DEFAULT_CENTERS[selectedCountry.code as keyof typeof DEFAULT_CENTERS] || DEFAULT_CENTERS.ZA;
  }, [properties, selectedProperty, selectedCountry]);

  const onMarkerClick = useCallback((property: Property) => {
    setInfoWindowProperty(property);
    onPropertySelect?.(property);
  }, [onPropertySelect]);

  const onInfoWindowClose = useCallback(() => {
    setInfoWindowProperty(null);
  }, []);

  if (loadError) {
    return (
      <div className="rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center bg-gray-100" style={{ height }}>
        <p className="text-gray-500">{t('map.loadError') || 'Error loading maps'}</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center bg-gray-100" style={{ height }}>
        <p className="text-gray-500">{t('map.loading') || 'Loading map...'}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={12}
        options={mapOptions}
      >
        {properties.map((property) => {
          if (typeof property.latitude !== 'number' || typeof property.longitude !== 'number') {
            return null;
          }
          
          const isSelected = selectedProperty?.id === property.id;
          
          return (
            <Marker
              key={property.id}
              position={{ lat: property.latitude, lng: property.longitude }}
              onClick={() => onMarkerClick(property)}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: isSelected ? 10 : 8,
                fillColor: isSelected ? '#ef4444' : '#3b82f6',
                fillOpacity: 0.8,
                strokeColor: isSelected ? '#dc2626' : '#2563eb',
                strokeWeight: 2,
              }}
            />
          );
        })}
        
        {infoWindowProperty && typeof infoWindowProperty.latitude === 'number' && typeof infoWindowProperty.longitude === 'number' && (
          <InfoWindow
            position={{ lat: infoWindowProperty.latitude, lng: infoWindowProperty.longitude }}
            onCloseClick={onInfoWindowClose}
          >
            <div className="p-2">
              <h3 className="font-medium text-gray-900">{infoWindowProperty.title || t('map.object')}</h3>
              {infoWindowProperty.price && (
                <p className="text-sm text-gray-600 mt-1">
                  {formatPrice(infoWindowProperty.price)}
                  <span className="text-xs text-gray-500 ml-2">
                    (${infoWindowProperty.price.toLocaleString()} USDT)
                  </span>
                </p>
              )}
              {infoWindowProperty.bedrooms && (
                <p className="text-xs text-gray-500 mt-1">
                  {infoWindowProperty.bedrooms} {t('property.bedrooms') || 'bedrooms'}
                </p>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}