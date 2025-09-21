import React, { useState, useEffect } from 'react'
import { ArrowLeft, User, Calendar, Car, Plane, MessageCircle, Edit, Trash2, History, Settings, Bell, UserCog, Star } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { CarRide, Trip, RideConfirmation } from '../types'
import UserConfirmationsContent from './UserConfirmationsContent'
import PassengerManagement from './PassengerManagement'
import RideHistoryModal from './RideHistoryModal'
import ConfirmationHistoryView from './ConfirmationHistoryView'
import ExpiryManagementPanel from './ExpiryManagementPanel'
import TestConfirmationFlow from './TestConfirmationFlow'
import NotificationSettings from './NotificationSettings'
import ProfileEditForm from './ProfileEditForm'
import ReviewForm from './ReviewForm'
import JoinedTripsView from './JoinedTripsView'
import JoinedRidesView from './JoinedRidesView'
import TripCategorySelector from './TripCategorySelector'
import RideCategorySelector from './RideCategorySelector'
import { getCurrencySymbol } from '../utils/currencies'

interface UserProfileProps {
  onBack: () => void
  onStartChat: (userId: string, userName: string, ride?: CarRide, trip?: Trip) => void
  onEditTrip: (trip: Trip) => void
  onEditRide: (ride: CarRide) => void
  initialTab?: string
}

type ProfileSection = 'overview' | 'edit-profile' | 'trips' | 'rides' | 'confirmations' | 'history' | 'expiry' | 'notifications' | 'test' | 'submit-review'
type TripView = 'selector' | 'offered' | 'joined'
type RideView = 'selector' | 'offered' | 'joined'

