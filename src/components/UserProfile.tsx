import React, { useState, useEffect } from 'react'
import { ArrowLeft, User, Calendar, Car, Plane, MessageCircle, CreditCard as Edit, Trash2, History, Settings, Bell, UserCog, Star, Clock, TriangleAlert as AlertTriangle, Shield, Archive, Send, Activity } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { CarRide, Trip, RideConfirmation, TripRequest, RideRequest } from '../types'
import UserConfirmationsContent from './UserConfirmationsContent'
import PassengerManagement from './PassengerManagement'
import RideHistoryModal from './RideHistoryModal'
import ConfirmationHistoryView from './ConfirmationHistoryView'
import ExpiryManagementPanel from './ExpiryManagementPanel'
import TestConfirmationFlow from './TestConfirmationFlow'
import NotificationSettings from './NotificationSettings'
import ProfileEditForm from './ProfileEditForm'
import ReviewForm from './ReviewForm'
import BlockedUsersView from './BlockedUsersView'
import ClosureHistoryView from './ClosureHistoryView'
import JoinedTripsView from './JoinedTripsView'
import JoinedRidesView from './JoinedRidesView'
import TripCategorySelector from './TripCategorySelector'
import RideCategorySelector from './RideCategorySelector'
import SystemHealthDashboard from './SystemHealthDashboard'
import NotificationManagement from './NotificationManagement'
import { getCurrencySymbol } from '../utils/currencies'
import { formatDateSafe, formatDateTimeSafe } from '../utils/dateHelpers'

interface UserProfileProps {
  onBack: () => void
  onStartChat: (userId: string, userName: string, ride?: CarRide, trip?: Trip) => void
  onEditTrip: (trip: Trip) => void
  onEditRide: (ride: CarRide) => void
  initialTab?: string
}

type ProfileTab = 'overview' | 'trips' | 'rides' | 'confirmations' | 'test' | 'notifications' | 'notification-management' | 'blocked' | 'closure-history'
type TripView = 'selector' | 'offered' | 'joined'
type RideView = 'selector' | 'offered' | 'joined'

