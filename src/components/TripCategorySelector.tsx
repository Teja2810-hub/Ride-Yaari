import React, { useState, useEffect } from 'react'
import { ArrowLeft, Plane, User, Calendar, Clock, MapPin, MessageCircle, CreditCard as Edit, Trash2, History, Send, Plus, X, TriangleAlert as AlertTriangle, ListFilter as Filter, Search, RefreshCw, CircleCheck as CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { Trip, RideConfirmation, TripRequest } from '../types'
import PassengerManagement from './PassengerManagement'
import TripClosureControls from './TripClosureControls'
import TripRequestEditModal from './TripRequestEditModal'
import { getCurrencySymbol } from '../utils/currencies'
import { useErrorHandler } from '../hooks/useErrorHandler'
import ErrorMessage from './ErrorMessage'
import LoadingSpinner from './LoadingSpinner'
import { formatDateSafe, formatDateTimeSafe } from '../utils/dateHelpers'

interface TripCategorySelectorProps {
  offeredTrips: Trip[]
  joinedTrips: RideConfirmation[]
  requestedTrips: TripRequest[]
  onStartChat: (userId: string, userName: string, ride?: any, trip?: Trip) => void
  onEditTrip: (trip: Trip) => void
  onDeleteTrip: (tripId: string) => void
  onViewTripHistory: (trip: Trip) => void
  onViewRequests: () => void
  onRefresh: () => void
}

type TripView = 'selector' | 'offered' | 'joined' | 'requested'
type SortOption = 'date-desc' | 'date-asc' | 'created-desc' | 'created-asc' | 'destination'
type FilterOption = 'all' | 'open' | 'closed' | 'future' | 'past'

export default function TripCategorySelector({
  offeredTrips,
  joinedTrips,
  requestedTrips,
  onStartChat,
  onEditTrip,
  onDeleteTrip,
  onViewTripHistory,
  onViewRequests,
  onRefresh
}: TripCategorySelectorProps) {
  const { user } = useAuth()
  const { error, isLoading, handleAsync, clearError } = useErrorHandler()
  const [tripView, setTripView] = useState<TripView>('selector')
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [showPassengerManagement, setShowPassengerManagement] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')
  const [filterBy, setFilterBy] = useState<FilterOption>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [editingRequest, setEditingRequest] = useState<TripRequest | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')

  const handleManagePassengers = (trip: Trip) => {
    setSelectedTrip(trip)
    setShowPassengerManagement(true)
  }

  const handleEditRequest = (request: TripRequest) => {
    setEditingRequest(request)
    setShowEditModal(true)
  }

  const handleSaveRequest = async (updatedRequest: Partial<TripRequest>) => {
    if (!editingRequest) return

    await handleAsync(async () => {
      const { error } = await supabase
        .from('trip_requests')
        .update(updatedRequest)
        .eq('id', editingRequest.id)

      if (error) throw error

      setShowEditModal(false)
      setEditingRequest(null)
      setSuccessMessage('Trip request updated successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
      onRefresh()
    })
  }

  const handleDeleteRequest = async (requestId: string) => {
    setDeletingRequestId(requestId)

    await handleAsync(async () => {
      const { error } = await supabase
        .from('trip_requests')
        .delete()
        .eq('id', requestId)
        .eq('passenger_id', user?.id)

      if (error) throw error

      setSuccessMessage('Trip request deleted successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
      onRefresh()
    }).finally(() => {
      setDeletingRequestId(null)
    })
  }

  const getFilteredAndSortedTrips = (trips: Trip[]) => {
    let filtered = trips.filter(trip => {
      const searchMatch = searchTerm === '' || 
        trip.leaving_airport.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.destination_airport.toLowerCase().includes(searchTerm.toLowerCase())

      const now = new Date()
      const travelDate = new Date(trip.travel_date)
      
      let filterMatch = true
      switch (filterBy) {
        case 'open':
          filterMatch = !trip.is_closed
          break
        case 'closed':
          filterMatch = !!trip.is_closed
          break
        case 'future':
          filterMatch = travelDate > now
          break
        case 'past':
          filterMatch = travelDate <= now
          break
        default:
          filterMatch = true
      }

      return searchMatch && filterMatch
    })

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return new Date(a.travel_date).getTime() - new Date(b.travel_date).getTime()
        case 'date-desc':
          return new Date(b.travel_date).getTime() - new Date(a.travel_date).getTime()
        case 'created-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'created-desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'destination':
          return a.destination_airport.localeCompare(b.destination_airport)
        default:
          return 0
      }
    })

    return filtered
  }

  const getFilteredAndSortedRequests = (requests: TripRequest[]) => {
    let filtered = requests.filter(request => {
      const searchMatch = searchTerm === '' || 
        request.departure_airport.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.destination_airport.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (request.additional_notes || '').toLowerCase().includes(searchTerm.toLowerCase())

      const now = new Date()
      let filterMatch = true
      
      switch (filterBy) {
        case 'open':
          filterMatch = request.is_active
          break
        case 'closed':
          filterMatch = !request.is_active
          break
        case 'future':
          if (request.specific_date) {
            filterMatch = new Date(request.specific_date) > now
          } else if (request.expires_at) {
            filterMatch = new Date(request.expires_at) > now
          } else {
            filterMatch = true
          }
          break
        case 'past':
          if (request.specific_date) {
            filterMatch = new Date(request.specific_date) <= now
          } else if (request.expires_at) {
            filterMatch = new Date(request.expires_at) <= now
          } else {
            filterMatch = false
          }
          break
        default:
          filterMatch = true
      }

      return searchMatch && filterMatch
    })

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          const dateA = a.specific_date ? new Date(a.specific_date) : new Date(a.created_at)
          const dateB = b.specific_date ? new Date(b.specific_date) : new Date(b.created_at)
          return dateA.getTime() - dateB.getTime()
        case 'date-desc':
          const dateA2 = a.specific_date ? new Date(a.specific_date) : new Date(a.created_at)
          const dateB2 = b.specific_date ? new Date(b.specific_date) : new Date(b.created_at)
          return dateB2.getTime() - dateA2.getTime()
        case 'created-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'created-desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'destination':
          return a.destination_airport.localeCompare(b.destination_airport)
        default:
          return 0
      }
    })

    return filtered
  }

  const formatRequestDateDisplay = (request: TripRequest): string => {
    switch (request.request_type) {
      case 'specific_date':
        return request.specific_date ? formatDateSafe(request.specific_date) : 'Flexible date'
      case 'multiple_dates':
        if (request.multiple_dates && request.multiple_dates.length > 0) {
          const validDates = request.multiple_dates.filter(d => d)
          if (validDates.length === 1) {
            return formatDateSafe(validDates[0])
          }
          return `${validDates.length} dates`
        }
        return 'Flexible dates'
      case 'month':
        if (request.request_month) {
          const date = new Date(request.request_month + '-01')
          return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        }
        return 'Flexible month'
      default:
        return 'Flexible timing'
    }
  }

  const getStats = () => {
    const totalOffered = offeredTrips.length
    const openOffered = offeredTrips.filter(t => !t.is_closed).length
    const closedOffered = offeredTrips.filter(t => t.is_closed).length
    const totalJoined = joinedTrips.length
    const confirmedJoined = joinedTrips.filter(c => c.status === 'accepted').length
    const pendingJoined = joinedTrips.filter(c => c.status === 'pending').length
    const totalRequested = requestedTrips.length
    const activeRequested = requestedTrips.filter(r => r.is_active).length

    return {
      totalOffered,
      openOffered,
      closedOffered,
      totalJoined,
      confirmedJoined,
      pendingJoined,
      totalRequested,
      activeRequested
    }
  }

  if (tripView === 'selector') {
    const stats = getStats()
    
    return (
      <div>
        {error && (
          <ErrorMessage
            message={error}
            onRetry={clearError}
            onDismiss={clearError}
            className="mb-6"
          />
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle size={20} className="text-green-600" />
              <p className="text-green-800">{successMessage}</p>
            </div>
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Airport Trips</h2>
          <p className="text-gray-600">
            Manage your posted trips, view trips you've joined, and track your trip requests.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalOffered}</div>
            <div className="text-sm text-blue-800">Trips Offered</div>
            <div className="text-xs text-gray-600 mt-1">{stats.openOffered} open, {stats.closedOffered} closed</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.totalJoined}</div>
            <div className="text-sm text-green-800">Trips Joined</div>
            <div className="text-xs text-gray-600 mt-1">{stats.confirmedJoined} confirmed, {stats.pendingJoined} pending</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.totalRequested}</div>
            <div className="text-sm text-purple-800">Trip Requests</div>
            <div className="text-xs text-gray-600 mt-1">{stats.activeRequested} active</div>
          </div>
          <div className="bg-indigo-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">{stats.totalOffered + stats.totalJoined + stats.totalRequested}</div>
            <div className="text-sm text-indigo-800">Total Activity</div>
            <div className="text-xs text-gray-600 mt-1">All trip interactions</div>
          </div>
        </div>

        {/* Category Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Trips You've Offered */}
          <div
            onClick={() => setTripView('offered')}
            className="group cursor-pointer bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 p-6"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Plane size={28} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Trips You've Offered</h3>
              <p className="text-gray-600 mb-4 leading-relaxed">
                View and manage airport trips you've posted for others to join
              </p>
              <div className="space-y-1 text-sm text-gray-500 mb-4">
                <p className="flex items-center justify-center">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                  {stats.totalOffered} trips posted
                </p>
                <p className="flex items-center justify-center">
                  <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                  {stats.openOffered} currently open
                </p>
              </div>
              <div className="inline-flex items-center text-blue-600 font-semibold group-hover:text-blue-700">
                Manage Your Trips
                <div className="ml-2 transform group-hover:translate-x-1 transition-transform">→</div>
              </div>
            </div>
          </div>

          {/* Trips You've Joined */}
          <div
            onClick={() => setTripView('joined')}
            className="group cursor-pointer bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 p-6"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <User size={28} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Trips You've Joined</h3>
              <p className="text-gray-600 mb-4 leading-relaxed">
                View airport trips you've requested to join and their status
              </p>
              <div className="space-y-1 text-sm text-gray-500 mb-4">
                <p className="flex items-center justify-center">
                  <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                  {stats.totalJoined} trips joined
                </p>
                <p className="flex items-center justify-center">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                  {stats.confirmedJoined} confirmed
                </p>
              </div>
              <div className="inline-flex items-center text-green-600 font-semibold group-hover:text-green-700">
                View Your Requests
                <div className="ml-2 transform group-hover:translate-x-1 transition-transform">→</div>
              </div>
            </div>
          </div>

          {/* Trip Requests */}
          <div
            onClick={() => setTripView('requested')}
            className="group cursor-pointer bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 p-6"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Send size={28} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Your Trip Requests</h3>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Manage trip assistance requests you've submitted to find travelers
              </p>
              <div className="space-y-1 text-sm text-gray-500 mb-4">
                <p className="flex items-center justify-center">
                  <span className="w-2 h-2 bg-purple-600 rounded-full mr-2"></span>
                  {stats.totalRequested} requests made
                </p>
                <p className="flex items-center justify-center">
                  <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                  {stats.activeRequested} active
                </p>
              </div>
              <div className="inline-flex items-center text-purple-600 font-semibold group-hover:text-purple-700">
                Manage Requests
                <div className="ml-2 transform group-hover:translate-x-1 transition-transform">→</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (tripView === 'offered') {
    const filteredTrips = getFilteredAndSortedTrips(offeredTrips)
    
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setTripView('selector')}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Trips You've Offered</h2>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <span className="text-gray-600">{filteredTrips.length} of {offeredTrips.length} trips</span>
          </div>
        </div>

        {error && (
          <ErrorMessage
            message={error}
            onRetry={clearError}
            onDismiss={clearError}
            className="mb-6"
          />
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle size={20} className="text-green-600" />
              <p className="text-green-800">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Search and Filter Controls */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 sm:mb-0">Filter & Search</h3>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Filter size={16} />
              <span>{showFilters ? 'Hide' : 'Show'} Filters</span>
            </button>
          </div>

          {showFilters && (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by airport or destination..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="all">All Status</option>
                    <option value="open">Open Trips</option>
                    <option value="closed">Closed Trips</option>
                    <option value="future">Future Trips</option>
                    <option value="past">Past Trips</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="date-desc">Travel Date (Latest First)</option>
                    <option value="date-asc">Travel Date (Earliest First)</option>
                    <option value="created-desc">Recently Posted</option>
                    <option value="created-asc">Oldest Posted</option>
                    <option value="destination">By Destination</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Trips List */}
        {filteredTrips.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plane size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {offeredTrips.length === 0 ? 'No Trips Posted Yet' : 'No Matching Trips'}
            </h3>
            <p className="text-gray-600">
              {offeredTrips.length === 0 
                ? 'You haven\'t posted any airport trips yet. Start by posting your first trip!'
                : 'Try adjusting your search or filter criteria.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTrips.map((trip) => (
              <div
                key={trip.id}
                className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Plane size={24} className="text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {trip.leaving_airport} → {trip.destination_airport}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Calendar size={12} />
                            <span>{formatDateSafe(trip.travel_date)}</span>
                          </div>
                          {trip.departure_time && (
                            <div className="flex items-center space-x-1">
                              <Clock size={12} />
                              <span>{trip.departure_time}</span>
                              {trip.departure_timezone && (
                                <span className="text-xs text-gray-500">
                                  ({trip.departure_timezone})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <TripClosureControls
                        trip={trip}
                        onUpdate={onRefresh}
                      />
                      
                      {trip.is_closed ? (
                        <div className="flex items-center space-x-2 bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                          <X size={14} />
                          <span>Closed</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                          <CheckCircle size={14} />
                          <span>Open</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Trip Details */}
                  <div className="bg-blue-50 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">From</p>
                        <div className="font-medium text-gray-900">{trip.leaving_airport}</div>
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
                        <p className="text-sm text-gray-600 mb-1">To</p>
                        <div className="font-medium text-gray-900">{trip.destination_airport}</div>
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
                        <div className="font-medium text-gray-900 flex items-center">
                          <Calendar size={14} className="mr-1 text-gray-400" />
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
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <span className="text-sm font-medium text-green-600">
                          Service Price: {getCurrencySymbol(trip.currency || 'USD')}{trip.price}
                          {trip.negotiable && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-2">
                              Negotiable
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => handleManagePassengers(trip)}
                        className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                      >
                        <User size={16} />
                        <span>Manage Passengers</span>
                      </button>
                      
                      <button
                        onClick={() => onViewTripHistory(trip)}
                        className="flex items-center space-x-2 text-gray-600 hover:text-gray-700 font-medium transition-colors"
                      >
                        <History size={16} />
                        <span>View History</span>
                      </button>
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => onEditTrip(trip)}
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                      >
                        <Edit size={16} />
                        <span>Edit</span>
                      </button>
                      
                      <button
                        onClick={() => onDeleteTrip(trip.id)}
                        className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                      >
                        <Trash2 size={16} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Passenger Management Modal */}
        {showPassengerManagement && selectedTrip && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <Plane size={24} className="text-blue-600" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Manage Passengers</h2>
                    <p className="text-sm text-gray-600">
                      {selectedTrip.leaving_airport} → {selectedTrip.destination_airport}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowPassengerManagement(false)
                    setSelectedTrip(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
                <PassengerManagement
                  trip={selectedTrip}
                  onStartChat={onStartChat}
                  onUpdate={onRefresh}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (tripView === 'joined') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setTripView('selector')}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Trips You've Joined</h2>
          </div>
          <span className="text-gray-600">{joinedTrips.length} trip{joinedTrips.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Use the imported component */}
        <div className="space-y-4">
          {joinedTrips.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plane size={32} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Trips Joined Yet</h3>
              <p className="text-gray-600">
                You haven't joined any airport trips yet. Start by finding and requesting trips!
              </p>
            </div>
          ) : (
            joinedTrips.map((confirmation) => {
              const trip = confirmation.trips!
              const traveler = confirmation.user_profiles

              return (
                <div
                  key={confirmation.id}
                  className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden">
                        {traveler?.profile_image_url ? (
                          <img
                            src={traveler.profile_image_url}
                            alt={traveler.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-semibold">
                            {(traveler?.full_name || 'T').charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {traveler?.full_name || 'Unknown Traveler'}
                        </h3>
                        <p className="text-sm text-gray-600">Trip Owner</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border text-sm font-medium ${
                        confirmation.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        confirmation.status === 'accepted' ? 'bg-green-100 text-green-800 border-green-200' :
                        'bg-red-100 text-red-800 border-red-200'
                      }`}>
                        {confirmation.status === 'pending' ? (
                          <Clock size={14} className="text-yellow-600" />
                        ) : confirmation.status === 'accepted' ? (
                          <CheckCircle size={14} className="text-green-600" />
                        ) : (
                          <X size={14} className="text-red-600" />
                        )}
                        <span className="capitalize">{confirmation.status}</span>
                      </div>
                      <Plane size={20} className="text-blue-600" />
                    </div>
                  </div>

                  {/* Trip Details */}
                  <div className="bg-blue-50 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">From</p>
                        <div className="font-medium text-gray-900">{trip.leaving_airport}</div>
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
                        <p className="text-sm text-gray-600 mb-1">To</p>
                        <div className="font-medium text-gray-900">{trip.destination_airport}</div>
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
                        <div className="font-medium text-gray-900 flex items-center">
                          <Calendar size={14} className="mr-1 text-gray-400" />
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
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <span className="text-sm font-medium text-green-600">
                          Service Price: {getCurrencySymbol(trip.currency || 'USD')}{trip.price}
                          {trip.negotiable && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-2">
                              Negotiable
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => onStartChat(
                        confirmation.ride_owner_id,
                        traveler?.full_name || 'Traveler',
                        undefined,
                        trip
                      )}
                      className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      <MessageCircle size={16} />
                      <span>Chat with {traveler?.full_name || 'Traveler'}</span>
                    </button>

                    <div className="text-xs text-gray-500">
                      Request ID: {confirmation.id.slice(0, 8)}...
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  if (tripView === 'requested') {
    const filteredRequests = getFilteredAndSortedRequests(requestedTrips)
    
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setTripView('selector')}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Your Trip Requests</h2>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <span className="text-gray-600">{filteredRequests.length} of {requestedTrips.length} requests</span>
          </div>
        </div>

        {error && (
          <ErrorMessage
            message={error}
            onRetry={clearError}
            onDismiss={clearError}
            className="mb-6"
          />
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle size={20} className="text-green-600" />
              <p className="text-green-800">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Search and Filter Controls */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 sm:mb-0">Filter & Search</h3>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Filter size={16} />
              <span>{showFilters ? 'Hide' : 'Show'} Filters</span>
            </button>
          </div>

          {showFilters && (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by airport, destination, or notes..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="all">All Status</option>
                    <option value="open">Active Requests</option>
                    <option value="closed">Inactive Requests</option>
                    <option value="future">Future Dates</option>
                    <option value="past">Past Dates</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="date-desc">Request Date (Latest First)</option>
                    <option value="date-asc">Request Date (Earliest First)</option>
                    <option value="created-desc">Recently Created</option>
                    <option value="created-asc">Oldest Created</option>
                    <option value="destination">By Destination</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Trip Requests List */}
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {requestedTrips.length === 0 ? 'No Trip Requests Yet' : 'No Matching Requests'}
            </h3>
            <p className="text-gray-600">
              {requestedTrips.length === 0 
                ? 'You haven\'t made any trip requests yet. Start by requesting assistance for your travel needs!'
                : 'Try adjusting your search or filter criteria.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <Send size={24} className="text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {request.departure_airport} → {request.destination_airport}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Calendar size={12} />
                          <span>{formatRequestDateDisplay(request)}</span>
                        </div>
                        {request.departure_time_preference && (
                          <div className="flex items-center space-x-1">
                            <Clock size={12} />
                            <span>Preferred: {request.departure_time_preference}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {request.is_active ? (
                      <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                        <CheckCircle size={14} />
                        <span>Active</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                        <X size={14} />
                        <span>Inactive</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Request Details */}
                <div className="bg-purple-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Request Type</p>
                      <div className="font-medium text-gray-900 capitalize">
                        {request.request_type.replace('_', ' ')}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Created</p>
                      <div className="font-medium text-gray-900">
                        {formatDateTimeSafe(request.created_at)}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Status</p>
                      <div className={`font-medium ${request.is_active ? 'text-green-600' : 'text-gray-600'}`}>
                        {request.is_active ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  </div>

                  {request.additional_notes && (
                    <div className="mt-3 pt-3 border-t border-purple-200">
                      <p className="text-sm text-gray-600 mb-1">What you need</p>
                      <p className="text-gray-900">{request.additional_notes}</p>
                    </div>
                  )}

                  {request.max_price && (
                    <div className="mt-3 pt-3 border-t border-purple-200">
                      <span className="text-sm font-medium text-green-600">
                        Max Budget: {getCurrencySymbol(request.currency || 'USD')}{request.max_price}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    Request ID: {request.id.slice(0, 8)}...
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleEditRequest(request)}
                      className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                    >
                      <Edit size={16} />
                      <span>Edit</span>
                    </button>
                    
                    <button
                      onClick={() => handleDeleteRequest(request.id)}
                      disabled={deletingRequestId === request.id}
                      className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
                    >
                      {deletingRequestId === request.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 size={16} />
                          <span>Delete</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Request Modal */}
        {showEditModal && editingRequest && (
          <TripRequestEditModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false)
              setEditingRequest(null)
            }}
            request={editingRequest}
            onSave={handleSaveRequest}
          />
        )}
      </div>
    )
  }

  return null
}