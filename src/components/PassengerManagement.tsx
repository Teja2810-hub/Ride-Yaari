import React, { useState, useEffect } from 'react'
import { Users, Check, X, MessageCircle, TriangleAlert as AlertTriangle, Clock, User, Search, ListFilter as Filter } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { RideConfirmation, CarRide, Trip } from '../types'
import DisclaimerModal from './DisclaimerModal'
import { notificationService } from '../utils/notificationService'
import { getUserDisplayName } from '../utils/messageTemplates'
import { formatDateSafe, formatDateTimeSafe } from '../utils/dateHelpers'

interface PassengerManagementProps {
  ride?: CarRide
  trip?: Trip
  onStartChat: (userId: string, userName: string, ride?: CarRide, trip?: Trip) => void
  onUpdate?: () => void
}

type ActionType = 'accept' | 'reject' | 'cancel'

export default function PassengerManagement({ ride, trip, onStartChat, onUpdate }: PassengerManagementProps) {
  const { user } = useAuth()
  const [confirmations, setConfirmations] = useState<RideConfirmation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [disclaimerAction, setDisclaimerAction] = useState<ActionType>('accept')
  const [selectedConfirmation, setSelectedConfirmation] = useState<RideConfirmation | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState<{
    show: boolean
    type: ActionType
    confirmation: RideConfirmation | null
  }>({ show: false, type: 'accept', confirmation: null })

  const sendEnhancedSystemMessage = async (
    action: 'accept' | 'reject' | 'cancel',
    userRole: 'owner' | 'passenger',
    senderId: string,
    receiverId: string,
    confirmation: RideConfirmation
  ) => {
    try {
      await notificationService.sendEnhancedSystemMessage(
        action,
        userRole,
        senderId,
        receiverId,
        ride,
        trip,
        `Passenger: ${confirmation.user_profiles.full_name}, Confirmation ID: ${confirmation.id}`
      )
    } catch (error) {
      console.error('Error sending enhanced system message:', error)
    }
  }
  useEffect(() => {
    if (ride || trip) {
      fetchConfirmations()
      
      // Subscribe to confirmation changes
      const subscription = supabase
        .channel('passenger_management')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ride_confirmations',
            filter: ride ? `ride_id=eq.${ride.id}` : `trip_id=eq.${trip?.id}`,
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
  }, [ride, trip])

  const fetchConfirmations = async () => {
    if (!user || (!ride && !trip)) return

    console.log('PassengerManagement: Fetching confirmations for:', { rideId: ride?.id, tripId: trip?.id, userId: user.id })
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
            created_at,
            age,
            gender
          )
        `)

      if (ride) {
        query = query.eq('ride_id', ride.id)
      } else if (trip) {
        query = query.eq('trip_id', trip.id)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      console.log('PassengerManagement: Fetched confirmations:', data?.length || 0)
      setConfirmations(data || [])
    } catch (error: any) {
      console.error('Error fetching confirmations:', error)
      setError('Failed to load passenger information')
    } finally {
      setLoading(false)
    }
  }

  const sendSystemMessage = async (message: string, senderId: string, receiverId: string) => {
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        message_content: message,
        message_type: 'system',
        is_read: false
      })
    
    if (error) {
      console.error('Error sending system message:', error)
    }
  }

  const getRideOrTripDetails = (): string => {
    if (ride) {
      return `car ride from ${ride.from_location} to ${ride.to_location} on ${new Date(ride.departure_date_time).toLocaleDateString()}`
    }
    if (trip) {
      const [year, month, day] = trip.travel_date.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      return `airport trip from ${trip.leaving_airport} to ${trip.destination_airport} on ${date.toLocaleDateString()}`
    }
    return 'ride'
  }

  const handleAction = (action: ActionType, confirmation: RideConfirmation) => {
    setShowConfirmModal({ show: true, type: action, confirmation })
  }

  const handleConfirmModalAction = async () => {
    if (!user || !showConfirmModal.confirmation) return

    setShowConfirmModal({ show: false, type: 'accept', confirmation: null })
    setActionLoading(showConfirmModal.confirmation.id)

    try {
      let newStatus: string

      switch (showConfirmModal.type) {
        case 'accept':
          newStatus = 'accepted'
          break
        case 'reject':
          newStatus = 'rejected'
          break
        case 'cancel':
          newStatus = 'rejected'
          break
        default:
          throw new Error('Invalid action')
      }

      const { error } = await supabase
        .from('ride_confirmations')
        .update({
          status: newStatus,
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', showConfirmModal.confirmation.id)

      if (error) throw error

      // Create persistent notification for passenger
      const action = showConfirmModal.type === 'cancel' ? 'cancel' : showConfirmModal.type
      const ride = showConfirmModal.confirmation.car_rides
      const trip = showConfirmModal.confirmation.trips

      const rideDetails = ride
        ? `${ride.from_location} → ${ride.to_location}`
        : trip
          ? `${trip.leaving_airport} → ${trip.destination_airport}`
          : 'ride'

      let title = ''
      let message = ''

      if (action === 'accept') {
        title = '🎉 Ride Confirmed!'
        message = `Your request for the ${rideDetails} has been accepted! Coordinate pickup details now.`
      } else if (action === 'reject') {
        title = '😔 Request Declined'
        message = `Your request for the ${rideDetails} was declined. You can request again or find other rides.`
      } else if (action === 'cancel') {
        title = '🚫 Ride Cancelled'
        message = `Your confirmed ride for ${rideDetails} has been cancelled by the driver.`
      }

      await supabase
        .from('user_notifications')
        .insert({
          user_id: showConfirmModal.confirmation.passenger_id,
          notification_type: 'confirmation_update',
          title,
          message,
          priority: 'high',
          is_read: false,
          related_user_id: user.id,
          action_data: {
            confirmation_id: showConfirmModal.confirmation.id,
            ride_id: showConfirmModal.confirmation.ride_id,
            trip_id: showConfirmModal.confirmation.trip_id
          }
        })

      console.log('PassengerManagement: Action completed, refreshing data')
      fetchConfirmations()
      if (onUpdate) onUpdate()
    } catch (error: any) {
      console.error(`Error ${showConfirmModal.type}ing request:`, error)
      setError(`Failed to ${showConfirmModal.type} request. Please try again.`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleConfirmAction = async () => {
    if (!user || !selectedConfirmation) return

    setShowDisclaimer(false)
    setActionLoading(selectedConfirmation.id)

    try {
      let newStatus: string
      let template: any

      switch (disclaimerAction) {
        case 'accept':
          newStatus = 'accepted'
          break
        case 'reject':
          newStatus = 'rejected'
          break
        case 'cancel':
          newStatus = 'rejected'
          break
        default:
          throw new Error('Invalid action')
      }

      const { error } = await supabase
        .from('ride_confirmations')
        .update({
          status: newStatus,
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedConfirmation.id)

      if (error) throw error

      // Create persistent notification for passenger
      const action = disclaimerAction === 'cancel' ? 'cancel' : disclaimerAction
      const ride = selectedConfirmation.car_rides
      const trip = selectedConfirmation.trips

      const rideDetails = ride
        ? `${ride.from_location} → ${ride.to_location}`
        : trip
          ? `${trip.leaving_airport} → ${trip.destination_airport}`
          : 'ride'

      let title = ''
      let message = ''

      if (action === 'accept') {
        title = '🎉 Ride Confirmed!'
        message = `Your request for the ${rideDetails} has been accepted! Coordinate pickup details now.`
      } else if (action === 'reject') {
        title = '😔 Request Declined'
        message = `Your request for the ${rideDetails} was declined. You can request again or find other rides.`
      } else if (action === 'cancel') {
        title = '🚫 Ride Cancelled'
        message = `Your confirmed ride for ${rideDetails} has been cancelled by the driver.`
      }

      await supabase
        .from('user_notifications')
        .insert({
          user_id: selectedConfirmation.passenger_id,
          notification_type: 'confirmation_update',
          title,
          message,
          priority: 'high',
          is_read: false,
          related_user_id: user.id,
          action_data: {
            confirmation_id: selectedConfirmation.id,
            ride_id: selectedConfirmation.ride_id,
            trip_id: selectedConfirmation.trip_id
          }
        })

      fetchConfirmations()
      if (onUpdate) onUpdate()
    } catch (error: any) {
      console.error(`Error ${disclaimerAction}ing request:`, error)
      alert(`Failed to ${disclaimerAction} request. Please try again.`)
    } finally {
      setActionLoading(null)
    }
  }

  const getDisclaimerContent = (action: ActionType) => {
    const rideDetails = getRideOrTripDetails()
    
    switch (action) {
      case 'accept':
        return {
          title: 'Accept Passenger Request',
          points: [
            'This will confirm the passenger for your ride',
            'The passenger will be notified of your acceptance',
            'You are committing to provide the ride as discussed',
            'Make sure you have agreed on pickup details and payment',
            'Once accepted, both parties are committed to the arrangement'
          ],
          explanation: `You are accepting a passenger for the ${rideDetails}. This is a commitment to provide the ride as discussed.`
        }
      case 'reject':
        return {
          title: 'Reject Passenger Request',
          points: [
            'This will decline the passenger\'s request',
            'The passenger will be notified of your decision',
            'The passenger can request again if they wish',
            'Consider explaining your reason in chat',
            'This action can be reversed if you change your mind'
          ],
          explanation: `You are rejecting a request for the ${rideDetails}. The passenger will be able to request again.`
        }
      case 'cancel':
        return {
          title: 'Cancel Confirmed Passenger',
          points: [
            'This will remove the passenger from your confirmed ride',
            'The passenger will be notified immediately',
            'This may affect your reputation on the platform',
            'Consider discussing the reason in chat first',
            'This should only be done if absolutely necessary'
          ],
          explanation: `You are removing a confirmed passenger from the ${rideDetails}. This should only be done if absolutely necessary.`
        }
      default:
        return {
          title: 'Confirm Action',
          points: ['Please confirm this action'],
          explanation: 'This action cannot be undone.'
        }
    }
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

  const filteredConfirmations = confirmations.filter(confirmation => {
    const matchesSearch = confirmation.user_profiles.full_name
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || confirmation.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const getStats = () => {
    const total = confirmations.length
    const pending = confirmations.filter(c => c.status === 'pending').length
    const accepted = confirmations.filter(c => c.status === 'accepted').length
    const rejected = confirmations.filter(c => c.status === 'rejected').length

    return { total, pending, accepted, rejected }
  }

  const stats = getStats()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading passenger information...</p>
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

  return (
    <>
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Requests</div>
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

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search passengers by name..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Passenger List */}
        {filteredConfirmations.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm || statusFilter !== 'all' ? 'No Matching Passengers' : 'No Passenger Requests'}
            </h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'No one has requested to join this ride yet.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredConfirmations.map((confirmation) => (
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
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        {confirmation.user_profiles.age && (
                          <span>Age: {confirmation.user_profiles.age}</span>
                        )}
                        {confirmation.user_profiles.gender && (
                          <span className="capitalize">{confirmation.user_profiles.gender}</span>
                        )}
                        <span>Member since {formatDateSafe(confirmation.user_profiles.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(confirmation.status)}`}>
                      {getStatusIcon(confirmation.status)}
                      <span className="capitalize">{confirmation.status}</span>
                    </div>
                  </div>
                </div>

                {/* Request Details */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 mb-1">Request Submitted</p>
                      <p className="font-medium text-gray-900">{formatDateTimeSafe(confirmation.created_at)}</p>
                    </div>
                    {confirmation.confirmed_at && (
                      <div>
                        <p className="text-gray-600 mb-1">
                          {confirmation.status === 'accepted' ? 'Accepted' : 'Rejected'} On
                        </p>
                        <p className="font-medium text-gray-900">{formatDateTimeSafe(confirmation.confirmed_at)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => onStartChat(
                      confirmation.user_profiles.id,
                      confirmation.user_profiles.full_name,
                      ride,
                      trip
                    )}
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    <MessageCircle size={16} />
                    <span>Chat with {confirmation.user_profiles.full_name}</span>
                  </button>

                  <div className="flex items-center space-x-3">
                    {confirmation.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleAction('reject', confirmation)}
                          disabled={actionLoading === confirmation.id}
                          className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
                        >
                          <X size={16} />
                          <span>Reject</span>
                        </button>
                        <button
                          onClick={() => handleAction('accept', confirmation)}
                          disabled={actionLoading === confirmation.id}
                          className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
                        >
                          <Check size={16} />
                          <span>Accept</span>
                        </button>
                      </>
                    )}

                    {confirmation.status === 'accepted' && (
                      <button
                        onClick={() => handleAction('cancel', confirmation)}
                        disabled={actionLoading === confirmation.id}
                        className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
                      >
                        <AlertTriangle size={16} />
                        <span>Remove Passenger</span>
                      </button>
                    )}

                    {actionLoading === confirmation.id && (
                      <div className="flex items-center space-x-2 text-gray-500">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                        <span className="text-sm">Processing...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Custom Confirmation Modal */}
      {showConfirmModal.show && showConfirmModal.confirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                showConfirmModal.type === 'accept' ? 'bg-green-100' :
                showConfirmModal.type === 'reject' ? 'bg-red-100' :
                'bg-orange-100'
              }`}>
                {showConfirmModal.type === 'accept' ? (
                  <Check size={32} className="text-green-600" />
                ) : showConfirmModal.type === 'reject' ? (
                  <X size={32} className="text-red-600" />
                ) : (
                  <AlertTriangle size={32} className="text-orange-600" />
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {showConfirmModal.type === 'accept' ? 'Accept Request' :
                 showConfirmModal.type === 'reject' ? 'Reject Request' :
                 'Cancel Ride'}
              </h2>
              <p className="text-gray-600">
                {showConfirmModal.type === 'accept' 
                  ? `Accept ${showConfirmModal.confirmation.user_profiles.full_name}'s request?`
                  : showConfirmModal.type === 'reject'
                    ? `Reject ${showConfirmModal.confirmation.user_profiles.full_name}'s request?`
                    : `Cancel the confirmed ride with ${showConfirmModal.confirmation.user_profiles.full_name}?`
                }
              </p>
            </div>
            
            <div className={`border rounded-lg p-4 mb-6 ${
              showConfirmModal.type === 'accept' ? 'bg-green-50 border-green-200' :
              showConfirmModal.type === 'reject' ? 'bg-red-50 border-red-200' :
              'bg-orange-50 border-orange-200'
            }`}>
              <h4 className={`font-semibold mb-2 ${
                showConfirmModal.type === 'accept' ? 'text-green-900' :
                showConfirmModal.type === 'reject' ? 'text-red-900' :
                'text-orange-900'
              }`}>
                {showConfirmModal.type === 'cancel' ? 'Warning:' : 'This will:'}
              </h4>
              <ul className={`text-sm space-y-1 ${
                showConfirmModal.type === 'accept' ? 'text-green-800' :
                showConfirmModal.type === 'reject' ? 'text-red-800' :
                'text-orange-800'
              }`}>
                {showConfirmModal.type === 'accept' ? (
                  <>
                    <li>• Confirm the passenger for your ride</li>
                    <li>• Notify the passenger of acceptance</li>
                    <li>• Create a commitment to provide the ride</li>
                  </>
                ) : showConfirmModal.type === 'reject' ? (
                  <>
                    <li>• Decline the passenger's request</li>
                    <li>• Notify the passenger of your decision</li>
                    <li>• Allow the passenger to request again</li>
                  </>
                ) : (
                  <>
                    <li>• Remove the passenger from your ride</li>
                    <li>• Notify the passenger immediately</li>
                    <li>• This may affect your reputation</li>
                  </>
                )}
              </ul>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmModal({ show: false, type: 'accept', confirmation: null })}
                className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmModalAction}
                disabled={isLoading}
                className={`flex-1 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                  showConfirmModal.type === 'accept' ? 'bg-green-600 hover:bg-green-700' :
                  showConfirmModal.type === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {isLoading ? 'Processing...' : 
                 showConfirmModal.type === 'accept' ? 'Yes, Accept' :
                 showConfirmModal.type === 'reject' ? 'Yes, Reject' :
                 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer Modal */}
      <DisclaimerModal
        isOpen={showDisclaimer}
        onClose={() => setShowDisclaimer(false)}
        onConfirm={handleConfirmAction}
        loading={actionLoading !== null}
        type={disclaimerAction === 'accept' ? 'owner-accept-request' : 
              disclaimerAction === 'reject' ? 'owner-reject-request' : 
              'cancel-confirmed-ride'}
        content={getDisclaimerContent(disclaimerAction)}
      />
    </>
  )
}