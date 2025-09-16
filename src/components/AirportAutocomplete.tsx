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
    
    const searchLower = searchTerm.toLowerCase()

    try {
      // Comprehensive airport database with major airports
      const airportDatabase: Airport[] = [
        // US Major Airports
        { code: 'ATL', name: 'Hartsfield-Jackson Atlanta International Airport', city: 'Atlanta', country: 'United States' },
        { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'United States' },
        { code: 'ORD', name: 'O\'Hare International Airport', city: 'Chicago', country: 'United States' },
        { code: 'DFW', name: 'Dallas/Fort Worth International Airport', city: 'Dallas', country: 'United States' },
        { code: 'DEN', name: 'Denver International Airport', city: 'Denver', country: 'United States' },
        { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'United States' },
        { code: 'SFO', name: 'San Francisco International Airport', city: 'San Francisco', country: 'United States' },
        { code: 'LAS', name: 'McCarran International Airport', city: 'Las Vegas', country: 'United States' },
        { code: 'SEA', name: 'Seattle-Tacoma International Airport', city: 'Seattle', country: 'United States' },
        { code: 'CLT', name: 'Charlotte Douglas International Airport', city: 'Charlotte', country: 'United States' },
        { code: 'EWR', name: 'Newark Liberty International Airport', city: 'Newark', country: 'United States' },
        { code: 'PHX', name: 'Phoenix Sky Harbor International Airport', city: 'Phoenix', country: 'United States' },
        { code: 'IAH', name: 'George Bush Intercontinental Airport', city: 'Houston', country: 'United States' },
        { code: 'MIA', name: 'Miami International Airport', city: 'Miami', country: 'United States' },
        { code: 'BOS', name: 'Logan International Airport', city: 'Boston', country: 'United States' },
        { code: 'MSP', name: 'Minneapolis-Saint Paul International Airport', city: 'Minneapolis', country: 'United States' },
        { code: 'DTW', name: 'Detroit Metropolitan Wayne County Airport', city: 'Detroit', country: 'United States' },
        { code: 'PHL', name: 'Philadelphia International Airport', city: 'Philadelphia', country: 'United States' },
        { code: 'LGA', name: 'LaGuardia Airport', city: 'New York', country: 'United States' },
        { code: 'BWI', name: 'Baltimore/Washington International Thurgood Marshall Airport', city: 'Baltimore', country: 'United States' },
        { code: 'DCA', name: 'Ronald Reagan Washington National Airport', city: 'Washington', country: 'United States' },
        { code: 'IAD', name: 'Washington Dulles International Airport', city: 'Washington', country: 'United States' },
        { code: 'SLC', name: 'Salt Lake City International Airport', city: 'Salt Lake City', country: 'United States' },
        { code: 'HNL', name: 'Daniel K. Inouye International Airport', city: 'Honolulu', country: 'United States' },
        { code: 'PDX', name: 'Portland International Airport', city: 'Portland', country: 'United States' },
        { code: 'TPA', name: 'Tampa International Airport', city: 'Tampa', country: 'United States' },
        { code: 'STL', name: 'Lambert-St. Louis International Airport', city: 'St. Louis', country: 'United States' },
        { code: 'BNA', name: 'Nashville International Airport', city: 'Nashville', country: 'United States' },
        { code: 'AUS', name: 'Austin-Bergstrom International Airport', city: 'Austin', country: 'United States' },
        { code: 'MSY', name: 'Louis Armstrong New Orleans International Airport', city: 'New Orleans', country: 'United States' },
        { code: 'RDU', name: 'Raleigh-Durham International Airport', city: 'Raleigh', country: 'United States' },
        { code: 'MCI', name: 'Kansas City International Airport', city: 'Kansas City', country: 'United States' },
        { code: 'IND', name: 'Indianapolis International Airport', city: 'Indianapolis', country: 'United States' },
        { code: 'CMH', name: 'John Glenn Columbus International Airport', city: 'Columbus', country: 'United States' },
        { code: 'PIT', name: 'Pittsburgh International Airport', city: 'Pittsburgh', country: 'United States' },
        { code: 'CLE', name: 'Cleveland Hopkins International Airport', city: 'Cleveland', country: 'United States' },
        { code: 'MKE', name: 'Milwaukee Mitchell International Airport', city: 'Milwaukee', country: 'United States' },
        { code: 'RIC', name: 'Richmond International Airport', city: 'Richmond', country: 'United States' },
        { code: 'ORF', name: 'Norfolk International Airport', city: 'Norfolk', country: 'United States' },
        { code: 'ROA', name: 'Roanoke-Blacksburg Regional Airport', city: 'Roanoke', country: 'United States' },
        { code: 'CHO', name: 'Charlottesville Albemarle Airport', city: 'Charlottesville', country: 'United States' },
        
        // International Major Airports
        { code: 'LHR', name: 'Heathrow Airport', city: 'London', country: 'United Kingdom' },
        { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France' },
        { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany' },
        { code: 'AMS', name: 'Amsterdam Airport Schiphol', city: 'Amsterdam', country: 'Netherlands' },
        { code: 'MAD', name: 'Madrid-Barajas Airport', city: 'Madrid', country: 'Spain' },
        { code: 'FCO', name: 'Leonardo da Vinci International Airport', city: 'Rome', country: 'Italy' },
        { code: 'ZUR', name: 'Zurich Airport', city: 'Zurich', country: 'Switzerland' },
        { code: 'VIE', name: 'Vienna International Airport', city: 'Vienna', country: 'Austria' },
        { code: 'CPH', name: 'Copenhagen Airport', city: 'Copenhagen', country: 'Denmark' },
        { code: 'ARN', name: 'Stockholm Arlanda Airport', city: 'Stockholm', country: 'Sweden' },
        { code: 'OSL', name: 'Oslo Airport', city: 'Oslo', country: 'Norway' },
        { code: 'HEL', name: 'Helsinki Airport', city: 'Helsinki', country: 'Finland' },
        { code: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'Turkey' },
        { code: 'SVO', name: 'Sheremetyevo International Airport', city: 'Moscow', country: 'Russia' },
        { code: 'NRT', name: 'Narita International Airport', city: 'Tokyo', country: 'Japan' },
        { code: 'HND', name: 'Haneda Airport', city: 'Tokyo', country: 'Japan' },
        { code: 'ICN', name: 'Incheon International Airport', city: 'Seoul', country: 'South Korea' },
        { code: 'PEK', name: 'Beijing Capital International Airport', city: 'Beijing', country: 'China' },
        { code: 'PVG', name: 'Shanghai Pudong International Airport', city: 'Shanghai', country: 'China' },
        { code: 'HKG', name: 'Hong Kong International Airport', city: 'Hong Kong', country: 'Hong Kong' },
        { code: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore' },
        { code: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'Thailand' },
        { code: 'KUL', name: 'Kuala Lumpur International Airport', city: 'Kuala Lumpur', country: 'Malaysia' },
        { code: 'CGK', name: 'Soekarno-Hatta International Airport', city: 'Jakarta', country: 'Indonesia' },
        { code: 'MNL', name: 'Ninoy Aquino International Airport', city: 'Manila', country: 'Philippines' },
        { code: 'SYD', name: 'Sydney Kingsford Smith Airport', city: 'Sydney', country: 'Australia' },
        { code: 'MEL', name: 'Melbourne Airport', city: 'Melbourne', country: 'Australia' },
        { code: 'AKL', name: 'Auckland Airport', city: 'Auckland', country: 'New Zealand' },
        { code: 'YYZ', name: 'Toronto Pearson International Airport', city: 'Toronto', country: 'Canada' },
        { code: 'YVR', name: 'Vancouver International Airport', city: 'Vancouver', country: 'Canada' },
        { code: 'YUL', name: 'Montreal-Pierre Elliott Trudeau International Airport', city: 'Montreal', country: 'Canada' },
        { code: 'GRU', name: 'São Paulo/Guarulhos International Airport', city: 'São Paulo', country: 'Brazil' },
        { code: 'GIG', name: 'Rio de Janeiro/Galeão International Airport', city: 'Rio de Janeiro', country: 'Brazil' },
        { code: 'MEX', name: 'Mexico City International Airport', city: 'Mexico City', country: 'Mexico' },
        { code: 'BOG', name: 'El Dorado International Airport', city: 'Bogotá', country: 'Colombia' },
        { code: 'LIM', name: 'Jorge Chávez International Airport', city: 'Lima', country: 'Peru' },
        { code: 'SCL', name: 'Arturo Merino Benítez International Airport', city: 'Santiago', country: 'Chile' },
        { code: 'EZE', name: 'Ezeiza International Airport', city: 'Buenos Aires', country: 'Argentina' },
        { code: 'JNB', name: 'O.R. Tambo International Airport', city: 'Johannesburg', country: 'South Africa' },
        { code: 'CPT', name: 'Cape Town International Airport', city: 'Cape Town', country: 'South Africa' },
        { code: 'CAI', name: 'Cairo International Airport', city: 'Cairo', country: 'Egypt' },
        { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'United Arab Emirates' },
        { code: 'DOH', name: 'Hamad International Airport', city: 'Doha', country: 'Qatar' },
        { code: 'KWI', name: 'Kuwait International Airport', city: 'Kuwait City', country: 'Kuwait' },
        { code: 'RUH', name: 'King Khalid International Airport', city: 'Riyadh', country: 'Saudi Arabia' },
        { code: 'JED', name: 'King Abdulaziz International Airport', city: 'Jeddah', country: 'Saudi Arabia' },
        { code: 'TLV', name: 'Ben Gurion Airport', city: 'Tel Aviv', country: 'Israel' },
        { code: 'DEL', name: 'Indira Gandhi International Airport', city: 'New Delhi', country: 'India' },
        { code: 'BOM', name: 'Chhatrapati Shivaji Maharaj International Airport', city: 'Mumbai', country: 'India' },
        { code: 'BLR', name: 'Kempegowda International Airport', city: 'Bangalore', country: 'India' },
        { code: 'MAA', name: 'Chennai International Airport', city: 'Chennai', country: 'India' },
        { code: 'HYD', name: 'Rajiv Gandhi International Airport', city: 'Hyderabad', country: 'India' },
        { code: 'CCU', name: 'Netaji Subhas Chandra Bose International Airport', city: 'Kolkata', country: 'India' },
        { code: 'AMD', name: 'Sardar Vallabhbhai Patel International Airport', city: 'Ahmedabad', country: 'India' },
        { code: 'COK', name: 'Cochin International Airport', city: 'Kochi', country: 'India' },
        { code: 'GOI', name: 'Goa International Airport', city: 'Goa', country: 'India' },
        { code: 'JAI', name: 'Jaipur International Airport', city: 'Jaipur', country: 'India' },
        { code: 'LKO', name: 'Chaudhary Charan Singh International Airport', city: 'Lucknow', country: 'India' },
        { code: 'IXC', name: 'Chandigarh Airport', city: 'Chandigarh', country: 'India' },
        { code: 'ATQ', name: 'Sri Guru Ram Dass Jee International Airport', city: 'Amritsar', country: 'India' },
        { code: 'SXR', name: 'Sheikh ul-Alam International Airport', city: 'Srinagar', country: 'India' },
        { code: 'IXL', name: 'Kushok Bakula Rimpochee Airport', city: 'Leh', country: 'India' }
      ]
      
      // Filter airports based on search term
      const airports = airportDatabase.filter(airport => {
        return (
          airport.code.toLowerCase().includes(searchLower) ||
          airport.code.toLowerCase().startsWith(searchLower) ||
          airport.name.toLowerCase().includes(searchLower) ||
          airport.city.toLowerCase().includes(searchLower) ||
          airport.country.toLowerCase().includes(searchLower)
        )
      })
      
      // Sort results to prioritize exact code matches
      airports.sort((a, b) => {
        const aCodeMatch = a.code.toLowerCase() === searchLower
        const bCodeMatch = b.code.toLowerCase() === searchLower
        const aCodeStart = a.code.toLowerCase().startsWith(searchLower)
        const bCodeStart = b.code.toLowerCase().startsWith(searchLower)
        
        if (aCodeMatch && !bCodeMatch) return -1
        if (!aCodeMatch && bCodeMatch) return 1
        if (aCodeStart && !bCodeStart) return -1
        if (!aCodeStart && bCodeStart) return 1
        
        return a.name.localeCompare(b.name)
      })
      
      // Limit results to top 15 for better UX
      setFilteredAirports(airports.slice(0, 15))
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