import React, { useState } from 'react'
import { ArrowLeft, Calendar, MessageCircle, User, Car, TriangleAlert as AlertTriangle, Clock, DollarSign, ListFilter as Filter, Import as SortAsc, Dessert as SortDesc, Search, Send, MapPin, Navigation, Circle as HelpCircle, Menu } from 'lucide-react'
import { supabase } from '../utils/supabase'
import { useAuth } from '../contexts/AuthContext'
import Sidebar from './Sidebar'
import { CarRide, RideRequest } from '../types'
import LocationAutocomplete from './LocationAutocomplete'
import DisclaimerModal from './DisclaimerModal'
import MessagesNotification from './MessagesNotification'
import NotificationBadge from './NotificationBadge'
import ConfirmationsNotification from './ConfirmationsNotification'
import { getCurrencySymbol } from '../utils/currencies'
import { haversineDistance } from '../utils/distance'
import { locationsMatch, normalizeLocationString } from '../utils/locationUtils'
import { popupManager } from '../utils/popupManager'
import { getDisplayRideRequests, formatRequestDateDisplay } from '../utils/requestDisplayHelpers'
import { formatDateTimeSafe } from '../utils/dateHelpers'

interface LocationData {
  address: string
  latitude: number | null
  longitude: number | null
}

interface FindRideProps {
  onBack: () => void
  onStartChat: (userId: string, userName: string, ride?: CarRide, trip?: any) => void
  isGuest?: boolean
}

type SearchType = 'from-to' | 'from-only' | 'to-only'
type LocationSearchType = 'manual' | 'nearby'
type SortOption = 'date-asc' | 'date-desc' | 'price-asc' | 'price-desc' | 'created-asc' | 'created-desc'

