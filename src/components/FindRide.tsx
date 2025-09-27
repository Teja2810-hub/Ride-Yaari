import React, { useState } from 'react'
import { ArrowLeft, Calendar, MessageCircle, User, Car, TriangleAlert as AlertTriangle, Clock, DollarSign, ListFilter as Filter, Import as SortAsc, Dessert as SortDesc, Navigation } from 'lucide-react'
import { supabase } from '../utils/supabase'
import { useAuth } from '../contexts/AuthContext'
import { CarRide } from '../types'
import LocationAutocomplete from './LocationAutocomplete'
import DisclaimerModal from './DisclaimerModal'
import { getCurrencySymbol } from '../utils/currencies'
import { popupManager } from '../utils/popupManager'

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

type SortOption = 'date-asc' | 'date-desc' | 'price-asc' | 'price-desc' | 'created-asc' | 'created-desc'

export default function FindRide({ onBack, onStartChat, isGuest = false }: FindRideProps) {
  const { user, isGuest: contextIsGuest } = useAuth()
  const effectiveIsGuest = isGuest || contextIsGuest
  const [fromLocation, setFromLocation] = useState<LocationData | null>(null)
  const [toLocation, setToLocation] = useState<LocationData | null>(null)
  const [departureDate, setDepartureDate] = useState('')
  const [departureMonth, setDepartureMonth] = useState('')
  const [searchByMonth, setSearchByMonth] = useState(false)
  const [rides, setRides] = useState<CarRide[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [selectedChatUser, setSelectedChatUser] = useState<{userId: string, userName: string}>({userId: '', userName: ''})
  const [selectedChatRide, setSelectedChatRide] = useState<CarRide | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('date-asc')
  const [showFilters, setShowFilters] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Get current date to filter out past rides
      const now = new Date().toISOString()
      
      let query = supabase
        .from('car_rides')
        .select(`
          *,
          user_profiles:user_id (
            id,
            full_name,
            profile_image_url
          )
        `)

      if (fromLocation?.address) {
        query = query.eq('from_location', fromLocation.address)
      }
      if (toLocation?.address) {
        query = query.eq('to_location', toLocation.address)
      }
      
      if (searchByMonth && departureMonth) {
        const startOfMonth = `${departureMonth}-01T00:00:00.000Z`
        const endOfMonth = new Date(departureMonth + '-01')
        endOfMonth.setMonth(endOfMonth.getMonth() + 1)
        const endOfMonthStr = endOfMonth.toISOString()
        
        query = query.gte('departure_date_time', startOfMonth).lt('departure_date_time', endOfMonthStr)
      } else if (!searchByMonth && departureDate) {
        const startOfDay = `${departureDate}T00:00:00.000Z`
        const endOfDay = `${departureDate}T23:59:59.999Z`
        query = query.gte('departure_date_time', startOfDay).lte('departure_date_time', endOfDay)
      }

      // Always filter for future rides and open rides
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
          query = query.order('price', { ascending: true, nullsLast: true })
          break
        case 'price-desc':
          query = query.order('price', { ascending: false, nullsFirst: true })
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

      console.log('Find rides query result:', { data: data?.length, error })
      setRides(data || [])
      setSearched(true)
    } catch (error) {
      console.error('Search error:', error)
      setRides([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const handleChatClick = (userId: string, userName: string, ride: CarRide) => {
    setSelectedChatUser({ userId, userName })
    setSelectedChatRide(ride)
    
    // Check if disclaimer should be shown
    if (popupManager.shouldShowDisclaimer('chat-ride', user?.id)) {
      setShowDisclaimer(true)
    } else {
      // Auto-proceed if disclaimer was already shown
      handleConfirmChat()
    }
  }

  const handleConfirmChat = () => {
    setShowDisclaimer(false)
    popupManager.markDisclaimerShown('chat-ride', user?.id)
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
            <p className="text-gray-600">Search for available car rides in your area</p>
            {effectiveIsGuest && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Browsing as Guest:</strong> You can view all available rides. Sign up to contact drivers.
                </p>
              </div>
            )}
          </div>

          <form onSubmit={handleSearch} className="space-y-6">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors text-sm"
                      >
                        <option value="date-asc">Departure Date (Earliest First)</option>
                        <option value="date-desc">Departure Date (Latest First)</option>
                        <option value="price-asc">Price (Low to High)</option>
                        <option value="price-desc">Price (High to Low)</option>
                        <option value="created-desc">Newly Posted (Latest First)</option>
                        <option value="created-asc">Newly Posted (Oldest First)</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <div className="text-sm text-green-700">
                        <p className="font-medium mb-1">Filter Info:</p>
                        <ul className="text-xs space-y-1">
                          <li>• Only shows open rides</li>
                          <li>• Future departure times only</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

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

                          <div>
                            <p className="text-sm text-gray-600 mb-1">Departure</p>
                            <div className="font-semibold text-gray-900 flex items-center">
                              <Clock size={14} className="mr-1 text-gray-400" />
                              {formatDateTime(ride.departure_date_time)}
                            </div>
                          </div>
                        </div>

                        {ride.intermediate_stops && ride.intermediate_stops.length > 0 && (
                          <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-2">Intermediate Stops:</p>
                            <div className="flex flex-wrap gap-2">
                              {ride.intermediate_stops.map((stop, index) => (
                                <span key={index} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
                                  <Navigation size={10} className="mr-1" />
                                  {stop.address}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center space-x-4">
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
                              <span>Contact Driver</span>
                            </button>
                            <p className="text-xs text-gray-500 text-center">
                              Sign up required to chat
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col space-y-2">
                            <button
                              onClick={() => handleChatClick(ride.user_id, ride.user_profiles?.full_name || 'Driver', ride)}
                              className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                            >
                              <MessageCircle size={20} />
                              <span>Start Chat</span>
                            </button>
                            <p className="text-xs text-gray-500 text-center">
                              Chat first, then request confirmation
                            </p>
                          </div>
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