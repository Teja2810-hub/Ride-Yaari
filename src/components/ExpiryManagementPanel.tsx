import React, { useState, useEffect } from 'react'
import { Clock, AlertTriangle, RefreshCw, Trash2, CheckCircle, X, Calendar, Filter } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { checkConfirmationExpiry, batchExpireConfirmations, getConfirmationStats } from '../utils/confirmationHelpers'
import { RideConfirmation } from '../types'

interface ExpiryManagementPanelProps {
  onRefresh?: () => void
}

interface ExpiryInfo {
  confirmation: RideConfirmation
  isExpired: boolean
  timeUntilExpiry?: number
  expiryDate?: Date
  reason?: string
}

export default function ExpiryManagementPanel({ onRefresh }: ExpiryManagementPanelProps) {
  const { user } = useAuth()
  const [expiryData, setExpiryData] = useState<ExpiryInfo[]>([])
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    expiringSoon: 0,
    expired: 0
  })
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'expiring' | 'expired'>('all')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    if (user) {
      fetchExpiryData()
      
      // Auto-refresh every 2 minutes
      const interval = setInterval(fetchExpiryData, 2 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [user])

  const fetchExpiryData = async () => {
    if (!user) return

    setLoading(true)
    setError('')

    try {
      // Get all pending confirmations
      const { data: confirmations, error: fetchError } = await supabase
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
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      // Check expiry status for each confirmation
      const expiryPromises = (confirmations || []).map(async (confirmation) => {
        const expiry = await checkConfirmationExpiry(confirmation.id)
        return {
          confirmation,
          ...expiry
        }
      })

      const expiryResults = await Promise.all(expiryPromises)
      setExpiryData(expiryResults)

      // Calculate stats
      const total = expiryResults.length
      const expired = expiryResults.filter(e => e.isExpired).length
      const expiringSoon = expiryResults.filter(e => 
        !e.isExpired && e.timeUntilExpiry !== undefined && e.timeUntilExpiry <= 24
      ).length

      setStats({
        total,
        pending: total,
        expiringSoon,
        expired
      })

      setLastUpdate(new Date())
    } catch (error: any) {
      console.error('Error fetching expiry data:', error)
      setError('Failed to load expiry information')
    } finally {
      setLoading(false)
    }
  }

  const handleBatchExpire = async () => {
    setProcessing(true)
    
    try {
      const result = await batchExpireConfirmations()
      
      if (result.expired > 0) {
        alert(`Successfully expired ${result.expired} confirmations.`)
        if (onRefresh) onRefresh()
        await fetchExpiryData()
      } else {
        alert('No confirmations needed expiring.')
      }

      if (result.errors.length > 0) {
        console.error('Batch expire errors:', result.errors)
        alert(`Some errors occurred during batch processing. Check console for details.`)
      }
    } catch (error: any) {
      console.error('Error in batch expire:', error)
      alert('Failed to process expired confirmations.')
    } finally {
      setProcessing(false)
    }
  }

  const handleExpireSpecific = async (confirmationId: string) => {
    try {
      const { error } = await supabase
        .from('ride_confirmations')
        .update({
          status: 'rejected',
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', confirmationId)

      if (error) throw error

      alert('Confirmation expired successfully.')
      await fetchExpiryData()
      if (onRefresh) onRefresh()
    } catch (error: any) {
      console.error('Error expiring specific confirmation:', error)
      alert('Failed to expire confirmation.')
    }
  }

  const formatTimeRemaining = (hours: number) => {
    if (hours <= 0) return 'Expired'
    
    const wholeHours = Math.floor(hours)
    const minutes = Math.floor((hours % 1) * 60)
    
    if (wholeHours === 0) {
      return `${minutes}m`
    } else if (minutes === 0) {
      return `${wholeHours}h`
    } else {
      return `${wholeHours}h ${minutes}m`
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

  const getFilteredData = () => {
    switch (filter) {
      case 'expiring':
        return expiryData.filter(e => !e.isExpired && e.timeUntilExpiry !== undefined && e.timeUntilExpiry <= 24)
      case 'expired':
        return expiryData.filter(e => e.isExpired)
      default:
        return expiryData
    }
  }

  const filteredData = getFilteredData()

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading expiry information...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-center py-12">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchExpiryData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0 mb-6">
          <div className="flex items-center space-x-3">
            <Clock size={24} className="text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Confirmation Expiry Management</h2>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchExpiryData}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            
            {stats.expired > 0 && (
              <button
                onClick={handleBatchExpire}
                disabled={processing}
                className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Trash2 size={16} />
                <span>{processing ? 'Processing...' : `Expire ${stats.expired} Confirmations`}</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-blue-800">Total Pending</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.total - stats.expiringSoon - stats.expired}</div>
            <div className="text-sm text-green-800">Healthy</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.expiringSoon}</div>
            <div className="text-sm text-yellow-800">Expiring Soon</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
            <div className="text-sm text-red-800">Expired</div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center space-x-4">
          <Filter size={16} className="text-gray-400" />
          <div className="flex space-x-2">
            {[
              { key: 'all', label: 'All', count: expiryData.length },
              { key: 'expiring', label: 'Expiring Soon', count: stats.expiringSoon },
              { key: 'expired', label: 'Expired', count: stats.expired }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  filter === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-1 px-1 rounded-full text-xs ${
                    filter === tab.key
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {lastUpdate && (
          <p className="text-xs text-gray-500 mt-4">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Expiry List */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Pending Confirmations ({filteredData.length} shown)
        </h3>

        {filteredData.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {filter === 'expired' ? (
                <AlertTriangle size={32} className="text-red-400" />
              ) : filter === 'expiring' ? (
                <Clock size={32} className="text-yellow-400" />
              ) : (
                <CheckCircle size={32} className="text-green-400" />
              )}
            </div>
            <h4 className="text-xl font-semibold text-gray-900 mb-2">
              {filter === 'expired' ? 'No Expired Confirmations' :
               filter === 'expiring' ? 'No Expiring Confirmations' :
               'No Pending Confirmations'}
            </h4>
            <p className="text-gray-600">
              {filter === 'expired' ? 'All confirmations are current.' :
               filter === 'expiring' ? 'No confirmations are expiring soon.' :
               'No pending confirmations found.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredData.map((item) => {
              const { confirmation, isExpired, timeUntilExpiry, expiryDate } = item
              const ride = confirmation.car_rides
              const trip = confirmation.trips
              const passenger = confirmation.user_profiles
              const isOwner = confirmation.ride_owner_id === user?.id

              return (
                <div
                  key={confirmation.id}
                  className={`border rounded-xl p-6 transition-all ${
                    isExpired 
                      ? 'border-red-200 bg-red-50' 
                      : timeUntilExpiry !== undefined && timeUntilExpiry <= 6
                        ? 'border-orange-200 bg-orange-50'
                        : timeUntilExpiry !== undefined && timeUntilExpiry <= 24
                          ? 'border-yellow-200 bg-yellow-50'
                          : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden">
                        {passenger.profile_image_url ? (
                          <img
                            src={passenger.profile_image_url}
                            alt={passenger.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-semibold">
                            {passenger.full_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{passenger.full_name}</h3>
                        <p className="text-sm text-gray-600">
                          {isOwner ? 'Requesting to join your' : 'You requested to join'} {ride ? 'car ride' : 'airport trip'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {isExpired ? (
                        <div className="flex items-center space-x-2 bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                          <AlertTriangle size={14} />
                          <span>Expired</span>
                        </div>
                      ) : timeUntilExpiry !== undefined && timeUntilExpiry <= 6 ? (
                        <div className="flex items-center space-x-2 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                          <Clock size={14} />
                          <span>Expires in {formatTimeRemaining(timeUntilExpiry)}</span>
                        </div>
                      ) : timeUntilExpiry !== undefined && timeUntilExpiry <= 24 ? (
                        <div className="flex items-center space-x-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                          <Clock size={14} />
                          <span>Expires in {formatTimeRemaining(timeUntilExpiry)}</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                          <CheckCircle size={14} />
                          <span>Healthy</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ride/Trip Details */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    {ride && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Route</p>
                          <p className="font-medium text-gray-900">
                            {ride.from_location} → {ride.to_location}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Departure</p>
                          <p className="font-medium text-gray-900">
                            {formatDateTime(ride.departure_date_time)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Expiry Rule</p>
                          <p className="font-medium text-gray-900">2 hours before departure</p>
                        </div>
                      </div>
                    )}

                    {trip && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Route</p>
                          <p className="font-medium text-gray-900">
                            {trip.leaving_airport} → {trip.destination_airport}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Travel Date</p>
                          <p className="font-medium text-gray-900">
                            {formatDate(trip.travel_date)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Expiry Rule</p>
                          <p className="font-medium text-gray-900">4 hours before departure</p>
                        </div>
                      </div>
                    )}

                    {expiryDate && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600 mb-1">Request Created</p>
                            <p className="font-medium text-gray-900">{formatDateTime(confirmation.created_at)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">
                              {isExpired ? 'Expired At' : 'Expires At'}
                            </p>
                            <p className={`font-medium ${isExpired ? 'text-red-600' : 'text-yellow-600'}`}>
                              {formatDateTime(expiryDate.toISOString())}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Request ID: {confirmation.id.slice(0, 8)}...
                    </div>
                    
                    {isExpired && isOwner && (
                      <button
                        onClick={() => handleExpireSpecific(confirmation.id)}
                        className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors text-sm"
                      >
                        <Trash2 size={16} />
                        <span>Expire Now</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Expiry Rules Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-4">📋 Expiry Rules</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">🚗 Car Rides</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Pending requests expire <strong>2 hours</strong> before departure</li>
              <li>• Automatic cleanup prevents last-minute cancellations</li>
              <li>• Passengers are notified when requests expire</li>
              <li>• Expired requests are marked as "rejected"</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">✈️ Airport Trips</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Pending requests expire <strong>4 hours</strong> before departure</li>
              <li>• Longer window for airport coordination needs</li>
              <li>• Travelers are notified when requests expire</li>
              <li>• System automatically handles cleanup</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-blue-100 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>💡 Pro Tip:</strong> Respond to ride requests promptly to avoid automatic expiry. 
            The system helps maintain active and timely confirmations for better user experience.
          </p>
        </div>
      </div>
    </div>
  )
}