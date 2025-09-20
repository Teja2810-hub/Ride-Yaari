import React, { useState, useEffect } from 'react'
import { ArrowLeft, User, Calendar, Car, Plane, MessageCircle, Edit, Trash2, History, Settings, Bell, UserCog } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { CarRide, Trip } from '../types'
import UserConfirmationsContent from './UserConfirmationsContent'
import PassengerManagement from './PassengerManagement'
import RideHistoryModal from './RideHistoryModal'
import ConfirmationHistoryView from './ConfirmationHistoryView'
import ExpiryManagementPanel from './ExpiryManagementPanel'
import TestConfirmationFlow from './TestConfirmationFlow'
import NotificationSettings from './NotificationSettings'
import ProfileEditForm from './ProfileEditForm'
import { getCurrencySymbol } from '../utils/currencies'

interface UserProfileProps {
  onBack: () => void
  onStartChat: (userId: string, userName: string, ride?: CarRide, trip?: Trip) => void
  onEditTrip: (trip: Trip) => void
  onEditRide: (ride: CarRide) => void
  initialTab?: string
}

type ProfileTab = 'overview' | 'trips' | 'rides' | 'confirmations' | 'history' | 'expiry' | 'test' | 'notifications'

export default function UserProfile({ onBack, onStartChat, onEditTrip, onEditRide, initialTab }: UserProfileProps) {
  const { user, userProfile } = useAuth()
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab === 'confirmations' ? 'confirmations' : 'overview')
  const [trips, setTrips] = useState<Trip[]>([])
  const [rides, setRides] = useState<CarRide[]>([])
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
    if (initialTab) {
      setActiveTab(initialTab === 'confirmations' ? 'confirmations' : 'overview')
    }
  }, [initialTab])

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

      setTrips(tripsData || [])
      setRides(ridesData || [])
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

  const tabs: { id: ProfileTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <User size={16} /> },
    { id: 'edit', label: 'Edit Profile', icon: <UserCog size={16} /> },
    { id: 'trips', label: 'Airport Trips', icon: <Plane size={16} /> },
    { id: 'rides', label: 'Car Rides', icon: <Car size={16} /> },
    { id: 'confirmations', label: 'Confirmations', icon: <MessageCircle size={16} /> },
    { id: 'history', label: 'History', icon: <History size={16} /> },
    { id: 'expiry', label: 'Expiry Management', icon: <Calendar size={16} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
    { id: 'test', label: 'System Test', icon: <Settings size={16} /> }
  ]

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

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-6 py-4 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.icon}
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

            {activeTab === 'overview' && (
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-blue-50 rounded-lg p-6 text-center">
                    <Plane size={32} className="text-blue-600 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-blue-600">{trips.length}</h3>
                    <p className="text-blue-800">Airport Trips</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-6 text-center">
                    <Car size={32} className="text-green-600 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-green-600">{rides.length}</h3>
                    <p className="text-green-800">Car Rides</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-6 text-center">
                    <MessageCircle size={32} className="text-purple-600 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-purple-600">Active</h3>
                    <p className="text-purple-800">Conversations</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button
                      onClick={() => setActiveTab('trips')}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      <Plane size={16} />
                      <span>View Trips</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('rides')}
                      className="flex items-center space-x-2 bg-green-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                    >
                      <Car size={16} />
                      <span>View Rides</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('confirmations')}
                      className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
                    >
                      <MessageCircle size={16} />
                      <span>Confirmations</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('notifications')}
                      className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors"
                    >
                      <Bell size={16} />
                      <span>Notifications</span>
                    </button>
                    <button
                      onClick={() => setShowProfileEdit(true)}
                      className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                    >
                      <UserCog size={16} />
                      <span>Edit Profile</span>
                    </button>
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
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Your Airport Trips</h2>
                  <span className="text-gray-600">{trips.length} trip{trips.length !== 1 ? 's' : ''}</span>
                </div>

                {trips.length === 0 ? (
                  <div className="text-center py-12">
                    <Plane size={48} className="text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No trips posted yet</h3>
                    <p className="text-gray-600">Start by posting your first airport trip to connect with other travelers.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {trips.map((trip) => (
                      <div key={trip.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4 mb-4">
                              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <Plane size={24} className="text-blue-600" />
                              </div>
                              <div>
                                <h3 className="text-xl font-semibold text-gray-900">
                                  {trip.leaving_airport} → {trip.destination_airport}
                                </h3>
                                <p className="text-gray-600">
                                  {formatDate(trip.travel_date)}
                                  {trip.departure_time && ` at ${trip.departure_time}`}
                                  {trip.departure_timezone && ` (${trip.departure_timezone})`}
                                </p>
                              </div>
                            </div>

                            {trip.price && (
                              <div className="mb-4">
                                <span className="text-sm font-medium text-green-600">
                                  Service Price: {getCurrencySymbol(trip.currency || 'USD')}{trip.price}
                                  {trip.negotiable && (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-2">
                                      Negotiable
                                    </span>
                                  )}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => handleViewTripHistory(trip)}
                              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                            >
                              <History size={16} />
                              <span>History</span>
                            </button>
                            <button
                              onClick={() => onEditTrip(trip)}
                              className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium transition-colors"
                            >
                              <Edit size={16} />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteTrip(trip.id)}
                              className="flex items-center space-x-2 text-red-600 hover:text-red-700 font-medium transition-colors"
                            >
                              <Trash2 size={16} />
                              <span>Delete</span>
                            </button>
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
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Your Car Rides</h2>
                  <span className="text-gray-600">{rides.length} ride{rides.length !== 1 ? 's' : ''}</span>
                </div>

                {rides.length === 0 ? (
                  <div className="text-center py-12">
                    <Car size={48} className="text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No rides posted yet</h3>
                    <p className="text-gray-600">Start by posting your first car ride to help other travelers save money.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rides.map((ride) => (
                      <div key={ride.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4 mb-4">
                              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                <Car size={24} className="text-green-600" />
                              </div>
                              <div>
                                <h3 className="text-xl font-semibold text-gray-900">
                                  {ride.from_location} → {ride.to_location}
                                </h3>
                                <p className="text-gray-600">
                                  {formatDateTime(ride.departure_date_time)}
                                </p>
                              </div>
                            </div>

                            <div className="mb-4">
                              <span className="text-sm font-medium text-green-600">
                                Price: {getCurrencySymbol(ride.currency || 'USD')}{ride.price} per passenger
                                {ride.negotiable && (
                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-2">
                                    Negotiable
                                  </span>
                                )}
                              </span>
                            </div>

                            {ride.intermediate_stops && ride.intermediate_stops.length > 0 && (
                              <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-2">Intermediate Stops:</p>
                                <div className="flex flex-wrap gap-2">
                                  {ride.intermediate_stops.map((stop, index) => (
                                    <span key={index} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                                      {stop.address}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => handleViewRideHistory(ride)}
                              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                            >
                              <History size={16} />
                              <span>History</span>
                            </button>
                            <button
                              onClick={() => onEditRide(ride)}
                              className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium transition-colors"
                            >
                              <Edit size={16} />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteRide(ride.id)}
                              className="flex items-center space-x-2 text-red-600 hover:text-red-700 font-medium transition-colors"
                            >
                              <Trash2 size={16} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>

                        {/* Passenger Management for this ride */}
                        <div className="mt-6 pt-6 border-t border-gray-200">
                          <h4 className="font-semibold text-gray-900 mb-4">Passenger Requests</h4>
                          <PassengerManagement
                            ride={ride}
                            onStartChat={onStartChat}
                            onUpdate={fetchUserData}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'confirmations' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Ride Confirmations</h2>
                  <p className="text-gray-600">
                    Manage your ride requests and confirmations. View pending requests, accepted rides, and handle cancellations.
                  </p>
                </div>
                <UserConfirmationsContent onStartChat={onStartChat} />
              </div>
            )}

            {activeTab === 'history' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirmation History</h2>
                  <p className="text-gray-600">
                    View detailed analytics and history of all your ride confirmations.
                  </p>
                </div>
                <ConfirmationHistoryView onStartChat={onStartChat} />
              </div>
            )}

            {activeTab === 'expiry' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Expiry Management</h2>
                  <p className="text-gray-600">
                    Monitor and manage confirmation expiry times to ensure timely responses.
                  </p>
                </div>
                <ExpiryManagementPanel onRefresh={fetchUserData} />
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

            {activeTab === 'test' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">System Health Check</h2>
                  <p className="text-gray-600">
                    Test the confirmation flow and system functionality to ensure everything is working correctly.
                  </p>
                </div>
                <TestConfirmationFlow />
              </div>
            )}
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