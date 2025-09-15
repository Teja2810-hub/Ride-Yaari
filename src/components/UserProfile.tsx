import React, { useState, useEffect } from 'react'
import { ArrowLeft, User, Edit, Save, X, Calendar, MapPin, Clock, Car, Plane, Check, MessageCircle, AlertTriangle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { Trip, CarRide, RideConfirmation } from '../types'
import { getCurrencySymbol } from '../utils/currencies'
import RideConfirmationActions from './RideConfirmationActions'

interface UserProfileProps {
  onBack: () => void
  onStartChat: (userId: string, userName: string, ride?: CarRide, trip?: Trip) => void
  onEditTrip: (trip: Trip) => void
  onEditRide: (ride: CarRide) => void
  initialTab?: string
}

export default function UserProfile({ onBack, onStartChat, onEditTrip, onEditRide, initialTab }: UserProfileProps) {
  const { user, userProfile } = useAuth()
  const [activeTab, setActiveTab] = useState(initialTab || 'profile')
  const [isEditing, setIsEditing] = useState(false)
  const [fullName, setFullName] = useState(userProfile?.full_name || '')
  const [age, setAge] = useState(userProfile?.age?.toString() || '')
  const [gender, setGender] = useState(userProfile?.gender || '')
  const [profileImageUrl, setProfileImageUrl] = useState(userProfile?.profile_image_url || '')
  const [loading, setLoading] = useState(false)
  const [trips, setTrips] = useState<Trip[]>([])
  const [rides, setRides] = useState<CarRide[]>([])
  const [confirmations, setConfirmations] = useState<RideConfirmation[]>([])
  const [passengerConfirmations, setPassengerConfirmations] = useState<RideConfirmation[]>([])
  const [loadingTrips, setLoadingTrips] = useState(false)
  const [loadingRides, setLoadingRides] = useState(false)
  const [loadingConfirmations, setLoadingConfirmations] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showAcceptDialog, setShowAcceptDialog] = useState(false)
  const [selectedConfirmation, setSelectedConfirmation] = useState<RideConfirmation | null>(null)

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab)
    }
  }, [initialTab])

  useEffect(() => {
    if (activeTab === 'trips') {
      fetchTrips()
    } else if (activeTab === 'rides') {
      fetchRides()
    } else if (activeTab === 'confirmations') {
      fetchConfirmations()
      fetchPassengerConfirmations()
    }
  }, [activeTab])

  const fetchTrips = async () => {
    if (!user) return
    
    setLoadingTrips(true)
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setTrips(data)
      }
    } catch (error) {
      console.error('Error fetching trips:', error)
    } finally {
      setLoadingTrips(false)
    }
  }

  const fetchRides = async () => {
    if (!user) return
    
    setLoadingRides(true)
    try {
      const { data, error } = await supabase
        .from('car_rides')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setRides(data)
      }
    } catch (error) {
      console.error('Error fetching rides:', error)
    } finally {
      setLoadingRides(false)
    }
  }

  const fetchConfirmations = async () => {
    if (!user) return
    
    setLoadingConfirmations(true)
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

      if (!error && data) {
        setConfirmations(data)
      }
    } catch (error) {
      console.error('Error fetching confirmations:', error)
    } finally {
      setLoadingConfirmations(false)
    }
  }

  const fetchPassengerConfirmations = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
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

      if (!error && data) {
        setPassengerConfirmations(data)
      }
    } catch (error) {
      console.error('Error fetching passenger confirmations:', error)
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: fullName,
          age: age ? parseInt(age) : null,
          gender: gender || null,
          profile_image_url: profileImageUrl || null
        })
        .eq('id', user.id)

      if (error) throw error

      setIsEditing(false)
      // Refresh the page to update the profile
      window.location.reload()
    } catch (error: any) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile. Please try again.')
    } finally {
      setLoading(false)
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
    } catch (error: any) {
      console.error('Error deleting trip:', error)
      alert('Failed to delete trip. Please try again.')
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
    } catch (error: any) {
      console.error('Error deleting ride:', error)
      alert('Failed to delete ride. Please try again.')
    }
  }

  const handleConfirmationAction = async (confirmationId: string, action: 'accept' | 'reject' | 'cancel') => {
    try {
      const confirmation = confirmations.find(c => c.id === confirmationId) || 
                          passengerConfirmations.find(c => c.id === confirmationId)
      if (!confirmation) return

      let newStatus = action === 'accept' ? 'accepted' : 'rejected'
      if (action === 'cancel' && confirmation.status === 'accepted') {
        newStatus = 'rejected'
      }

      const { error } = await supabase
        .from('ride_confirmations')
        .update({ 
          status: newStatus,
          confirmed_at: new Date().toISOString()
        })
        .eq('id', confirmationId)

      if (error) throw error

      // Send system message
      const rideType = confirmation.ride_id ? 'car ride' : 'airport trip'
      let systemMessage = ''
      
      if (action === 'accept') {
        systemMessage = `🎉 Great news! Your request for the ${rideType} has been ACCEPTED! You can now coordinate pickup details and payment. You can cancel anytime if needed.`
      } else if (action === 'cancel') {
        systemMessage = `😔 Unfortunately, the ${rideType} you were confirmed for has been cancelled by the ride owner. You can request to join this ride again using the button below.`
      } else {
        systemMessage = `😔 Unfortunately, your request for the ${rideType} has been declined. You can request to join this ride again using the button below if needed.`
      }
      
      await supabase
        .from('chat_messages')
        .insert({
          sender_id: confirmation.ride_owner_id,
          receiver_id: confirmation.passenger_id,
          message_content: systemMessage,
          message_type: 'system',
          is_read: false
        })

      // Refresh confirmations
      fetchConfirmations()
      fetchPassengerConfirmations()
      
      setShowAcceptDialog(false)
      setShowCancelDialog(false)
      setSelectedConfirmation(null)
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

  const renderConfirmationCard = (confirmation: RideConfirmation, isPassenger: boolean = false) => {
    const ride = confirmation.car_rides
    const trip = confirmation.trips
    const otherUser = isPassenger ? 
      confirmation.user_profiles : // This is the ride owner when user is passenger
      confirmation.user_profiles   // This is the passenger when user is owner

    return (
      <div key={confirmation.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold">
                {otherUser.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{otherUser.full_name}</h3>
              <p className="text-sm text-gray-600">
                {isPassenger ? 
                  `You ${confirmation.status === 'pending' ? 'requested to join' : 
                         confirmation.status === 'accepted' ? 'are confirmed for' : 
                         'were rejected from'} this ${ride ? 'car ride' : 'airport trip'}` :
                  `${confirmation.status === 'pending' ? 'wants to join your' : 
                    confirmation.status === 'accepted' ? 'confirmed for your' : 
                    'was rejected from your'} ${ride ? 'car ride' : 'airport trip'}`
                }
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
            {ride ? (
              <Car size={20} className="text-green-600" />
            ) : (
              <Plane size={20} className="text-blue-600" />
            )}
          </div>
        </div>

        {/* Ride/Trip Details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          {ride && (
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
          )}

          {trip && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">From</p>
                <div className="font-medium text-gray-900">{trip.leaving_airport}</div>
                {trip.departure_time && (
                  <div className="text-xs text-gray-500 mt-1">
                    Departure: {trip.departure_time}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">To</p>
                <div className="font-medium text-gray-900">{trip.destination_airport}</div>
                {trip.landing_time && (
                  <div className="text-xs text-gray-500 mt-1">
                    Arrival: {trip.landing_time}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Travel Date</p>
                <div className="font-medium text-gray-900 flex items-center">
                  <Calendar size={14} className="mr-1 text-gray-400" />
                  {formatDate(trip.travel_date)}
                </div>
              </div>
            </div>
          )}

          {(ride?.price || trip?.price) && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <span className="text-sm font-medium text-green-600">
                Price: {getCurrencySymbol((ride?.currency || trip?.currency) || 'USD')}{ride?.price || trip?.price}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => onStartChat(
              isPassenger ? confirmation.ride_owner_id : confirmation.passenger_id,
              otherUser.full_name,
              ride || undefined,
              trip || undefined
            )}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            <MessageCircle size={16} />
            <span>Chat with {otherUser.full_name}</span>
          </button>

          {!isPassenger && confirmation.status === 'pending' && (
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  setSelectedConfirmation(confirmation)
                  setShowCancelDialog(true)
                }}
                className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <X size={16} />
                <span>Reject</span>
              </button>
              <button
                onClick={() => {
                  setSelectedConfirmation(confirmation)
                  setShowAcceptDialog(true)
                }}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Check size={16} />
                <span>Accept</span>
              </button>
            </div>
          )}

          {!isPassenger && confirmation.status === 'accepted' && (
            <button
              onClick={() => {
                setSelectedConfirmation(confirmation)
                setShowCancelDialog(true)
              }}
              className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <X size={16} />
              <span>Cancel Ride</span>
            </button>
          )}
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
            <span>Back</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'profile', label: 'Profile', icon: User },
                { id: 'trips', label: 'Airport Trips', icon: Plane },
                { id: 'rides', label: 'Car Rides', icon: Car },
                { id: 'confirmations', label: 'Ride Requests', icon: Check }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'profile' && (
              <div className="max-w-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Profile Information</h2>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      <Edit size={16} />
                      <span>Edit Profile</span>
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                        <input
                          type="number"
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                          min="18"
                          max="100"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        >
                          <option value="">Prefer not to say</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Profile Image URL</label>
                      <input
                        type="url"
                        value={profileImageUrl}
                        onChange={(e) => setProfileImageUrl(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        placeholder="https://example.com/your-image.jpg"
                      />
                    </div>

                    <div className="flex space-x-4">
                      <button
                        onClick={handleSaveProfile}
                        disabled={loading}
                        className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        <Save size={16} />
                        <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false)
                          setFullName(userProfile?.full_name || '')
                          setAge(userProfile?.age?.toString() || '')
                          setGender(userProfile?.gender || '')
                          setProfileImageUrl(userProfile?.profile_image_url || '')
                        }}
                        className="flex items-center space-x-2 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                      >
                        <X size={16} />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center space-x-6">
                      {userProfile?.profile_image_url ? (
                        <img
                          src={userProfile.profile_image_url}
                          alt={userProfile.full_name}
                          className="w-20 h-20 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-2xl font-semibold">
                            {userProfile?.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{userProfile?.full_name}</h3>
                        <p className="text-gray-600">{user?.email}</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                        <p className="text-gray-900">{userProfile?.age || 'Not specified'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                        <p className="text-gray-900 capitalize">{userProfile?.gender || 'Not specified'}</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
                      <p className="text-gray-900">
                        {new Date(userProfile?.created_at || '').toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'trips' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Airport Trips</h2>
                {loadingTrips ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading trips...</p>
                  </div>
                ) : trips.length === 0 ? (
                  <div className="text-center py-12">
                    <Plane size={48} className="text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No trips yet</h3>
                    <p className="text-gray-600">Your posted airport trips will appear here</p>
                  </div>
                ) : (
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
                              <p className="text-sm text-gray-600">
                                {formatDate(trip.travel_date)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => onEditTrip(trip)}
                              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTrip(trip.id)}
                              className="text-red-600 hover:text-red-700 font-medium transition-colors"
                            >
                              Delete
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
                          <div>
                            <p className="text-gray-600">Posted</p>
                            <p className="font-medium">
                              {new Date(trip.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'rides' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Car Rides</h2>
                {loadingRides ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading rides...</p>
                  </div>
                ) : rides.length === 0 ? (
                  <div className="text-center py-12">
                    <Car size={48} className="text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No rides yet</h3>
                    <p className="text-gray-600">Your posted car rides will appear here</p>
                  </div>
                ) : (
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
                              <p className="text-sm text-gray-600">
                                {formatDateTime(ride.departure_date_time)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => onEditRide(ride)}
                              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteRide(ride.id)}
                              className="text-red-600 hover:text-red-700 font-medium transition-colors"
                            >
                              Delete
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
                              <p className="text-gray-600">Negotiable</p>
                              <p className="font-medium text-blue-600">Yes</p>
                            </div>
                          )}
                          <div>
                            <p className="text-gray-600">Posted</p>
                            <p className="font-medium">
                              {new Date(ride.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'confirmations' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Ride Requests & Confirmations</h2>
                
                {loadingConfirmations ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading confirmations...</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Requests for your rides/trips */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Requests for Your Rides/Trips</h3>
                      {confirmations.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <Check size={32} className="text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-600">No ride requests yet</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {confirmations.map((confirmation) => renderConfirmationCard(confirmation, false))}
                        </div>
                      )}
                    </div>

                    {/* Your requests to join rides/trips */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Ride Requests</h3>
                      {passengerConfirmations.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <Check size={32} className="text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-600">No ride requests sent yet</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {passengerConfirmations.map((confirmation) => renderConfirmationCard(confirmation, true))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Accept Confirmation Dialog */}
      {showAcceptDialog && selectedConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={24} className="text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Accept Ride Request</h3>
              <p className="text-gray-600">
                Are you sure you want to accept {selectedConfirmation.user_profiles.full_name}'s request to join your {selectedConfirmation.ride_id ? 'car ride' : 'airport trip'}? 
                They will be notified and you can coordinate the details through chat.
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowAcceptDialog(false)
                  setSelectedConfirmation(null)
                }}
                className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmationAction(selectedConfirmation.id, 'accept')}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Yes, Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel/Reject Confirmation Dialog */}
      {showCancelDialog && selectedConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {selectedConfirmation.status === 'accepted' ? 'Cancel Ride Confirmation' : 'Reject Ride Request'}
              </h3>
              <p className="text-gray-600">
                {selectedConfirmation.status === 'accepted' 
                  ? `Are you sure you want to cancel the confirmed ride with ${selectedConfirmation.user_profiles.full_name}? They will be notified and can request to join again if needed.`
                  : `Are you sure you want to reject ${selectedConfirmation.user_profiles.full_name}'s request to join your ${selectedConfirmation.ride_id ? 'car ride' : 'airport trip'}? They can request again if needed.`
                }
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowCancelDialog(false)
                  setSelectedConfirmation(null)
                }}
                className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Keep {selectedConfirmation.status === 'accepted' ? 'Confirmed' : 'Pending'}
              </button>
              <button
                onClick={() => handleConfirmationAction(
                  selectedConfirmation.id, 
                  selectedConfirmation.status === 'accepted' ? 'cancel' : 'reject'
                )}
                className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Yes, {selectedConfirmation.status === 'accepted' ? 'Cancel' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}