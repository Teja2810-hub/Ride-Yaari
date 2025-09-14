import React, { useState, useEffect, useRef } from 'react'
import { Navigation, MapPin } from 'lucide-react'

interface LocationData {
  address: string
  latitude: number | null
  longitude: number | null
}

interface LocationAutocompleteProps {
  value: LocationData | null
  onChange: (location: LocationData | null) => void
  placeholder: string
  label: string
  required?: boolean
}

// Google Places API types
declare global {
  interface Window {
    google: any
    initGooglePlaces: () => void
  }
}

export default function LocationAutocomplete({
  value,
  onChange,
  placeholder,
  label,
  required = false
}: LocationAutocompleteProps) {
  const [predictions, setPredictions] = useState<any[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [googleLoaded, setGoogleLoaded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const autocompleteService = useRef<any>(null)
  const placesService = useRef<any>(null)

  console.log('LocationAutocomplete - Current value:', value)
  console.log('LocationAutocomplete - Current inputValue:', inputValue)

  // Load Google Places API
  useEffect(() => {
    const loadGooglePlaces = () => {
      if (window.google && window.google.maps) {
        console.log('Google Places API already loaded')
        initializeServices()
        return
      }

      // Check if API key is available
      const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY
      if (!apiKey) {
        setError('Google Places API key not configured. Please add VITE_GOOGLE_PLACES_API_KEY to your .env file.')
        console.error('Missing Google Places API key')
        return
      }

      // Check if script is already being loaded
      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        console.log('Google Places API script already loading...')
        // Wait for it to load
        const checkLoaded = setInterval(() => {
          if (window.google && window.google.maps) {
            clearInterval(checkLoaded)
            initializeServices()
          }
        }, 100)
        return
      }

      console.log('Loading Google Places API...')
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGooglePlaces`
      script.async = true
      script.defer = true
      
      window.initGooglePlaces = () => {
        console.log('Google Places API loaded successfully')
        initializeServices()
      }

      script.onerror = () => {
        console.error('Failed to load Google Places API')
        setError('Failed to load Google Places API. Please check your API key and internet connection.')
      }

      document.head.appendChild(script)
    }

    const initializeServices = () => {
      try {
        autocompleteService.current = new window.google.maps.places.AutocompleteService()
        // Create a dummy div for PlacesService (required by Google API)
        const dummyDiv = document.createElement('div')
        placesService.current = new window.google.maps.places.PlacesService(dummyDiv)
        setGoogleLoaded(true)
        setError('') // Clear any previous errors
        console.log('Google Places services initialized')
      } catch (error) {
        console.error('Error initializing Google Places services:', error)
        setError('Error initializing Google Places services')
      }
    }

    loadGooglePlaces()
  }, [])

  useEffect(() => {
    // Update input display value when external value changes
    if (value && value.address) {
      console.log('LocationAutocomplete - Setting inputValue from value.address:', value.address)
      setInputValue(value.address)
    } else {
      console.log('LocationAutocomplete - Clearing inputValue')
      setInputValue('')
    }
  }, [value])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        dropdownRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchPlaces = async (searchTerm: string) => {
    if (searchTerm.length < 2 || !googleLoaded || !autocompleteService.current) {
      setPredictions([])
      setShowDropdown(false)
      return
    }

    console.log('LocationAutocomplete - Searching Google Places for:', searchTerm)
    setLoading(true)
    setError('')

    try {
      const request = {
        input: searchTerm,
        // Remove or adjust the types filter:
        // types: ['(cities)'], // <-- Remove this line or use a broader type
        // You can also try types: ['geocode'] or omit types for broader results
        componentRestrictions: { country: [] }
      }

      autocompleteService.current.getPlacePredictions(request, (predictions: any[], status: any) => {
        console.log('Google Places API response status:', status)
        console.log('Google Places API predictions:', predictions)

        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          setPredictions(predictions)
          setShowDropdown(true)
        } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          setPredictions([])
          setShowDropdown(false)
        } else {
          console.error('Google Places API error:', status)
          setError('Error searching locations. Please try again.')
          setPredictions([])
          setShowDropdown(false)
        }
        setLoading(false)
      })
    } catch (error: any) {
      console.error('LocationAutocomplete - Error searching places:', error)
      setError('Failed to search locations. Please try again.')
      setPredictions([])
      setShowDropdown(false)
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value
    console.log('LocationAutocomplete - Input changed to:', searchTerm)
    setInputValue(searchTerm)
    
    if (searchTerm.length === 0) {
      console.log('LocationAutocomplete - Clearing selection')
      onChange(null)
      setPredictions([])
      setShowDropdown(false)
    } else {
      searchPlaces(searchTerm)
    }
  }

  const handlePlaceSelect = (prediction: any) => {
    console.log('LocationAutocomplete - Place selected:', prediction)
    
    if (!placesService.current) {
      console.error('Places service not initialized')
      return
    }

    setLoading(true)
    
    // Get place details including coordinates
    const request = {
      placeId: prediction.place_id,
      fields: ['geometry', 'formatted_address', 'name']
    }

    placesService.current.getDetails(request, (place: any, status: any) => {
      console.log('Place details status:', status)
      console.log('Place details:', place)

      if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
        const locationData: LocationData = {
          address: place.formatted_address || prediction.description,
          latitude: place.geometry?.location?.lat() || null,
          longitude: place.geometry?.location?.lng() || null
        }
        
        console.log('LocationAutocomplete - Created LocationData:', locationData)
        
        setInputValue(locationData.address)
        onChange(locationData)
        setShowDropdown(false)
      } else {
        console.error('Error getting place details:', status)
        setError('Error getting location details. Please try again.')
      }
      setLoading(false)
    })
  }

  const handleInputFocus = () => {
    if (predictions.length > 0) {
      setShowDropdown(true)
    }
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <Navigation className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          placeholder={placeholder}
          required={required}
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-3 top-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}

      {!googleLoaded && !error && (
        <p className="text-sm text-gray-500 mt-1">Loading location services...</p>
      )}

      {showDropdown && predictions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {predictions.map((prediction, index) => (
            <div
              key={`${prediction.place_id}-${index}`}
              onClick={() => handlePlaceSelect(prediction)}
              className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                  <MapPin size={16} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">
                    {prediction.structured_formatting?.main_text || prediction.description}
                  </div>
                  <div className="text-sm text-gray-600">
                    {prediction.structured_formatting?.secondary_text || ''}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}