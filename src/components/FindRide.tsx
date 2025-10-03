import React, { useState } from 'react'
import { ArrowLeft, Calendar, MessageCircle, User, Car, TriangleAlert as AlertTriangle, Clock, DollarSign, ListFilter as Filter, Import as SortAsc, Dessert as SortDesc, Send } from 'lucide-react'
import { supabase } from '../utils/supabase'
import { useAuth } from '../contexts/AuthContext'
import { CarRide, RideRequest } from '../types'
import LocationAutocomplete from './LocationAutocomplete'
import DisclaimerModal from './DisclaimerModal'
import { getCurrencySymbol } from '../utils/currencies'
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
  onStartChat: (userId: string, userName: string, ride?: CarRide, trip?: Trip) => void
  isGuest?: boolean
}

type SortOption = 'date-asc' | 'date-desc' | 'price-asc' | 'price-desc' | 'created-asc' | 'created-desc'

export default function FindRide({ onBack, onStartChat, isGuest = false }: FindRideProps) {
  const { user, isGuest: contextIsGuest } = useAuth()
  const effectiveIsGuest = isGuest || contextIsGuest
  const [departureLocation, setDepartureLocation] = useState<LocationData | null>(null)
  const [destinationLocation, setDestinationLocation] = useState<LocationData | null>(null)
  const [travelDate, setTravelDate] = useState('')
  const [travelMonth, setTravelMonth] = useState('')
  const [searchByMonth, setSearchByMonth] = useState(false)
  const [rides, setRides] = useState<CarRide[]>([])
  const [rideRequests, setRideRequests] = useState<RideRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [selectedChatUser, setSelectedChatUser] = useState<{userId: string, userName: string}>({userId: '', userName: ''})
  const [selectedChatRide, setSelectedChatRide] = useState<CarRide | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('date-asc')
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState<'rides' | 'requests'>('rides')

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Debug: Check if there are any ride requests at all
      const { data: allRequests, error: allRequestsError } = await supabase
        .from('ride_requests')
        .select('id, departure_location, destination_location, is_active')
        .limit(5)
      
      console.log('FindRide: Total ride requests in database:', allRequests?.length || 0)
      if (allRequests && allRequests.length > 0) {
        console.log('FindRide: Sample requests from database:', allRequests)
      }
      
      // Get current date to filter out past rides
      const now = new Date().toISOString().split('T')[0]
      
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

      // Apply location filters
      if (departureLocation?.address) {
        query = query.ilike('from_location', `%${departureLocation.address.split(',')[0].trim()}%`)
      }
      if (destinationLocation?.address) {
        query = query.ilike('to_location', `%${destinationLocation.address.split(',')[0].trim()}%`)
      }
      
      if (searchByMonth && travelMonth) {
        const startOfMonth = `${travelMonth}-01`
        const endOfMonth = new Date(travelMonth + '-01')
        endOfMonth.setMonth(endOfMonth.getMonth() + 1)
        const endOfMonthStr = endOfMonth.toISOString().split('T')[0]
        
        query = query.gte('departure_date_time', startOfMonth).lt('departure_date_time', endOfMonthStr)
      } else if (!searchByMonth && travelDate) {
        const startOfDay = `${travelDate}T00:00:00.000Z`
        const endOfDay = `${travelDate}T23:59:59.999Z`
        query = query.gte('departure_date_time', startOfDay).lte('departure_date_time', endOfDay)
      }

      // Always filter for future rides
      query = query
        .eq('is_closed', false)
        .gte('departure_date_time', new Date().toISOString())

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

      setRides(data || [])

      // Also fetch matching ride requests
      const requests = await getDisplayRideRequests(
        departureLocation?.address,
        destinationLocation?.address,
        travelDate ? new Date(travelDate).toISOString().split('T')[0] : undefined,
        travelMonth,
        searchByMonth,
        undefined // Don't exclude user's own requests
      )
      setRideRequests(requests)
      setSearched(true)
    } catch (error) {
      console.error('Search error:', error)
      setRides([])
      setRideRequests([])
    } finally {
      setLoading(false)
    }
  }

  const handleChatClick = (userId: string, userName: string, ride: CarRide) => {
    setSelectedChatUser({ userId, userName })
    setSelectedChatRide(ride)
    
    // Check if disclaimer should be shown
    if (popupManager.shouldShowDisclaimer('chat-ride', user?.id, userId)) {
      setShowDisclaimer(true)
    } else {
      // Auto-proceed if disclaimer was already shown
      handleConfirmChat()
    }
  }

  const handleConfirmChat = () => {
    setShowDisclaimer(false)
    popupManager.markDisclaimerShown('chat-ride', user?.id, selectedChatUser.userId)
    onStartChat(selectedChatUser.userId, selectedChatUser.userName, selectedChatRide || undefined, undefined)
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
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 my-4">
              <p className="font-semibold mb-2">🔍 Smart Search Tips:</p>
              <ul className="text-left space-y-1 text-green-800 text-sm">
                <li>• Search by <strong>departure location</strong> to find rides leaving from your area</li>
                <li>• Search by <strong>destination location</strong> to find rides going to your destination</li>
                <li>• Use <strong>both locations</strong> for specific route matches</li>
                <li>• Leave both fields empty to see all available rides</li>
              </ul>
            </div>
            {effectiveIsGuest && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Browsing as Guest:</strong> You can view all available rides. Sign up to contact drivers.
                </p>
              </div>
            )}
          </div>

          <form onSubmit={handleSearch} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <LocationAutocomplete
                value={departureLocation}
                onChange={setDepartureLocation}
                placeholder="Any departure location"
                label="Departure Location"
              />

              <LocationAutocomplete
                value={destinationLocation}
                onChange={setDestinationLocation}
                placeholder="Any destination location"
                label="Destination Location"
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
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
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
                      className="text-green-600 hover:text-green-700 font-medium transition-colors"
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
                                  {formatDateTimeSafe(ride.departure_date_time)}
                                </div>
                              </div>
                            </div>

                            {ride.intermediate_stops && ride.intermediate_stops.length > 0 && (
                              <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-2">Intermediate Stops:</p>
                                <div className="flex flex-wrap gap-2">
                                  {ride.intermediate_stops.map((stop, index) => (
                                    <span key={index} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
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
                                      <DollarSign size={16} className="mr-1" />
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
                            {effectiveIsGuest ? (
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
                            ) : ride.user_id === user?.id ? (
                              <div className="flex flex-col space-y-2">
                                <div className="bg-green-100 text-green-800 px-6 py-3 rounded-lg font-medium text-center border border-green-200">
                                  Your Ride
                                </div>
                                <p className="text-xs text-gray-500 text-center">
                                  This is your posted ride
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
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                      <h4 className="font-semibold text-purple-900 mb-2">💡 About Ride Requests</h4>
                      <p className="text-sm text-purple-800">
                        These are passengers looking for rides on routes similar to your search. 
                        Contact them if you're driving and can provide a ride!
                      </p>
                    </div>
                    
                    {rideRequests.map((request) => (
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
                                <p className="text-purple-600 font-medium">Looking for a ride</p>
                              </div>
                            </div>

                            <div className="grid md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <p className="text-sm text-gray-600 mb-1">From</p>
                                <div className="font-semibold text-gray-900">
                                  {request.departure_location}
                                </div>
                              </div>

                              <div>
                                <p className="text-sm text-gray-600 mb-1">To</p>
                                <div className="font-semibold text-gray-900">
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
                            {effectiveIsGuest ? (
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
                            ) : request.passenger_id === user?.id ? (
                              <div className="flex flex-col space-y-2">
                                <div className="bg-purple-100 text-purple-800 px-6 py-3 rounded-lg font-medium text-center border border-purple-200">
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
                                  className="flex items-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
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