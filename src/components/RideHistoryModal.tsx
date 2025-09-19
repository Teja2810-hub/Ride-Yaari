import React, { useState, useEffect } from 'react'
import { X, Car, Plane, User, Calendar, Clock, MapPin, Check, AlertTriangle, MessageCircle, Filter, SortAsc, SortDesc } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { RideConfirmation, CarRide, Trip } from '../types'
import { getCurrencySymbol } from '../utils/currencies'

interface RideHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  ride?: CarRide
  trip?: Trip
  onStartChat: (userId: string, userName: string, ride?: CarRide, trip?: Trip) => void
}

type SortOption = 'date-asc' | 'date-desc' | 'name-asc' | 'name-desc' | 'status'
type FilterOption = 'all' | 'pending' | 'accepted' | 'rejected'

export default function RideHistoryModal({ isOpen, onClose, ride, trip, onStartChat }: RideHistoryModalProps) {
  const { user } = useAuth()
  const [confirmations, setConfirmations] = useState<RideConfirmation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')
  const [filterBy, setFilterBy] = useState<FilterOption>('all')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (isOpen && (ride || trip)) {
      fetchConfirmationHistory()
    }
  }, [isOpen, ride, trip, sortBy, filterBy])

  const fetchConfirmationHistory = async () => {
    if (!user || (!ride && !trip)) return

    setLoading(true)
    setError('')

    try {
      let query = supabase
        .from('ride_confirmations')
        .select(`
          *,
          user_profiles!ride_confirmations_passenger_id_fkey (
            id,
            full_name,
            profile_image_url,
            created_at
          )
        `)

      if (ride) {
        query = query.eq('ride_id', ride.id)
      } else if (trip) {
        query = query.eq('trip_id', trip.id)
      }

      // Apply status filter
      if (filterBy !== 'all') {
        query = query.eq('status', filterBy)
      }

      // Apply sorting
      switch (sortBy) {
        case 'date-asc':
          query = query.order('created_at', { ascending: true })
          break
        case 'date-desc':
          query = query.order('created_at', { ascending: false })
          break
        case 'name-asc':
          query = query.order('user_profiles(full_name)', { ascending: true })
          break
        case 'name-desc':
          query = query.order('user_profiles(full_name)', { ascending: false })
          break
        case 'status':
          query = query.order('status').order('created_at', { ascending: false })
          break
      }

      const { data, error } = await query

      if (error) throw error

      setConfirmations(data || [])
    } catch (error: any) {
      console.error('Error fetching confirmation history:', error)
      setError('Failed to load confirmation history')
    } finally {
      setLoading(false)
    }
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={14} className="text-yellow-600" />
      case 'accepted':
        return <Check size={14} className="text-green-600" />
      case 'rejected':
        return <X size={14} className="text-red-600" />
      default:
        return <AlertTriangle size={14} className="text-gray-600" />
    }
  }

  const getConfirmationStats = () => {
    const total = confirmations.length
    const pending = confirmations.filter(c => c.status === 'pending').length
    const accepted = confirmations.filter(c => c.status === 'accepted').length
    const rejected = confirmations.filter(c => c.status === 'rejected').length

    return { total, pending, accepted, rejected }
  }

  if (!isOpen) return null

  const stats = getConfirmationStats()
  const rideOrTrip = ride || trip
  const isCarRide = !!ride

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {isCarRide ? (
              <Car size={24} className="text-green-600" />
            ) : (
              <Plane size={24} className="text-blue-600" />
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {isCarRide ? 'Car Ride' : 'Airport Trip'} History
              </h2>
              <p className="text-sm text-gray-600">
                {isCarRide 
                  ? `${ride?.from_location} → ${ride?.to_location}`
                  : `${trip?.leaving_airport} → ${trip?.destination_airport}`
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Requests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
              <div className="text-sm text-gray-600">Accepted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              <div className="text-sm text-gray-600">Rejected</div>
            </div>
          </div>
        </div>

        {/* Filters and Sorting */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Filter size={16} />
              <span>Filters & Sorting</span>
            </button>
            
            {showFilters && (
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Filter:</label>
                  <select
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Sort:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="date-desc">Newest First</option>
                    <option value="date-asc">Oldest First</option>
                    <option value="name-asc">Name A-Z</option>
                    <option value="name-desc">Name Z-A</option>
                    <option value="status">By Status</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 280px)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading confirmation history...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchConfirmationHistory}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : confirmations.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User size={32} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Confirmation History</h3>
              <p className="text-gray-600">
                {filterBy === 'all' 
                  ? 'No one has requested to join this ride yet.'
                  : `No ${filterBy} confirmations found.`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {confirmations.map((confirmation) => (
                <div
                  key={confirmation.id}
                  className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden">
                        {confirmation.user_profiles.profile_image_url ? (
                          <img
                            src={confirmation.user_profiles.profile_image_url}
                            alt={confirmation.user_profiles.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-semibold">
                            {confirmation.user_profiles.full_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {confirmation.user_profiles.full_name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Member since {formatDate(confirmation.user_profiles.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(confirmation.status)}`}>
                        {getStatusIcon(confirmation.status)}
                        <span className="capitalize">{confirmation.status}</span>
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Request Timeline</h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-bold text-xs">1</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Request Submitted</p>
                          <p className="text-xs text-gray-600">{formatDateTime(confirmation.created_at)}</p>
                        </div>
                      </div>
                      
                      {confirmation.confirmed_at && (
                        <div className="flex items-center space-x-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            confirmation.status === 'accepted' ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            <span className={`font-bold text-xs ${
                              confirmation.status === 'accepted' ? 'text-green-600' : 'text-red-600'
                            }`}>2</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Request {confirmation.status === 'accepted' ? 'Accepted' : 'Rejected'}
                            </p>
                            <p className="text-xs text-gray-600">{formatDateTime(confirmation.confirmed_at)}</p>
                          </div>
                        </div>
                      )}
                      
                      {confirmation.updated_at !== confirmation.created_at && (
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                            <span className="text-gray-600 font-bold text-xs">•</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Last Updated</p>
                            <p className="text-xs text-gray-600">{formatDateTime(confirmation.updated_at)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        onClose()
                        onStartChat(
                          confirmation.user_profiles.id,
                          confirmation.user_profiles.full_name,
                          ride,
                          trip
                        )
                      }}
                      className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      <MessageCircle size={16} />
                      <span>Chat with {confirmation.user_profiles.full_name}</span>
                    </button>

                    <div className="text-xs text-gray-500">
                      Request ID: {confirmation.id.slice(0, 8)}...
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with Ride/Trip Details */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {isCarRide && ride && (
              <>
                <div>
                  <p className="text-gray-600 mb-1">Route</p>
                  <div className="font-medium text-gray-900 flex items-center">
                    <MapPin size={14} className="mr-1 text-gray-400" />
                    {ride.from_location} → {ride.to_location}
                  </div>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Departure</p>
                  <div className="font-medium text-gray-900 flex items-center">
                    <Clock size={14} className="mr-1 text-gray-400" />
                    {formatDateTime(ride.departure_date_time)}
                  </div>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Price</p>
                  <div className="font-medium text-green-600">
                    {getCurrencySymbol(ride.currency || 'USD')}{ride.price}
                    {ride.negotiable && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-2">
                        Negotiable
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}

            {!isCarRide && trip && (
              <>
                <div>
                  <p className="text-gray-600 mb-1">Route</p>
                  <div className="font-medium text-gray-900">
                    {trip.leaving_airport} → {trip.destination_airport}
                  </div>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Travel Date</p>
                  <div className="font-medium text-gray-900 flex items-center">
                    <Calendar size={14} className="mr-1 text-gray-400" />
                    {formatDate(trip.travel_date)}
                  </div>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Service Price</p>
                  <div className="font-medium text-green-600">
                    {trip.price ? (
                      <>
                        {getCurrencySymbol(trip.currency || 'USD')}{trip.price}
                        {trip.negotiable && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-2">
                            Negotiable
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-500">Free Service</span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}