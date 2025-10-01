import React, { useState } from 'react'
import { Car, User, ArrowRight, Plus, Users, ChevronDown, ChevronUp, Calendar, Clock, MapPin, DollarSign, CreditCard as Edit, Trash2, TriangleAlert as AlertTriangle, History, Navigation, Lock, CircleCheck as CheckCircle, Circle as XCircle, Send } from 'lucide-react'
import { CarRide, RideConfirmation, RideRequest } from '../types'
import { getCurrencySymbol } from '../utils/currencies'
import { formatDateSafe } from '../utils/dateHelpers'
import PassengerManagement from './PassengerManagement'
import TripClosureControls from './TripClosureControls'
import { supabase } from '../utils/supabase'

interface RideCategorySelectorProps {
  offeredRides: CarRide[]
  joinedRides: RideConfirmation[]
  requestedRides: RideRequest[]
  onStartChat: (userId: string, userName: string, ride?: any, trip?: any) => void
  onEditRide: (ride: CarRide) => void
  onDeleteRide: (rideId: string) => void
  onViewRideHistory: (ride: CarRide) => void
  onViewRequests: () => void
  onRefresh: () => void
}

export default function RideCategorySelector({ 
  offeredRides,
  joinedRides,
  requestedRides,
  onStartChat,
  onEditRide,
  onDeleteRide,
  onViewRideHistory,
  onViewRequests,
  onRefresh
}: RideCategorySelectorProps) {
  const [expandedOfferedRide, setExpandedOfferedRide] = useState<string | null>(null)
  const [expandedJoinedRide, setExpandedJoinedRide] = useState<string | null>(null)
  const [expandedRequestedRide, setExpandedRequestedRide] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<'overview' | 'offered' | 'joined' | 'requested'>('overview')

  // Debug logging
  React.useEffect(() => {
    console.log('RideCategorySelector: Data received:', {
      offeredRides: offeredRides.length,
      joinedRides: joinedRides.length,
      requestedRides: requestedRides.length
    })
    console.log('RideCategorySelector: Sample requested ride:', requestedRides[0])
  }, [offeredRides, joinedRides, requestedRides])

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

  const isExpiredOrExpiringSoon = (ride: CarRide): boolean => {
    const now = new Date()
    const departureTime = new Date(ride.departure_date_time)
    
    // Check if ride is in the past
    if (departureTime < now) return true
    
    // Check if ride is within 1 hour
    const hoursUntilDeparture = (departureTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    return hoursUntilDeparture <= 1
  }

  const getRideStatus = (ride: CarRide): { status: 'open' | 'closed' | 'expired'; color: string; icon: React.ReactNode; label: string } => {
    const now = new Date()
    const departureTime = new Date(ride.departure_date_time)
    
    if (ride.is_closed) {
      return {
        status: 'closed',
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: <Lock size={14} className="text-red-600" />,
        label: 'Closed'
      }
    }
    
    if (departureTime <= now) {
      return {
        status: 'expired',
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: <XCircle size={14} className="text-gray-600" />,
        label: 'Expired'
      }
    }
    
    return {
      status: 'open',
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: <CheckCircle size={14} className="text-green-600" />,
      label: 'Open'
    }
  }
  const toggleOfferedRide = (rideId: string) => {
    setExpandedOfferedRide(expandedOfferedRide === rideId ? null : rideId)
  }

  const toggleJoinedRide = (rideId: string) => {
    setExpandedJoinedRide(expandedJoinedRide === rideId ? null : rideId)
  }

  const toggleRequestedRide = (requestId: string) => {
    setExpandedRequestedRide(expandedRequestedRide === requestId ? null : requestId)
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

  const formatRequestDateDisplay = (request: RideRequest): string => {
    switch (request.request_type) {
      case 'specific_date':
        return request.specific_date ? formatDateSafe(request.specific_date) : 'Specific date'
      case 'multiple_dates':
        return request.multiple_dates && request.multiple_dates.length > 0
          ? `${request.multiple_dates.length} selected dates`
          : 'Multiple dates'
      case 'month':
        return request.request_month || 'Month'
      default:
        return 'Unknown'
    }
  }

  if (activeSection === 'overview') {
    return (
      <div>
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Car Rides</h2>
          <p className="text-gray-600">
            View rides you're offering, rides you've joined, or ride requests you've made.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Rides You're Offering */}
          <div
            onClick={() => setActiveSection('offered')}
            className="group cursor-pointer bg-white border border-gray-200 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 p-8"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-green-600 to-green-700 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Car size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Rides You're Offering</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Manage car rides you've posted to share costs and help other travelers
              </p>
              <div className="bg-green-50 rounded-lg p-4 mb-6 w-full">
                <div className="flex items-center justify-center space-x-2">
                  <Plus size={20} className="text-green-600" />
                  <span className="text-2xl font-bold text-green-600">{offeredRides.length}</span>
                  <span className="text-green-800">Ride{offeredRides.length !== 1 ? 's' : ''} Posted</span>
                </div>
              </div>
              <div className="inline-flex items-center text-green-600 font-semibold group-hover:text-green-700">
                View Your Rides
                <ArrowRight size={20} className="ml-2 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* Rides You've Joined */}
          <div
            onClick={() => setActiveSection('joined')}
            className="group cursor-pointer bg-white border border-gray-200 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 p-8"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Users size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Rides You've Joined</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                View car rides where you've been confirmed as a passenger
              </p>
              <div className="bg-emerald-50 rounded-lg p-4 mb-6 w-full">
                <div className="flex items-center justify-center space-x-2">
                  <User size={20} className="text-emerald-600" />
                  <span className="text-2xl font-bold text-emerald-600">{joinedRides.length}</span>
                  <span className="text-emerald-800">Ride{joinedRides.length !== 1 ? 's' : ''} Joined</span>
                </div>
              </div>
              <div className="inline-flex items-center text-emerald-600 font-semibold group-hover:text-emerald-700">
                View Joined Rides
                <ArrowRight size={20} className="ml-2 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* Ride Requests */}
          <div
            onClick={() => setActiveSection('requested')}
            className="group cursor-pointer bg-white border border-gray-200 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 p-8"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Send size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Ride Requests</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Manage ride requests you've submitted to find drivers
              </p>
              <div className="bg-purple-50 rounded-lg p-4 mb-6 w-full">
                <div className="flex items-center justify-center space-x-2">
                  <Send size={20} className="text-purple-600" />
                  <span className="text-2xl font-bold text-purple-600">{requestedRides.length}</span>
                  <span className="text-purple-800">Request{requestedRides.length !== 1 ? 's' : ''} Made</span>
                </div>
              </div>
              <div className="inline-flex items-center text-purple-600 font-semibold group-hover:text-purple-700">
                View Your Requests
                <ArrowRight size={20} className="ml-2 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-12 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Car Rides Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">{offeredRides.length + joinedRides.length + requestedRides.length}</div>
              <div className="text-gray-700">Total Rides</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">{offeredRides.length}</div>
              <div className="text-gray-700">As Driver</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-600 mb-2">{joinedRides.length}</div>
              <div className="text-gray-700">As Passenger</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-600 mb-2">{requestedRides.length}</div>
              <div className="text-gray-700">Requests Made</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (activeSection === 'offered') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setActiveSection('overview')}
              className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium transition-colors"
            >
              <ArrowRight size={20} className="rotate-180" />
              <span>Back</span>
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Rides You're Offering</h2>
          </div>
          <span className="text-gray-600">{offeredRides.length} ride{offeredRides.length !== 1 ? 's' : ''}</span>
        </div>

        {offeredRides.length === 0 ? (
          <div className="text-center py-12">
            <Car size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No rides posted yet</h3>
            <p className="text-gray-600">Start by posting your first car ride to help other travelers save money.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {offeredRides.map((ride) => {
              const isExpanded = expandedOfferedRide === ride.id
              const isExpiredSoon = isExpiredOrExpiringSoon(ride)
              const rideStatus = getRideStatus(ride)
              
              return (
                <div key={ride.id} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                  {/* Ride Header - Always Visible */}
                  <div 
                    className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleOfferedRide(ride.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
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
                      <div className="flex items-center space-x-3">
                        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border text-sm font-medium ${rideStatus.color}`}>
                          {rideStatus.icon}
                          <span>{rideStatus.label}</span>
                        </div>
                        <span className="text-sm font-medium text-green-600">
                          {getCurrencySymbol(ride.currency || 'USD')}{ride.price}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">
                            {isExpanded ? 'Hide Details' : 'Show Details'}
                          </span>
                          {isExpanded ? (
                            <ChevronUp size={20} className="text-gray-400" />
                          ) : (
                            <ChevronDown size={20} className="text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gray-50">
                      <div className="p-6 space-y-6">
                        {/* Ride Details */}
                        <div className="bg-green-50 rounded-lg p-4">
                          <h4 className="font-semibold text-green-900 mb-3">Ride Details</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600 mb-1">From</p>
                              <div className="font-medium text-gray-900 flex items-center">
                                <MapPin size={14} className="mr-1 text-gray-400" />
                                {ride.from_location}
                              </div>
                            </div>
                            <div>
                              <p className="text-gray-600 mb-1">To</p>
                              <div className="font-medium text-gray-900 flex items-center">
                                <MapPin size={14} className="mr-1 text-gray-400" />
                                {ride.to_location}
                              </div>
                            </div>
                            <div>
                              <p className="text-gray-600 mb-1">Departure</p>
                              <div className="font-medium text-gray-900 flex items-center">
                                <Clock size={14} className="mr-1 text-gray-400" />
                                {formatDateTime(ride.departure_date_time)}
                              </div>
                            </div>
                          </div>

                          {ride.intermediate_stops && ride.intermediate_stops.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-green-200">
                              <p className="text-gray-600 mb-2">Intermediate Stops:</p>
                              <div className="flex flex-wrap gap-2">
                                {ride.intermediate_stops.map((stop, index) => (
                                  <span key={index} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
                                    <Navigation size={10} className="mr-1" />
                                    {stop.address}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="mt-3 pt-3 border-t border-green-200">
                            <span className="text-sm font-medium text-green-600">
                              Price: {getCurrencySymbol(ride.currency || 'USD')}{ride.price} per passenger
                              {ride.negotiable && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-2">
                                  Negotiable
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {rideStatus.status !== 'expired' && (
                              <TripClosureControls
                                ride={ride}
                                onUpdate={onRefresh}
                              />
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onViewRideHistory(ride)
                              }}
                              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                            >
                              <History size={16} />
                              <span>View History</span>
                            </button>
                          </div>
                          <div className="flex items-center space-x-3">
                            {rideStatus.status === 'open' ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onEditRide(ride)
                                }}
                                className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium transition-colors"
                              >
                                <Edit size={16} />
                                <span>Edit</span>
                              </button>
                            ) : (
                              <div className="flex items-center space-x-2 text-gray-400 cursor-not-allowed">
                                <Edit size={16} />
                                <span>{rideStatus.label === 'Closed' ? 'Closed' : rideStatus.label === 'Expired' ? 'Expired' : 'Cannot Edit'}</span>
                              </div>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onDeleteRide(ride.id)
                              }}
                              className="flex items-center space-x-2 text-red-600 hover:text-red-700 font-medium transition-colors"
                            >
                              <Trash2 size={16} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>

                        {/* Passenger Management */}
                        {rideStatus.status === 'open' && (
                          <div className="border-t border-gray-200 pt-6">
                            <h4 className="font-semibold text-gray-900 mb-4">Passenger Requests</h4>
                            <PassengerManagement
                              ride={ride}
                              onStartChat={onStartChat}
                              onUpdate={onRefresh}
                            />
                          </div>
                        )}
                        
                        {rideStatus.status === 'closed' && (
                          <div className="border-t border-gray-200 pt-6">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                              <div className="flex items-center space-x-3">
                                <Lock size={20} className="text-red-600" />
                                <div>
                                  <h4 className="font-semibold text-red-900">Ride Closed</h4>
                                  <p className="text-sm text-red-800">
                                    This ride is closed and not accepting new passengers.
                                    {ride.closed_reason && ` Reason: ${ride.closed_reason}`}
                                  </p>
                                  {ride.closed_at && (
                                    <p className="text-xs text-red-700 mt-1">
                                      Closed on {formatDateTime(ride.closed_at)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {rideStatus.status === 'expired' && (
                          <div className="border-t border-gray-200 pt-6">
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center space-x-3">
                                <XCircle size={20} className="text-gray-600" />
                                <div>
                                  <h4 className="font-semibold text-gray-900">Ride Expired</h4>
                                  <p className="text-sm text-gray-800">
                                    This ride has passed its departure time and is no longer active.
                                  </p>
                                  <p className="text-xs text-gray-600 mt-1">
                                    Departure was {formatDateTime(ride.departure_date_time)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  if (activeSection === 'joined') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setActiveSection('overview')}
              className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium transition-colors"
            >
              <ArrowRight size={20} className="rotate-180" />
              <span>Back</span>
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Rides You've Joined</h2>
          </div>
          <span className="text-gray-600">{joinedRides.length} ride{joinedRides.length !== 1 ? 's' : ''}</span>
        </div>

        {joinedRides.length === 0 ? (
          <div className="text-center py-12">
            <Car size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No rides joined yet</h3>
            <p className="text-gray-600">Start by finding and requesting to join car rides!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {joinedRides.map((confirmation) => {
              const ride = confirmation.car_rides!
              const driver = confirmation.user_profiles
              const isExpanded = expandedJoinedRide === confirmation.id
              const isExpiredSoon = isExpiredOrExpiringSoon(ride)
              
              return (
                <div key={confirmation.id} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                  {/* Ride Header - Always Visible */}
                  <div 
                    className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleJoinedRide(confirmation.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center overflow-hidden">
                          {driver?.profile_image_url ? (
                            <img
                              src={driver.profile_image_url}
                              alt={driver.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-white font-semibold">
                              {(driver?.full_name || 'D').charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">
                            {ride.from_location} → {ride.to_location}
                          </h3>
                          <p className="text-gray-600">
                            {formatDateTime(ride.departure_date_time)} • {driver?.full_name || 'Unknown Driver'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(confirmation.status)}`}>
                          <span className="capitalize">{confirmation.status}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">
                            {isExpanded ? 'Hide Details' : 'Show Details'}
                          </span>
                          {isExpanded ? (
                            <ChevronUp size={20} className="text-gray-400" />
                          ) : (
                            <ChevronDown size={20} className="text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gray-50">
                      <div className="p-6 space-y-6">
                        {/* Ride Details */}
                        <div className="bg-green-50 rounded-lg p-4">
                          <h4 className="font-semibold text-green-900 mb-3">Ride Details</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600 mb-1">From</p>
                              <div className="font-medium text-gray-900 flex items-center">
                                <MapPin size={14} className="mr-1 text-gray-400" />
                                {ride.from_location}
                              </div>
                            </div>
                            <div>
                              <p className="text-gray-600 mb-1">To</p>
                              <div className="font-medium text-gray-900 flex items-center">
                                <MapPin size={14} className="mr-1 text-gray-400" />
                                {ride.to_location}
                              </div>
                            </div>
                            <div>
                              <p className="text-gray-600 mb-1">Departure</p>
                              <div className="font-medium text-gray-900 flex items-center">
                                <Clock size={14} className="mr-1 text-gray-400" />
                                {formatDateTime(ride.departure_date_time)}
                              </div>
                            </div>
                          </div>

                          {ride.intermediate_stops && ride.intermediate_stops.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-green-200">
                              <p className="text-gray-600 mb-2">Intermediate Stops:</p>
                              <div className="flex flex-wrap gap-2">
                                {ride.intermediate_stops.map((stop, index) => (
                                  <span key={index} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
                                    <Navigation size={10} className="mr-1" />
                                    {stop.address}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="mt-3 pt-3 border-t border-green-200">
                            <span className="text-sm font-medium text-green-600">
                              Price: {getCurrencySymbol(ride.currency || 'USD')}{ride.price} per passenger
                              {ride.negotiable && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-2">
                                  Negotiable
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Request Timeline */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-3">Request Timeline</h4>
                          <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                <span className="text-green-600 font-bold text-xs">1</span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">Request Submitted</p>
                                <p className="text-xs text-gray-600">{formatDateTime(confirmation.created_at)}</p>
                              </div>
                            </div>
                            
                            {confirmation.confirmed_at && (
                              <div className="flex items-center space-x-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                  confirmation.status === 'accepted' ? 'bg-green-100' : 'bg-red-100'
                                }`}>
                                  <span className={`font-bold text-xs ${
                                    confirmation.status === 'accepted' ? 'text-green-600' : 'text-red-600'
                                  }`}>2</span>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    Request {confirmation.status === 'accepted' ? 'Accepted' : 'Declined'}
                                  </p>
                                  <p className="text-xs text-gray-600">{formatDateTime(confirmation.confirmed_at)}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                            onUpdate={() => {
                              console.log('TripClosureControls onUpdate called for ride:', ride.id)
                              onRefresh()
                            }}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onStartChat(
                                confirmation.ride_owner_id,
                                driver?.full_name || 'Driver',
                                ride,
                                undefined
                              )
                            }}
                            className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium transition-colors"
                          >
                            <User size={16} />
                            <span>Chat with {driver?.full_name || 'Driver'}</span>
                          </button>

                          <div className="text-xs text-gray-500">
                            Request ID: {confirmation.id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  if (activeSection === 'requested') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setActiveSection('overview')}
              className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium transition-colors"
            >
              <ArrowRight size={20} className="rotate-180" />
              <span>Back</span>
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Your Ride Requests</h2>
          </div>
          <span className="text-gray-600">{requestedRides.length} request{requestedRides.length !== 1 ? 's' : ''}</span>
        </div>

        {requestedRides.length === 0 ? (
          <div className="text-center py-12">
            <Send size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No ride requests yet</h3>
            <p className="text-gray-600">Start by requesting rides to find drivers in your area!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requestedRides.map((request) => (
              <div key={request.id} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                {/* Request Header - Always Visible */}
                <div 
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleRequestedRide(request.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                        <Send size={24} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {request.departure_location} → {request.destination_location}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {formatRequestDateDisplay(request)}
                          {request.departure_time_preference && (
                            <span> • {request.departure_time_preference}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                        request.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        <span>{request.is_active ? 'Active' : 'Inactive'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">
                          {expandedRequestedRide === request.id ? 'Hide Details' : 'Show Details'}
                        </span>
                        {expandedRequestedRide === request.id ? (
                          <ChevronUp size={20} className="text-gray-400" />
                        ) : (
                          <ChevronDown size={20} className="text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedRequestedRide === request.id && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    <div className="p-6 space-y-6">
                      {/* Request Details */}
                      <div className="bg-purple-50 rounded-lg p-4">
                        <h4 className="font-semibold text-purple-900 mb-3">Request Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600 mb-1">From</p>
                            <div className="font-medium text-gray-900 flex items-center">
                              <MapPin size={14} className="mr-1 text-gray-400" />
                              {request.departure_location}
                            </div>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">To</p>
                            <div className="font-medium text-gray-900 flex items-center">
                              <MapPin size={14} className="mr-1 text-gray-400" />
                              {request.destination_location}
                            </div>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">When</p>
                            <div className="font-medium text-gray-900 flex items-center">
                              <Calendar size={14} className="mr-1 text-gray-400" />
                              {formatRequestDateDisplay(request)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-purple-200">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            {request.departure_time_preference && (
                              <div>
                                <p className="text-gray-600 mb-1">Preferred Time</p>
                                <div className="font-medium text-gray-900 flex items-center">
                                  <Clock size={14} className="mr-1 text-gray-400" />
                                  {request.departure_time_preference}
                                </div>
                              </div>
                            )}
                            {request.max_price && (
                              <div>
                                <p className="text-gray-600 mb-1">Max Budget</p>
                                <div className="font-medium text-green-600">
                                  {getCurrencySymbol(request.currency || 'USD')}{request.max_price}
                                </div>
                              </div>
                            )}
                            <div>
                              <p className="text-gray-600 mb-1">Search Radius</p>
                              <div className="font-medium text-gray-900">
                                Airport-to-airport matching
                              </div>
                            </div>
                          </div>
                        </div>

                        {request.additional_notes && (
                          <div className="mt-3 pt-3 border-t border-purple-200">
                            <p className="text-gray-600 mb-1">Additional Notes</p>
                            <p className="text-gray-900 text-sm">{request.additional_notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Request Timeline */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">Request Timeline</h4>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                              <span className="text-purple-600 font-bold text-xs">1</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">Request Created</p>
                              <p className="text-xs text-gray-600">{formatDateTime(request.created_at)}</p>
                            </div>
                          </div>
                          
                          {request.expires_at && (
                            <div className="flex items-center space-x-3">
                              <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                                <span className="text-orange-600 font-bold text-xs">⏰</span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {new Date(request.expires_at) > new Date() ? 'Expires' : 'Expired'}
                                </p>
                                <p className="text-xs text-gray-600">{formatDateTime(request.expires_at)}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div className="text-xs text-gray-500">
                          Request ID: {request.id.slice(0, 8)}...
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              // TODO: Implement edit functionality
                              alert('Edit functionality coming soon')
                            }}
                            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors text-sm"
                          >
                            <Edit size={16} />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              if (!confirm('Are you sure you want to delete this trip request?')) return
                              try {
                                const { error } = await supabase
                                  .from('trip_requests')
                                  .delete()
                                  .eq('id', request.id)
                                if (error) throw error
                                onRefresh()
                              } catch (error: any) {
                                alert('Failed to delete request: ' + error.message)
                              }
                            }}
                            className="flex items-center space-x-2 text-red-600 hover:text-red-700 font-medium transition-colors text-sm"
                          >
                            <Trash2 size={16} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return null
}

                key={request.id}
                className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                      <Send size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {request.departure_location} → {request.destination_location}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {formatRequestDateDisplay(request)}
                        {request.departure_time_preference && (
                          <span> • {request.departure_time_preference}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        // TODO: Implement edit functionality
                        alert('Edit functionality coming soon')
                      }}
                      className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors text-sm"
                    >
                      <Edit size={16} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        if (!confirm('Are you sure you want to delete this ride request?')) return
                        try {
                          const { error } = await supabase
                            .from('ride_requests')
                            .delete()
                            .eq('id', request.id)
                          if (error) throw error
                          onRefresh()
                        } catch (error: any) {
                          alert('Failed to delete request: ' + error.message)
                        }
                      }}
                      className="flex items-center space-x-2 text-red-600 hover:text-red-700 font-medium transition-colors text-sm"
                    >
                      <Trash2 size={16} />
                      <span>Delete</span>
                    </button>
                    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                      request.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      <span>{request.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                </div>
                
                {request.additional_notes && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Notes</p>
                    <p className="text-gray-900">{request.additional_notes}</p>
                  </div>
                )}
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                      <span>Search radius: {request.search_radius_miles} miles</span>
                    </div>
                    {request.max_price && (
                      <div className="flex items-center space-x-1">
                        <DollarSign size={12} />
                        <span>Max budget: {getCurrencySymbol(request.currency || 'USD')}{request.max_price}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return null
}