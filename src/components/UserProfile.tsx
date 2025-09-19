import React, { useState, useEffect } from 'react'
import { ArrowLeft, User, Edit, Save, X, Calendar, MapPin, Clock, Car, Plane, Check, AlertTriangle, MessageCircle, DollarSign } from 'lucide-react'
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
  const [editingProfile, setEditingProfile] = useState(false)
  const [fullName, setFullName] = useState(userProfile?.full_name || '')
  const [age, setAge] = useState(userProfile?.age?.toString() || '')
  const [gender, setGender] = useState(userProfile?.gender || '')
  const [profileImageUrl, setProfileImageUrl] = useState(userProfile?.profile_image_url || '')
  const [saving, setSaving] = useState(false)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [disclaimerAction, setDisclaimerAction] = useState<{
    type: string
    confirmationId: string
    action: 'accept' | 'reject' | 'cancel'
  } | null>(null)

  useEffect(() => {
    if (user) {
      fetchUserData()
      
      // Subscribe to confirmation changes
      const subscription = supabase
        .channel('user_confirmations')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ride_confirmations',
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

  const fetchUserData = async () => {
    if (!user) return

    setLoading(true)
    try {
      await Promise.all([
        fetchTrips(),
        fetchRides(),
        fetchConfirmations()
      ])
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTrips = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', user.id)
      .order('travel_date', { ascending: false })

    if (!error && data) {
      setTrips(data)
    }
  }

  const fetchRides = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('car_rides')
      .select('*')
      .eq('user_id', user.id)
      .order('departure_date_time', { ascending: false })

    if (!error && data) {
      setRides(data)
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
        .order('created_at', { ascending: false })

      if (!error && data) {
        setConfirmations(data)
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
          full_name: fullName,
          age: age ? parseInt(age) : null,
          gender: gender || null,
          profile_image_url: profileImageUrl || null
        })
        .eq('id', user.id)

      if (error) throw error

      setEditingProfile(false)
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

  const handleConfirmationAction = (confirmationId: string, action: 'accept' | 'reject' | 'cancel') => {
    const confirmation = confirmations.find(c => c.id === confirmationId)
    if (!confirmation) return

    const rideType = confirmation.ride_id ? 'car ride' : 'airport trip'
    
    setDisclaimerAction({ type: rideType, confirmationId, action })
    setShowDisclaimer(true)
  }

  const handleConfirmAction = async () => {
    if (!disclaimerAction || !user) return

    setShowDisclaimer(false)
    
    try {
      const { confirmationId, action } = disclaimerAction
      const confirmation = confirmations.find(c => c.id === confirmationId)
      if (!confirmation) return

      let newStatus: string
      let systemMessage: string
      let receiverId: string

      const isOwner = confirmation.ride_owner_id === user.id
      const rideDetails = confirmation.car_rides 
        ? `car ride from ${confirmation.car_rides.from_location} to ${confirmation.car_rides.to_location}`
        : `airport trip from ${confirmation.trips?.leaving_airport} to ${confirmation.trips?.destination_airport}`

      if (action === 'accept') {
        newStatus = 'accepted'
        systemMessage = `🎉 Great news! Your request for the ${rideDetails} has been ACCEPTED! You can now coordinate pickup details and payment.`
        receiverId = confirmation.passenger_id
      } else if (action === 'reject') {
        newStatus = 'rejected'
        systemMessage = `😔 Unfortunately, your request for the ${rideDetails} has been declined. You can request to join this ride again if needed.`
        receiverId = confirmation.passenger_id
      } else { // cancel
        newStatus = 'rejected'
        if (isOwner) {
          systemMessage = `😔 The ride owner has cancelled the ${rideDetails}. You can request to join this ride again if it becomes available.`
          receiverId = confirmation.passenger_id
        } else {
          systemMessage = `😔 The passenger has cancelled their spot on the ${rideDetails}. The ride is now available for other passengers.`
          receiverId = confirmation.ride_owner_id
        }
      }

      // Update confirmation status
      const { error } = await supabase
        .from('ride_confirmations')
        .update({
          status: newStatus,
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', confirmationId)

      if (error) throw error

      // Send system message
      await supabase
        .from('chat_messages')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          message_content: systemMessage,
          message_type: 'system',
          is_read: false
        })

      // Refresh confirmations
      fetchConfirmations()
    } catch (error) {
      console.error('Error updating confirmation:', error)
      alert('Failed to update confirmation. Please try again.')
    } finally {
      setDisclaimerAction(null)
    }
  }

  const getDisclaimerContent = (type: string, action: string) => {
    const actionText = action === 'accept' ? 'Accept' : action === 'reject' ? 'Reject' : 'Cancel'
    
    return {
      title: `${actionText} Ride Confirmation`,
      points: [
        `This will ${action} the ride confirmation`,
        'The other party will be notified immediately',
        action === 'accept' ? 'You are committing to the agreed arrangements' : 'This action can be reversed if needed',
        'All communication will remain in your chat history'
      ],
      explanation: `You are about to ${action} this ${type} confirmation. Make sure you have discussed any necessary details in chat.`
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

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Profile Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt={fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={32} className="text-blue-600" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{userProfile?.full_name}</h1>
                <p className="text-gray-600">Member since {new Date(userProfile?.created_at || '').toLocaleDateString()}</p>
              </div>
            </div>
            <button
              onClick={() => setEditingProfile(!editingProfile)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Edit size={16} />
              <span>Edit Profile</span>
            </button>
          </div>

          {/* Edit Profile Form */}
          {editingProfile && (
            <div className="mb-8 p-6 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Profile</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Profile Image URL</label>
                  <input
                    type="url"
                    value={profileImageUrl}
                    onChange={(e) => setProfileImageUrl(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>
              <div className="flex space-x-3 mt-4">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Save size={16} />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
                <button
                  onClick={() => setEditingProfile(false)}
                  className="flex items-center space-x-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  <X size={16} />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex space-x-1 mb-8 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('trips')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                activeTab === 'trips'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              My Trips ({trips.length})
            </button>
            <button
              onClick={() => setActiveTab('rides')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                activeTab === 'rides'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              My Rides ({rides.length})
            </button>
            <button
              onClick={() => setActiveTab('confirmations')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                activeTab === 'confirmations'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Confirmations ({confirmations.length})
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'trips' && (
            <div className="space-y-4">
              {trips.length === 0 ? (
                <div className="text-center py-12">
                  <Plane size={48} className="text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No trips yet</h3>
                  <p className="text-gray-600">Your posted trips will appear here</p>
                </div>
              ) : (
                trips.map((trip) => (
                  <div key={trip.id} className="border border-gray-200 rounded-lg p-6">
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
                      <div className="flex space-x-2">
                        <button
                          onClick={() => onEditTrip(trip)}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTrip(trip.id)}
                          className="text-red-600 hover:text-red-700 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {trip.departure_time && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                        <Clock size={16} />
                        <span>Departure: {trip.departure_time}</span>
                        {trip.departure_timezone && (
                          <span className="text-gray-500">({trip.departure_timezone})</span>
                        )}
                      </div>
                    )}
                    {trip.price && (
                      <div className="flex items-center space-x-2 text-sm text-green-600">
                        <DollarSign size={16} />
                        <span>{getCurrencySymbol(trip.currency || 'USD')}{trip.price}</span>
                        {trip.negotiable && <span className="text-gray-500">(Negotiable)</span>}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'rides' && (
            <div className="space-y-4">
              {rides.length === 0 ? (
                <div className="text-center py-12">
                  <Car size={48} className="text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No rides yet</h3>
                  <p className="text-gray-600">Your posted rides will appear here</p>
                </div>
              ) : (
                rides.map((ride) => (
                  <div key={ride.id} className="border border-gray-200 rounded-lg p-6">
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
                      <div className="flex space-x-2">
                        <button
                          onClick={() => onEditRide(ride)}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteRide(ride.id)}
                          className="text-red-600 hover:text-red-700 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-green-600">
                      <DollarSign size={16} />
                      <span>{getCurrencySymbol(ride.currency || 'USD')}{ride.price}</span>
                      {ride.negotiable && <span className="text-gray-500">(Negotiable)</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'confirmations' && (
            <div className="space-y-6">
              {confirmations.length === 0 ? (
                <div className="text-center py-12">
                  <Check size={48} className="text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No confirmations yet</h3>
                  <p className="text-gray-600">Your ride confirmations will appear here</p>
                </div>
              ) : (
                <>
                  {/* Car Rides Confirmations */}
                  {confirmations.filter(c => c.car_rides).length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Car size={20} className="text-green-600 mr-2" />
                        Car Rides ({confirmations.filter(c => c.car_rides).length})
                      </h3>
                      <div className="space-y-4">
                        {confirmations.filter(c => c.car_rides).map((confirmation) => {
                          const ride = confirmation.car_rides!
                          const passenger = confirmation.user_profiles
                          const isOwner = confirmation.ride_owner_id === user?.id
                          
                          return (
                            <div key={confirmation.id} className="border border-gray-200 rounded-lg p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                                    <span className="text-white font-semibold text-sm">
                                      {passenger.full_name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-gray-900">
                                      {isOwner ? `${passenger.full_name} wants to join` : `You requested to join`}
                                    </h4>
                                    <p className="text-sm text-gray-600">
                                      {ride.from_location} → {ride.to_location}
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

                              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <p className="text-gray-600 mb-1">Departure</p>
                                    <div className="font-medium text-gray-900 flex items-center">
                                      <Clock size={14} className="mr-1 text-gray-400" />
                                      {formatDateTime(ride.departure_date_time)}
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-gray-600 mb-1">Price</p>
                                    <div className="font-medium text-green-600">
                                      {getCurrencySymbol(ride.currency || 'USD')}{ride.price}
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-gray-600 mb-1">Requested</p>
                                    <div className="font-medium text-gray-900">
                                      {new Date(confirmation.created_at).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <button
                                  onClick={() => onStartChat(
                                    isOwner ? passenger.id : confirmation.ride_owner_id,
                                    isOwner ? passenger.full_name : 'Ride Owner'
                                  )}
                                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                                >
                                  <MessageCircle size={16} />
                                  <span>Chat</span>
                                </button>

                                <div className="flex items-center space-x-3">
                                  {confirmation.status === 'pending' && isOwner && (
                                    <>
                                      <button
                                        onClick={() => handleConfirmationAction(confirmation.id, 'reject')}
                                        className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                      >
                                        <X size={16} />
                                        <span>Reject</span>
                                      </button>
                                      <button
                                        onClick={() => handleConfirmationAction(confirmation.id, 'accept')}
                                        className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                      >
                                        <Check size={16} />
                                        <span>Accept</span>
                                      </button>
                                    </>
                                  )}

                                  {confirmation.status === 'accepted' && (
                                    <button
                                      onClick={() => handleConfirmationAction(confirmation.id, 'cancel')}
                                      className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                    >
                                      <AlertTriangle size={16} />
                                      <span>Cancel</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Airport Trips Confirmations */}
                  {confirmations.filter(c => c.trips).length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Plane size={20} className="text-blue-600 mr-2" />
                        Airport Trips ({confirmations.filter(c => c.trips).length})
                      </h3>
                      <div className="space-y-4">
                        {confirmations.filter(c => c.trips).map((confirmation) => {
                          const trip = confirmation.trips!
                          const passenger = confirmation.user_profiles
                          const isOwner = confirmation.ride_owner_id === user?.id
                          
                          return (
                            <div key={confirmation.id} className="border border-gray-200 rounded-lg p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                                    <span className="text-white font-semibold text-sm">
                                      {passenger.full_name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-gray-900">
                                      {isOwner ? `${passenger.full_name} wants to join` : `You requested to join`}
                                    </h4>
                                    <p className="text-sm text-gray-600">
                                      {trip.leaving_airport} → {trip.destination_airport}
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

                              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <p className="text-gray-600 mb-1">Travel Date</p>
                                    <div className="font-medium text-gray-900 flex items-center">
                                      <Calendar size={14} className="mr-1 text-gray-400" />
                                      {formatDate(trip.travel_date)}
                                    </div>
                                  </div>
                                  {trip.price && (
                                    <div>
                                      <p className="text-gray-600 mb-1">Service Price</p>
                                      <div className="font-medium text-green-600">
                                        {getCurrencySymbol(trip.currency || 'USD')}{trip.price}
                                      </div>
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-gray-600 mb-1">Requested</p>
                                    <div className="font-medium text-gray-900">
                                      {new Date(confirmation.created_at).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <button
                                  onClick={() => onStartChat(
                                    isOwner ? passenger.id : confirmation.ride_owner_id,
                                    isOwner ? passenger.full_name : 'Trip Owner'
                                  )}
                                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                                >
                                  <MessageCircle size={16} />
                                  <span>Chat</span>
                                </button>

                                <div className="flex items-center space-x-3">
                                  {confirmation.status === 'pending' && isOwner && (
                                    <>
                                      <button
                                        onClick={() => handleConfirmationAction(confirmation.id, 'reject')}
                                        className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                      >
                                        <X size={16} />
                                        <span>Reject</span>
                                      </button>
                                      <button
                                        onClick={() => handleConfirmationAction(confirmation.id, 'accept')}
                                        className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                      >
                                        <Check size={16} />
                                        <span>Accept</span>
                                      </button>
                                    </>
                                  )}

                                  {confirmation.status === 'accepted' && (
                                    <button
                                      onClick={() => handleConfirmationAction(confirmation.id, 'cancel')}
                                      className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                    >
                                      <AlertTriangle size={16} />
                                      <span>Cancel</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Disclaimer Modal */}
        <DisclaimerModal
          isOpen={showDisclaimer}
          onClose={() => {
            setShowDisclaimer(false)
            setDisclaimerAction(null)
          }}
          onConfirm={handleConfirmAction}
          loading={false}
          type="ride"
          content={disclaimerAction ? getDisclaimerContent(disclaimerAction.type, disclaimerAction.action) : undefined}
        />
      </div>
    </div>
  )
}