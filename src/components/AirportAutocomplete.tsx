import React, { useState, useEffect, useRef } from 'react'
import { Plane, MapPin } from 'lucide-react'
import { Airport } from '../types'

interface AirportAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
  required?: boolean
}

export default function AirportAutocomplete({
  value,
  onChange,
  placeholder,
  label,
  required = false
}: AirportAutocompleteProps) {
  const [filteredAirports, setFilteredAirports] = useState<Airport[]>([])
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

  const searchAirports = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setFilteredAirports([])
      setShowDropdown(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      // Using OpenFlights API (free, no API key required)
      const response = await fetch(`https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat`)
      const text = await response.text()
      
      // Parse CSV data
      const lines = text.split('\n')
      const airports: Airport[] = []
      
      for (const line of lines) {
        if (!line.trim()) continue
        
        const fields = line.split(',').map(field => field.replace(/"/g, ''))
        if (fields.length >= 6) {
          const [id, name, city, country, code] = fields
          
          if (code && code.length === 3 && name && city && country) {
            const airport: Airport = {
              code: code.toUpperCase(),
              name: name,
              city: city,
              country: country
            }
            
            // Filter based on search term
            const searchLower = searchTerm.toLowerCase()
            if (
              airport.code.toLowerCase().includes(searchLower) ||
              airport.name.toLowerCase().includes(searchLower) ||
              airport.city.toLowerCase().includes(searchLower) ||
              airport.country.toLowerCase().includes(searchLower)
            ) {
              airports.push(airport)
            }
          }
        }
        
        // Limit results to prevent performance issues
        if (airports.length >= 20) break
      }
      
      setFilteredAirports(airports)
      setShowDropdown(airports.length > 0)
    } catch (error) {
      console.error('Error fetching airports:', error)
      setError('Failed to load airports. Please try again.')
      setFilteredAirports([])
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
      setFilteredAirports([])
      setShowDropdown(false)
    } else {
      searchAirports(searchTerm)
    }
  }

  const handleAirportSelect = (airport: Airport) => {
    setInputValue(`${airport.code} - ${airport.name}, ${airport.city}`)
    onChange(airport.code)
    setShowDropdown(false)
  }

  const handleInputFocus = () => {
    if (filteredAirports.length > 0) {
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
        <Plane className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
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

      {showDropdown && filteredAirports.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {filteredAirports.map((airport, index) => (
            <div
              key={`${airport.code}-${index}`}
              onClick={() => handleAirportSelect(airport)}
              className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                  <MapPin size={16} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-blue-600">{airport.code}</span>
                    <span className="text-gray-900">{airport.name}</span>
                  </div>
                  <div className="text-sm text-gray-600">{airport.city}, {airport.country}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}