export default function UserProfile({ onBack, onStartChat, onEditTrip, onEditRide, initialTab }: UserProfileProps) {
  const { user, userProfile } = useAuth()
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab === 'confirmations' ? 'confirmations' : 'overview')
  const [tripView, setTripView] = useState<TripView>('selector')
  const [rideView, setRideView] = useState<RideView>('selector')
  const [trips, setTrips] = useState<Trip[]>([])
  const [rides, setRides] = useState<CarRide[]>([])
  const [joinedTrips, setJoinedTrips] = useState<RideConfirmation[]>([])
  const [joinedRides, setJoinedRides] = useState<RideConfirmation[]>([])
  const [requestedTrips, setRequestedTrips] = useState<TripRequest[]>([])
  const [requestedRides, setRequestedRides] = useState<RideRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedRide, setSelectedRide] = useState<CarRide | null>(null)
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [showRideHistory, setShowRideHistory] = useState(false)
  const [showProfileEdit, setShowProfileEdit] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState<{
    show: boolean
    type: 'trip' | 'ride'
    id: string
    name: string
  }>({ show: false, type: 'trip', id: '', name: '' })

  useEffect(() => {
    if (user) {
      fetchUserData()
    }
  }, [user])

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab === 'confirmations' ? 'confirmations' : 'overview')
    }
  }, [initialTab])

  // Reset views when switching tabs
  useEffect(() => {
    if (activeTab !== 'trips') {
      setTripView('selector')
    }
    if (activeTab !== 'rides') {
      setRideView('selector')
    }
  }, [activeTab])
  
  const fetchUserData = async () => {
    if (!user) return

    setLoading(true)
    setError('')

    try {
      console.log('Fetching user data for:', user.id)
      
      // Fetch user's trips
      const { data: tripsData, error: tripsError } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (tripsError) throw tripsError
      console.log('Fetched trips:', tripsData?.length || 0)

      // Fetch user's rides
      const { data: ridesData, error: ridesError } = await supabase
        .from('car_rides')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (ridesError) throw ridesError
      console.log('Fetched rides:', ridesData?.length || 0)

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
      console.log('Fetched joined trips:', joinedTripsData?.length || 0)

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
      console.log('Fetched joined rides:', joinedRidesData?.length || 0)
      
      // Fetch trip requests user has made
      const { data: requestedTripsData, error: requestedTripsError } = await supabase
        .from('trip_requests')
        .select(`
          *,
          user_profiles!trip_requests_passenger_id_fkey (
            id,
            full_name,
            profile_image_url
          )
        `)
        .eq('passenger_id', user.id)
        .order('created_at', { ascending: false })

      if (requestedTripsError) throw requestedTripsError
      console.log('Fetched requested trips:', requestedTripsData?.length || 0)
      if (requestedTripsData && requestedTripsData.length > 0) {
        console.log('Sample requested trip:', requestedTripsData[0])
      }

      // Fetch ride requests user has made
      const { data: requestedRidesData, error: requestedRidesError } = await supabase
        .from('ride_requests')
        .select(`
          *,
          user_profiles!ride_requests_passenger_id_fkey (
            id,
            full_name,
            profile_image_url
          )
        `)
        .eq('passenger_id', user.id)
        .order('created_at', { ascending: false })

      if (requestedRidesError) throw requestedRidesError
      console.log('Fetched requested rides:', requestedRidesData?.length || 0)
      if (requestedRidesData && requestedRidesData.length > 0) {
        console.log('Sample requested ride:', requestedRidesData[0])
      }
      
      setTrips(tripsData || [])
      setRides(ridesData || [])
      setJoinedTrips(joinedTripsData || [])
      setJoinedRides(joinedRidesData || [])
      setRequestedTrips(requestedTripsData || [])
      setRequestedRides(requestedRidesData || [])
      
      console.log('User data fetch completed successfully')
      console.log('Final data counts:', {
        trips: tripsData?.length || 0,
        rides: ridesData?.length || 0,
        joinedTrips: joinedTripsData?.length || 0,
        joinedRides: joinedRidesData?.length || 0,
        requestedTrips: requestedTripsData?.length || 0,
        requestedRides: requestedRidesData?.length || 0
      })
      
      // If we're on the notification-management tab, also refresh notifications
      if (activeTab === 'notification-management') {
        console.log('Refreshing notification management data...')
        // Trigger a refresh of the notification management component
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('refreshNotifications'))
        }, 100)
      }
    } catch (error: any) {
      console.error('Error fetching user data:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTrip = async (tripId: string) => {
    setShowDeleteModal({ show: false, type: 'trip', id: '', name: '' })

    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId)

      if (error) throw error

      setTrips(trips.filter(trip => trip.id !== tripId))
    } catch (error: any) {
      setError('Failed to delete trip: ' + error.message)
    }
  }

  const handleDeleteRide = async (rideId: string) => {
    setShowDeleteModal({ show: false, type: 'ride', id: '', name: '' })

    try {
      const { error } = await supabase
        .from('car_rides')
        .delete()
        .eq('id', rideId)

      if (error) throw error

      setRides(rides.filter(ride => ride.id !== rideId))
    } catch (error: any) {
      setError('Failed to delete ride: ' + error.message)
    }
  }

  const showDeleteConfirmation = (type: 'trip' | 'ride', id: string, name: string) => {
    setShowDeleteModal({ show: true, type, id, name })
  }


  const handleViewRideHistory = (ride: CarRide) => {
    setSelectedRide(ride)
    setShowRideHistory(true)
  }

  const handleViewTripHistory = (trip: Trip) => {
    setSelectedTrip(trip)
    setShowRideHistory(true)
  }

  const allTabs: { id: ProfileTab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: <User size={16} /> },
    { id: 'trips', label: 'Airport Trips', icon: <Plane size={16} /> },
    { id: 'rides', label: 'Car Rides', icon: <Car size={16} /> },
    { id: 'confirmations', label: 'Confirmations', icon: <MessageCircle size={16} /> },
    { id: 'blocked', label: 'Blocked Users', icon: <Shield size={16} /> },
    { id: 'closure-history', label: 'Closure History', icon: <Archive size={16} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
    { id: 'notification-management', label: 'Manage Alerts', icon: <Settings size={16} /> },
    { id: 'test', label: 'System Health', icon: <Activity size={16} />, adminOnly: true },
    { id: 'reviews', label: 'Submit Review', icon: <Star size={16} /> }
  ]

  const tabs = allTabs.filter(tab => !tab.adminOnly || userProfile?.is_admin)

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50/90 to-indigo-100/90 travel-bg p-4">
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
                    <h1 className="text-2xl sm:text-3xl font-bold truncate max-w-48 sm:max-w-none">{userProfile?.full_name}</h1>
                    <div className="flex flex-wrap items-center gap-2 sm:space-x-4 mt-2">
                      {userProfile?.age && (
                        <span className="text-blue-100 text-xs sm:text-sm bg-white bg-opacity-20 px-2 sm:px-3 py-1 rounded-full">
                          Age: {userProfile.age}
                        </span>
                      )}
                      {userProfile?.gender && (
                        <span className="text-blue-100 text-xs sm:text-sm bg-white bg-opacity-20 px-2 sm:px-3 py-1 rounded-full capitalize">
                          {userProfile.gender === 'prefer_not_to_say' ? 'Prefer not to say' : userProfile.gender}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-blue-100 text-xs sm:text-sm text-right">Member since {new Date(userProfile?.created_at || '').toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  disabled={loading}
                  className={`flex items-center space-x-2 px-6 py-4 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : loading ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.adminOnly && userProfile?.is_admin && (
                    <span className="ml-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded">
                      ADMIN
                    </span>
                  )}
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

            {loading && (
              <div className="mb-6">
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-4"></div>
                  <span className="text-gray-600">Loading...</span>
                </div>
              </div>
            )}

            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                  <div className="bg-blue-50 rounded-lg p-6 text-center">
                    <Plane size={32} className="text-blue-600 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-blue-600">{trips.length}</h3>
                    <p className="text-blue-800">Airport Trips</p>
                  </div>
                  <div className="bg-indigo-50 rounded-lg p-6 text-center">
                    <User size={32} className="text-indigo-600 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-indigo-600">{joinedTrips.length}</h3>
                    <p className="text-indigo-800">Trips Joined</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-6 text-center">
                    <Car size={32} className="text-green-600 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-green-600">{rides.length}</h3>
                    <p className="text-green-800">Rides Offered</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-6 text-center">
                    <User size={32} className="text-emerald-600 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-emerald-600">{joinedRides.length}</h3>
                    <p className="text-emerald-800">Rides Joined</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <button
                      onClick={() => setShowProfileEdit(true)}
                      disabled={loading}
                      className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                    >
                      <UserCog size={16} />
                      <span>Edit Profile</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('trips')}
                      disabled={loading}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      <Plane size={16} />
                      <span>View Trips</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('rides')}
                      disabled={loading}
                      className="flex items-center space-x-2 bg-green-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                    >
                      <Car size={16} />
                      <span>View Rides</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('confirmations')}
                      disabled={loading}
                      className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
                    >
                      <MessageCircle size={16} />
                      <span>Confirmations</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('blocked')}
                      disabled={loading}
                      className="flex items-center space-x-2 bg-red-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
                    >
                      <Shield size={16} />
                      <span>Blocked Users</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('notifications')}
                      disabled={loading}
                      className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors"
                    >
                      <Bell size={16} />
                      <span>Notifications</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('notification-management')}
                      disabled={loading}
                      className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
                    >
                      <Settings size={16} />
                      <span>Manage Alerts</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('reviews')}
                      disabled={loading}
                      className="flex items-center space-x-2 bg-yellow-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-yellow-700 transition-colors"
                    >
                      <Star size={16} />
                      <span>Submit Review</span>
                    </button>
                  </div>
                  
                  {/* Support Developer Section */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="text-center">
                      <h4 className="font-semibold text-yellow-900 mb-2">☕ Support the Developer</h4>
                      <p className="text-sm text-yellow-800 mb-3">
                        Help keep RideYaari free and growing! Every coffee helps maintain the servers and fund new features.
                      </p>
                      <a
                        href="https://www.buymeacoffee.com/rideyaari"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block hover:scale-105 transition-transform"
                      >
                        <img 
                          src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=☕&slug=rideyaari&button_colour=FFDD00&font_colour=000000&font_family=Comic&outline_colour=000000&coffee_colour=ffffff" 
                          alt="Buy me a coffee"
                          className="h-10"
                        />
                      </a>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {activeTab === 'edit' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Edit Profile</h2>
                  <p className="text-gray-600">
                    Update your personal information, profile picture, password, and email address.
                  </p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <ProfileEditForm 
                    onClose={() => setActiveTab('overview')} 
                    onSuccess={() => {
                      setActiveTab('overview')
                      fetchUserData()
                    }} 
                  />
                </div>
              </div>
            )}

            {activeTab === 'trips' && (
              !loading ? (
              <TripCategorySelector
                offeredTrips={trips}
                joinedTrips={joinedTrips}
                requestedTrips={requestedTrips}
                onStartChat={onStartChat}
                onEditTrip={onEditTrip}
                onDeleteTrip={(tripId) => {
                  const trip = trips.find(t => t.id === tripId)
                  const tripName = trip ? `${trip.leaving_airport} → ${trip.destination_airport}` : 'this trip'
                  showDeleteConfirmation('trip', tripId, tripName)
                }}
                onViewTripHistory={handleViewTripHistory}
                onViewRequests={() => setActiveTab('requests')}
                onRefresh={fetchUserData}
              />
              ) : (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-4"></div>
                  <span className="text-gray-600">Loading trips...</span>
                </div>
              )
            )}

            {activeTab === 'rides' && (
              !loading ? (
              <RideCategorySelector
                offeredRides={rides}
                joinedRides={joinedRides}
                requestedRides={requestedRides}
                onStartChat={onStartChat}
                onEditRide={onEditRide}
                onDeleteRide={(rideId) => {
                  const ride = rides.find(r => r.id === rideId)
                  const rideName = ride ? `${ride.from_location} → ${ride.to_location}` : 'this ride'
                  showDeleteConfirmation('ride', rideId, rideName)
                }}
                onViewRideHistory={handleViewRideHistory}
                onViewRequests={() => setActiveTab('requests')}
                onRefresh={fetchUserData}
              />
              ) : (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-4"></div>
                  <span className="text-gray-600">Loading rides...</span>
                </div>
              )
            )}

            {activeTab === 'confirmations' && (
              !loading ? (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Ride Confirmations</h2>
                  <p className="text-gray-600">
                    Manage your ride requests and confirmations. View pending requests, accepted rides, and handle cancellations.
                  </p>
                </div>
                <UserConfirmationsContent onStartChat={onStartChat} />
              </div>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-4"></div>
                  <span className="text-gray-600">Loading confirmations...</span>
                </div>
              )
            )}

            {activeTab === 'blocked' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Blocked Users</h2>
                  <p className="text-gray-600">
                    Manage users you've blocked. Blocked users cannot send you messages or see your new trips/rides.
                  </p>
                </div>
                <BlockedUsersView onBack={() => setActiveTab('overview')} />
              </div>
            )}

            {activeTab === 'closure-history' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Closure History</h2>
                  <p className="text-gray-600">
                    View trips and rides you've closed. Closed items don't appear in search results but maintain their history.
                  </p>
                </div>
                <ClosureHistoryView onBack={() => setActiveTab('overview')} />
              </div>
            )}

            {activeTab === 'notifications' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Notification Settings</h2>
                  <p className="text-gray-600">
                    Customize how you receive notifications for ride requests, messages, and updates.
                  </p>
                </div>
                <NotificationSettings />
              </div>
            )}

            {activeTab === 'notification-management' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Manage Ride Alerts</h2>
                  <p className="text-gray-600">
                    View and manage your active ride notification preferences. Delete notifications to stop receiving alerts.
                  </p>
                </div>
                <NotificationManagement />
              </div>
            )}

            {activeTab === 'test' && (
              <div>
                {userProfile?.is_admin ? (
                  <>
                    <div className="mb-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900 mb-2">System Health Check</h2>
                          <p className="text-gray-600">
                            Test the confirmation flow and system functionality to ensure everything is working correctly.
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded-full">
                          ADMIN ONLY
                        </span>
                      </div>
                    </div>

                    {/* Debug Section for Requests */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
                      <h3 className="font-semibold text-yellow-900 mb-4">🔍 Request Data Debug</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-yellow-800 mb-2"><strong>Trip Requests:</strong> {requestedTrips.length}</p>
                          {requestedTrips.length > 0 && (
                            <div className="bg-white rounded p-3">
                              <p className="text-xs text-gray-600">Latest request:</p>
                              <p className="text-xs text-gray-900">{requestedTrips[0]?.departure_airport} → {requestedTrips[0]?.destination_airport}</p>
                              <p className="text-xs text-gray-600">Type: {requestedTrips[0]?.request_type}</p>
                              <p className="text-xs text-gray-600">Active: {requestedTrips[0]?.is_active ? 'Yes' : 'No'}</p>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-yellow-800 mb-2"><strong>Ride Requests:</strong> {requestedRides.length}</p>
                          {requestedRides.length > 0 && (
                            <div className="bg-white rounded p-3">
                              <p className="text-xs text-gray-600">Latest request:</p>
                              <p className="text-xs text-gray-900">{requestedRides[0]?.departure_location} → {requestedRides[0]?.destination_location}</p>
                              <p className="text-xs text-gray-600">Type: {requestedRides[0]?.request_type}</p>
                              <p className="text-xs text-gray-600">Active: {requestedRides[0]?.is_active ? 'Yes' : 'No'}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={fetchUserData}
                        className="mt-4 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
                      >
                        Refresh Request Data
                      </button>
                    </div>

                    <SystemHealthDashboard />
                  </>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
                    <Shield size={48} className="text-red-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-red-900 mb-2">Access Denied</h3>
                    <p className="text-red-700">
                      This section is restricted to administrators only. You do not have permission to view this content.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Submit a Review</h2>
                  <p className="text-gray-600">
                    Share your experience with RideYaari to help other travelers and improve our platform.
                  </p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <ReviewForm onReviewSubmitted={() => {
                    // Show success message and refresh
                    setTimeout(() => {
                      window.location.reload()
                    }, 2000)
                  }} />
                </div>
              </div>
            )}
          </div>
        </div>
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

      {/* Custom Delete Confirmation Modal */}
      {showDeleteModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} className="text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Delete {showDeleteModal.type}</h2>
              <p className="text-gray-600">
                Are you sure you want to delete <strong>{showDeleteModal.name}</strong>?
              </p>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle size={16} className="text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-900 mb-1">Warning:</h4>
                  <ul className="text-sm text-red-800 space-y-1">
                    <li>• This action cannot be undone</li>
                    <li>• All associated confirmations will be removed</li>
                    <li>• Chat conversations will remain but the {showDeleteModal.type} reference will be lost</li>
                    <li>• Passengers will be notified if they had confirmed requests</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteModal({ show: false, type: 'trip', id: '', name: '' })}
                className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (showDeleteModal.type === 'trip') {
                    handleDeleteTrip(showDeleteModal.id)
                  } else {
                    handleDeleteRide(showDeleteModal.id)
                  }
                }}
                className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Yes, Delete {showDeleteModal.type}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}