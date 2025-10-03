import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, Marker, Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { MapPin, Search } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useCountries } from '../hooks/useCountries';

type LocationPickerProps = {
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
  initialLocation?: { lat: number; lng: number };
  className?: string;
};

// Default centers moved to useCountries hook

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  gestureHandling: 'cooperative',
  backgroundColor: '#f3f4f6',
};

export function LocationPicker({ onLocationSelect, initialLocation, className = '' }: LocationPickerProps) {
  const { t } = useLanguage();
  const { selectedCountry } = useCountries();

  const getDefaultCenter = () => {
    if (initialLocation) return initialLocation;
    const [lat, lng] = selectedCountry.mapCenter;
    return { lat, lng };
  };

  const [selectedLocation, setSelectedLocation] = useState(getDefaultCenter());
  const [selectedAddress, setSelectedAddress] = useState('');
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  // Update map center when country changes
  useEffect(() => {
    if (!initialLocation) {
      const [lat, lng] = selectedCountry.mapCenter;
      setSelectedLocation({ lat, lng });
      setSelectedAddress('');
    }
  }, [selectedCountry.code, initialLocation]);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places'],
  });

  const mapContainerStyle = {
    width: '100%',
    height: '384px'
  };

  const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      handleLocationChange(lat, lng);
    }
  }, []);

  const onMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      handleLocationChange(lat, lng);
    }
  }, []);

  const handleLocationChange = async (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    
    if (!geocoderRef.current && window.google) {
      geocoderRef.current = new google.maps.Geocoder();
    }
    
    if (geocoderRef.current) {
      try {
        const result = await geocoderRef.current.geocode({ location: { lat, lng } });
        if (result.results && result.results[0]) {
          const address = result.results[0].formatted_address;
          setSelectedAddress(address);
          onLocationSelect({ lat, lng, address });
        } else {
          setSelectedAddress('');
          onLocationSelect({ lat, lng, address: '' });
        }
      } catch (error) {
        console.error('Geocoding error:', error);
        onLocationSelect({ lat, lng, address: '' });
      }
    } else {
      onLocationSelect({ lat, lng, address: '' });
    }
  };

  const onPlaceSelected = useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const address = place.formatted_address || '';
        setSelectedLocation({ lat, lng });
        setSelectedAddress(address);
        onLocationSelect({ lat, lng, address });
      }
    }
  }, [onLocationSelect]);

  const onAutocompleteLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  }, []);

  if (loadError) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="w-full h-96 rounded-lg border border-gray-300 overflow-hidden flex items-center justify-center bg-gray-100">
          <p className="text-gray-500">{t('map.loadError') || 'Error loading maps'}</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="w-full h-96 rounded-lg border border-gray-300 overflow-hidden flex items-center justify-center bg-gray-100">
          <p className="text-gray-500">{t('map.loading') || 'Loading map...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('addProperty.selectLocation')}
        </label>
        
        <div className="mb-4">
          <Autocomplete
            onLoad={onAutocompleteLoad}
            onPlaceChanged={onPlaceSelected}
            options={{
              componentRestrictions: { country: selectedCountry.code.toLowerCase() },
              fields: ['formatted_address', 'geometry', 'name'],
            }}
          >
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400 z-10" />
              <input
                type="text"
                placeholder={t('addProperty.searchArea')}
                className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </Autocomplete>
        </div>
        
        <div className="rounded-lg border border-gray-300 overflow-hidden">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={selectedLocation}
            zoom={selectedCountry.mapZoom}
            onClick={onMapClick}
            options={mapOptions}
          >
            <Marker
              position={selectedLocation}
              draggable={true}
              onDragEnd={onMarkerDragEnd}
              animation={google.maps.Animation.DROP}
            />
          </GoogleMap>
        </div>
        
        {selectedAddress && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">{t('addProperty.selectedAddress')}</p>
                <p className="text-green-700 text-sm">{selectedAddress}</p>
                <p className="text-xs text-green-600 mt-1">
                  {t('addProperty.coordinates')} {selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}