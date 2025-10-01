import React, { useState } from 'react'
import { Plane, User, ArrowRight, Plus, Users, ChevronDown, ChevronUp, Calendar, Clock, Globe, DollarSign, CreditCard as Edit, Trash2, TriangleAlert as AlertTriangle, History, Lock, CircleCheck as CheckCircle, Circle as XCircle, Send } from 'lucide-react'
import { Trip, RideConfirmation, TripRequest } from '../types'
import { getCurrencySymbol } from '../utils/currencies'
import { formatDateSafe } from '../utils/dateHelpers'
import PassengerManagement from './PassengerManagement'
import TripClosureControls from './TripClosureControls'
import { supabase } from '../utils/supabase'

interface TripCategorySelectorProps {
  offeredTrips: Trip[]
  joinedTrips: RideConfirmation[]
  requestedTrips: TripRequest[]
  onStartChat: (userId: string, userName: string, ride?: any, trip?: any) => void
  onEditTrip: (trip: Trip) => void
  onDeleteTrip: (tripId: string) => void
  onViewTripHistory: (trip: Trip) => void
  onViewRequests: () => void
  onRefresh: () => void
}

export default function TripCategorySelector({ 
  offeredTrips,
  joinedTrips,
  requestedTrips,
  onStartChat,
  onEditTrip,
  onDeleteTrip,
  onViewTripHistory,
  onViewRequests,
  onRefresh
}: TripCategorySelectorProps) {
  const [expandedOfferedTrip, setExpandedOfferedTrip] = useState<string | null>(null)
  const [expandedJoinedTrip, setExpandedJoinedTrip] = useState<string | null>(null)
  const [expandedRequestedTrip, setExpandedRequestedTrip] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<'overview' | 'offered' | 'joined' | 'requested'>('overview')

  // Debug logging
  React.useEffect(() => {
    console.log('TripCategorySelector: Data received:', {
      offeredTrips: offeredTrips.length,
      joinedTrips: joinedTrips.length,
      requestedTrips: requestedTrips.length
    })
    console.log('TripCategorySelector: Sample requested trip:', requestedTrips[0])
  }, [offeredTrips, joinedTrips, requestedTrips])

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

  const isExpiredOrExpiringSoon = (trip: Trip): boolean => {
    const now = new Date()
    const travelDate = new Date(trip.travel_date)
    
    // Check if trip is in the past
    if (travelDate < now) return true
    
    // Check if trip is within 1 hour (for same-day trips)
    const hoursUntilTravel = (travelDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    return hoursUntilTravel <= 1
  }

  const getTripStatus = (trip: Trip): { status: 'open' | 'closed' | 'expired'; color: string; icon: React.ReactNode; label: string } => {
    const now = new Date()
    const travelDate = new Date(trip.travel_date)
    
    if (trip.is_closed) {
      return {
        status: 'closed',
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: <Lock size={14} className="text-red-600" />,
        label: 'Closed'
      }
    }
    
    if (travelDate <= now) {
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
  const toggleOfferedTrip = (tripId: string) => {
    setExpandedOfferedTrip(expandedOfferedTrip === tripId ? null : tripId)
  }

  const toggleJoinedTrip = (tripId: string) => {
    setExpandedJoinedTrip(expandedJoinedTrip === tripId ? null : tripId)
  }

  const toggleRequestedTrip = (requestId: string) => {
    setExpandedRequestedTrip(expandedRequestedTrip === requestId ? null : requestId)
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

  const formatRequestDateDisplay = (request: TripRequest): string => {
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Airport Trips</h2>
          <p className="text-gray-600">
            View trips you're offering, trips you've joined, or trip requests you've made.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Trips You're Offering */}
          <div
            onClick={() => setActiveSection('offered')}
            className="group cursor-pointer bg-white border border-gray-200 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 p-8"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Plane size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Trips You're Offering</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Manage airport trips you've posted to help other travelers with deliveries and assistance
              </p>
              <div className="bg-blue-50 rounded-lg p-4 mb-6 w-full">
                <div className="flex items-center justify-center space-x-2">
                  <Plus size={20} className="text-blue-600" />
                  <span className="text-2xl font-bold text-blue-600">{offeredTrips.length}</span>
                  <span className="text-blue-800">Trip{offeredTrips.length !== 1 ? 's' : ''} Posted</span>
                </div>
              </div>
              <div className="inline-flex items-center text-blue-600 font-semibold group-hover:text-blue-700">
                View Your Trips
                <ArrowRight size={20} className="ml-2 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* Trips You've Joined */}
          <div
            onClick={() => setActiveSection('joined')}
            className="group cursor-pointer bg-white border border-gray-200 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 p-8"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Users size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Trips You've Joined</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                View airport trips where you've been confirmed as a passenger or service recipient
              </p>
              <div className="bg-indigo-50 rounded-lg p-4 mb-6 w-full">
                <div className="flex items-center justify-center space-x-2">
                  <User size={20} className="text-indigo-600" />
                  <span className="text-2xl font-bold text-indigo-600">{joinedTrips.length}</span>
                  <span className="text-indigo-800">Trip{joinedTrips.length !== 1 ? 's' : ''} Joined</span>
                </div>
              </div>
              <div className="inline-flex items-center text-indigo-600 font-semibold group-hover:text-indigo-700">
                View Joined Trips
                <ArrowRight size={20} className="ml-2 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* Trip Requests */}
          <div
            onClick={() => setActiveSection('requested')}
            className="group cursor-pointer bg-white border border-gray-200 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 p-8"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Send size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Trip Requests</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Manage trip assistance requests you've submitted to find travelers
              </p>
              <div className="bg-purple-50 rounded-lg p-4 mb-6 w-full">
                <div className="flex items-center justify-center space-x-2">
                  <Send size={20} className="text-purple-600" />
                  <span className="text-2xl font-bold text-purple-600">{requestedTrips.length}</span>
                  <span className="text-purple-800">Request{requestedTrips.length !== 1 ? 's' : ''} Made</span>
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
        <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Airport Trips Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">{offeredTrips.length + joinedTrips.length + requestedTrips.length}</div>
              <div className="text-gray-700">Total Trips</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">{offeredTrips.length}</div>
              <div className="text-gray-700">As Traveler</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">{joinedTrips.length}</div>
              <div className="text-gray-700">As Passenger</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-600 mb-2">{requestedTrips.length}</div>
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
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <ArrowRight size={20} className="rotate-180" />
              <span>Back</span>
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Trips You're Offering</h2>
          </div>
          <span className="text-gray-600">{offeredTrips.length} trip{offeredTrips.length !== 1 ? 's' : ''}</span>
        </div>

        {offeredTrips.length === 0 ? (
          <div className="text-center py-12">
            <Plane size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No trips posted yet</h3>
            <p className="text-gray-600">Start by posting your first airport trip to connect with other travelers.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {offeredTrips.map((trip) => {
              const isExpanded = expandedOfferedTrip === trip.id
              const isExpiredSoon = isExpiredOrExpiringSoon(trip)
              const tripStatus = getTripStatus(trip)
              
              return (
                <div key={trip.id} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                  {/* Trip Header - Always Visible */}
                  <div 
                    className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleOfferedTrip(trip.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
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
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border text-sm font-medium ${tripStatus.color}`}>
                          {tripStatus.icon}
                          <span>{tripStatus.label}</span>
                        </div>
                        {trip.price && (
                          <span className="text-sm font-medium text-green-600">
                            {getCurrencySymbol(trip.currency || 'USD')}{trip.price}
                          </span>
                        )}
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
                        {/* Trip Details */}
                        <div className="bg-blue-50 rounded-lg p-4">
                          <h4 className="font-semibold text-blue-900 mb-3">Trip Details</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600 mb-1">Departure Airport</p>
                              <p className="font-medium text-gray-900">{trip.leaving_airport}</p>
                              {trip.departure_time && (
                                <div className="text-gray-600 flex items-center mt-1">
                                  <Clock size={12} className="mr-1" />
                                  {trip.departure_time}
                                  {trip.departure_timezone && (
                                    <span className="text-xs text-gray-500 ml-1">
                                      ({trip.departure_timezone})
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-gray-600 mb-1">Destination Airport</p>
                              <p className="font-medium text-gray-900">{trip.destination_airport}</p>
                              {trip.landing_time && (
                                <div className="text-gray-600 flex items-center mt-1">
                                  <Clock size={12} className="mr-1" />
                                  {trip.landing_time}
                                  {trip.landing_timezone && (
                                    <span className="text-xs text-gray-500 ml-1">
                                      ({trip.landing_timezone})
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-gray-600 mb-1">Travel Date</p>
                              <div className="font-medium text-gray-900 flex items-center">
                                <Calendar size={14} className="mr-1 text-gray-400" />
                                {formatDate(trip.travel_date)}
                              </div>
                              {trip.landing_date && trip.landing_date !== trip.travel_date && (
                                <div className="text-gray-600 mt-1">
                                  Landing: {formatDate(trip.landing_date)}
                                </div>
                              )}
                            </div>
                            {trip.price && (
                              <div>
                                <p className="text-gray-600 mb-1">Service Price</p>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-green-600">
                                    {getCurrencySymbol(trip.currency || 'USD')}{trip.price}
                                  </span>
                                  {trip.negotiable && (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                      Negotiable
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {tripStatus.status !== 'expired' && (
                              <TripClosureControls
                                trip={trip}
                                onUpdate={onRefresh}
                              />
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onViewTripHistory(trip)
                              }}
                              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                            >
                              <History size={16} />
                              <span>View History</span>
                            </button>
                          </div>
                          <div className="flex items-center space-x-3">
                            {tripStatus.status === 'open' ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onEditTrip(trip)
                                }}
                                className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium transition-colors"
                              >
                                <Edit size={16} />
                                <span>Edit</span>
                              </button>
                            ) : (
                              <div className="flex items-center space-x-2 text-gray-400 cursor-not-allowed">
                                <Edit size={16} />
                                <span>{tripStatus.label === 'Closed' ? 'Closed' : tripStatus.label === 'Expired' ? 'Expired' : 'Cannot Edit'}</span>
                              </div>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onDeleteTrip(trip.id)
                              }}
                              className="flex items-center space-x-2 text-red-600 hover:text-red-700 font-medium transition-colors"
                            >
                              <Trash2 size={16} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>

                        {/* Passenger Management */}
                        {tripStatus.status === 'open' && (
                          <div className="border-t border-gray-200 pt-6">
                            <h4 className="font-semibold text-gray-900 mb-4">Passenger Requests</h4>
                            <PassengerManagement
                              trip={trip}
                              onStartChat={onStartChat}
                              onUpdate={onRefresh}
                            />
                          </div>
                        )}
                        
                        {tripStatus.status === 'closed' && (
                          <div className="border-t border-gray-200 pt-6">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                              <div className="flex items-center space-x-3">
                                <Lock size={20} className="text-red-600" />
                                <div>
                                  <h4 className="font-semibold text-red-900">Trip Closed</h4>
                                  <p className="text-sm text-red-800">
                                    This trip is closed and not accepting new passengers.
                                    {trip.closed_reason && ` Reason: ${trip.closed_reason}`}
                                  </p>
                                  {trip.closed_at && (
                                    <p className="text-xs text-red-700 mt-1">
                                      Closed on {formatDateTime(trip.closed_at)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {tripStatus.status === 'expired' && (
                          <div className="border-t border-gray-200 pt-6">
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center space-x-3">
                                <XCircle size={20} className="text-gray-600" />
                                <div>
                                  <h4 className="font-semibold text-gray-900">Trip Expired</h4>
                                  <p className="text-sm text-gray-800">
                                    This trip has passed its travel date and is no longer active.
                                  </p>
                                  <p className="text-xs text-gray-600 mt-1">
                                    Travel date was {formatDate(trip.travel_date)}
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
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <ArrowRight size={20} className="rotate-180" />
              <span>Back</span>
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Trips You've Joined</h2>
          </div>
          <span className="text-gray-600">{joinedTrips.length} trip{joinedTrips.length !== 1 ? 's' : ''}</span>
        </div>

        {joinedTrips.length === 0 ? (
          <div className="text-center py-12">
            <Plane size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No trips joined yet</h3>
            <p className="text-gray-600">Start by finding and requesting to join airport trips!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {joinedTrips.map((confirmation) => {
              const trip = confirmation.trips!
              const traveler = confirmation.user_profiles
              const isExpanded = expandedJoinedTrip === confirmation.id
              
              return (
                <div key={confirmation.id} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                  {/* Trip Header - Always Visible */}
                  <div 
                    className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleJoinedTrip(confirmation.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden">
                          {traveler?.profile_image_url ? (
                            <img
                              src={traveler.profile_image_url}
                              alt={traveler.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-white font-semibold">
                              {(traveler?.full_name || 'T').charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">
                            {trip.leaving_airport} → {trip.destination_airport}
                          </h3>
                          <p className="text-gray-600">
                            {formatDate(trip.travel_date)} • {traveler?.full_name || 'Unknown Traveler'}
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
                        {/* Trip Details */}
                        <div className="bg-blue-50 rounded-lg p-4">
                          <h4 className="font-semibold text-blue-900 mb-3">Trip Details</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600 mb-1">From</p>
                              <div className="font-medium text-gray-900">{trip.leaving_airport}</div>
                              {trip.departure_time && (
                                <div className="text-gray-600 flex items-center mt-1">
                                  <Clock size={12} className="mr-1" />
                                  {trip.departure_time}
                                  {trip.departure_timezone && (
                                    <span className="text-xs text-gray-500 ml-1">
                                      ({trip.departure_timezone})
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-gray-600 mb-1">To</p>
                              <div className="font-medium text-gray-900">{trip.destination_airport}</div>
                              {trip.landing_time && (
                                <div className="text-gray-600 flex items-center mt-1">
                                  <Clock size={12} className="mr-1" />
                                  {trip.landing_time}
                                  {trip.landing_timezone && (
                                    <span className="text-xs text-gray-500 ml-1">
                                      ({trip.landing_timezone})
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-gray-600 mb-1">Travel Date</p>
                              <div className="font-medium text-gray-900 flex items-center">
                                <Calendar size={14} className="mr-1 text-gray-400" />
                                {formatDate(trip.travel_date)}
                              </div>
                              {trip.landing_date && trip.landing_date !== trip.travel_date && (
                                <div className="text-gray-600 mt-1">
                                  Landing: {formatDate(trip.landing_date)}
                                </div>
                              )}
                            </div>
                          </div>

                          {trip.price && (
                            <div className="mt-3 pt-3 border-t border-blue-200">
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

                        {/* Request Timeline */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-3">Request Timeline</h4>
                          <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-bold text-xs">1</span>
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
                              console.log('TripClosureControls onUpdate called for trip:', trip.id)
                              onRefresh()
                            }}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onStartChat(
                                confirmation.ride_owner_id,
                                traveler?.full_name || 'Traveler',
                                undefined,
                                trip
                              )
                            }}
                            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                          >
                            <User size={16} />
                            <span>Chat with {traveler?.full_name || 'Traveler'}</span>
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
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <ArrowRight size={20} className="rotate-180" />
              <span>Back</span>
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Your Trip Requests</h2>
          </div>
          <span className="text-gray-600">{requestedTrips.length} request{requestedTrips.length !== 1 ? 's' : ''}</span>
        </div>

        {requestedTrips.length === 0 ? (
          <div className="text-center py-12">
            <Send size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No trip requests yet</h3>
            <p className="text-gray-600">Start by requesting trips to find travelers who can assist you!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requestedTrips.map((request) => (
              <div key={request.id} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                {/* Request Header - Always Visible */}
                <div 
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleRequestedTrip(request.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                        <Send size={24} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {request.departure_airport} → {request.destination_airport}
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
                          {expandedRequestedTrip === request.id ? 'Hide Details' : 'Show Details'}
                        </span>
                        {expandedRequestedTrip === request.id ? (
                          <ChevronUp size={20} className="text-gray-400" />
                        ) : (
                          <ChevronDown size={20} className="text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedRequestedTrip === request.id && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    <div className="p-6 space-y-6">
                      {/* Request Details */}
                      <div className="bg-purple-50 rounded-lg p-4">
                        <h4 className="font-semibold text-purple-900 mb-3">Request Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600 mb-1">From</p>
                            <div className="font-medium text-gray-900">{request.departure_airport}</div>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">To</p>
                            <div className="font-medium text-gray-900">{request.destination_airport}</div>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">When</p>
                            <div className="font-medium text-gray-900 flex items-center">
                              <Calendar size={14} className="mr-1 text-gray-400" />
                              {formatRequestDateDisplay(request)}
                            </div>
                          </div>
                        </div>

                        {request.departure_time_preference && (
                          <div className="mt-3 pt-3 border-t border-purple-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-gray-600 mb-1">Preferred Time</p>
                                <div className="font-medium text-gray-900 flex items-center">
                                  <Clock size={14} className="mr-1 text-gray-400" />
                                  {request.departure_time_preference}
                                </div>
                              </div>
                              {request.max_price && (
                                <div>
                                  <p className="text-gray-600 mb-1">Max Budget</p>
                                  <div className="font-medium text-green-600">
                                    {getCurrencySymbol(request.currency || 'USD')}{request.max_price}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
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
                        {request.departure_airport} → {request.destination_airport}
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
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

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

  return null
}