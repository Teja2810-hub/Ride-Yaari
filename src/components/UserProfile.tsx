import React, { useState, useEffect } from 'react'
import { ArrowLeft, User, Calendar, MapPin, Plane, Car, Edit, Trash2, MessageCircle, Star, Send, Check, X, Clock, AlertTriangle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { Trip, CarRide, Review, RideConfirmation } from '../types'
import ReviewForm from './ReviewForm'
import { getCurrencySymbol } from '../utils/currencies'
import DisclaimerModal from './DisclaimerModal'

interface UserProfileProps {
  onBack: () => void
  onStartChat: (userId: string, userName: string) => void
  onEditTrip: (trip: Trip) => void
  onEditRide: (ride: CarRide) => void
  initialTab?: string
}

type TabType = 'profile' | 'trips' | 'rides' | 'conversations' | 'confirmations' | 'reviews'

export default function UserProfile({ onBack, onStartChat, onEditTrip, onEditRide, initialTab }: UserProfileProps) {
  const { user, userProfile } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>((initialTab as TabType) || 'profile')
  const [trips, setTrips] = useState<Trip[]>([])
  const [rides, setRides] = useState<CarRide[]>([])
  const [confirmations, setConfirmations] = useState<RideConfirmation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{type: 'trip' | 'ride', id: string} | null>(null)
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false)
  const [disclaimerAction, setDisclaimerAction] = useState<{
    type: 'accept' | 'reject' | 'cancel'
    confirmation: RideConfirmation
  } | null>(null)

  useEffect(() => {
    if (user) {
      fetchUserData()
    }
  }, [user])

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab as TabType)
    }
  }, [initialTab])

  const fetchUserData = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Fetch trips
      const { data: tripsData, error: tripsError } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (tripsError) throw tripsError
      setTrips(tripsData || [])

      // Fetch rides
      const { data: ridesData, error: ridesError } = await supabase
        .from('car_rides')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (ridesError) throw ridesError
      setRides(ridesData || [])

      // Fetch confirmations
      await fetchConfirmations()

    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchConfirmations = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
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
            currency,
            user_id
          ),
          trips!ride_confirmations_trip_id_fkey (
            id,
            leaving_airport,
            destination_airport,
            travel_date,
            price,
            currency,
            user_id
          )
        `)
        .eq('ride_owner_id', user.id)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setConfirmations(data)
      }
    } catch (error) {
      console.error('Error fetching confirmations:', error)
    }
  }

  const handleDeleteItem = async () => {
    if (!itemToDelete) return

    try {
      const table = itemToDelete.type === 'trip' ? 'trips' : 'car_rides'
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', itemToDelete.id)

      if (error) throw error

      // Update local state
      if (itemToDelete.type === 'trip') {
        setTrips(trips.filter(trip => trip.id !== itemToDelete.id))
      } else {
        setRides(rides.filter(ride => ride.id !== itemToDelete.id))
      }

      setShowDeleteModal(false)
      setItemToDelete(null)
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleConfirmationAction = async (action: 'accept' | 'reject' | 'cancel', confirmation: RideConfirmation) => {
    setDisclaimerAction({ type: action, confirmation })
    setShowDisclaimerModal(true)
  }

  const executeConfirmationAction = async () => {
    if (!disclaimerAction || !user) return

    const { type, confirmation } = disclaimerAction
    
    try {
      let newStatus: string
      let systemMessage: string
      const rideType = confirmation.ride_id ? 'car ride' : 'airport trip'
      const rideDetails = confirmation.car_rides 
        ? `from ${confirmation.car_rides.from_location} to ${confirmation.car_rides.to_location}`
        : `from ${confirmation.trips?.leaving_airport} to ${confirmation.trips?.destination_airport}`

      switch (type) {
        case 'accept':
          newStatus = 'accepted'
          systemMessage = `🎉 Great news! Your request for the ${rideType} ${rideDetails} has been ACCEPTED! You can now coordinate pickup details and payment.`
          break
        case 'reject':
          newStatus = 'rejected'
          systemMessage = `😔 Unfortunately, your request for the ${rideType} ${rideDetails} has been declined. You can request to join this ride again if needed.`
          break
        case 'cancel':
          newStatus = 'rejected'
          systemMessage = `😔 The ${rideType} ${rideDetails} has been cancelled by the ride owner. You can request to join this ride again if it becomes available.`
          break
        default:
          return
      }

      // Update confirmation status
      const { error } = await supabase
        .from('ride_confirmations')
        .update({ 
          status: newStatus,
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', confirmation.id)

      if (error) throw error

      // Send system message to passenger
      await supabase
        .from('chat_messages')
        .insert({
          sender_id: user.id,
          receiver_id: confirmation.passenger_id,
          message_content: systemMessage,
          message_type: 'system',
          is_read: false
        })

      // Refresh confirmations
      await fetchConfirmations()
      
      setShowDisclaimerModal(false)
      setDisclaimerAction(null)
    } catch (error: any) {
      console.error('Error updating confirmation:', error)
      alert('Failed to process request. Please try again.')
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

  const getDisclaimerContent = (type: string, confirmation: RideConfirmation) => {
    const rideType = confirmation.ride_id ? 'car ride' : 'airport trip'
    const rideDetails = confirmation.car_rides 
      ? `from ${confirmation.car_rides.from_location} to ${confirmation.car_rides.to_location}`
      : `from ${confirmation.trips?.leaving_airport} to ${confirmation.trips?.destination_airport}`

    switch (type) {
      case 'accept':
        return {
          title: 'Accept Ride Request',
          points: [
            'This will confirm the passenger for your ride',
            'The passenger will be notified of your acceptance',
            'You are committing to provide the ride as discussed',
            'Make sure you have agreed on pickup details and payment'
          ],
          explanation: `You are accepting a passenger for the ${rideType} ${rideDetails}. This is a commitment to provide the ride.`
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
          explanation: `You are rejecting a request for the ${rideType} ${rideDetails}. The passenger will be able to request again.`
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
          explanation: `You are cancelling the confirmed ${rideType} ${rideDetails}. This should only be done if absolutely necessary.`
        }
      default:
        return {
          title: 'Confirm Action',
          points: ['Please confirm this action'],
          explanation: 'This action cannot be undone.'
        }
    }
  }

  const renderConfirmationsTab = () => {
    const carRideConfirmations = confirmations.filter(c => c.ride_id)
    const airportTripConfirmations = confirmations.filter(c => c.trip_id)

    return (
      <div className="space-y-8">
        {/* Car Rides Section */}
        <div>
          <div className="flex items-center space-x-3 mb-6">
            <Car size={24} className="text-green-600" />
            <h3 className="text-xl font-semibold text-gray-900">Car Rides</h3>
            <span className="bg-green-100 text-green-800 text-sm px-2 py-1 rounded-full">
              {carRideConfirmations.length}
            </span>
          </div>

          {carRideConfirmations.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Car size={32} className="text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No car ride confirmations yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {carRideConfirmations.map((confirmation) => {
                const ride = confirmation.car_rides
                const passenger = confirmation.user_profiles

                return (
                  <div key={confirmation.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
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
                          <h4 className="text-lg font-semibold text-gray-900">{passenger.full_name}</h4>
                          <p className="text-sm text-gray-600">
                            {confirmation.status === 'pending' ? 'wants to join your car ride' : 
                             confirmation.status === 'accepted' ? 'confirmed for your car ride' : 
                             'was rejected from your car ride'}
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
                      </div>
                    </div>

                    {/* Ride Details */}
                    {ride && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
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
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <span className="text-sm font-medium text-green-600">
                              Price: {getCurrencySymbol(ride.currency || 'USD')}{ride.price}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => onStartChat(passenger.id, passenger.full_name)}
                        className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                      >
                        <MessageCircle size={16} />
                        <span>Chat with {passenger.full_name}</span>
                      </button>

                      {confirmation.status === 'pending' && (
                        <div className="flex items-center space-x-3">
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
                        </div>
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
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Airport Trips Section */}
        <div>
          <div className="flex items-center space-x-3 mb-6">
            <Plane size={24} className="text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-900">Airport Trips</h3>
            <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
              {airportTripConfirmations.length}
            </span>
          </div>

          {airportTripConfirmations.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Plane size={32} className="text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No airport trip confirmations yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {airportTripConfirmations.map((confirmation) => {
                const trip = confirmation.trips
                const passenger = confirmation.user_profiles

                return (
                  <div key={confirmation.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
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
                          <h4 className="text-lg font-semibold text-gray-900">{passenger.full_name}</h4>
                          <p className="text-sm text-gray-600">
                            {confirmation.status === 'pending' ? 'wants to join your airport trip' : 
                             confirmation.status === 'accepted' ? 'confirmed for your airport trip' : 
                             'was rejected from your airport trip'}
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
                      </div>
                    </div>

                    {/* Trip Details */}
                    {trip && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
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
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <span className="text-sm font-medium text-green-600">
                              Service Price: {getCurrencySymbol(trip.currency || 'USD')}{trip.price}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => onStartChat(passenger.id, passenger.full_name)}
                        className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                      >
                        <MessageCircle size={16} />
                        <span>Chat with {passenger.full_name}</span>
                      </button>

                      {confirmation.status === 'pending' && (
                        <div className="flex items-center space-x-3">
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
                        </div>
                      )}

                      {confirmation.status === 'accepted' && (
                        <button
                          onClick={() => handleConfirmationAction('cancel', confirmation)}
                          className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                          <AlertTriangle size={16} />
                          <span>Cancel Trip</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
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

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <User size={40} />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{userProfile?.full_name}</h1>
                <p className="text-blue-100">RideYaari Member</p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-8">
              {[
                { id: 'profile', label: 'Profile Settings', icon: User },
                { id: 'trips', label: 'Airport Trips', icon: Plane },
                { id: 'rides', label: 'Car Rides', icon: Car },
                { id: 'confirmations', label: 'Confirmations', icon: Check },
                { id: 'conversations', label: 'Conversations', icon: MessageCircle },
                { id: 'reviews', label: 'Submit Review', icon: Star }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon size={16} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Profile Settings</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={userProfile?.full_name || ''}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                      disabled
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Profile editing features will be available in a future update.
                </p>
              </div>
            )}

            {activeTab === 'trips' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Your Airport Trips</h2>
                {trips.length === 0 ? (
                  <div className="text-center py-12">
                    <Plane size={48} className="text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No trips posted yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {trips.map((trip) => (
                      <div key={trip.id} className="border border-gray-200 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-4">
                            <Plane size={24} className="text-blue-600" />
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {trip.leaving_airport} → {trip.destination_airport}
                              </h3>
                              <p className="text-gray-600 flex items-center">
                                <Calendar size={16} className="mr-2" />
                                {new Date(trip.travel_date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => onEditTrip(trip)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setItemToDelete({ type: 'trip', id: trip.id })
                                setShowDeleteModal(true)
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        {trip.price && (
                          <div className="text-sm text-green-600 font-medium">
                            Service Price: {getCurrencySymbol(trip.currency || 'USD')}{trip.price}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'rides' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Your Car Rides</h2>
                {rides.length === 0 ? (
                  <div className="text-center py-12">
                    <Car size={48} className="text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No rides posted yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rides.map((ride) => (
                      <div key={ride.id} className="border border-gray-200 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-4">
                            <Car size={24} className="text-green-600" />
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {ride.from_location} → {ride.to_location}
                              </h3>
                              <p className="text-gray-600 flex items-center">
                                <Calendar size={16} className="mr-2" />
                                {new Date(ride.departure_date_time).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => onEditRide(ride)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setItemToDelete({ type: 'ride', id: ride.id })
                                setShowDeleteModal(true)
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="text-sm text-green-600 font-medium">
                          Price: {getCurrencySymbol(ride.currency || 'USD')}{ride.price} per passenger
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'confirmations' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Ride Confirmations</h2>
                <p className="text-gray-600">Manage passenger requests for your rides and trips</p>
                {renderConfirmationsTab()}
              </div>
            )}

            {activeTab === 'conversations' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Conversations</h2>
                <p className="text-gray-600">
                  Your conversations are accessible through the Messages notification in the main dashboard.
                </p>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Submit a Review</h2>
                <ReviewForm />
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={24} className="text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Delete {itemToDelete?.type}</h3>
                <p className="text-gray-600">
                  Are you sure you want to delete this {itemToDelete?.type}? This action cannot be undone.
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setItemToDelete(null)
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteItem}
                  className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer Modal */}
        <DisclaimerModal
          isOpen={showDisclaimerModal}
          onClose={() => {
            setShowDisclaimerModal(false)
            setDisclaimerAction(null)
          }}
          onConfirm={executeConfirmationAction}
          loading={false}
          type="ride"
          content={disclaimerAction ? getDisclaimerContent(disclaimerAction.type, disclaimerAction.confirmation) : undefined}
        />
      </div>
    </div>
  )
}