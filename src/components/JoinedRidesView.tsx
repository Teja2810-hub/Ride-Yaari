import React, { useState } from 'react'
import { ArrowLeft, Car, User, Calendar, Clock, MapPin, MessageCircle, Check, X, AlertTriangle, Filter, Search, Navigation } from 'lucide-react'
import { RideConfirmation } from '../types'
import { getCurrencySymbol } from '../utils/currencies'

interface JoinedRidesViewProps {
  joinedRides: RideConfirmation[]
  onBack: () => void
  onStartChat: (userId: string, userName: string, ride?: any, trip?: any) => void
  onRefresh: () => void
}

type StatusFilter = 'all' | 'pending' | 'accepted' | 'rejected'
type SortOption = 'date-desc' | 'date-asc' | 'status' | 'destination'

export default function JoinedRidesView({ joinedRides, onBack, onStartChat, onRefresh }: JoinedRidesViewProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)

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

  const filteredAndSortedRides = () => {
    let filtered = joinedRides.filter(confirmation => {
      const ride = confirmation.car_rides
      if (!ride) return false

      // Status filter
      const statusMatch = statusFilter === 'all' || confirmation.status === statusFilter

      // Search filter (by location or driver name)
      const searchMatch = searchTerm === '' || 
        ride.from_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ride.to_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (confirmation.user_profiles?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())

      return statusMatch && searchMatch
    })

    // Apply sorting
    filtered.sort((a, b) => {
      const rideA = a.car_rides!
      const rideB = b.car_rides!

      switch (sortBy) {
        case 'date-asc':
          return new Date(rideA.departure_date_time).getTime() - new Date(rideB.departure_date_time).getTime()
        case 'date-desc':
          return new Date(rideB.departure_date_time).getTime() - new Date(rideA.departure_date_time).getTime()
        case 'status':
          const statusOrder = { 'pending': 0, 'accepted': 1, 'rejected': 2 }
          const statusDiff = statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder]
          if (statusDiff !== 0) return statusDiff
          return new Date(rideB.departure_date_time).getTime() - new Date(rideA.departure_date_time).getTime()
        case 'destination':
          return rideA.to_location.localeCompare(rideB.to_location)
        default:
          return 0
      }
    })

    return filtered
  }

  const getStats = () => {
    const total = joinedRides.length
    const pending = joinedRides.filter(c => c.status === 'pending').length
    const accepted = joinedRides.filter(c => c.status === 'accepted').length
    const rejected = joinedRides.filter(c => c.status === 'rejected').length

    return { total, pending, accepted, rejected }
  }

  const filteredRides = filteredAndSortedRides()
  const stats = getStats()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Rides You've Joined</h2>
        </div>
        <span className="text-gray-600">{filteredRides.length} of {joinedRides.length} ride{joinedRides.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-sm text-gray-600">Pending</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
          <div className="text-sm text-gray-600">Confirmed</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          <div className="text-sm text-gray-600">Declined</div>
        </div>
      </div>

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
                placeholder="Search by location or driver name..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Confirmed</option>
                  <option value="rejected">Declined</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                >
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="status">By Status</option>
                  <option value="destination">By Destination</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rides List */}
      {filteredRides.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Car size={32} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {joinedRides.length === 0 ? 'No Rides Joined Yet' : 'No Matching Rides'}
          </h3>
          <p className="text-gray-600">
            {joinedRides.length === 0 
              ? 'You haven\'t joined any car rides yet. Start by finding and requesting rides!'
              : 'Try adjusting your search or filter criteria.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRides.map((confirmation) => {
            const ride = confirmation.car_rides!
            const driver = confirmation.user_profiles

            return (
              <div
                key={confirmation.id}
                className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center overflow-hidden">
                      {driver?.profile_image_url ? (
                        <img
                          src={driver.profile_image_url}
                          alt={driver.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-semibold">
                          {(driver?.full_name || 'D').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {driver?.full_name || 'Unknown Driver'}
                      </h3>
                      <p className="text-sm text-gray-600">Driver</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(confirmation.status)}`}>
                      {getStatusIcon(confirmation.status)}
                      <span className="capitalize">{confirmation.status}</span>
                    </div>
                    <Car size={20} className="text-green-600" />
                  </div>
                </div>

                {/* Ride Details */}
                <div className="bg-green-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">From</p>
                      <div className="font-medium text-gray-900 flex items-center">
                        <MapPin size={14} className="mr-1 text-gray-400" />
                        {ride.from_location}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">To</p>
                      <div className="font-medium text-gray-900 flex items-center">
                        <MapPin size={14} className="mr-1 text-gray-400" />
                        {ride.to_location}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Departure</p>
                      <div className="font-medium text-gray-900 flex items-center">
                        <Clock size={14} className="mr-1 text-gray-400" />
                        {formatDateTime(ride.departure_date_time)}
                      </div>
                    </div>
                  </div>

                  {ride.intermediate_stops && ride.intermediate_stops.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-green-200">
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

                  <div className="mt-3 pt-3 border-t border-green-200">
                    <span className="text-sm font-medium text-green-600">
                      Price: {getCurrencySymbol(ride.currency || 'USD')}{ride.price} per passenger
                      {ride.negotiable && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-2">
                          Negotiable
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Request Timeline */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Request Timeline</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-bold text-xs">1</span>
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
                            Request {confirmation.status === 'accepted' ? 'Accepted' : 'Declined'}
                          </p>
                          <p className="text-xs text-gray-600">{formatDateTime(confirmation.confirmed_at)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => onStartChat(
                      confirmation.ride_owner_id,
                      driver?.full_name || 'Driver',
                      ride,
                      undefined
                    )}
                    className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium transition-colors"
                  >
                    <MessageCircle size={16} />
                    <span>Chat with {driver?.full_name || 'Driver'}</span>
                  </button>

                  <div className="text-xs text-gray-500">
                    Request ID: {confirmation.id.slice(0, 8)}...
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Summary Information */}
      <div className="mt-8 bg-green-50 border border-green-200 rounded-xl p-6">
        <h3 className="font-semibold text-green-900 mb-4">📊 Your Ride Activity</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-green-900 mb-2">🚗 Ride Statistics</h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• Total rides joined: <strong>{stats.total}</strong></li>
              <li>• Confirmed rides: <strong>{stats.accepted}</strong></li>
              <li>• Success rate: <strong>{stats.total > 0 ? Math.round((stats.accepted / stats.total) * 100) : 0}%</strong></li>
              <li>• Pending requests: <strong>{stats.pending}</strong></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-green-900 mb-2">🛣️ Travel Insights</h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• Most common destination: <strong>{getMostCommonDestination()}</strong></li>
              <li>• Upcoming rides: <strong>{getUpcomingRidesCount()}</strong></li>
              <li>• Recent activity: <strong>{getRecentActivityCount()}</strong></li>
              <li>• Total savings estimate: <strong>{getTotalSavingsEstimate()}</strong></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )

  function getMostCommonDestination(): string {
    if (joinedRides.length === 0) return 'None'
    
    const destinations = joinedRides
      .map(c => c.car_rides?.to_location)
      .filter(Boolean) as string[]
    
    const counts = destinations.reduce((acc, dest) => {
      acc[dest] = (acc[dest] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const mostCommon = Object.entries(counts).sort(([,a], [,b]) => b - a)[0]
    return mostCommon ? mostCommon[0] : 'None'
  }

  function getUpcomingRidesCount(): number {
    const now = new Date()
    return joinedRides.filter(c => {
      const ride = c.car_rides
      return ride && new Date(ride.departure_date_time) > now && c.status === 'accepted'
    }).length
  }

  function getRecentActivityCount(): number {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return joinedRides.filter(c => new Date(c.created_at) > weekAgo).length
  }

  function getTotalSavingsEstimate(): string {
    const acceptedRides = joinedRides.filter(c => c.status === 'accepted' && c.car_rides)
    if (acceptedRides.length === 0) return '$0'
    
    const totalSavings = acceptedRides.reduce((sum, c) => {
      const ride = c.car_rides!
      // Estimate savings as the ride price (what they would have paid for gas/transport)
      return sum + ride.price
    }, 0)
    
    return `$${totalSavings.toFixed(0)}`
  }
}