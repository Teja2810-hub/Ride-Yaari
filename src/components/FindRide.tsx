import React, { useState } from 'react'
import { ArrowLeft, Search, MessageCircle, User, Car, DollarSign, Clock, AlertTriangle, HelpCircle, Calendar, MapPin } from 'lucide-react'
import { supabase } from '../utils/supabase'
import { useAuth } from '../contexts/AuthContext'
import { CarRide } from '../types'
import LocationAutocomplete from './LocationAutocomplete'
import DisclaimerModal from './DisclaimerModal'
import { getCurrencySymbol } from '../utils/currencies'
import { haversineDistance } from '../utils/distance'
import { locationsMatch, normalizeLocationString } from '../utils/locationUtils'

interface LocationData {
  address: string
  latitude: number | null
  longitude: number | null
}

interface FindRideProps {
  onBack: () => void
  onStartChat: (userId: string, userName: string) => void
}

type SearchType = 'from-to' | 'from-only' | 'to-only'

export default function FindRide({ onBack, onStartChat }: FindRideProps) {
  const { user } = useAuth()
  const [fromLocation, setFromLocation] = useState<LocationData | null>(null)
  const [toLocation, setToLocation] = useState<LocationData | null>(null)
  const [searchRadius, setSearchRadius] = useState('10')
  const [departureDate, setDepartureDate] = useState('')
  const [departureMonth, setDepartureMonth] = useState('')
  const [searchByMonth, setSearchByMonth] = useState(false)
  const [rides, setRides] = useState<CarRide[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [selectedChatUser, setSelectedChatUser] = useState<{userId: string, userName: string}>({userId: '', userName: ''})
  const [showRadiusHelp, setShowRadiusHelp] = useState(false)
  const [strictSearch, setStrictSearch] = useState(false)
  const [radiusUnit, setRadiusUnit] = useState('miles')
  const [useCustomRadius, setUseCustomRadius] = useState(false)
  const [customRadius, setCustomRadius] = useState('')

  const getEffectiveRadiusMiles = (radius: number, unit: string) => {
    if (unit === 'kilometers') {
      return radius * 0.621371 // Convert kilometers to miles
    }
    return radius
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setLoading(true)

    try {
      console.log('=== STARTING RIDE SEARCH ===')
      console.log('Search criteria:', {
        fromLocation: fromLocation?.address,
        toLocation: toLocation?.address,
        strictSearch,
        searchRadius,
        departureDate,
        departureMonth,
        searchByMonth
      })

      let query = supabase
        .from('car_rides')
        .select(`
          *,
          user_profiles:user_id (
            id,
            full_name
          )
        `)

      // Apply date filters
      if (searchByMonth && departureMonth) {
        const startOfMonth = `${departureMonth}-01T00:00:00`
        const endOfMonth = new Date(departureMonth + '-01')
        endOfMonth.setMonth(endOfMonth.getMonth() + 1)
        const endOfMonthStr = endOfMonth.toISOString()
        
        console.log('Applying month filter:', startOfMonth, 'to', endOfMonthStr)
        query = query.gte('departure_date_time', startOfMonth).lt('departure_date_time', endOfMonthStr)
      } else if (!searchByMonth && departureDate) {
        const startOfDay = `${departureDate}T00:00:00`
        const endOfDay = `${departureDate}T23:59:59`
        console.log('Applying date filter:', startOfDay, 'to', endOfDay)
        query = query.gte('departure_date_time', startOfDay).lte('departure_date_time', endOfDay)
      }

      // Always filter for future rides
      const now = new Date().toISOString()
      console.log('Filtering for rides after:', now)
      query = query.gte('departure_date_time', now)

      const { data, error } = await query
        .order('departure_date_time')

      if (error) throw error

      console.log('Raw database results:', data?.length || 0, 'rides')
      if (data && data.length > 0) {
        console.log('Sample ride:', {
          from: data[0].from_location,
          to: data[0].to_location,
          departure: data[0].departure_date_time,
          intermediate_stops: data[0].intermediate_stops
        })
      }

      let filteredRides = data || []

      // Apply location filtering only if we have search criteria
      if (fromLocation || toLocation) {
        console.log('=== APPLYING LOCATION FILTERS ===')
        console.log('FROM search:', fromLocation?.address)
        console.log('TO search:', toLocation?.address)
        console.log('Search mode:', strictSearch ? 'STRICT' : 'FLEXIBLE')
        
        filteredRides = filteredRides.filter(ride => {
          console.log(`\n--- Checking ride: ${ride.from_location} → ${ride.to_location} ---`)
          
          let matchesFrom = !fromLocation // If no FROM criteria, it matches
          let matchesTo = !toLocation     // If no TO criteria, it matches
          
          // Check FROM location if specified
          if (fromLocation) {
            const searchTerm = fromLocation.address.toLowerCase()
            console.log('Checking FROM:', searchTerm)
            matchesFrom = false
            
            if (strictSearch) {
              console.log('STRICT search for FROM location')
              if (ride.from_location.toLowerCase().trim() === searchTerm.toLowerCase().trim()) {
                console.log('✅ FROM: Exact match with departure location')
                matchesFrom = true
              }
            } else {
              console.log('FLEXIBLE search for FROM location')
              if (locationsMatch(ride.from_location, searchTerm)) {
                console.log('✅ FROM: Text match found in departure location')
                matchesFrom = true
              }
              
              // Check intermediate stops
              if (!matchesFrom && ride.intermediate_stops && Array.isArray(ride.intermediate_stops)) {
                for (const stop of ride.intermediate_stops) {
                  if (stop.address && locationsMatch(stop.address, searchTerm)) {
                    console.log('✅ FROM: Match found in intermediate stop:', stop.address)
                    matchesFrom = true
                    break
                  }
                }
              }
              
              // Check distance if coordinates available
              if (!matchesFrom && fromLocation.latitude && fromLocation.longitude && searchRadius) {
                console.log('Checking distance for FROM location')
                const radiusMiles = parseInt(searchRadius)
                const effectiveRadiusMiles = getEffectiveRadiusMiles(radiusMiles, radiusUnit)
                
                if (ride.from_latitude && ride.from_longitude) {
                  const distance = haversineDistance(
                    fromLocation.latitude,
                    fromLocation.longitude,
                    ride.from_latitude,
                    ride.from_longitude
                  )
                  console.log(`Distance to departure: ${distance.toFixed(1)} miles`)
                  if (distance <= effectiveRadiusMiles) {
                    console.log('✅ FROM: Within radius of departure location')
                    matchesFrom = true
                  }
                }
                
                // Check distance to intermediate stops
                if (!matchesFrom && ride.intermediate_stops && Array.isArray(ride.intermediate_stops)) {
                  for (const stop of ride.intermediate_stops) {
                    if (stop.latitude && stop.longitude) {
                      const distance = haversineDistance(
                        fromLocation.latitude,
                        fromLocation.longitude,
                        stop.latitude,
                        stop.longitude
                      )
                      console.log(`Distance to intermediate stop "${stop.address}": ${distance.toFixed(1)} miles`)
                      if (distance <= effectiveRadiusMiles) {
                        console.log('✅ FROM: Within radius of intermediate stop')
                        matchesFrom = true
                        break
                      }
                    }
                  }
                }
              }
            }
            console.log('FROM location result:', matchesFrom ? '✅ MATCH' : '❌ NO MATCH')
          }
          
          // Check TO location if specified
          if (toLocation) {
            const searchTerm = toLocation.address.toLowerCase()
            console.log('Checking TO:', searchTerm)
            matchesTo = false
            
            if (strictSearch) {
              console.log('STRICT search for TO location')
              if (ride.to_location.toLowerCase().trim() === searchTerm.toLowerCase().trim()) {
                console.log('✅ TO: Exact match with destination location')
                matchesTo = true
              }
            } else {
              console.log('FLEXIBLE search for TO location')
              if (locationsMatch(ride.to_location, searchTerm)) {
                console.log('✅ TO: Text match found in destination location')
                matchesTo = true
              }
              
              // Check intermediate stops
              if (!matchesTo && ride.intermediate_stops && Array.isArray(ride.intermediate_stops)) {
                for (const stop of ride.intermediate_stops) {
                  if (stop.address && locationsMatch(stop.address, searchTerm)) {
                    console.log('✅ TO: Match found in intermediate stop:', stop.address)
                    matchesTo = true
                    break
                  }
                }
              }
              
              // Check distance if coordinates available
              if (!matchesTo && toLocation.latitude && toLocation.longitude && searchRadius) {
                console.log('Checking distance for TO location')
                const radiusMiles = parseInt(searchRadius)
                
                if (ride.to_latitude && ride.to_longitude) {
                  const distance = haversineDistance(
                    toLocation.latitude,
                    toLocation.longitude,
                    ride.to_latitude,
                    ride.to_longitude
                  )
                  console.log(`Distance to destination: ${distance.toFixed(1)} miles`)
                  if (distance <= radiusMiles) {
                    console.log('✅ TO: Within radius of destination location')
                    matchesTo = true
                  }
                }
                
                if (!matchesTo && ride.from_latitude && ride.from_longitude) {
                  const distance = haversineDistance(
                    toLocation.latitude,
                    toLocation.longitude,
                    ride.from_latitude,
                    ride.from_longitude
                  )
                  console.log(`Distance to departure: ${distance.toFixed(1)} miles`)
                  if (distance <= radiusMiles) {
                    console.log('✅ TO: Within radius of departure location')
                    matchesTo = true
                  }
                }
              }
            }
            console.log('TO location result:', matchesTo ? '✅ MATCH' : '❌ NO MATCH')
          }
          
          const matches = matchesFrom && matchesTo
          console.log(`FINAL RESULT: ${matches ? '✅ RIDE MATCHES' : '❌ RIDE REJECTED'}`)
          
          return matches
        })
      } else {
        console.log('=== NO LOCATION FILTERS APPLIED ===')
        console.log('Showing all rides')
      }
      
      console.log('=== SEARCH COMPLETE ===')
      console.log('Final filtered rides:', filteredRides.length)
      console.log('Rides:', filteredRides.map(r => `${r.from_location} → ${r.to_location}`))

      setRides(filteredRides)
      setSearched(true)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChatClick = (userId: string, userName: string) => {
    setSelectedChatUser({ userId, userName })
    setShowDisclaimer(true)
  }

  const handleConfirmChat = () => {
    setShowDisclaimer(false)
    onStartChat(selectedChatUser.userId, selectedChatUser.userName)
  }

  const formatDateTime = (dateTimeString: string) => {
    return new Date(dateTimeString).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0]
  }

  const getTodayMonth = () => {
    return new Date().toISOString().slice(0, 7)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Dashboard</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Find a Ride</h1>
            <p className="text-gray-600 mb-4">Search for available car rides in your area</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-semibold mb-2">🔍 Smart Search Tips:</p>
              <ul className="text-left space-y-1">
                <li>• Search by <strong>departure location</strong> to find rides leaving from your area</li>
                <li>• Search by <strong>destination</strong> to find rides going to where you need</li>
                <li>• Use <strong>both locations</strong> for specific route matches</li>
                <li>• <strong>Flexible search</strong> finds rides within your specified radius</li>
                <li>• <strong>Strict search</strong> only shows exact location matches</li>
                <li>• Leave locations empty to see all available rides</li>
              </ul>
            </div>
          </div>

          <form onSubmit={handleSearch} className="space-y-6">
            {/* Search Mode Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Search Mode
              </label>
              <div className="flex space-x-6">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="searchMode"
                    checked={!strictSearch}
                    onChange={() => setStrictSearch(false)}
                    className="mr-2 text-green-600"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Flexible Search</span>
                    <p className="text-xs text-gray-500">Find rides within radius of your locations</p>
                  </div>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="searchMode"
                    checked={strictSearch}
                    onChange={() => setStrictSearch(true)}
                    className="mr-2 text-green-600"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Strict Search</span>
                    <p className="text-xs text-gray-500">Only exact location matches</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <LocationAutocomplete
                value={fromLocation}
                onChange={setFromLocation}
                placeholder="Any departure location"
                label="From Location"
              />

              <LocationAutocomplete
                value={toLocation}
                onChange={setToLocation}
                placeholder="Any destination location"
                label="To Location"
              />
            </div>

            {!strictSearch && (fromLocation?.latitude && fromLocation?.longitude || toLocation?.latitude && toLocation?.longitude) && (
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Search Radius: {useCustomRadius && customRadius ? customRadius : searchRadius} {radiusUnit}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowRadiusHelp(!showRadiusHelp)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <HelpCircle size={16} />
                  </button>
                </div>
                {showRadiusHelp && (
                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                    This will search for rides within {useCustomRadius && customRadius ? customRadius : searchRadius} {radiusUnit} of your selected location(s). For departure location, it finds rides starting OR ending nearby. For destination, it finds rides ending OR starting nearby.
                  </div>
                )}

                {/* Unit Selection */}
                <div className="flex space-x-4 mb-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="radiusUnit"
                      checked={radiusUnit === 'miles'}
                      onChange={() => setRadiusUnit('miles')}
                      className="mr-2 text-green-600"
                    />
                    <span className="text-sm text-gray-700">Miles</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="radiusUnit"
                      checked={radiusUnit === 'kilometers'}
                      onChange={() => setRadiusUnit('kilometers')}
                      className="mr-2 text-green-600"
                    />
                    <span className="text-sm text-gray-700">Kilometers</span>
                  </label>
                </div>

                {/* Radius Input Method Selection */}
                <div className="flex space-x-4 mb-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="radiusInputMethod"
                      checked={!useCustomRadius}
                      onChange={() => setUseCustomRadius(false)}
                      className="mr-2 text-green-600"
                    />
                    <span className="text-sm text-gray-700">Use Slider</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="radiusInputMethod"
                      checked={useCustomRadius}
                      onChange={() => setUseCustomRadius(true)}
                      className="mr-2 text-green-600"
                    />
                    <span className="text-sm text-gray-700">Enter Custom Value</span>
                  </label>
                </div>

                {!useCustomRadius ? (
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      step="5"
                      value={searchRadius}
                      onChange={(e) => setSearchRadius(e.target.value)}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-sm text-gray-500 mt-1">
                      <span>0 {radiusUnit}</span>
                      <span>1000 {radiusUnit}</span>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={customRadius}
                      onChange={(e) => setCustomRadius(e.target.value)}
                      placeholder={`Enter radius in ${radiusUnit} (can exceed 1000)`}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                    />
                    <div className="absolute right-3 top-3 text-sm text-gray-500">
                      {radiusUnit}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      You can enter values greater than 1000 {radiusUnit} manually if needed
                    </p>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Search by Date or Month
              </label>
              <div className="flex space-x-4 mb-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="searchType"
                    checked={!searchByMonth}
                    onChange={() => setSearchByMonth(false)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Specific Date</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="searchType"
                    checked={searchByMonth}
                    onChange={() => setSearchByMonth(true)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Entire Month</span>
                </label>
              </div>
            </div>

            {!searchByMonth ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Departure Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    min={getTodayDate()}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                    placeholder="Any date"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">Leave empty to search all dates</p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Departure Month
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="month"
                    value={departureMonth}
                    onChange={(e) => setDepartureMonth(e.target.value)}
                    min={getTodayMonth()}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">Search for all rides in the selected month</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Searching...' : 'Search Rides'}
            </button>
          </form>
        </div>

        {/* Search Results */}
        {searched && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Available Rides
              </h2>
              <span className="text-gray-600">
                {rides.length} ride{rides.length !== 1 ? 's' : ''} found
              </span>
            </div>

            {rides.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Car size={32} className="text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No rides found</h3>
                <p className="text-gray-600 mb-6">
                  Try adjusting your search criteria or check back later for new rides
                </p>
                <button
                  onClick={() => {
                    setFromLocation(null)
                    setToLocation(null)
                    setSearchRadius('10')
                    setDepartureDate('')
                    setDepartureMonth('')
                    setSearched(false)
                  }}
                  className="text-green-600 hover:text-green-700 font-medium transition-colors"
                >
                  Clear Search
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {rides.map((ride) => (
                  <div
                    key={ride.id}
                    className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-4">
                          <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
                            <User size={24} className="text-green-600" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900">
                              {ride.user_profiles?.full_name}
                            </h3>
                            <p className="text-gray-600">Driver</p>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">From</p>
                            <div className="font-semibold text-gray-900">
                              {ride.from_location}
                            </div>
                          </div>

                          <div>
                            <p className="text-sm text-gray-600 mb-1">To</p>
                            <div className="font-semibold text-gray-900">
                              {ride.to_location}
                            </div>
                          </div>

                          {ride.intermediate_stops && ride.intermediate_stops.length > 0 && (
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Stops</p>
                              <div className="text-sm text-gray-700">
                                {ride.intermediate_stops.map((stop, index) => (
                                  <div key={index} className="flex items-center space-x-1">
                                    <MapPin size={12} className="text-gray-400" />
                                    <span className="truncate">{stop.address}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div>
                            <p className="text-sm text-gray-600 mb-1">Departure</p>
                            <div className="font-semibold text-gray-900">
                              {formatDateTime(ride.departure_date_time)}
                            </div>
                          </div>

                          <div>
                            <p className="text-sm text-gray-600 mb-1">Price</p>
                            <div className="font-semibold text-green-600 flex items-center">
                              {getCurrencySymbol(ride.currency || 'USD')}{ride.price}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="ml-6">
                        {ride.user_id === user?.id ? (
                          <div className="flex items-center space-x-2 bg-gray-100 text-gray-500 px-6 py-3 rounded-lg font-medium cursor-not-allowed">
                            <AlertTriangle size={20} />
                            <span>Your Ride</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleChatClick(ride.user_id, ride.user_profiles?.full_name || 'Unknown')}
                            className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                          >
                            <MessageCircle size={20} />
                            <span>Contact Driver</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DisclaimerModal
          isOpen={showDisclaimer}
          onClose={() => setShowDisclaimer(false)}
          onConfirm={handleConfirmChat}
          loading={false}
          type="chat-ride"
        />
      </div>
    </div>
  )
}