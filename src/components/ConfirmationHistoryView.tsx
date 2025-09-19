import React, { useState, useEffect } from 'react'
import { Calendar, Clock, User, Filter, Search, Download, Eye } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { RideConfirmation } from '../types'

interface ConfirmationHistoryViewProps {
  onStartChat: (userId: string, userName: string, ride?: any, trip?: any) => void
}

type DateRange = 'all' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
type ViewMode = 'summary' | 'detailed'

export default function ConfirmationHistoryView({ onStartChat }: ConfirmationHistoryViewProps) {
  const { user } = useAuth()
  const [confirmations, setConfirmations] = useState<RideConfirmation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dateRange, setDateRange] = useState<DateRange>('month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('summary')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (user) {
      fetchConfirmationHistory()
    }
  }, [user, dateRange, customStartDate, customEndDate])

  const getDateRangeFilter = () => {
    const now = new Date()
    let startDate: Date

    switch (dateRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3
        startDate = new Date(now.getFullYear(), quarterStart, 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      case 'custom':
        if (customStartDate) {
          startDate = new Date(customStartDate)
        } else {
          return null
        }
        break
      default:
        return null
    }

    const endDate = dateRange === 'custom' && customEndDate 
      ? new Date(customEndDate) 
      : now

    return { startDate, endDate }
  }

  const fetchConfirmationHistory = async () => {
    if (!user) return

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
            profile_image_url
          ),
          car_rides!ride_confirmations_ride_id_fkey (
            id,
            from_location,
            to_location,
            departure_date_time,
            price,
            currency
          ),
          trips!ride_confirmations_trip_id_fkey (
            id,
            leaving_airport,
            destination_airport,
            travel_date,
            price,
            currency
          )
        `)
        .or(`ride_owner_id.eq.${user.id},passenger_id.eq.${user.id}`)

      // Apply date range filter
      const dateFilter = getDateRangeFilter()
      if (dateFilter) {
        query = query
          .gte('created_at', dateFilter.startDate.toISOString())
          .lte('created_at', dateFilter.endDate.toISOString())
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      setConfirmations(data || [])
    } catch (error: any) {
      console.error('Error fetching confirmation history:', error)
      setError('Failed to load confirmation history')
    } finally {
      setLoading(false)
    }
  }

  const filteredConfirmations = confirmations.filter(confirmation =>
    confirmation.user_profiles.full_name
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  )

  const getAnalytics = () => {
    const total = filteredConfirmations.length
    const asOwner = filteredConfirmations.filter(c => c.ride_owner_id === user?.id).length
    const asPassenger = filteredConfirmations.filter(c => c.passenger_id === user?.id).length
    const accepted = filteredConfirmations.filter(c => c.status === 'accepted').length
    const rejected = filteredConfirmations.filter(c => c.status === 'rejected').length
    const pending = filteredConfirmations.filter(c => c.status === 'pending').length
    const carRides = filteredConfirmations.filter(c => c.ride_id).length
    const airportTrips = filteredConfirmations.filter(c => c.trip_id).length

    const acceptanceRate = total > 0 ? ((accepted / total) * 100).toFixed(1) : '0'

    return {
      total,
      asOwner,
      asPassenger,
      accepted,
      rejected,
      pending,
      carRides,
      airportTrips,
      acceptanceRate
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

  const exportData = () => {
    const csvData = filteredConfirmations.map(confirmation => ({
      'Date': new Date(confirmation.created_at).toLocaleDateString(),
      'Passenger': confirmation.user_profiles.full_name,
      'Type': confirmation.ride_id ? 'Car Ride' : 'Airport Trip',
      'Route': confirmation.car_rides 
        ? `${confirmation.car_rides.from_location} → ${confirmation.car_rides.to_location}`
        : `${confirmation.trips?.leaving_airport} → ${confirmation.trips?.destination_airport}`,
      'Status': confirmation.status,
      'Role': confirmation.ride_owner_id === user?.id ? 'Owner' : 'Passenger',
      'Confirmed At': confirmation.confirmed_at ? new Date(confirmation.confirmed_at).toLocaleDateString() : 'N/A'
    }))

    const csvContent = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rideyaari-confirmations-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading confirmation history...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchConfirmationHistory}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  const analytics = getAnalytics()

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0 mb-6">
          <h2 className="text-xl font-bold text-gray-900">Confirmation History & Analytics</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setViewMode(viewMode === 'summary' ? 'detailed' : 'summary')}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Eye size={16} />
              <span>{viewMode === 'summary' ? 'Detailed View' : 'Summary View'}</span>
            </button>
            {filteredConfirmations.length > 0 && (
              <button
                onClick={exportData}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download size={16} />
                <span>Export CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Date Range and Search */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="all">All Time</option>
              <option value="week">Last 7 Days</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {dateRange === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search passengers..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Analytics Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{analytics.total}</div>
            <div className="text-xs text-blue-800">Total</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{analytics.asOwner}</div>
            <div className="text-xs text-green-800">As Owner</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{analytics.asPassenger}</div>
            <div className="text-xs text-purple-800">As Passenger</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{analytics.pending}</div>
            <div className="text-xs text-yellow-800">Pending</div>
          </div>
          <div className="bg-emerald-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{analytics.accepted}</div>
            <div className="text-xs text-emerald-800">Accepted</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{analytics.rejected}</div>
            <div className="text-xs text-red-800">Rejected</div>
          </div>
          <div className="bg-indigo-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">{analytics.acceptanceRate}%</div>
            <div className="text-xs text-indigo-800">Accept Rate</div>
          </div>
          <div className="bg-teal-50 rounded-lg p-4 text-center">
            <div className="text-lg font-bold text-teal-600">{analytics.carRides}/{analytics.airportTrips}</div>
            <div className="text-xs text-teal-800">Car/Airport</div>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Confirmation History ({filteredConfirmations.length} records)
        </h3>

        {filteredConfirmations.length === 0 ? (
          <div className="text-center py-12">
            <Calendar size={48} className="text-gray-400 mx-auto mb-4" />
            <h4 className="text-xl font-semibold text-gray-900 mb-2">No History Found</h4>
            <p className="text-gray-600">
              {searchTerm ? 'No confirmations match your search.' : 'No confirmations in the selected date range.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredConfirmations.map((confirmation) => (
              <div
                key={confirmation.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                {viewMode === 'summary' ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {confirmation.user_profiles.full_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{confirmation.user_profiles.full_name}</p>
                        <p className="text-sm text-gray-600">
                          {confirmation.ride_id ? 'Car Ride' : 'Airport Trip'} • 
                          {confirmation.ride_owner_id === user?.id ? ' You as Owner' : ' You as Passenger'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        confirmation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        confirmation.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {confirmation.status}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(confirmation.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden">
                          {confirmation.user_profiles.profile_image_url ? (
                            <img
                              src={confirmation.user_profiles.profile_image_url}
                              alt={confirmation.user_profiles.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-white font-medium">
                              {confirmation.user_profiles.full_name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{confirmation.user_profiles.full_name}</h4>
                          <p className="text-sm text-gray-600">
                            {confirmation.ride_owner_id === user?.id ? 'Requested to join your' : 'You requested to join'} {confirmation.ride_id ? 'car ride' : 'airport trip'}
                          </p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        confirmation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        confirmation.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {confirmation.status}
                      </span>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-gray-600">Route</p>
                          <p className="font-medium text-gray-900">
                            {confirmation.car_rides 
                              ? `${confirmation.car_rides.from_location} → ${confirmation.car_rides.to_location}`
                              : `${confirmation.trips?.leaving_airport} → ${confirmation.trips?.destination_airport}`
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Requested</p>
                          <p className="font-medium text-gray-900">{formatDateTime(confirmation.created_at)}</p>
                        </div>
                        {confirmation.confirmed_at && (
                          <div>
                            <p className="text-gray-600">{confirmation.status === 'accepted' ? 'Accepted' : 'Rejected'}</p>
                            <p className="font-medium text-gray-900">{formatDateTime(confirmation.confirmed_at)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}