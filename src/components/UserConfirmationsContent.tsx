import React, { useState, useEffect } from 'react'
import { Check, X, MessageCircle, Car, Plane, Calendar, Clock, User, TriangleAlert as AlertTriangle, History, RotateCcw, RefreshCw, ListFilter as Filter, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { RideConfirmation } from '../types'
import ConfirmationItem from './ConfirmationItem'
import { getCurrencySymbol } from '../utils/currencies'
import { formatDateSafe, formatDateTimeSafe } from '../utils/dateHelpers'

interface UserConfirmationsContentProps {
  onStartChat: (userId: string, userName: string, ride?: any, trip?: any) => void
}

type StatusFilter = 'pending' | 'accepted' | 'rejected'
type SortOption = 'date-desc' | 'date-asc' | 'status'

function CollapsibleConfirmationItem({ confirmation, onUpdate, onStartChat }: { confirmation: RideConfirmation, onUpdate: () => void, onStartChat: (userId: string, userName: string, ride?: any, trip?: any) => void }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { user } = useAuth()
  const ride = confirmation.car_rides
  const trip = confirmation.trips
  const passenger = confirmation.user_profiles
  const isCurrentUserOwner = confirmation.ride_owner_id === user?.id

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden">
              {passenger.profile_image_url ? (
                <img
                  src={passenger.profile_image_url}
                  alt={passenger.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-semibold text-sm">
                  {passenger.full_name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{passenger.full_name}</h3>
              <p className="text-sm text-gray-600">
                {ride ? `${ride.from_location} → ${ride.to_location}` : `${trip?.leaving_airport} → ${trip?.destination_airport}`}
              </p>
              <p className="text-xs text-gray-500">
                {ride ? formatDateTimeSafe(ride.departure_date_time) : formatDateSafe(trip?.travel_date || '')}
              </p>
              <p className="text-xs font-medium mt-1">
                {isCurrentUserOwner ? (
                  <span className={confirmation.status === 'accepted' ? 'text-green-600' : confirmation.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'}>
                    You {confirmation.status === 'accepted' ? 'accepted' : confirmation.status === 'rejected' ? 'rejected' : 'have a request from'} {passenger.full_name}
                  </span>
                ) : (
                  <span className={confirmation.status === 'accepted' ? 'text-green-600' : confirmation.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'}>
                    {confirmation.status === 'accepted' ? 'You were accepted' : confirmation.status === 'rejected' ? 'You were rejected' : 'Request pending'}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`text-xs px-2 py-1 rounded-full ${
              confirmation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              confirmation.status === 'accepted' ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800'
            }`}>
              {confirmation.status.charAt(0).toUpperCase() + confirmation.status.slice(1)}
            </span>
            {ride ? <Car size={16} className="text-green-600" /> : <Plane size={16} className="text-blue-600" />}
            {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <ConfirmationItem
            confirmation={confirmation}
            onUpdate={onUpdate}
            onStartChat={onStartChat}
          />
        </div>
      )}
    </div>
  )
}

export default function UserConfirmationsContent({ onStartChat }: UserConfirmationsContentProps) {
  const { user } = useAuth()
  const [confirmations, setConfirmations] = useState<RideConfirmation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<StatusFilter>('pending')
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (user) {
      fetchConfirmations()
      
      // Subscribe to confirmation changes
      const subscription = supabase
        .channel('user_confirmations')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ride_confirmations',
            filter: `or(ride_owner_id.eq.${user.id},passenger_id.eq.${user.id})`,
          },
          () => {
            fetchConfirmations()
          }
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [user])

  const fetchConfirmations = async () => {
    if (!user) return

    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase
        .from('ride_confirmations')
        .select(`
          *,
          user_profiles!ride_confirmations_passenger_id_fkey (
            id,
            full_name,
            profile_image_url,
            created_at
          ),
          car_rides!ride_confirmations_ride_id_fkey (
            id,
            from_location,
            to_location,
            departure_date_time,
            price,
            currency,
            negotiable,
            user_id,
            seats_available,
            total_seats
          ),
          trips!ride_confirmations_trip_id_fkey (
            id,
            leaving_airport,
            destination_airport,
            travel_date,
            departure_time,
            departure_timezone,
            landing_date,
            landing_time,
            landing_timezone,
            price,
            currency,
            negotiable,
            user_id
          )
        `)
        .or(`ride_owner_id.eq.${user.id},passenger_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (error) throw error

      setConfirmations(data || [])
    } catch (error: any) {
      console.error('Error fetching confirmations:', error)
      setError('Failed to load confirmations')
    } finally {
      setLoading(false)
    }
  }

  const getFilteredConfirmations = (status: StatusFilter) => {
    let filtered = confirmations.filter(confirmation => confirmation.status === status)

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(confirmation =>
        confirmation.user_profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (confirmation.car_rides?.from_location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (confirmation.car_rides?.to_location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (confirmation.trips?.leaving_airport || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (confirmation.trips?.destination_airport || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'date-desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'status':
          const statusOrder = { 'pending': 0, 'accepted': 1, 'rejected': 2 }
          const statusDiff = statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder]
          if (statusDiff !== 0) return statusDiff
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        default:
          return 0
      }
    })

    return filtered
  }

  const getStats = () => {
    const total = confirmations.length
    const pending = confirmations.filter(c => c.status === 'pending').length
    const accepted = confirmations.filter(c => c.status === 'accepted').length
    const rejected = confirmations.filter(c => c.status === 'rejected').length

    return { total, pending, accepted, rejected }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading confirmations...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchConfirmations}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  const stats = getStats()
  const filteredConfirmations = getFilteredConfirmations(activeTab)

  return (
    <div>
      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div 
          onClick={() => setActiveTab('pending')}
          className={`rounded-lg p-4 text-center cursor-pointer transition-colors ${
            activeTab === 'pending' ? 'bg-yellow-100 border-2 border-yellow-500' : 'bg-yellow-50 border border-yellow-200 hover:bg-yellow-100'
          }`}
        >
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-sm text-yellow-800">Pending</div>
        </div>
        <div 
          onClick={() => setActiveTab('accepted')}
          className={`rounded-lg p-4 text-center cursor-pointer transition-colors ${
            activeTab === 'accepted' ? 'bg-green-100 border-2 border-green-500' : 'bg-green-50 border border-green-200 hover:bg-green-100'
          }`}
        >
          <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
          <div className="text-sm text-green-800">Accepted</div>
        </div>
        <div 
          onClick={() => setActiveTab('rejected')}
          className={`rounded-lg p-4 text-center cursor-pointer transition-colors ${
            activeTab === 'rejected' ? 'bg-red-100 border-2 border-red-500' : 'bg-red-50 border border-red-200 hover:bg-red-100'
          }`}
        >
          <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          <div className="text-sm text-red-800">Rejected</div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 sm:mb-0">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Confirmations ({filteredConfirmations.length})
          </h3>
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
                placeholder="Search by passenger name or location..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="status">By Status</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Confirmations List */}
      {filteredConfirmations.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle size={32} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No {activeTab} Confirmations
          </h3>
          <p className="text-gray-600">
            {searchTerm
              ? 'No confirmations match your search criteria.'
              : `You don't have any ${activeTab} confirmations yet.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredConfirmations.map((confirmation) => (
            <CollapsibleConfirmationItem
              key={confirmation.id}
              confirmation={confirmation}
              onUpdate={fetchConfirmations}
              onStartChat={onStartChat}
            />
          ))}
        </div>
      )}

      {/* Information Panel */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-4">📋 About Confirmations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">🚗 As a Driver/Traveler</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Review and respond to passenger requests</li>
              <li>• Accept or reject requests based on your preferences</li>
              <li>• Manage confirmed passengers for your rides/trips</li>
              <li>• Cancel confirmed rides if necessary</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">👥 As a Passenger</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Track your ride/trip requests</li>
              <li>• See acceptance/rejection status</li>
              <li>• Request again after rejections (with cooldown)</li>
              <li>• Cancel your own pending requests</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}