export default function UserProfile({ onBack, onStartChat, onEditTrip, onEditRide, initialTab }: UserProfileProps) {
  const { user, userProfile } = useAuth()
  const [activeSection, setActiveSection] = useState<ProfileSection>('overview')
  const [tripView, setTripView] = useState<TripView>('selector')
  const [rideView, setRideView] = useState<RideView>('selector')
  const [trips, setTrips] = useState<Trip[]>([])
  const [rides, setRides] = useState<CarRide[]>([])
  const [joinedTrips, setJoinedTrips] = useState<RideConfirmation[]>([])
  const [joinedRides, setJoinedRides] = useState<RideConfirmation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedRide, setSelectedRide] = useState<CarRide | null>(null)
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [showRideHistory, setShowRideHistory] = useState(false)
  const [showProfileEdit, setShowProfileEdit] = useState(false)

  useEffect(() => {
    if (user) {
      fetchUserData()
    }
  }, [user])

  useEffect(() => {
    if (initialTab === 'confirmations') {
      setActiveSection('confirmations')
    }
  }, [initialTab])

  // Reset views when switching tabs
  useEffect(() => {
    if (activeSection !== 'trips') {
      setTripView('selector')
    }
    if (activeSection !== 'rides') {
      setRideView('selector')
    }
  }, [activeSection])

  const fetchUserData = async () => {
    if (!user) return

    setLoading(true)
    setError('')

    try {
      // Fetch user's trips
      const { data: tripsData, error: tripsError } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (tripsError) throw tripsError

      // Fetch user's rides
      const { data: ridesData, error: ridesError } = await supabase
        .from('car_rides')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (ridesError) throw ridesError

      // Fetch trips user has joined (as passenger)
      const { data: joinedTripsData, error: joinedTripsError } = await supabase
        .from('ride_confirmations')
        .select(`
          *,
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
          ),
          user_profiles!ride_confirmations_ride_owner_id_fkey (
            id,
            full_name,
            profile_image_url
          )
        `)
        .eq('passenger_id', user.id)
        .not('trip_id', 'is', null)
        .order('created_at', { ascending: false })

      if (joinedTripsError) throw joinedTripsError

      // Fetch rides user has joined (as passenger)
      const { data: joinedRidesData, error: joinedRidesError } = await supabase
        .from('ride_confirmations')
        .select(`
          *,
          car_rides!ride_confirmations_ride_id_fkey (
            id,
            from_location,
            to_location,
            from_latitude,
            from_longitude,
            to_latitude,
            to_longitude,
            departure_date_time,
            price,
            currency,
            negotiable,
            intermediate_stops,
            user_id
          ),
          user_profiles!ride_confirmations_ride_owner_id_fkey (
            id,
            full_name,
            profile_image_url
          )
        `)
        .eq('passenger_id', user.id)
        .not('ride_id', 'is', null)
        .order('created_at', { ascending: false })

      if (joinedRidesError) throw joinedRidesError
      setTrips(tripsData || [])
      setRides(ridesData || [])
      setJoinedTrips(joinedTripsData || [])
      setJoinedRides(joinedRidesData || [])
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTrip = async (tripId: string) => {
    if (!confirm('Are you sure you want to delete this trip? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId)

      if (error) throw error

      setTrips(trips.filter(trip => trip.id !== tripId))
    } catch (error: any) {
      alert('Failed to delete trip: ' + error.message)
    }
  }

  const handleDeleteRide = async (rideId: string) => {
    if (!confirm('Are you sure you want to delete this ride? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('car_rides')
        .delete()
        .eq('id', rideId)

      if (error) throw error

      setRides(rides.filter(ride => ride.id !== rideId))
    } catch (error: any) {
      alert('Failed to delete ride: ' + error.message)
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

  const handleViewRideHistory = (ride: CarRide) => {
    setSelectedRide(ride)
    setShowRideHistory(true)
  }

  const handleViewTripHistory = (trip: Trip) => {
    setSelectedTrip(trip)
    setShowRideHistory(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="container mx-auto max-w-6xl">
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
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8">
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center overflow-hidden">
                {userProfile?.profile_image_url ? (
                  <img
                    src={userProfile.profile_image_url}
                    alt={userProfile.full_name}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span className="text-2xl font-bold text-white">
                    {userProfile?.full_name?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                <h1 className="text-3xl font-bold">{userProfile?.full_name}</h1>
                <p className="text-blue-100">Member since {new Date(userProfile?.created_at || '').toLocaleDateString()}</p>
                {userProfile?.age && (
                  <p className="text-blue-100">Age: {userProfile.age}</p>
                )}
                {userProfile?.gender && (
                  <p className="text-blue-100 capitalize">Gender: {userProfile.gender}</p>
                )}
                  </div>
                  <button
                    onClick={() => setShowProfileEdit(true)}
                    className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    <UserCog size={20} />
                    <span>Edit Profile</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {activeSection === 'overview' && (
              <div className="space-y-8">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-blue-900 mb-2">Profile Information</h3>
                      <p className="text-blue-800 text-sm">
                        Keep your profile up to date to help other travelers connect with you safely.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowProfileEdit(true)}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      <UserCog size={16} />
                      <span>Edit Profile</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-blue-50 rounded-lg p-6 text-center">
                    <Plane size={32} className="text-blue-600 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-blue-600">{trips.length}</h3>
                    <p className="text-blue-800">Airport Trips</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-6 text-center">
                    <Car size={32} className="text-green-600 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-green-600">{rides.length}</h3>
                    <p className="text-green-800">Rides Offered</p>
                  </div>
                  <div className="bg-indigo-50 rounded-lg p-6 text-center">
                    <User size={32} className="text-indigo-600 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-indigo-600">{joinedTrips.length}</h3>
                    <p className="text-indigo-800">Trips Joined</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-6 text-center">
                    <User size={32} className="text-emerald-600 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-emerald-600">{joinedRides.length}</h3>
                    <p className="text-emerald-800">Rides Joined</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <button
                      onClick={() => setActiveSection('trips')}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      <Plane size={16} />
                      <span>View Trips</span>
                    </button>
                    <button
                      onClick={() => setActiveSection('rides')}
                      className="flex items-center space-x-2 bg-green-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                    >
                      <Car size={16} />
                      <span>View Rides</span>
                    </button>
                    <button
                      onClick={() => setActiveSection('confirmations')}
                      className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
                    >
                      <MessageCircle size={16} />
                      <span>Confirmations</span>
                    </button>
                    <button
                      onClick={() => setActiveSection('notifications')}
                      className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors"
                    >
                      <Bell size={16} />
                      <span>Notifications</span>
                    </button>
                    <button
                      onClick={() => setActiveSection('submit-review')}
                      className="flex items-center space-x-2 bg-yellow-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-yellow-700 transition-colors"
                    >
                      <Star size={16} />
                      <span>Submit Review</span>
                    </button>
                  </div>
                  
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button
                      onClick={() => setActiveSection('history')}
                      className="flex items-center space-x-2 border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      <History size={16} />
                      <span>View History</span>
                    </button>
                    <button
                      onClick={() => setActiveSection('expiry')}
                      className="flex items-center space-x-2 border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      <Calendar size={16} />
                      <span>Expiry Management</span>
                    </button>
                    <button
                      onClick={() => setActiveSection('test')}
                      className="flex items-center space-x-2 border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      <Settings size={16} />
                      <span>System Test</span>
                    </button>
                    <button
                      onClick={() => setShowProfileEdit(true)}
                      className="flex items-center space-x-2 border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      <UserCog size={16} />
                      <span>Edit Profile</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'trips' && (
              <div>
                <div className="mb-6">
                  <button
                    onClick={() => setActiveSection('overview')}
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors mb-4"
                  >
                    <ArrowLeft size={20} />
                    <span>Back to Overview</span>
                  </button>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Airport Trips</h2>
                  <p className="text-gray-600">
                    Manage your airport trips and view trips you've joined as a passenger.
                  </p>
                </div>
                <TripCategorySelector
                  offeredTrips={trips}
                  joinedTrips={joinedTrips}
                  onStartChat={onStartChat}
                  onEditTrip={onEditTrip}
                  onDeleteTrip={handleDeleteTrip}
                  onViewTripHistory={handleViewTripHistory}
                  onRefresh={fetchUserData}
                />
              </div>
            )}

            {activeSection === 'rides' && (
              <div>
                <div className="mb-6">
                  <button
                    onClick={() => setActiveSection('overview')}
                    className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium transition-colors mb-4"
                  >
                    <ArrowLeft size={20} />
                    <span>Back to Overview</span>
                  </button>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Car Rides</h2>
                  <p className="text-gray-600">
                    Manage your car rides and view rides you've joined as a passenger.
                  </p>
                </div>
                <RideCategorySelector
                  offeredRides={rides}
                  joinedRides={joinedRides}
                  onStartChat={onStartChat}
                  onEditRide={onEditRide}
                  onDeleteRide={handleDeleteRide}
                  onViewRideHistory={handleViewRideHistory}
                  onRefresh={fetchUserData}
                />
              </div>
            )}

            {activeSection === 'confirmations' && (
              <div>
                <div className="mb-6">
                  <button
                    onClick={() => setActiveSection('overview')}
                    className="flex items-center space-x-2 text-purple-600 hover:text-purple-700 font-medium transition-colors mb-4"
                  >
                    <ArrowLeft size={20} />
                    <span>Back to Overview</span>
                  </button>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Ride Confirmations</h2>
                  <p className="text-gray-600">
                    Manage your ride requests and confirmations. View pending requests, accepted rides, and handle cancellations.
                  </p>
                </div>
                <UserConfirmationsContent onStartChat={onStartChat} />
              </div>
            )}

            {activeSection === 'history' && (
              <div>
                <div className="mb-6">
                  <button
                    onClick={() => setActiveSection('overview')}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-700 font-medium transition-colors mb-4"
                  >
                    <ArrowLeft size={20} />
                    <span>Back to Overview</span>
                  </button>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirmation History</h2>
                  <p className="text-gray-600">
                    View detailed analytics and history of all your ride confirmations.
                  </p>
                </div>
                <ConfirmationHistoryView onStartChat={onStartChat} />
              </div>
            )}

            {activeSection === 'expiry' && (
              <div>
                <div className="mb-6">
                  <button
                    onClick={() => setActiveSection('overview')}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-700 font-medium transition-colors mb-4"
                  >
                    <ArrowLeft size={20} />
                    <span>Back to Overview</span>
                  </button>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Expiry Management</h2>
                  <p className="text-gray-600">
                    Monitor and manage confirmation expiry times to ensure timely responses.
                  </p>
                </div>
                <ExpiryManagementPanel onRefresh={fetchUserData} />
              </div>
            )}

            {activeSection === 'notifications' && (
              <div>
                <div className="mb-6">
                  <button
                    onClick={() => setActiveSection('overview')}
                    className="flex items-center space-x-2 text-orange-600 hover:text-orange-700 font-medium transition-colors mb-4"
                  >
                    <ArrowLeft size={20} />
                    <span>Back to Overview</span>
                  </button>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Notification Settings</h2>
                  <p className="text-gray-600">
                    Customize how you receive notifications for ride requests, messages, and updates.
                  </p>
                </div>
                <NotificationSettings />
              </div>
            )}

            {activeSection === 'test' && (
              <div>
                <div className="mb-6">
                  <button
                    onClick={() => setActiveSection('overview')}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-700 font-medium transition-colors mb-4"
                  >
                    <ArrowLeft size={20} />
                    <span>Back to Overview</span>
                  </button>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">System Health Check</h2>
                  <p className="text-gray-600">
                    Test the confirmation flow and system functionality to ensure everything is working correctly.
                  </p>
                </div>
                <TestConfirmationFlow />
              </div>
            )}

            {activeSection === 'submit-review' && (
              <div>
                <div className="mb-6">
                  <button
                    onClick={() => setActiveSection('overview')}
                    className="flex items-center space-x-2 text-yellow-600 hover:text-yellow-700 font-medium transition-colors mb-4"
                  >
                    <ArrowLeft size={20} />
                    <span>Back to Overview</span>
                  </button>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Submit a Review</h2>
                  <p className="text-gray-600">
                    Share your experience with RideYaari to help other travelers and improve our platform.
                  </p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <ReviewForm onReviewSubmitted={() => {
                    // Show success message and optionally redirect back to overview
                    setTimeout(() => {
                      setActiveSection('overview')
                    }, 3000)
                  }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Legacy sections for backward compatibility */}
        {activeSection !== 'overview' && activeSection !== 'trips' && activeSection !== 'rides' && 
         activeSection !== 'confirmations' && activeSection !== 'history' && activeSection !== 'expiry' && 
         activeSection !== 'notifications' && activeSection !== 'test' && activeSection !== 'submit-review' && (
          <div className="p-8">
            {activeSection === 'edit-profile' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Edit Profile</h2>
                  <p className="text-gray-600">
                    Update your personal information, profile picture, password, and email address.
                  </p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <ProfileEditForm 
                    onClose={() => setActiveSection('overview')} 
                    onSuccess={() => {
                      setActiveSection('overview')
                      fetchUserData()
                    }} 
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Remove all the old tab content sections since they're now handled above */}
      {false && (
        <div>
          {/* This section is now unused but kept for reference */}
          <div className="space-y-8">
            {activeSection === 'trips' && (
              <TripCategorySelector
                offeredTrips={trips}
                joinedTrips={joinedTrips}
                onStartChat={onStartChat}
                onEditTrip={onEditTrip}
                onDeleteTrip={handleDeleteTrip}
                onViewTripHistory={handleViewTripHistory}
                onRefresh={fetchUserData}
              />
            )}

            {activeSection === 'rides' && (
              <RideCategorySelector
                offeredRides={rides}
                joinedRides={joinedRides}
                onStartChat={onStartChat}
                onEditRide={onEditRide}
                onDeleteRide={handleDeleteRide}
                onViewRideHistory={handleViewRideHistory}
                onRefresh={fetchUserData}
              />
            )}

          </div>
        )}
      </div>

        {/* Ride History Modal */}
        <RideHistoryModal
          isOpen={showRideHistory}
          onClose={() => {
            setShowRideHistory(false)
            setSelectedRide(null)
            setSelectedTrip(null)
          }}
          ride={selectedRide || undefined}
          trip={selectedTrip || undefined}
          onStartChat={onStartChat}
        />
      </div>

      {/* Profile Edit Modal */}
      {showProfileEdit && (
        <ProfileEditForm
          onClose={() => setShowProfileEdit(false)}
          onSuccess={() => {
            setShowProfileEdit(false)
            fetchUserData()
          }}
        />
      )}
    </div>
  )
}