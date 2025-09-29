import React, { useState, useEffect } from 'react'
import { Check, X, MessageCircle, Car, Plane, Calendar, Clock, User, TriangleAlert as AlertTriangle, History, RotateCcw, RefreshCw, ListFilter as Filter, Search } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { RideConfirmation } from '../types'
import ConfirmationItem from './ConfirmationItem'
import { getCurrencySymbol } from '../utils/currencies'
import { formatDateSafe, formatDateTimeSafe } from '../utils/dateHelpers'

interface UserConfirmationsContentProps {
  onStartChat: (userId: string, userName: string, ride?: any, trip?: any) => void
}

type StatusFilter = 'all' | 'pending' | 'accepted' | 'rejected'
type SortOption = 'date-desc' | 'date-asc' | 'status'

export default function UserConfirmationsContent({ onStartChat }: UserConfirmationsContentProps) {
  const { user } = useAuth()
  const [confirmations, setConfirmations] = useState<RideConfirmation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
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
            user_id
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

  const filteredAndSortedConfirmations = () => {
    let filtered = confirmations.filter(confirmation => {
      // Status filter
      const statusMatch = statusFilter === 'all' || confirmation.status === statusFilter

      // Search filter
      const searchMatch = searchTerm === '' || 
        confirmation.user_profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (confirmation.car_rides?.from_location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (confirmation.car_rides?.to_location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (confirmation.trips?.leaving_airport || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (confirmation.trips?.destination_airport || '').toLowerCase().includes(searchTerm.toLowerCase())

      return statusMatch && searchMatch
    })

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

  const filteredConfirmations = filteredAndSortedConfirmations()
  const stats = getStats()

  return (
    <div>
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
          <div className="text-sm text-gray-600">Accepted</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          <div className="text-sm text-gray-600">Rejected</div>
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
                placeholder="Search by passenger name or location..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

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
            {confirmations.length === 0 ? 'No Confirmations Yet' : 'No Matching Confirmations'}
          </h3>
          <p className="text-gray-600">
            {confirmations.length === 0 
              ? 'Confirmations will appear here when you request rides or receive requests.'
              : 'Try adjusting your search or filter criteria.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredConfirmations.map((confirmation) => (
            <ConfirmationItem
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