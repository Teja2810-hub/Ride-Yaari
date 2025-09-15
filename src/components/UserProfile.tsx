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

type ProfileTab = 'profile' | 'trips' | 'rides' | 'confirmations'

export default function UserProfile({ onBack, onStartChat, onEditTrip, onEditRide, initialTab }: UserProfileProps) {
  const { user, userProfile } = useAuth()
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab === 'confirmations' ? 'confirmations' : 'profile')
  const [isEditing, setIsEditing] = useState(false)
  const [fullName, setFullName] = useState(userProfile?.full_name || '')
  const [age, setAge] = useState(userProfile?.age?.toString() || '')
  const [gender, setGender] = useState(userProfile?.gender || '')
  const [profileImageUrl, setProfileImageUrl] = useState(userProfile?.profile_image_url || '')
  const [loading, setLoading] = useState(false)
  const [trips, setTrips] = useState<Trip[]>([])
  const [rides, setRides] = useState<CarRide[]>([])
  const [confirmations, setConfirmations] = useState<RideConfirmation[]>([])
  const [confirmationFilter, setConfirmationFilter] = useState<'all' | 'car' | 'airport'>('all')
  const [confirmationStatusFilter, setConfirmationStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all')

  useEffect(() => {
    if (user) {
      fetchUserData()
    }
  }, [user])

  useEffect(() => {
    if (initialTab === 'confirmations') {
      setActiveTab('confirmations')
    }
  }, [initialTab])

  const fetchUserData = async () => {
    if (!user) return

    try {
      // Fetch user's trips
      const { data: tripsData, error: tripsError } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!tripsError) {
        setTrips(tripsData || [])
      }

      // Fetch user's rides
      const { data: ridesData, error: ridesError } = await supabase
        .from('car_rides')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!ridesError) {
        setRides(ridesData || [])
      }

      // Fetch confirmations (both as owner and passenger)
      const { data: confirmationsData, error: confirmationsError } = await supabase
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
            departure_time,
            price,
            currency,
            user_id
          )
        `)
        .or(`ride_owner_id.eq.${user.id},passenger_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (!confirmationsError) {
        setConfirmations(confirmationsData || [])
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
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
    if (!window.confirm('Are you sure you want to delete this trip? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId)
        .eq('user_id', user?.id)

      if (error) throw error

      setTrips(trips.filter(trip => trip.id !== tripId))
    } catch (error: any) {
      console.error('Error deleting trip:', error)
      alert('Failed to delete trip. Please try again.')
    }
  }

  const handleDeleteRide = async (rideId: string) => {
    if (!window.confirm('Are you sure you want to delete this ride? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('car_rides')
        .delete()
        .eq('id', rideId)
        .eq('user_id', user?.id)

      if (error) throw error

      setRides(rides.filter(ride => ride.id !== rideId))
    } catch (error: any) {
      console.error('Error deleting ride:', error)
      alert('Failed to delete ride. Please try again.')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
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

  const filteredConfirmations = confirmations.filter(confirmation => {
    // Filter by type
    if (confirmationFilter === 'car' && !confirmation.ride_id) return false
    if (confirmationFilter === 'airport' && !confirmation.trip_id) return false
    
    // Filter by status
    if (confirmationStatusFilter !== 'all' && confirmation.status !== confirmationStatusFilter) return false
    
    return true
  })

  const getConfirmationRole = (confirmation: RideConfirmation) => {
    return confirmation.ride_owner_id === user?.id ? 'owner' : 'passenger'
  }

  const handleCancelConfirmation = async (confirmationId: string, isOwner: boolean) => {
    const confirmMessage = isOwner 
      ? 'Are you sure you want to cancel this confirmed ride? The passenger will be notified.'
      : 'Are you sure you want to cancel your participation in this ride? The owner will be notified.'
    
    if (!window.confirm(confirmMessage)) {
      return
    }

    try {
      const { error } = await supabase
        .from('ride_confirmations')
        .update({ 
          status: 'rejected',
          confirmed_at: new Date().toISOString()
        })
        .eq('id', confirmationId)

      if (error) throw error

      // Send system message
      const confirmation = confirmations.find(c => c.id === confirmationId)
      if (confirmation) {
        let rideDetails = ''
        if (confirmation.car_rides) {
          const ride = confirmation.car_rides
          const departureDate = new Date(ride.departure_date_time).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })
          rideDetails = `${ride.from_location} → ${ride.to_location} on ${departureDate}`
        } else if (confirmation.trips) {
          const trip = confirmation.trips
          const travelDate = new Date(trip.travel_date).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          })
          rideDetails = `${trip.leaving_airport} → ${trip.destination_airport} on ${travelDate}`
          if (trip.departure_time) {
            rideDetails += ` at ${trip.departure_time}`
          }
        }
        
        const rideType = confirmation.ride_id ? 'car ride' : 'airport trip'
        const systemMessage = isOwner
          ? `😔 The ${rideType} (${rideDetails}) has been cancelled by the ride owner. You can request to join this ride again if needed.`
          : `😔 The passenger has cancelled their participation in the ${rideType} (${rideDetails}). The spot is now available for other passengers.`
        
        await supabase
          .from('chat_messages')
          .insert({
            sender_id: isOwner ? confirmation.ride_owner_id : confirmation.passenger_id,
            receiver_id: isOwner ? confirmation.passenger_id : confirmation.ride_owner_id,
            message_content: systemMessage,
            message_type: 'system',
            is_read: false
          })
      }

      fetchUserData()
    } catch (error: any) {
      console.error('Error cancelling confirmation:', error)
      alert('Failed to cancel. Please try again.')
    }
  }

  const handleRequestAgain = async (confirmation: RideConfirmation) => {
    if (!window.confirm('Are you sure you want to request this ride again?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('ride_confirmations')
        .update({ 
          status: 'pending',
          confirmed_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', confirmation.id)

      if (error) throw error

      // Send system message
      let rideDetails = ''
      if (confirmation.car_rides) {
        const ride = confirmation.car_rides
        const departureDate = new Date(ride.departure_date_time).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
        rideDetails = `${ride.from_location} → ${ride.to_location} on ${departureDate}`
      } else if (confirmation.trips) {
        const trip = confirmation.trips
        const travelDate = new Date(trip.travel_date).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        })
        rideDetails = `${trip.leaving_airport} → ${trip.destination_airport} on ${travelDate}`
        if (trip.departure_time) {
          rideDetails += ` at ${trip.departure_time}`
        }
      }
      
      const rideType = confirmation.ride_id ? 'car ride' : 'airport trip'
      const systemMessage = `🚗 New ride confirmation request received for your ${rideType}: ${rideDetails}. You can accept/reject this request in your confirmations tab.`
      
      await supabase
        .from('chat_messages')
        .insert({
          sender_id: confirmation.passenger_id,
          receiver_id: confirmation.ride_owner_id,
          message_content: systemMessage,
          message_type: 'system',
          is_read: false
        })

      fetchUserData()
    } catch (error: any) {
      console.error('Error requesting again:', error)
      alert('Failed to send request. Please try again.')
    }
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
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center overflow-hidden">
                {userProfile?.profile_image_url ? (
                  <img
                    src={userProfile.profile_image_url}
                    alt={userProfile.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={40} className="text-white" />
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold">{userProfile?.full_name}</h1>
                <p className="text-blue-100">{user?.email}</p>
                <p className="text-blue-100 text-sm">
                  Member since {new Date(userProfile?.created_at || '').toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-8">
              {[
                { id: 'profile', label: 'Profile', icon: User },
                { id: 'trips', label: 'Airport Trips', icon: Plane },
                { id: 'rides', label: 'Car Rides', icon: Car },
                { id: 'confirmations', label: 'Confirmations', icon: Check }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as ProfileTab)}
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                  {id === 'confirmations' && confirmations.filter(c => c.status === 'pending' && c.ride_owner_id === user?.id).length > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {confirmations.filter(c => c.status === 'pending' && c.ride_owner_id === user?.id).length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Profile Information</h2>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      <Edit size={16} />
                      <span>Edit Profile</span>
                    </button>
                  ) : (
                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          setIsEditing(false)
                          setFullName(userProfile?.full_name || '')
                          setAge(userProfile?.age?.toString() || '')
                          setGender(userProfile?.gender || '')
                          setProfileImageUrl(userProfile?.profile_image_url || '')
                        }}
                        className="flex items-center space-x-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                      >
                        <X size={16} />
                        <span>Cancel</span>
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={loading}
                        className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        <Save size={16} />
                        <span>{loading ? 'Saving...' : 'Save'}</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      />
                    ) : (
                      <p className="text-gray-900 py-3">{userProfile?.full_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <p className="text-gray-900 py-3">{user?.email}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        min="18"
                        max="100"
                      />
                    ) : (
                      <p className="text-gray-900 py-3">{userProfile?.age || 'Not specified'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                    {isEditing ? (
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
                    ) : (
                      <p className="text-gray-900 py-3">{userProfile?.gender || 'Not specified'}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Profile Image URL</label>
                    {isEditing ? (
                      <input
                        type="url"
                        value={profileImageUrl}
                        onChange={(e) => setProfileImageUrl(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        placeholder="https://example.com/your-image.jpg"
                      />
                    ) : (
                      <p className="text-gray-900 py-3">{userProfile?.profile_image_url || 'No image set'}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'trips' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Your Airport Trips</h2>
                  <span className="text-gray-600">{trips.length} trip{trips.length !== 1 ? 's' : ''}</span>
                </div>

                {trips.length === 0 ? (
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
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Plane size={20} className="text-blue-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {trip.leaving_airport} → {trip.destination_airport}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {formatDate(trip.travel_date)}
                                {trip.departure_time && ` at ${trip.departure_time}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => onEditTrip(trip)}
                              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTrip(trip.id)}
                              className="text-red-600 hover:text-red-700 font-medium text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        {trip.price && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <span className="text-sm font-medium text-green-600">
                              Service Price: {getCurrencySymbol(trip.currency || 'USD')}{trip.price}
                              {trip.negotiable && ' (Negotiable)'}
                            </span>
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
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Your Car Rides</h2>
                  <span className="text-gray-600">{rides.length} ride{rides.length !== 1 ? 's' : ''}</span>
                </div>

                {rides.length === 0 ? (
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
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <Car size={20} className="text-green-600" />
                            </div>
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
                              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteRide(ride.id)}
                              className="text-red-600 hover:text-red-700 font-medium text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <span className="text-sm font-medium text-green-600">
                            Price: {getCurrencySymbol(ride.currency || 'USD')}{ride.price} per passenger
                            {ride.negotiable && ' (Negotiable)'}
                          </span>
                        </div>

                        {ride.intermediate_stops && ride.intermediate_stops.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-sm font-medium text-gray-700 mb-2">Intermediate Stops:</p>
                            <div className="space-y-1">
                              {ride.intermediate_stops.map((stop, index) => (
                                <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                                  <MapPin size={12} />
                                  <span>{stop.address}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'confirmations' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Ride Confirmations</h2>
                  <span className="text-gray-600">{filteredConfirmations.length} confirmation{filteredConfirmations.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Type</label>
                    <select
                      value={confirmationFilter}
                      onChange={(e) => setConfirmationFilter(e.target.value as any)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Types</option>
                      <option value="car">Car Rides</option>
                      <option value="airport">Airport Trips</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
                    <select
                      value={confirmationStatusFilter}
                      onChange={(e) => setConfirmationStatusFilter(e.target.value as any)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                {filteredConfirmations.length === 0 ? (
                  <div className="text-center py-12">
                    <Check size={48} className="text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No confirmations yet</h3>
                    <p className="text-gray-600">Your ride confirmations will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredConfirmations.map((confirmation) => {
                      const isOwner = getConfirmationRole(confirmation) === 'owner'
                      const ride = confirmation.car_rides
                      const trip = confirmation.trips
                      const otherUser = confirmation.user_profiles

                      return (
                        <div key={confirmation.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-semibold text-sm">
                                  {otherUser.full_name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {isOwner ? `${otherUser.full_name} (Passenger)` : `Your request to ${otherUser.full_name}`}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  {isOwner ? 'Wants to join your' : 'You requested to join'} {ride ? 'car ride' : 'airport trip'}
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
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600 mb-1">To</p>
                                  <div className="font-medium text-gray-900">{trip.destination_airport}</div>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600 mb-1">Travel Date</p>
                                  <div className="font-medium text-gray-900 flex items-center">
                                    <Calendar size={14} className="mr-1 text-gray-400" />
                                    {formatDate(trip.travel_date)}
                                    {trip.departure_time && ` at ${trip.departure_time}`}
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
                              onClick={() => onStartChat(otherUser.id, otherUser.full_name)}
                              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                            >
                              <MessageCircle size={16} />
                              <span>Chat with {otherUser.full_name}</span>
                            </button>

                            <div className="flex items-center space-x-3">
                              {isOwner && confirmation.status === 'pending' && (
                                <RideConfirmationActions
                                  confirmation={confirmation}
                                  onUpdate={fetchUserData}
                                  onStartChat={onStartChat}
                                />
                              )}

                              {confirmation.status === 'accepted' && (
                                <button
                                  onClick={() => handleCancelConfirmation(confirmation.id, isOwner)}
                                  className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                >
                                  <X size={16} />
                                  <span>Cancel</span>
                                </button>
                              )}

                              {!isOwner && confirmation.status === 'rejected' && (
                                <button
                                  onClick={() => handleRequestAgain(confirmation)}
                                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                >
                                  <Check size={16} />
                                  <span>Request Again</span>
                                </button>
                              )}

                              {!isOwner && confirmation.status === 'pending' && (
                                <div className="flex items-center space-x-2 text-yellow-600">
                                  <Clock size={16} />
                                  <span className="text-sm">Waiting for response...</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}