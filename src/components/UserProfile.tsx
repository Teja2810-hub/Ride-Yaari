import React, { useState, useEffect } from 'react'
import { ArrowLeft, User, Calendar, Car, Plane, MessageCircle, Edit, Trash2, History, Settings, Bell, Star, Clock, AlertTriangle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { CarRide, Trip } from '../types'
import ProfileUpdateForm from './ProfileUpdateForm'
import ReviewForm from './ReviewForm'
import RideDetailModal from './RideDetailModal'
import TripDetailModal from './TripDetailModal'
import { getCurrencySymbol } from '../utils/currencies'

interface UserProfileProps {
  onBack: () => void
  onStartChat: (userId: string, userName: string, ride?: CarRide, trip?: Trip) => void
  onEditTrip: (trip: Trip) => void
  onEditRide: (ride: CarRide) => void
  initialTab?: string
}

export default function UserProfile({ onBack, onStartChat, onEditTrip, onEditRide, initialTab }: UserProfileProps) {
  const { user, userProfile } = useAuth()
  const [trips, setTrips] = useState<Trip[]>([])
  const [rides, setRides] = useState<CarRide[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showProfileUpdate, setShowProfileUpdate] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [selectedRide, setSelectedRide] = useState<CarRide | null>(null)
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [showRideDetail, setShowRideDetail] = useState(false)
  const [showTripDetail, setShowTripDetail] = useState(false)

  useEffect(() => {
    if (user) {
      fetchUserData()
    }
  }, [user])

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

  const handleRideClick = (ride: CarRide) => {
    setSelectedRide(ride)
    setShowRideDetail(true)
  }

  const handleTripClick = (trip: Trip) => {
    setSelectedTrip(trip)
    setShowTripDetail(true)
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
              <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                {userProfile?.profile_image_url ? (
                  <img
                    src={userProfile.profile_image_url}
                    alt={userProfile.full_name}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span className="text-2xl font-bold">
                    {userProfile?.full_name?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
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
            </div>
          </div>

          {/* Profile Content */}
          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-8">
              {/* Stats Overview */}
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
                  <p className="text-purple-800">Profile</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button
                    onClick={() => setShowProfileUpdate(true)}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    <User size={16} />
                    <span>Update Profile</span>
                  </button>
                  <button
                    onClick={() => setShowReviewForm(true)}
                    className="flex items-center space-x-2 bg-yellow-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-yellow-700 transition-colors"
                  >
                    <Star size={16} />
                    <span>Submit Review</span>
                  </button>
                  <button
                    onClick={() => {
                      if (initialTab === 'confirmations') {
                        onBack()
                      }
                    }}
                    className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
                  >
                    <MessageCircle size={16} />
                    <span>Confirmations</span>
                  </button>
                  <button
                    onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                    className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors"
                  >
                    <Bell size={16} />
                    <span>Settings</span>
                  </button>
                </div>
              </div>

              {/* Airport Trips Section */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center">
                    <Plane size={20} className="mr-3 text-blue-600" />
                    Your Airport Trips
                  </h2>
                  <span className="text-gray-600">{trips.length} trip{trips.length !== 1 ? 's' : ''}</span>
                </div>

                {trips.length === 0 ? (
                  <div className="text-center py-8">
                    <Plane size={32} className="text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No trips posted yet</h3>
                    <p className="text-gray-600">Start by posting your first airport trip to connect with other travelers.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {trips.map((trip) => (
                      <div 
                        key={trip.id} 
                        onClick={() => handleTripClick(trip)}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer hover:border-blue-300"
                      >
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Plane size={20} className="text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {trip.leaving_airport} → {trip.destination_airport}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {formatDate(trip.travel_date)}
                            </p>
                          </div>
                        </div>
                        {trip.price && (
                          <div className="text-sm text-green-600 font-medium">
                            {getCurrencySymbol(trip.currency || 'USD')}{trip.price}
                            {trip.negotiable && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-2">
                                Negotiable
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Car Rides Section */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center">
                    <Car size={20} className="mr-3 text-green-600" />
                    Your Car Rides
                  </h2>
                  <span className="text-gray-600">{rides.length} ride{rides.length !== 1 ? 's' : ''}</span>
                </div>

                {rides.length === 0 ? (
                  <div className="text-center py-8">
                    <Car size={32} className="text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No rides posted yet</h3>
                    <p className="text-gray-600">Start by posting your first car ride to help other travelers save money.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rides.map((ride) => (
                      <div 
                        key={ride.id} 
                        onClick={() => handleRideClick(ride)}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer hover:border-green-300"
                      >
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <Car size={20} className="text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {ride.from_location} → {ride.to_location}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {formatDateTime(ride.departure_date_time)}
                            </p>
                          </div>
                        </div>
                        <div className="text-sm text-green-600 font-medium">
                          {getCurrencySymbol(ride.currency || 'USD')}{ride.price}
                          {ride.negotiable && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-2">
                              Negotiable
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Update Modal */}
        {showProfileUpdate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Update Profile</h2>
                <button
                  onClick={() => setShowProfileUpdate(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-6">
                <ProfileUpdateForm 
                  onClose={() => setShowProfileUpdate(false)}
                  onSuccess={() => {
                    setShowProfileUpdate(false)
                    fetchUserData()
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Review Form Modal */}
        {showReviewForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Submit Review</h2>
                <button
                  onClick={() => setShowReviewForm(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-6">
                <ReviewForm 
                  onReviewSubmitted={() => {
                    setShowReviewForm(false)
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Ride Detail Modal */}
        <RideDetailModal
          isOpen={showRideDetail}
          onClose={() => {
            setShowRideDetail(false)
            setSelectedRide(null)
          }}
          ride={selectedRide!}
          onEdit={onEditRide}
          onDelete={handleDeleteRide}
          onStartChat={onStartChat}
        />

        {/* Trip Detail Modal */}
        <TripDetailModal
          isOpen={showTripDetail}
          onClose={() => {
            setShowTripDetail(false)
            setSelectedTrip(null)
          }}
          trip={selectedTrip!}
          onEdit={onEditTrip}
          onDelete={handleDeleteTrip}
          onStartChat={onStartChat}
        />
      </div>
    </div>
  )
}