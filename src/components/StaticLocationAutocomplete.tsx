import React, { useState, useEffect, useRef } from 'react'
import { Navigation, MapPin } from 'lucide-react'
import { supabase } from '../utils/supabase'

interface Location {
  id: string
  name: string
  type: string
  country_code: string
  state_province?: string
}

interface StaticLocationAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
  required?: boolean
}

export default function StaticLocationAutocomplete({
  value,
  onChange,
  placeholder,
  label,
  required = false
}: StaticLocationAutocompleteProps) {
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Update input display value when external value changes
    if (value) {
      setInputValue(value)
    } else {
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

  const searchLocations = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setFilteredLocations([])
      setShowDropdown(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase
        .from('world_locations')
        .select('id, name, type, country_code, state_province')
        .or(`name.ilike.%${searchTerm}%,state_province.ilike.%${searchTerm}%`)
        .in('type', ['city', 'town', 'county', 'state', 'province'])
        .order('population', { ascending: false, nullsLast: true })
        .limit(20)

      if (error) throw error

      const locations: Location[] = (data || []).map(location => ({
        id: location.id,
        name: location.name,
        type: location.type,
        country_code: location.country_code,
        state_province: location.state_province
      }))

      setFilteredLocations(locations)
      setShowDropdown(locations.length > 0)
    } catch (error: any) {
      console.error('Error fetching locations:', error)
      setError('Failed to load locations. Please try again.')
      setFilteredLocations([])
      setShowDropdown(false)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value
    setInputValue(searchTerm)
    
    if (searchTerm.length === 0) {
      onChange('')
      setFilteredLocations([])
      setShowDropdown(false)
    } else {
      searchLocations(searchTerm)
    }
  }

  const handleLocationSelect = (location: Location) => {
    const displayName = location.state_province 
      ? `${location.name}, ${location.state_province}, ${location.country_code}`
      : `${location.name}, ${location.country_code}`
    
    setInputValue(displayName)
    onChange(displayName)
    setShowDropdown(false)
  }

  const handleInputFocus = () => {
    if (filteredLocations.length > 0) {
      setShowDropdown(true)
    }
  }

  const getLocationTypeIcon = (type: string) => {
    switch (type) {
      case 'city':
        return '🏙️'
      case 'town':
        return '🏘️'
      case 'county':
        return '🏞️'
      case 'state':
      case 'province':
        return '🗺️'
      default:
        return '📍'
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

      {showDropdown && filteredLocations.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {filteredLocations.map((location, index) => (
            <div
              key={`${location.id}-${index}`}
              onClick={() => handleLocationSelect(location)}
              className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                  <span className="text-sm">{getLocationTypeIcon(location.type)}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-900">{location.name}</span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full capitalize">
                      {location.type}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {location.state_province && `${location.state_province}, `}
                    {location.country_code}
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