export default function FindRide({ onBack, onStartChat, isGuest = false }: FindRideProps) {
  const { user, isGuest: contextIsGuest, signOut } = useAuth()
  const effectiveIsGuest = isGuest || contextIsGuest
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Load cached filters from localStorage
  const loadCachedFilters = () => {
    try {
      const cached = localStorage.getItem('findRideFilters')
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  }

  const cachedFilters = loadCachedFilters()

  const [locationSearchType, setLocationSearchType] = useState<LocationSearchType>(cachedFilters?.locationSearchType || 'manual')
  const [fromLocation, setFromLocation] = useState<LocationData | null>(cachedFilters?.fromLocation || null)
  const [toLocation, setToLocation] = useState<LocationData | null>(cachedFilters?.toLocation || null)
  const [userLocation, setUserLocation] = useState<LocationData | null>(cachedFilters?.userLocation || null)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [searchRadius, setSearchRadius] = useState(cachedFilters?.searchRadius || 25)
  const [departureDate, setDepartureDate] = useState(cachedFilters?.departureDate || '')
  const [departureMonth, setDepartureMonth] = useState(cachedFilters?.departureMonth || '')
  const [searchByMonth, setSearchByMonth] = useState(cachedFilters?.searchByMonth || false)
  const [rides, setRides] = useState<CarRide[]>([])
  const [rideRequests, setRideRequests] = useState<RideRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [selectedChatUser, setSelectedChatUser] = useState<{userId: string, userName: string}>({userId: '', userName: ''})
  const [selectedChatRide, setSelectedChatRide] = useState<CarRide | null>(null)
  const [showRadiusHelp, setShowRadiusHelp] = useState(false)
  const [strictSearch, setStrictSearch] = useState(cachedFilters?.strictSearch || false)
  const [radiusUnit, setRadiusUnit] = useState(cachedFilters?.radiusUnit || 'miles')
  const [useCustomRadius, setUseCustomRadius] = useState(cachedFilters?.useCustomRadius || false)
  const [customRadius, setCustomRadius] = useState(cachedFilters?.customRadius || '')
  const [sortBy, setSortBy] = useState<SortOption>(cachedFilters?.sortBy || 'date-asc')
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState<'rides' | 'requests'>('rides')
  const [activeNotification, setActiveNotification] = React.useState<'messages' | 'notifications' | 'confirmations' | null>(null)

  const onViewConfirmations = () => {
    console.log('View confirmations clicked')
  }

  // Cache filters whenever they change
  React.useEffect(() => {
    const filters = {
      locationSearchType,
      fromLocation,
      toLocation,
      userLocation,
      searchRadius,
      departureDate,
      departureMonth,
      searchByMonth,
      strictSearch,
      radiusUnit,
      useCustomRadius,
      customRadius,
      sortBy
    }
    localStorage.setItem('findRideFilters', JSON.stringify(filters))
  }, [locationSearchType, fromLocation, toLocation, userLocation, searchRadius, departureDate, departureMonth, searchByMonth, strictSearch, radiusUnit, useCustomRadius, customRadius, sortBy])

  // Auto-search on component mount for guests to show available rides
  React.useEffect(() => {
    // Remove auto-search for guests - they should search manually
    // if (effectiveIsGuest && !searched && !loading) {
    //   handleAutoSearch()
    // }
  }, [effectiveIsGuest, searched, loading])

  const handleAutoSearch = async () => {
    setLoading(true)

    try {
      console.log('=== AUTO SEARCH FOR GUEST RIDES ===')
      
      // Get current date to filter out past rides
      const now = new Date().toISOString()
      console.log('Filtering rides after:', now)
      
      const { data, error } = await supabase
        .from('car_rides')
        .select(`
          *,
          user_profiles:user_id (
            id,
            full_name
          )
        `)
        .eq('is_closed', false)
        .gte('departure_date_time', now)
        .order('departure_date_time')
        .limit(20) // Limit results for better performance

      if (error) throw error

      console.log('Auto search results:', data?.length || 0, 'rides')
      setRides(data || [])

      // Also fetch matching ride requests
      const requests = await getDisplayRideRequests(
        departureLocation,
        destinationLocation,
        travelDate,
        travelMonth,
        searchByMonth,
        user?.id
      )
      setRideRequests(requests)
      setSearched(true)
    } catch (error) {
      console.error('Auto search error:', error)
      // If there's an error, still set searched to true to prevent infinite retries
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }

  const getCurrentLocation = async () => {
    setGettingLocation(true)
    setLocationError('')

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser')
      setGettingLocation(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        
        try {
          // Use reverse geocoding to get address
          const response = await fetch(
            `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${import.meta.env.VITE_OPENCAGE_API_KEY}`
          )
          
          if (response.ok) {
            const data = await response.json()
            if (data.results && data.results.length > 0) {
              const result = data.results[0]
              setUserLocation({
                address: result.formatted,
                latitude: latitude,
                longitude: longitude
              })
            } else {
              setUserLocation({
                address: `Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
                latitude: latitude,
                longitude: longitude
              })
            }
          } else {
            // Fallback if reverse geocoding fails
            setUserLocation({
              address: `Your Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
              latitude: latitude,
              longitude: longitude
            })
          }
        } catch (error) {
          console.error('Reverse geocoding error:', error)
          // Still set location with coordinates
          setUserLocation({
            address: `Your Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            latitude: latitude,
            longitude: longitude
          })
        }
        
        setGettingLocation(false)
      },
      (error) => {
        console.error('Geolocation error:', error)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location access denied. Please enable location permissions.')
            break
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location information is unavailable.')
            break
          case error.TIMEOUT:
            setLocationError('Location request timed out.')
            break
          default:
            setLocationError('An unknown error occurred while getting location.')
            break
        }
        setGettingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    )
  }

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
        userLocation: userLocation?.address,
        locationSearchType,
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
          user_id,
          user_profiles:user_id (
            id,
            full_name,
            profile_image_url
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
      query = query
        .eq('is_closed', false)
        .gte('departure_date_time', now)

      // Apply sorting
      switch (sortBy) {
        case 'date-asc':
          query = query.order('departure_date_time', { ascending: true })
          break
        case 'date-desc':
          query = query.order('departure_date_time', { ascending: false })
          break
        case 'price-asc':
          query = query.order('price', { ascending: true })
          break
        case 'price-desc':
          query = query.order('price', { ascending: false })
          break
        case 'created-asc':
          query = query.order('created_at', { ascending: true })
          break
        case 'created-desc':
          query = query.order('created_at', { ascending: false })
          break
        default:
          query = query.order('departure_date_time', { ascending: true })
      }

      const { data, error } = await query

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
      if (fromLocation || toLocation || (locationSearchType === 'nearby' && userLocation)) {
        console.log('=== APPLYING LOCATION FILTERS ===')
        console.log('FROM search:', fromLocation?.address)
        console.log('TO search:', toLocation?.address)
        console.log('USER location:', userLocation?.address)
        console.log('Search type:', locationSearchType)
        console.log('Search mode:', strictSearch ? 'STRICT' : 'FLEXIBLE')
        
        filteredRides = filteredRides.filter(ride => {
          console.log(`\n--- Checking ride: ${ride.from_location} → ${ride.to_location} ---`)
          
          // For nearby search, we use user location as the search center
          let matchesFrom = true
          let matchesTo = true
          
          if (locationSearchType === 'nearby' && userLocation) {
            console.log('NEARBY search mode')
            matchesFrom = false
            matchesTo = false
            
            // Check if ride starts or ends near user location
            if (userLocation.latitude && userLocation.longitude && searchRadius) {
              const radiusMiles = useCustomRadius && customRadius ? parseInt(customRadius) : parseInt(searchRadius)
              const effectiveRadiusMiles = getEffectiveRadiusMiles(radiusMiles, radiusUnit)
              
              // Check distance to departure location
              if (ride.from_latitude && ride.from_longitude) {
                const distanceToFrom = haversineDistance(
                  userLocation.latitude,
                  userLocation.longitude,
                  ride.from_latitude,
                  ride.from_longitude
                )
                console.log(`Distance to departure: ${distanceToFrom.toFixed(1)} miles`)
                if (distanceToFrom <= effectiveRadiusMiles) {
                  console.log('✅ NEARBY: Within radius of departure location')
                  matchesFrom = true
                }
              }
              
              // Check distance to destination location
              if (ride.to_latitude && ride.to_longitude) {
                const distanceToTo = haversineDistance(
                  userLocation.latitude,
                  userLocation.longitude,
                  ride.to_latitude,
                  ride.to_longitude
                )
                console.log(`Distance to destination: ${distanceToTo.toFixed(1)} miles`)
                if (distanceToTo <= effectiveRadiusMiles) {
                  console.log('✅ NEARBY: Within radius of destination location')
                  matchesTo = true
                }
              }
              
              // Check distance to intermediate stops
              if (!matchesFrom && !matchesTo && ride.intermediate_stops && Array.isArray(ride.intermediate_stops)) {
                for (const stop of ride.intermediate_stops) {
                  if (stop.latitude && stop.longitude) {
                    const distance = haversineDistance(
                      userLocation.latitude,
                      userLocation.longitude,
                      stop.latitude,
                      stop.longitude
                    )
                    console.log(`Distance to intermediate stop "${stop.address}": ${distance.toFixed(1)} miles`)
                    if (distance <= effectiveRadiusMiles) {
                      console.log('✅ NEARBY: Within radius of intermediate stop')
                      matchesFrom = true
                      matchesTo = true
                      break
                    }
                  }
                }
              }
            }
          } else {
            // Manual search mode (existing logic)
            matchesFrom = !fromLocation // If no FROM criteria, it matches
            matchesTo = !toLocation     // If no TO criteria, it matches
          
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
                  const radiusMiles = useCustomRadius && customRadius ? parseInt(customRadius) : parseInt(searchRadius)
                  const effectiveRadiusMiles = getEffectiveRadiusMiles(radiusMiles, radiusUnit)

                  if (ride.to_latitude && ride.to_longitude) {
                    const distance = haversineDistance(
                      toLocation.latitude,
                      toLocation.longitude,
                      ride.to_latitude,
                      ride.to_longitude
                    )
                    console.log(`Distance to destination: ${distance.toFixed(1)} miles`)
                    if (distance <= effectiveRadiusMiles) {
                      console.log('✅ TO: Within radius of destination location')
                      matchesTo = true
                    }
                  }

                  // Check distance to intermediate stops
                  if (!matchesTo && ride.intermediate_stops && Array.isArray(ride.intermediate_stops)) {
                    for (const stop of ride.intermediate_stops) {
                      if (stop.latitude && stop.longitude) {
                        const distance = haversineDistance(
                          toLocation.latitude,
                          toLocation.longitude,
                          stop.latitude,
                          stop.longitude
                        )
                        console.log(`Distance to intermediate stop "${stop.address}": ${distance.toFixed(1)} miles`)
                        if (distance <= effectiveRadiusMiles) {
                          console.log('✅ TO: Within radius of intermediate stop')
                          matchesTo = true
                          break
                        }
                      }
                    }
                  }
                }
              }
              console.log('TO location result:', matchesTo ? '✅ MATCH' : '❌ NO MATCH')
            }
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

      // Also fetch matching ride requests
      const requests = await getDisplayRideRequests(
        fromLocation?.address,
        toLocation?.address,
        departureDate,
        departureMonth,
        searchByMonth,
        undefined, // Don't exclude user's own requests
        searchRadius
      )
      setRideRequests(requests)
      setSearched(true)

      // Restore from cache if returning from chat
      if (cachedFilters?.searched) {
        setSearched(true)
      }
    } catch (error) {
      console.error('Search error:', error)
      setRides([]) // Set empty array on error
      setRideRequests([])
    } finally {
      setLoading(false)
    }
  }

  const handleChatClick = (userId: string, userName: string, ride: CarRide) => {
    console.log('FindRide: handleChatClick called with:', { userId, userName, ride })

    if (!userId || userId.trim() === '') {
      console.error('FindRide: Invalid userId in handleChatClick:', { userId, userName, ride })
      alert('Cannot open chat: User information is not available. Please try refreshing the page.')
      return
    }

    setSelectedChatUser({ userId, userName })
    setSelectedChatRide(ride)

    if (popupManager.shouldShowDisclaimer('chat-ride', user?.id, userId)) {
      setShowDisclaimer(true)
    } else {
      handleConfirmChat()
    }
  }

  const handleConfirmChat = () => {
    setShowDisclaimer(false)
    popupManager.markDisclaimerShown('chat-ride', user?.id, selectedChatUser.userId)
    onStartChat(selectedChatUser.userId, selectedChatUser.userName, selectedChatRide || undefined, undefined)
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
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Dashboard</span>
          </button>
          {!effectiveIsGuest && (
            <div className="flex items-center space-x-4">
              <MessagesNotification
                onStartChat={(userId, userName) => onStartChat(userId, userName, undefined, undefined)}
                isOpen={activeNotification === 'messages'}
                onOpen={() => setActiveNotification('messages')}
                onClose={() => setActiveNotification(null)}
              />
              <NotificationBadge
                onStartChat={(userId, userName) => onStartChat(userId, userName, undefined, undefined)}
                onViewConfirmations={onViewConfirmations}
                isOpen={activeNotification === 'notifications'}
                onOpen={() => setActiveNotification('notifications')}
                onClose={() => setActiveNotification(null)}
              />
              <ConfirmationsNotification
                onStartChat={(userId, userName) => onStartChat(userId, userName, undefined, undefined)}
                onViewConfirmations={onViewConfirmations}
                isOpen={activeNotification === 'confirmations'}
                onOpen={() => setActiveNotification('confirmations')}
                onClose={() => setActiveNotification(null)}
              />
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 text-green-600 hover:text-green-700 font-medium transition-colors rounded-xl"
              >
                <Menu size={20} />
                <span className="hidden sm:inline">Menu</span>
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Find a Ride</h1>
            <p className="text-gray-600 mb-4">Search for available car rides in your area</p>
            {effectiveIsGuest && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Browsing as Guest:</strong> You can view all available rides. Sign up to contact drivers.
                </p>
              </div>
            )}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-semibold mb-2">🔍 Smart Search Tips:</p>
              <ul className="text-left space-y-1">
                <li>• Use <strong>Nearby Search</strong> to find rides near your current location</li>
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
            {/* Location Search Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Search Type
              </label>
              <div className="flex space-x-6">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="locationSearchType"
                    checked={locationSearchType === 'manual'}
                    onChange={() => {
                      setLocationSearchType('manual')
                      setUserLocation(null)
                      setLocationError('')
                    }}
                    className="mr-2 text-green-600"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Manual Search</span>
                    <p className="text-xs text-gray-500">Enter specific locations</p>
                  </div>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="locationSearchType"
                    checked={locationSearchType === 'nearby'}
                    onChange={() => {
                      setLocationSearchType('nearby')
                      setFromLocation(null)
                      setToLocation(null)
                    }}
                    className="mr-2 text-green-600"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Nearby Search</span>
                    <p className="text-xs text-gray-500">Find rides near your location</p>
                  </div>
                </label>
              </div>
            </div>

            {locationSearchType === 'nearby' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Location
                </label>
                {!userLocation ? (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      disabled={gettingLocation}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Navigation size={20} />
                      <span>{gettingLocation ? 'Getting Location...' : 'Get My Location'}</span>
                    </button>
                    {locationError && (
                      <p className="text-sm text-red-600">{locationError}</p>
                    )}
                    <p className="text-sm text-gray-500">
                      Click to allow location access and find rides near you
                    </p>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <Navigation size={16} className="text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-green-900">Location Found</p>
                        <p className="text-sm text-green-700">{userLocation.address}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUserLocation(null)
                          setLocationError('')
                        }}
                        className="text-green-600 hover:text-green-700 text-sm font-medium"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {locationSearchType === 'manual' && (
             <>
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
                  placeholder="Enter city, neighborhood, or landmark (not exact address)"
                  label="To Location"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1 mb-4">
                For best results, enter a city, neighborhood, or landmark as your destination. If you are searching for a specific location, you can enter that as well. Broader locations help you find more rides!
              </p>
             </>  
            )}

            {!!((locationSearchType === 'nearby' && userLocation) || (!strictSearch && (fromLocation?.latitude && fromLocation?.longitude || toLocation?.latitude && toLocation?.longitude))) && (
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Search Radius: {useCustomRadius && customRadius ? customRadius : searchRadius} {radiusUnit}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowRadiusHelp((v) => !v)}
                    onMouseEnter={() => setShowRadiusHelp(true)}
                    onMouseLeave={() => setShowRadiusHelp(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                    aria-label="Search radius help"
                    title="Click or hover for more info"
                  >
                    <HelpCircle size={16} />
                  </button>
                </div>
                {showRadiusHelp && (
                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                    {locationSearchType === 'nearby'
                      ? `This will search for rides within ${useCustomRadius && customRadius ? customRadius : searchRadius} ${radiusUnit} of your current location. It finds rides starting, ending, or passing through your area.`
                      : `This will search for rides within ${useCustomRadius && customRadius ? customRadius : searchRadius} ${radiusUnit} of your selected location(s). For departure location, it finds rides starting nearby. For destination, it finds rides ending nearby.`
                    }
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

            {/* Sorting and Filters */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Sort & Filter Results
                </label>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 text-green-600 hover:text-green-700 text-sm font-medium"
                >
                  <Filter size={14} />
                  <span>{showFilters ? 'Hide' : 'Show'} Options</span>
                </button>
              </div>
              
              {showFilters && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors text-sm"
                      >
                        <option value="date-asc">Travel Date (Earliest First)</option>
                        <option value="date-desc">Travel Date (Latest First)</option>
                        <option value="price-asc">Price (Low to High)</option>
                        <option value="price-desc">Price (High to Low)</option>
                        <option value="created-desc">Newly Posted (Latest First)</option>
                        <option value="created-asc">Newly Posted (Oldest First)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Search Radius</label>
                      <select
                        value={searchRadius}
                        onChange={(e) => setSearchRadius(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors text-sm"
                      >
                        <option value={0}>Exact Match Only</option>
                        <option value={5}>5 miles</option>
                        <option value={10}>10 miles</option>
                        <option value={15}>15 miles</option>
                        <option value={20}>20 miles</option>
                        <option value={25}>25 miles</option>
                        <option value={30}>30 miles</option>
                        <option value={50}>50 miles</option>
                        <option value={75}>75 miles</option>
                        <option value={100}>100 miles</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        {searchRadius === 0 ? 'Only exact location matches' : `Show rides within ${searchRadius} miles`}
                      </p>
                    </div>
                    <div className="flex items-end">
                      <div className="text-sm text-green-700">
                        <p className="font-medium mb-1">Filter Info:</p>
                        <ul className="text-xs space-y-1">
                          <li>• Only shows open rides</li>
                          <li>• Future travel dates only</li>
                          <li>• Radius: {searchRadius === 0 ? 'Exact match' : `${searchRadius} miles`}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || (locationSearchType === 'nearby' && !userLocation)}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Searching...' : 'Search Rides'}
            </button>
          </form>
        </div>

        {/* Search Results */}
        {searched && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Tab Navigation */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('rides')}
                  className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                    activeTab === 'rides'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Available Rides ({rides.length})
                </button>
                <button
                  onClick={() => setActiveTab('requests')}
                  className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                    activeTab === 'requests'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Ride Requests ({rideRequests.length})
                </button>
              </div>
              <span className="text-gray-600">
                {activeTab === 'rides' ? rides.length : rideRequests.length} {activeTab === 'rides' ? 'ride' : 'request'}{(activeTab === 'rides' ? rides.length : rideRequests.length) !== 1 ? 's' : ''} found
              </span>
            </div>

            {/* Available Rides Tab */}
            {activeTab === 'rides' && (
              <>
                {rides.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Car size={32} className="text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No rides found</h3>
                    <p className="text-gray-600 mb-6">
                      Try adjusting your search criteria or check the "Ride Requests" tab to see if anyone is looking for rides on your route
                    </p>
                    <button
                      onClick={() => setActiveTab('requests')}
                      className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      View Ride Requests ({rideRequests.length})
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
                              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center overflow-hidden">
                                {ride.user_profiles?.profile_image_url ? (
                                  <img
                                    src={ride.user_profiles.profile_image_url}
                                    alt={ride.user_profiles.full_name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                      e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-green-100"><svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>'
                                    }}
                                  />
                                ) : (
                                  <User size={24} className="text-green-600" />
                                )}
                              </div>
                              <div>
                                <h3 className="text-xl font-semibold text-gray-900">
                                  {ride.user_profiles?.full_name || 'Driver'}
                                </h3>
                                <p className="text-gray-600">Driver</p>
                              </div>
                            </div>

                            <div className="grid md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <p className="text-sm text-gray-600 mb-1">From</p>
                                <div className="font-semibold text-gray-900 flex items-center">
                                  <MapPin size={14} className="mr-1 text-gray-400" />
                                  {ride.from_location}
                                </div>
                              </div>

                              <div>
                                <p className="text-sm text-gray-600 mb-1">To</p>
                                <div className="font-semibold text-gray-900 flex items-center">
                                  <MapPin size={14} className="mr-1 text-gray-400" />
                                  {ride.to_location}
                                </div>
                              </div>

                              <div>
                                <p className="text-sm text-gray-600 mb-1">Departure</p>
                                <div className="font-semibold text-gray-900 flex items-center">
                                  <Clock size={14} className="mr-1 text-gray-400" />
                                  {formatDateTimeSafe(ride.departure_date_time)}
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <div className="flex items-center justify-between space-x-4">
                                <div>
                                  <p className="text-sm text-gray-600 mb-1">Price per Passenger</p>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-semibold text-green-600 flex items-center">
                                      {getCurrencySymbol(ride.currency || 'USD')}{ride.price}
                                    </span>
                                    {ride.negotiable && (
                                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                        Negotiable
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600 mb-1">Seats Available</p>
                                  <div className="flex items-center space-x-2">
                                    {ride.seats_available === 0 ? (
                                      <span className="text-xs bg-red-100 text-red-800 px-3 py-1 rounded-full font-bold">
                                        Fully Booked
                                      </span>
                                    ) : ride.seats_available <= 2 ? (
                                      <span className="text-xs bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-bold">
                                        {ride.seats_available} seat{ride.seats_available > 1 ? 's' : ''} left
                                      </span>
                                    ) : (
                                      <span className="font-semibold text-blue-600">
                                        {ride.seats_available} of {ride.total_seats}
                                      </span>
                                    )}
                                  </div>
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
                            ) : effectiveIsGuest ? (
                              <div className="flex flex-col space-y-2">
                                <button
                                  onClick={() => handleChatClick(ride.user_id, ride.user_profiles?.full_name || 'Unknown', ride)}
                                  className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                                >
                                  <MessageCircle size={20} />
                                  <span>Chat with Driver</span>
                                </button>
                                <p className="text-xs text-gray-500 text-center">
                                  Sign up required to chat
                                </p>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  console.log('FindRide: Chat button clicked for ride:', { ride })
                                  const userId = ride.user_id || (ride.user_profiles as any)?.id
                                  const userName = ride.user_profiles?.full_name || 'Driver'
                                  console.log('FindRide: Extracted user data:', { userId, userName })

                                  if (!userId || userId.trim() === '') {
                                    console.error('FindRide: Missing user ID', { ride })
                                    alert('Cannot open chat: User information is not available')
                                    return
                                  }
                                  handleChatClick(userId, userName, ride)
                                }}
                                disabled={!ride.user_id && !(ride.user_profiles as any)?.id}
                                className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                              >
                                <MessageCircle size={20} />
                                <span>Chat with Driver</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Ride Requests Tab */}
            {activeTab === 'requests' && (
              <>
                {rideRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Send size={32} className="text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No ride requests found</h3>
                    <p className="text-gray-600 mb-6">
                      No one is currently requesting rides on this route. Check the "Available Rides" tab for posted rides.
                    </p>
                    <button
                      onClick={() => setActiveTab('rides')}
                      className="text-green-600 hover:text-green-700 font-medium transition-colors"
                    >
                      View Available Rides ({rides.length})
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <h4 className="font-semibold text-blue-900 mb-2">💡 About Ride Requests</h4>
                      <p className="text-sm text-blue-800">
                        These are passengers looking for rides on routes similar to your search. 
                        Contact them if you're planning to drive and can offer a ride!
                      </p>
                    </div>
                    
                    {rideRequests.map((request) => (
                      <div
                        key={request.id}
                        className="border border-blue-200 rounded-xl p-6 hover:shadow-md transition-shadow bg-blue-50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4 mb-4">
                              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden">
                                {request.user_profiles?.profile_image_url ? (
                                  <img
                                    src={request.user_profiles.profile_image_url}
                                    alt={request.user_profiles.full_name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-white font-semibold">
                                    {(request.user_profiles?.full_name || 'P').charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div>
                                <h3 className="text-xl font-semibold text-gray-900">
                                  {request.user_profiles?.full_name || 'Passenger'}
                                </h3>
                                <p className="text-blue-600 font-medium">Looking for a ride</p>
                              </div>
                            </div>

                            <div className="grid md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <p className="text-sm text-gray-600 mb-1">From</p>
                                <div className="font-semibold text-gray-900 flex items-center">
                                  <MapPin size={14} className="mr-1 text-gray-400" />
                                  {request.departure_location}
                                </div>
                              </div>

                              <div>
                                <p className="text-sm text-gray-600 mb-1">To</p>
                                <div className="font-semibold text-gray-900 flex items-center">
                                  <MapPin size={14} className="mr-1 text-gray-400" />
                                  {request.destination_location}
                                </div>
                              </div>

                              <div>
                                <p className="text-sm text-gray-600 mb-1">When</p>
                                <div className="font-semibold text-gray-900 flex items-center">
                                  <Calendar size={14} className="mr-1 text-gray-400" />
                                  {formatRequestDateDisplay(request)}
                                </div>
                              </div>
                            </div>

                            {request.additional_notes && (
                              <div className="mt-4 pt-4 border-t border-blue-200">
                                <p className="text-sm text-gray-600 mb-1">Additional Notes</p>
                                <p className="text-gray-900">{request.additional_notes}</p>
                              </div>
                            )}

                            <div className="mt-4 pt-4 border-t border-blue-200">
                              <div className="flex items-center space-x-4 text-sm text-gray-600">
                                <div className="flex items-center space-x-1">
                                  <Search size={12} />
                                  <span>Search radius: {request.search_radius_miles} miles</span>
                                </div>
                                {request.departure_time_preference && (
                                  <div className="flex items-center space-x-1">
                                    <Clock size={12} />
                                    <span>Preferred time: {request.departure_time_preference}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="ml-6">
                            {request.passenger_id === user?.id ? (
                              <div className="flex items-center space-x-2 bg-gray-100 text-gray-500 px-6 py-3 rounded-lg font-medium cursor-not-allowed">
                                <AlertTriangle size={20} />
                                <span>Your Request</span>
                              </div>
                            ) : effectiveIsGuest ? (
                              <div className="flex flex-col space-y-2">
                                <button
                                  onClick={() => handleChatClick(request.passenger_id, request.user_profiles?.full_name || 'Unknown', undefined)}
                                  className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                                >
                                  <MessageCircle size={20} />
                                  <span>Contact Passenger</span>
                                </button>
                                <p className="text-xs text-gray-500 text-center">
                                  Sign up required to chat
                                </p>
                              </div>
                            ) : request.passenger_id === user?.id ? (
                              <div className="flex flex-col space-y-2">
                                <div className="bg-orange-100 text-orange-800 px-6 py-3 rounded-lg font-medium text-center border border-orange-200">
                                  Your Request
                                </div>
                                <p className="text-xs text-gray-500 text-center">
                                  This is your posted request
                                </p>
                              </div>
                            ) : (
                              <div className="flex flex-col space-y-2">
                                <button
                                  onClick={() => handleChatClick(request.passenger_id, request.user_profiles?.full_name || 'Passenger', undefined)}
                                  className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                                >
                                  <MessageCircle size={20} />
                                  <span>Offer Ride</span>
                                </button>
                                <p className="text-xs text-gray-500 text-center">
                                  Chat to discuss details
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Legacy rides display - remove this section */}
        {searched && false && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Search Results
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
                    setUserLocation(null)
                    setSearchRadius('10')
                    setDepartureDate('')
                    setDepartureMonth('')
                    setLocationSearchType('manual')
                    setSearched(false)
                  }}
                  className="text-green-600 hover:text-green-700 font-medium transition-colors"
                >
                  Clear Search
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Legacy content removed */}
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

        {!effectiveIsGuest && (
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onHelp={() => {
              setSidebarOpen(false)
            }}
            onProfile={() => {
              setSidebarOpen(false)
              onBack()
            }}
            onNotifications={() => {
              setSidebarOpen(false)
            }}
            onMessages={() => {
              setSidebarOpen(false)
            }}
            onRideRequests={() => {
              setSidebarOpen(false)
            }}
            onSignOut={() => {
              setSidebarOpen(false)
              signOut()
            }}
          />
        )}
      </div>
    </div>
  )
}