import React, { useState } from 'react'
import { ArrowLeft, Calendar, MessageCircle, User, Plane, TriangleAlert as AlertTriangle, Clock, DollarSign, ListFilter as Filter, Import as SortAsc, Dessert as SortDesc, Send } from 'lucide-react'
import { supabase } from '../utils/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Trip, TripRequest } from '../types'
import AirportAutocomplete from './AirportAutocomplete'
import DisclaimerModal from './DisclaimerModal'
import { getCurrencySymbol } from '../utils/currencies'
import { popupManager } from '../utils/popupManager'
import { getDisplayTripRequests, formatRequestDateDisplay } from '../utils/requestDisplayHelpers'
import { formatDateSafe } from '../utils/dateHelpers'

interface FindTripProps {
  onBack: () => void
  onStartChat: (userId: string, userName: string, ride?: CarRide, trip?: Trip) => void
  isGuest?: boolean
}

type SortOption = 'date-asc' | 'date-desc' | 'price-asc' | 'price-desc' | 'created-asc' | 'created-desc'

export default function FindTrip({ onBack, onStartChat, isGuest = false }: FindTripProps) {
  const { user, isGuest: contextIsGuest } = useAuth()
  const effectiveIsGuest = isGuest || contextIsGuest
  const [departureAirport, setDepartureAirport] = useState('')
  const [destinationAirport, setDestinationAirport] = useState('')
  const [travelDate, setTravelDate] = useState('')
  const [travelMonth, setTravelMonth] = useState('')
  const [searchByMonth, setSearchByMonth] = useState(false)
  const [trips, setTrips] = useState<Trip[]>([])
  const [tripRequests, setTripRequests] = useState<TripRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [selectedChatUser, setSelectedChatUser] = useState<{userId: string, userName: string}>({userId: '', userName: ''})
  const [selectedChatTrip, setSelectedChatTrip] = useState<Trip | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('date-asc')
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState<'trips' | 'requests'>('trips')

  // Auto-search on component mount for guests to show available trips
  React.useEffect(() => {
    // Remove auto-search for guests - they should search manually
    // if (effectiveIsGuest && !searched && !loading) {
    //   handleAutoSearch()
    // }
  }, [effectiveIsGuest, searched, loading])

  const handleAutoSearch = async () => {
    setLoading(true)

    try {
      console.log('=== AUTO SEARCH FOR GUEST TRIPS ===')
      
      // Get current date to filter out past trips
      const now = new Date().toISOString().split('T')[0]
      console.log('Filtering trips after date:', now)
      
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          user_profiles:user_id (
            id,
            full_name
          )
        `)
        .eq('is_closed', false)
        .gte('travel_date', now)
        .order('travel_date')
        .limit(20) // Limit results for better performance

      if (error) throw error

      console.log('Auto search results:', data?.length || 0, 'trips')
      setTrips(data || [])
      setSearched(true)
    } catch (error) {
      console.error('Auto search error:', error)
      // If there's an error, still set searched to true to prevent infinite retries
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Debug: Check if there are any trip requests at all
      const { data: allRequests, error: allRequestsError } = await supabase
        .from('trip_requests')
        .select('id, departure_airport, destination_airport, is_active')
        .limit(5)
      
      console.log('FindTrip: Total trip requests in database:', allRequests?.length || 0)
      if (allRequests && allRequests.length > 0) {
        console.log('FindTrip: Sample requests from database:', allRequests)
      }
      
      // Get current date to filter out past trips
      const now = new Date().toISOString().split('T')[0]
      
      let query = supabase
        .from('trips')
        .select(`
          *,
          user_profiles:user_id (
            id,
            full_name,
            profile_image_url
          )
        `)

      if (departureAirport) {
        query = query.eq('leaving_airport', departureAirport)
      }
      if (destinationAirport) {
        query = query.eq('destination_airport', destinationAirport)
      }
      
      if (searchByMonth && travelMonth) {
        const startOfMonth = `${travelMonth}-01`
        const endOfMonth = new Date(travelMonth + '-01')
        endOfMonth.setMonth(endOfMonth.getMonth() + 1)
        const endOfMonthStr = endOfMonth.toISOString().split('T')[0]
        
        query = query.gte('travel_date', startOfMonth).lt('travel_date', endOfMonthStr)
      } else if (!searchByMonth && travelDate) {
        query = query.eq('travel_date', travelDate)
      }

      // Always filter for future trips
      query = query
        .eq('is_closed', false)
        .gte('travel_date', now)

      // Exclude user's own trips if not a guest
      // Note: Removed exclusion of user's own trips to allow them to see their own trips in search results

      // Apply sorting
      switch (sortBy) {
        case 'date-asc':
          query = query.order('travel_date', { ascending: true })
          break
        case 'date-desc':
          query = query.order('travel_date', { ascending: false })
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
          query = query.order('travel_date', { ascending: true })
      }

      const { data, error } = await query

      if (error) throw error

      setTrips(data || [])

      // Also fetch matching trip requests
      const requests = await getDisplayTripRequests(
        departureAirport,
        destinationAirport,
        travelDate ? new Date(travelDate).toISOString().split('T')[0] : undefined,
        travelMonth,
        searchByMonth,
        undefined // Don't exclude user's own requests
      )
      setTripRequests(requests)
      setSearched(true)
    } catch (error) {
      console.error('Search error:', error)
      setTrips([])
      setTripRequests([])
    } finally {
      setLoading(false)
    }
  }

  const handleChatClick = (userId: string, userName: string, trip: Trip) => {
    setSelectedChatUser({ userId, userName })
    setSelectedChatTrip(trip)
    
    // Check if disclaimer should be shown
    if (popupManager.shouldShowDisclaimer('chat-trip', user?.id, userId)) {
      setShowDisclaimer(true)
    } else {
      // Auto-proceed if disclaimer was already shown
      handleConfirmChat()
    }
  }

  const handleConfirmChat = () => {
    setShowDisclaimer(false)
    popupManager.markDisclaimerShown('chat-trip', user?.id, selectedChatUser.userId)
    onStartChat(selectedChatUser.userId, selectedChatUser.userName, undefined, selectedChatTrip || undefined)
  }


  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0]
  }

  const getTodayMonth = () => {
    return new Date().toISOString().slice(0, 7)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Dashboard</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Find a Trip</h1>
            <p className="text-gray-600">Search for travelers on your needed route</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 my-4">
              <p className="font-semibold mb-2">🔍 Smart Search Tips:</p>
              <ul className="text-left space-y-1 text-blue-800 text-sm">
                <li>• Search by <strong>departure airport</strong> to find trips leaving from your airport</li>
                <li>• Search by <strong>destination airport</strong> to find trips going to your airport</li>
                <li>• Use <strong>both airports</strong> for specific route matches</li>
                <li>• Leave both fields empty to see all available trips</li>
              </ul>
            </div>
            {effectiveIsGuest && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Browsing as Guest:</strong> You can view all available trips. Sign up to contact travelers.
                </p>
              </div>
            )}
          </div>

          <form onSubmit={handleSearch} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <AirportAutocomplete
                value={departureAirport}
                onChange={setDepartureAirport}
                placeholder="Any departure airport"
                label="Departure Airport"
              />

              <AirportAutocomplete
                value={destinationAirport}
                onChange={setDestinationAirport}
                placeholder="Any destination airport"
                label="Destination Airport"
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
                  Travel Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    min={getTodayDate()}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Any date"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">Leave empty to search all dates</p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Travel Month
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="month"
                    value={travelMonth}
                    onChange={(e) => setTravelMonth(e.target.value)}
                    min={getTodayMonth()}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">Search for all trips in the selected month</p>
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
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  <Filter size={14} />
                  <span>{showFilters ? 'Hide' : 'Show'} Options</span>
                </button>
              </div>
              
              {showFilters && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
                      >
                        <option value="date-asc">Travel Date (Earliest First)</option>
                        <option value="date-desc">Travel Date (Latest First)</option>
                        <option value="price-asc">Price (Low to High)</option>
                        <option value="price-desc">Price (High to Low)</option>
                        <option value="created-desc">Newly Posted (Latest First)</option>
                        <option value="created-asc">Newly Posted (Oldest First)</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <div className="text-sm text-blue-700">
                        <p className="font-medium mb-1">Filter Info:</p>
                        <ul className="text-xs space-y-1">
                          <li>• Only shows open trips</li>
                          <li>• Future travel dates only</li>
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
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Searching...' : 'Search Trips'}
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
                  onClick={() => setActiveTab('trips')}
                  className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                    activeTab === 'trips'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Available Trips ({trips.length})
                </button>
                <button
                  onClick={() => setActiveTab('requests')}
                  className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                    activeTab === 'requests'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Trip Requests ({tripRequests.length})
                </button>
              </div>
              <span className="text-gray-600">
                {activeTab === 'trips' ? trips.length : tripRequests.length} {activeTab === 'trips' ? 'trip' : 'request'}{(activeTab === 'trips' ? trips.length : tripRequests.length) !== 1 ? 's' : ''} found
              </span>
            </div>

            {/* Available Trips Tab */}
            {activeTab === 'trips' && (
              <>
                {trips.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Plane size={32} className="text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No trips found</h3>
                    <p className="text-gray-600 mb-6">
                      Try adjusting your search criteria or check the "Trip Requests" tab to see if anyone is looking for assistance on your route
                    </p>
                    <button
                      onClick={() => setActiveTab('requests')}
                      className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      View Trip Requests ({tripRequests.length})
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {trips.map((trip) => (
                      <div
                        key={trip.id}
                        className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4 mb-4">
                              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
                                {trip.user_profiles?.profile_image_url ? (
                                  <img
                                    src={trip.user_profiles.profile_image_url}
                                    alt={trip.user_profiles.full_name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                      e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-blue-100"><svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>'
                                    }}
                                  />
                                ) : (
                                  <User size={24} className="text-blue-600" />
                                )}
                              </div>
                              <div>
                                <h3 className="text-xl font-semibold text-gray-900">
                                  {trip.user_profiles?.full_name || 'Traveler'}
                                </h3>
                                <p className="text-gray-600">Traveler</p>
                              </div>
                            </div>

                            <div className="grid md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <p className="text-sm text-gray-600 mb-1">Departure</p>
                                <div className="font-semibold text-gray-900">
                                  {trip.leaving_airport}
                                </div>
                                {trip.departure_time && (
                                  <div className="text-sm text-gray-600 flex items-center mt-1">
                                    <Clock size={12} className="mr-1" />
                                    {trip.departure_time}
                                    {trip.departure_timezone && (
                                      <span className="text-xs text-gray-500 ml-1">
                                        ({trip.departure_timezone})
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div>
                                <p className="text-sm text-gray-600 mb-1">Destination</p>
                                <div className="font-semibold text-gray-900">
                                  {trip.destination_airport}
                                </div>
                                {trip.landing_time && (
                                  <div className="text-sm text-gray-600 flex items-center mt-1">
                                    <Clock size={12} className="mr-1" />
                                    {trip.landing_time}
                                    {trip.landing_timezone && (
                                      <span className="text-xs text-gray-500 ml-1">
                                        ({trip.landing_timezone})
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div>
                                <p className="text-sm text-gray-600 mb-1">Travel Date</p>
                                <div className="font-semibold text-gray-900">
                                  {formatDateSafe(trip.travel_date)}
                                </div>
                                {trip.landing_date && trip.landing_date !== trip.travel_date && (
                                  <div className="text-sm text-gray-600 mt-1">
                                    Landing: {formatDateSafe(trip.landing_date)}
                                  </div>
                                )}
                              </div>
                            </div>

                            {trip.price && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="flex items-center space-x-4">
                                  <div>
                                    <p className="text-sm text-gray-600 mb-1">Service Price</p>
                                    <div className="flex items-center space-x-2">
                                      <span className="font-semibold text-green-600 flex items-center">
                                        {getCurrencySymbol(trip.currency || 'USD')}{trip.price}
                                      </span>
                                      {trip.negotiable && (
                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                          Negotiable
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="ml-6">
                            {trip.user_id === user?.id ? (
                              <div className="flex flex-col space-y-2">
                                <div className="bg-gray-100 text-gray-600 px-6 py-3 rounded-lg font-medium text-center">
                                  Your Trip
                                </div>
                              </div>
                            ) : effectiveIsGuest ? (
                              <div className="flex flex-col space-y-2">
                                <button
                                  onClick={() => handleChatClick(trip.user_id, trip.user_profiles?.full_name || 'Unknown', trip)}
                                  className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                                >
                                  <MessageCircle size={20} />
                                  <span>Contact Traveler</span>
                                </button>
                                <p className="text-xs text-gray-500 text-center">
                                  Sign up required to chat
                                </p>
                              </div>
                            ) : (
                              <div className="flex flex-col space-y-2">
                                <button
                                  onClick={() => handleChatClick(trip.user_id, trip.user_profiles?.full_name || 'Traveler', trip)}
                                  className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
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
              </>
            )}

            {/* Trip Requests Tab */}
            {activeTab === 'requests' && (
              <>
                {tripRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Send size={32} className="text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No trip requests found</h3>
                    <p className="text-gray-600 mb-6">
                      No one is currently requesting assistance on this route. Check the "Available Trips" tab for posted trips.
                    </p>
                    <button
                      onClick={() => setActiveTab('trips')}
                      className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      View Available Trips ({trips.length})
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                      <h4 className="font-semibold text-purple-900 mb-2">💡 About Trip Requests</h4>
                      <p className="text-sm text-purple-800">
                        These are passengers looking for assistance on routes similar to your search. 
                        Contact them if you're traveling and can provide help!
                      </p>
                    </div>
                    
                    {tripRequests.map((request) => (
                      <div
                        key={request.id}
                        className="border border-purple-200 rounded-xl p-6 hover:shadow-md transition-shadow bg-purple-50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4 mb-4">
                              <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center overflow-hidden">
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
                                <p className="text-purple-600 font-medium">Looking for assistance</p>
                              </div>
                            </div>

                            <div className="grid md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <p className="text-sm text-gray-600 mb-1">From</p>
                                <div className="font-semibold text-gray-900">
                                  {request.departure_airport}
                                </div>
                              </div>

                              <div>
                                <p className="text-sm text-gray-600 mb-1">To</p>
                                <div className="font-semibold text-gray-900">
                                  {request.destination_airport}
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
                              <div className="mt-4 pt-4 border-t border-purple-200">
                                <p className="text-sm text-gray-600 mb-1">What they need</p>
                                <p className="text-gray-900">{request.additional_notes}</p>
                              </div>
                            )}

                            <div className="mt-4 pt-4 border-t border-purple-200">
                              <div className="flex items-center space-x-4 text-sm text-gray-600">
                                {request.departure_time_preference && (
                                  <div className="flex items-center space-x-1">
                                    <Clock size={12} />
                                    <span>Preferred time: {request.departure_time_preference}</span>
                                  </div>
                                )}
                                {request.max_price && (
                                  <div className="flex items-center space-x-1">
                                    <DollarSign size={12} />
                                    <span>Max budget: {getCurrencySymbol(request.currency || 'USD')}{request.max_price}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="ml-6">
                            {request.passenger_id === user?.id ? (
                              <div className="flex flex-col space-y-2">
                                <div className="bg-gray-100 text-gray-600 px-6 py-3 rounded-lg font-medium text-center">
                                  Your Request
                                </div>
                              </div>
                            ) : effectiveIsGuest ? (
                              <div className="flex flex-col space-y-2">
                                <button
                                  onClick={() => handleChatClick(request.passenger_id, request.user_profiles?.full_name || 'Unknown', undefined)}
                                  className="flex items-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
                                >
                                  <MessageCircle size={20} />
                                  <span>Contact Passenger</span>
                                </button>
                                <p className="text-xs text-gray-500 text-center">
                                  Sign up required to chat
                                </p>
                              </div>
                            ) : (
                              <div className="flex flex-col space-y-2">
                                <button
                                  onClick={() => handleChatClick(request.passenger_id, request.user_profiles?.full_name || 'Passenger', undefined)}
                                  className="flex items-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
                                >
                                  <MessageCircle size={20} />
                                  <span>Offer Assistance</span>
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

        {/* Legacy trips display - remove this section */}
        {searched && false && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Search Results
              </h2>
              <span className="text-gray-600">
                {trips.length} trip{trips.length !== 1 ? 's' : ''} found
              </span>
            </div>

            {trips.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plane size={32} className="text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No trips found</h3>
                <p className="text-gray-600 mb-6">
                  Try adjusting your search criteria or check back later for new trips
                </p>
                <button
                  onClick={() => {
                    setDepartureAirport('')
                    setDestinationAirport('')
                    setTravelDate('')
                    setTravelMonth('')
                    setSearched(false)
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
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
          type="chat-trip"
        />
      </div>
    </div>
  )
}