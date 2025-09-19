import React, { useState, useEffect } from 'react'
import { ArrowLeft, User, Edit, Save, X, Plane, Car, MessageCircle, Trash2, Calendar, Clock, MapPin, Check, AlertTriangle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { Trip, CarRide, RideConfirmation } from '../types'
import { getCurrencySymbol } from '../utils/currencies'
import DisclaimerModal from './DisclaimerModal'

interface UserProfileProps {
  onBack: () => void
  onStartChat: (userId: string, userName: string) => void
  onEditTrip: (trip: Trip) => void
  onEditRide: (ride: CarRide) => void
  initialTab?: string
}

type TabType = 'trips' | 'rides' | 'confirmations'

export default function UserProfile({ onBack, onStartChat, onEditTrip, onEditRide, initialTab }: UserProfileProps) {
  const { user, userProfile } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>((initialTab as TabType) || 'trips')
  const [trips, setTrips] = useState<Trip[]>([])
  const [rides, setRides] = useState<CarRide[]>([])
  const [confirmations, setConfirmations] = useState<RideConfirmation[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedProfile, setEditedProfile] = useState({
    full_name: userProfile?.full_name || '',
    age: userProfile?.age || '',
    gender: userProfile?.gender || '',
    profile_image_url: userProfile?.profile_image_url || ''
  })
  const [saving, setSaving] = useState(false)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [disclaimerAction, setDisclaimerAction] = useState<{
    type: 'accept' | 'reject' | 'cancel'
    confirmationId: string
    confirmation: RideConfirmation
  } | null>(null)

  useEffect(() => {
    if (user) {
      fetchUserData()
    }
  }, [user, activeTab])

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab as TabType)
    }
  }, [initialTab])

  const fetchUserData = async () => {
    if (!user) return

    setLoading(true)
    try {
      if (activeTab === 'trips') {
        const { data, error } = await supabase
          .from('trips')
          .select('*')
          .eq('user_id', user.id)
          .order('travel_date', { ascending: false })

        if (!error) {
          setTrips(data || [])
        }
      } else if (activeTab === 'rides') {
        const { data, error } = await supabase
          .from('car_rides')
          .select('*')
          .eq('user_id', user.id)
          .order('departure_date_time', { ascending: false })

        if (!error) {
          setRides(data || [])
        }
      } else if (activeTab === 'confirmations') {
        await fetchConfirmations()
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchConfirmations = async () => {
    if (!user) return

    try {
      // Fetch confirmations where user is the ride owner
      const { data: ownerConfirmations, error: ownerError } = await supabase
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
        .eq('ride_owner_id', user.id)
        .order('created_at', { ascending: false })

      // Fetch confirmations where user is the passenger
      const { data: passengerConfirmations, error: passengerError } = await supabase
        .from('ride_confirmations')
        .select(`
          *,
          user_profiles!ride_confirmations_ride_owner_id_fkey (
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
        .eq('passenger_id', user.id)
        .order('created_at', { ascending: false })

      if (!ownerError && !passengerError) {
        // Combine and sort all confirmations
        const allConfirmations = [
          ...(ownerConfirmations || []).map(c => ({ ...c, user_role: 'owner' as const })),
          ...(passengerConfirmations || []).map(c => ({ ...c, user_role: 'passenger' as const }))
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

        setConfirmations(allConfirmations)
      }
    } catch (error) {
      console.error('Error fetching confirmations:', error)
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: editedProfile.full_name,
          age: editedProfile.age ? parseInt(editedProfile.age) : null,
          gender: editedProfile.gender || null,
          profile_image_url: editedProfile.profile_image_url || null
        })
        .eq('id', user.id)

      if (error) throw error

      setIsEditing(false)
      // Refresh the page to get updated profile
      window.location.reload()
    } catch (error) {
      console.error('Error updating profile:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTrip = async (tripId: string) => {
    if (!confirm('Are you sure you want to delete this trip?')) return

    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId)

      if (error) throw error

      setTrips(trips.filter(trip => trip.id !== tripId))
    } catch (error) {
      console.error('Error deleting trip:', error)
    }
  }

  const handleDeleteRide = async (rideId: string) => {
    if (!confirm('Are you sure you want to delete this ride?')) return

    try {
      const { error } = await supabase
        .from('car_rides')
        .delete()
        .eq('id', rideId)

      if (error) throw error

      setRides(rides.filter(ride => ride.id !== rideId))
    } catch (error) {
      console.error('Error deleting ride:', error)
    }
  }

  const handleConfirmationAction = (action: 'accept' | 'reject' | 'cancel', confirmation: RideConfirmation) => {
    setDisclaimerAction({ type: action, confirmationId: confirmation.id, confirmation })
    setShowDisclaimer(true)
  }

  const handleConfirmAction = async () => {
    if (!disclaimerAction || !user) return

    setShowDisclaimer(false)
    
    try {
      const { type, confirmationId, confirmation } = disclaimerAction
      
      if (type === 'accept') {
        const { error } = await supabase
          .from('ride_confirmations')
          .update({ 
            status: 'accepted',
            confirmed_at: new Date().toISOString()
          })
          .eq('id', confirmationId)

        if (error) throw error

        // Send system message
        const rideDetails = confirmation.car_rides 
          ? `car ride from ${confirmation.car_rides.from_location} to ${confirmation.car_rides.to_location}`
          : `airport trip from ${confirmation.trips?.leaving_airport} to ${confirmation.trips?.destination_airport}`
        
        const receiverId = confirmation.user_role === 'owner' ? confirmation.passenger_id : confirmation.ride_owner_id
        const systemMessage = `🎉 Great news! Your request for the ${rideDetails} has been ACCEPTED! You can now coordinate pickup details and payment.`
        
        await supabase
          .from('chat_messages')
          .insert({
            sender_id: user.id,
            receiver_id: receiverId,
            message_content: systemMessage,
            message_type: 'system',
            is_read: false
          })

      } else if (type === 'reject') {
        const { error } = await supabase
          .from('ride_confirmations')
          .update({ 
            status: 'rejected',
            confirmed_at: new Date().toISOString()
          })
          .eq('id', confirmationId)

        if (error) throw error

        // Send system message
        const rideDetails = confirmation.car_rides 
          ? `car ride from ${confirmation.car_rides.from_location} to ${confirmation.car_rides.to_location}`
          : `airport trip from ${confirmation.trips?.leaving_airport} to ${confirmation.trips?.destination_airport}`
        
        const receiverId = confirmation.user_role === 'owner' ? confirmation.passenger_id : confirmation.ride_owner_id
        const systemMessage = `😔 Unfortunately, your request for the ${rideDetails} has been declined. You can request to join this ride again if needed.`
        
        await supabase
          .from('chat_messages')
          .insert({
            sender_id: user.id,
            receiver_id: receiverId,
            message_content: systemMessage,
            message_type: 'system',
            is_read: false
          })

      } else if (type === 'cancel') {
        const { error } = await supabase
          .from('ride_confirmations')
          .update({ 
            status: 'rejected',
            confirmed_at: new Date().toISOString()
          })
          .eq('id', confirmationId)

        if (error) throw error

        // Send system message
        const rideDetails = confirmation.car_rides 
          ? `car ride from ${confirmation.car_rides.from_location} to ${confirmation.car_rides.to_location}`
          : `airport trip from ${confirmation.trips?.leaving_airport} to ${confirmation.trips?.destination_airport}`
        
        const receiverId = confirmation.user_role === 'owner' ? confirmation.passenger_id : confirmation.ride_owner_id
        const isOwner = confirmation.user_role === 'owner'
        const systemMessage = isOwner
          ? `😔 The ride owner has cancelled the ${rideDetails}. You can request to join this ride again if it becomes available.`
          : `😔 The passenger has cancelled their spot on the ${rideDetails}. The ride is now available for other passengers.`
        
        await supabase
          .from('chat_messages')
          .insert({
            sender_id: user.id,
            receiver_id: receiverId,
            message_content: systemMessage,
            message_type: 'system',
            is_read: false
          })
      }

      // Refresh confirmations
      await fetchConfirmations()
    } catch (error: any) {
      console.error('Error processing confirmation action:', error)
      alert('Failed to process request. Please try again.')
    }

    setDisclaimerAction(null)
  }

  const getDisclaimerContent = (action: 'accept' | 'reject' | 'cancel', confirmation: RideConfirmation) => {
    const rideDetails = confirmation.car_rides 
      ? `car ride from ${confirmation.car_rides.from_location} to ${confirmation.car_rides.to_location}`
      : `airport trip from ${confirmation.trips?.leaving_airport} to ${confirmation.trips?.destination_airport}`

    switch (action) {
      case 'accept':
        return {
          title: 'Accept Ride Request',
          points: [
            'This will confirm the passenger for your ride',
            'The passenger will be notified of your acceptance',
            'You are committing to provide the ride as discussed',
            'Make sure you have agreed on pickup details and payment'
          ],
          explanation: `You are accepting a passenger for the ${rideDetails}. This is a commitment to provide the ride.`
        }
      case 'reject':
        return {
          title: 'Reject Ride Request',
          points: [
            'This will decline the passenger\'s request',
            'The passenger will be notified of your decision',
            'The passenger can request again if they wish',
            'Consider explaining your reason in chat'
          ],
          explanation: `You are rejecting a request for the ${rideDetails}. The passenger will be able to request again.`
        }
      case 'cancel':
        return {
          title: 'Cancel Confirmed Ride',
          points: [
            'This will cancel the confirmed ride arrangement',
            'The other party will be notified immediately',
            'This may affect your reputation on the platform',
            'Consider discussing the reason in chat first'
          ],
          explanation: `You are cancelling the confirmed ${rideDetails}. This should only be done if absolutely necessary.`
        }
      default:
        return {
          title: 'Confirm Action',
          points: ['Please confirm this action'],
          explanation: 'This action cannot be undone.'
        }
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

  const renderConfirmationsTab = () => {
    if (loading) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading confirmations...</p>
        </div>
      )
    }

    // Separate confirmations by type
    const carRideConfirmations = confirmations.filter(c => c.car_rides)
    const airportTripConfirmations = confirmations.filter(c => c.trips)

    if (confirmations.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Ride Confirmations</h3>
          <p className="text-gray-600">
            When you request rides or receive ride requests, they'll appear here
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-8">
        {/* Car Ride Confirmations */}
        {carRideConfirmations.length > 0 && (
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <Car size={24} className="text-green-600" />
              <h3 className="text-xl font-bold text-gray-900">Car Ride Confirmations</h3>
              <span className="bg-green-100 text-green-800 text-sm px-2 py-1 rounded-full">
                {carRideConfirmations.length}
              </span>
            </div>
            <div className="space-y-4">
              {carRideConfirmations.map((confirmation) => {
                const ride = confirmation.car_rides!
                const otherUser = confirmation.user_role === 'owner' 
                  ? confirmation.user_profiles 
                  : confirmation.user_profiles
                const isOwner = confirmation.user_role === 'owner'

                return (
                  <div key={confirmation.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          {otherUser.profile_image_url ? (
                            <img
                              src={otherUser.profile_image_url}
                              alt={otherUser.full_name}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <span className="text-green-600 font-semibold">
                              {otherUser.full_name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">{otherUser.full_name}</h4>
                          <p className="text-sm text-gray-600">
                            {isOwner ? 'Passenger Request' : 'Your Request to Driver'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                          confirmation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          confirmation.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {confirmation.status.charAt(0).toUpperCase() + confirmation.status.slice(1)}
                        </span>
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
                      {ride.price && (
                        <div className="mt-3 pt-3 border-t border-green-200">
                          <span className="text-sm font-medium text-green-600">
                            Price: {getCurrencySymbol(ride.currency || 'USD')}{ride.price}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => onStartChat(
                          isOwner ? confirmation.passenger_id : confirmation.ride_owner_id,
                          otherUser.full_name
                        )}
                        className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                      >
                        <MessageCircle size={16} />
                        <span>Chat with {otherUser.full_name}</span>
                      </button>

                      <div className="flex items-center space-x-3">
                        {confirmation.status === 'pending' && isOwner && (
                          <>
                            <button
                              onClick={() => handleConfirmationAction('reject', confirmation)}
                              className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                              <X size={16} />
                              <span>Reject</span>
                            </button>
                            <button
                              onClick={() => handleConfirmationAction('accept', confirmation)}
                              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                              <Check size={16} />
                              <span>Accept</span>
                            </button>
                          </>
                        )}

                        {confirmation.status === 'accepted' && (
                          <button
                            onClick={() => handleConfirmationAction('cancel', confirmation)}
                            className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                          >
                            <AlertTriangle size={16} />
                            <span>Cancel Ride</span>
                          </button>
                        )}

                        {confirmation.status === 'pending' && !isOwner && (
                          <div className="text-sm text-yellow-600 font-medium">
                            Awaiting driver response
                          </div>
                        )}

                        {confirmation.status === 'rejected' && (
                          <div className="text-sm text-red-600 font-medium">
                            Request declined
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Airport Trip Confirmations */}
        {airportTripConfirmations.length > 0 && (
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <Plane size={24} className="text-blue-600" />
              <h3 className="text-xl font-bold text-gray-900">Airport Trip Confirmations</h3>
              <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
                {airportTripConfirmations.length}
              </span>
            </div>
            <div className="space-y-4">
              {airportTripConfirmations.map((confirmation) => {
                const trip = confirmation.trips!
                const otherUser = confirmation.user_role === 'owner' 
                  ? confirmation.user_profiles 
                  : confirmation.user_profiles
                const isOwner = confirmation.user_role === 'owner'

                return (
                  <div key={confirmation.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          {otherUser.profile_image_url ? (
                            <img
                              src={otherUser.profile_image_url}
                              alt={otherUser.full_name}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <span className="text-blue-600 font-semibold">
                              {otherUser.full_name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">{otherUser.full_name}</h4>
                          <p className="text-sm text-gray-600">
                            {isOwner ? 'Service Request' : 'Your Request for Service'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                          confirmation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          confirmation.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {confirmation.status.charAt(0).toUpperCase() + confirmation.status.slice(1)}
                        </span>
                        <Plane size={20} className="text-blue-600" />
                      </div>
                    </div>

                    {/* Trip Details */}
                    <div className="bg-blue-50 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">From</p>
                          <div className="font-medium text-gray-900">
                            {trip.leaving_airport}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">To</p>
                          <div className="font-medium text-gray-900">
                            {trip.destination_airport}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Travel Date</p>
                          <div className="font-medium text-gray-900 flex items-center">
                            <Calendar size={14} className="mr-1 text-gray-400" />
                            {formatDate(trip.travel_date)}
                          </div>
                        </div>
                      </div>
                      {trip.price && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <span className="text-sm font-medium text-blue-600">
                            Service Price: {getCurrencySymbol(trip.currency || 'USD')}{trip.price}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => onStartChat(
                          isOwner ? confirmation.passenger_id : confirmation.ride_owner_id,
                          otherUser.full_name
                        )}
                        className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                      >
                        <MessageCircle size={16} />
                        <span>Chat with {otherUser.full_name}</span>
                      </button>

                      <div className="flex items-center space-x-3">
                        {confirmation.status === 'pending' && isOwner && (
                          <>
                            <button
                              onClick={() => handleConfirmationAction('reject', confirmation)}
                              className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                              <X size={16} />
                              <span>Reject</span>
                            </button>
                            <button
                              onClick={() => handleConfirmationAction('accept', confirmation)}
                              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                              <Check size={16} />
                              <span>Accept</span>
                            </button>
                          </>
                        )}

                        {confirmation.status === 'accepted' && (
                          <button
                            onClick={() => handleConfirmationAction('cancel', confirmation)}
                            className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                          >
                            <AlertTriangle size={16} />
                            <span>Cancel Service</span>
                          </button>
                        )}

                        {confirmation.status === 'pending' && !isOwner && (
                          <div className="text-sm text-yellow-600 font-medium">
                            Awaiting response
                          </div>
                        )}

                        {confirmation.status === 'rejected' && (
                          <div className="text-sm text-red-600 font-medium">
                            Request declined
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Airport Trip Confirmations */}
        {airportTripConfirmations.length > 0 && carRideConfirmations.length > 0 && (
          <div className="border-t border-gray-200 pt-8"></div>
        )}
      </div>
    )
  }

  const renderTripsTab = () => {
    if (loading) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading trips...</p>
        </div>
      )
    }

    if (trips.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plane size={32} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No trips posted yet</h3>
          <p className="text-gray-600">Your posted airport trips will appear here</p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {trips.map((trip) => (
          <div key={trip.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Plane size={24} className="text-blue-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {trip.leaving_airport} → {trip.destination_airport}
                  </h3>
                  <p className="text-gray-600">{formatDate(trip.travel_date)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onEditTrip(trip)}
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <Edit size={16} />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDeleteTrip(trip.id)}
                  className="flex items-center space-x-1 text-red-600 hover:text-red-700 transition-colors"
                >
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {trip.departure_time && (
                <div>
                  <p className="text-gray-600">Departure Time</p>
                  <p className="font-medium">{trip.departure_time}</p>
                </div>
              )}
              {trip.landing_time && (
                <div>
                  <p className="text-gray-600">Landing Time</p>
                  <p className="font-medium">{trip.landing_time}</p>
                </div>
              )}
              {trip.price && (
                <div>
                  <p className="text-gray-600">Service Price</p>
                  <p className="font-medium text-green-600">
                    {getCurrencySymbol(trip.currency || 'USD')}{trip.price}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderRidesTab = () => {
    if (loading) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading rides...</p>
        </div>
      )
    }

    if (rides.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Car size={32} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No rides posted yet</h3>
          <p className="text-gray-600">Your posted car rides will appear here</p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {rides.map((ride) => (
          <div key={ride.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Car size={24} className="text-green-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {ride.from_location} → {ride.to_location}
                  </h3>
                  <p className="text-gray-600">{formatDateTime(ride.departure_date_time)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onEditRide(ride)}
                  className="flex items-center space-x-1 text-green-600 hover:text-green-700 transition-colors"
                >
                  <Edit size={16} />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDeleteRide(ride.id)}
                  className="flex items-center space-x-1 text-red-600 hover:text-red-700 transition-colors"
                >
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Price per Passenger</p>
                <p className="font-medium text-green-600">
                  {getCurrencySymbol(ride.currency || 'USD')}{ride.price}
                </p>
              </div>
              {ride.negotiable && (
                <div>
                  <p className="text-gray-600">Pricing</p>
                  <p className="font-medium text-blue-600">Negotiable</p>
                </div>
              )}
              {ride.intermediate_stops && ride.intermediate_stops.length > 0 && (
                <div>
                  <p className="text-gray-600">Stops</p>
                  <p className="font-medium">{ride.intermediate_stops.length} stop(s)</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
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

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Profile Header */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
              {userProfile?.profile_image_url ? (
                <img
                  src={userProfile.profile_image_url}
                  alt={userProfile.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={48} className="text-blue-600" />
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isEditing ? (
                <input
                  type="text"
                  value={editedProfile.full_name}
                  onChange={(e) => setEditedProfile({ ...editedProfile, full_name: e.target.value })}
                  className="text-center border border-gray-300 rounded-lg px-4 py-2"
                />
              ) : (
                userProfile?.full_name
              )}
            </h1>
            <p className="text-gray-600">RideYaari Member</p>
            
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="mt-4 flex items-center space-x-2 mx-auto text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Edit size={16} />
                <span>Edit Profile</span>
              </button>
            ) : (
              <div className="mt-4 flex items-center justify-center space-x-4">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Save size={16} />
                  <span>{saving ? 'Saving...' : 'Save'}</span>
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setEditedProfile({
                      full_name: userProfile?.full_name || '',
                      age: userProfile?.age || '',
                      gender: userProfile?.gender || '',
                      profile_image_url: userProfile?.profile_image_url || ''
                    })
                  }}
                  className="flex items-center space-x-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <X size={16} />
                  <span>Cancel</span>
                </button>
              </div>
            )}
          </div>

          {/* Profile Details */}
          {isEditing && (
            <div className="grid md:grid-cols-2 gap-6 mb-8 p-6 bg-gray-50 rounded-xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                <input
                  type="number"
                  value={editedProfile.age}
                  onChange={(e) => setEditedProfile({ ...editedProfile, age: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your age"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                <select
                  value={editedProfile.gender}
                  onChange={(e) => setEditedProfile({ ...editedProfile, gender: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Profile Image URL</label>
                <input
                  type="url"
                  value={editedProfile.profile_image_url}
                  onChange={(e) => setEditedProfile({ ...editedProfile, profile_image_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter image URL"
                />
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex space-x-1 mb-8 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('trips')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-colors ${
                activeTab === 'trips'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Plane size={20} />
              <span>Airport Trips</span>
            </button>
            <button
              onClick={() => setActiveTab('rides')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-colors ${
                activeTab === 'rides'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Car size={20} />
              <span>Car Rides</span>
            </button>
            <button
              onClick={() => setActiveTab('confirmations')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-colors ${
                activeTab === 'confirmations'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Check size={20} />
              <span>Confirmations</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {activeTab === 'trips' && renderTripsTab()}
            {activeTab === 'rides' && renderRidesTab()}
            {activeTab === 'confirmations' && renderConfirmationsTab()}
          </div>
        </div>

        {/* Disclaimer Modal */}
        {showDisclaimer && disclaimerAction && (
          <DisclaimerModal
            isOpen={showDisclaimer}
            onClose={() => {
              setShowDisclaimer(false)
              setDisclaimerAction(null)
            }}
            onConfirm={handleConfirmAction}
            loading={false}
            type={disclaimerAction.type}
            content={getDisclaimerContent(disclaimerAction.type, disclaimerAction.confirmation)}
          />
        )}
      </div>
    </div>
  )
}