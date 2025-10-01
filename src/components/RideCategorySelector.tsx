import React, { useState } from 'react'
import { ArrowLeft, Car, User, Calendar, Clock, MapPin, MessageCircle, CreditCard as Edit, Trash2, History, Send, Plus, X, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Navigation } from 'lucide-react'
import { RideConfirmation, CarRide, RideRequest } from '../types'
import { getCurrencySymbol } from '../utils/currencies'
import PassengerManagement from './PassengerManagement'
import TripClosureControls from './TripClosureControls'
import RideRequestEditModal from './RideRequestEditModal'
import { supabase } from '../utils/supabase'
import { formatDateSafe, formatDateTimeSafe } from '../utils/dateHelpers'

interface RideCategorySelectorProps {
  offeredRides: CarRide[]
  joinedRides: RideConfirmation[]
  requestedRides: RideRequest[]
  onStartChat: (userId: string, userName: string, ride?: CarRide, trip?: any) => void
  onEditRide: (ride: CarRide) => void
  onDeleteRide: (rideId: string) => void
  onViewRideHistory: (ride: CarRide) => void
  onViewRequests: () => void
  onRefresh: () => void
}

type RideView = 'selector' | 'offered' | 'joined' | 'requested'

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
  const [rideView, setRideView] = useState<RideView>('selector')
  const [selectedRide, setSelectedRide] = useState<CarRide | null>(null)
  const [showPassengerManagement, setShowPassengerManagement] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState<{
    show: boolean
    type: 'ride' | 'request'
    id: string
    name: string
  }>({ show: false, type: 'ride', id: '', name: '' })
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingRequest, setEditingRequest] = useState<RideRequest | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<RideRequest | null>(null)
  const [showRequestDetails, setShowRequestDetails] = useState(false)

  const handleDeleteRide = async (rideId: string) => {
    setShowDeleteModal({ show: false, type: 'ride', id: '', name: '' })
    onDeleteRide(rideId)
  }

  const handleDeleteRequest = async (requestId: string) => {
    setShowDeleteModal({ show: false, type: 'request', id: '', name: '' })
    
    try {
      const { error } = await supabase
        .from('ride_requests')
        .delete()
        .eq('id', requestId)

      if (error) throw error

      onRefresh()
    } catch (error: any) {
      console.error('Error deleting ride request:', error)
      alert('Failed to delete ride request: ' + error.message)
    }
  }

  const handleEditRequest = (request: RideRequest) => {
    setEditingRequest(request)
    setShowEditModal(true)
  }

  const handleSaveRequest = async (updatedRequest: Partial<RideRequest>) => {
    if (!editingRequest) return

    try {
      const { error } = await supabase
        .from('ride_requests')
        .update(updatedRequest)
        .eq('id', editingRequest.id)

      if (error) throw error

      setShowEditModal(false)
      setEditingRequest(null)
      onRefresh()
    } catch (error: any) {
      console.error('Error updating ride request:', error)
      alert('Failed to update ride request: ' + error.message)
    }
  }

  const showDeleteConfirmation = (type: 'ride' | 'request', id: string, name: string) => {
    setShowDeleteModal({ show: true, type, id, name })
  }

  const formatRequestDateDisplay = (request: RideRequest): string => {
    switch (request.request_type) {
      case 'specific_date':
        return request.specific_date ? formatDateSafe(request.specific_date) : 'Flexible date'
      case 'multiple_dates':
        if (request.multiple_dates && request.multiple_dates.length > 0) {
          const validDates = request.multiple_dates.filter(d => d)
          if (validDates.length === 1) {
            return formatDateSafe(validDates[0])
          }
          return `${validDates.length} dates`
        }
        return 'Flexible dates'
      case 'month':
        if (request.request_month) {
          const date = new Date(request.request_month + '-01')
          return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        }
        return 'Flexible month'
      default:
        return 'Flexible timing'
    }
  }

  const handleViewRequestDetails = (request: RideRequest) => {
    setSelectedRequest(request)
    setShowRequestDetails(true)
  }

  if (rideView === 'selector') {
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Car Rides</h2>
          <p className="text-gray-600">Manage your car rides and ride requests</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            onClick={() => setRideView('offered')}
            className="group cursor-pointer bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 p-6"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Car size={32} className="text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Rides You've Offered</h3>
              <p className="text-gray-600 mb-4">View and manage your posted car rides</p>
              <div className="text-2xl font-bold text-green-600">{offeredRides.length}</div>
            </div>
          </div>

          <div
            onClick={() => setRideView('joined')}
            className="group cursor-pointer bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 p-6"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <User size={32} className="text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Rides You've Joined</h3>
              <p className="text-gray-600 mb-4">View rides you've requested to join</p>
              <div className="text-2xl font-bold text-emerald-600">{joinedRides.length}</div>
            </div>
          </div>

          <div
            onClick={() => setRideView('requested')}
            className="group cursor-pointer bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 p-6"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Send size={32} className="text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Rides You've Requested</h3>
              <p className="text-gray-600 mb-4">View your ride requests</p>
              <div className="text-2xl font-bold text-purple-600">{requestedRides.length}</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (rideView === 'offered') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setRideView('selector')}
              className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Rides You've Offered</h2>
          </div>
          <span className="text-gray-600">{offeredRides.length} ride{offeredRides.length !== 1 ? 's' : ''}</span>
        </div>

        {offeredRides.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Car size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Rides Posted</h3>
            <p className="text-gray-600">You haven't posted any car rides yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {offeredRides.map((ride) => (
              <div key={ride.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <Car size={20} className="text-green-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {ride.from_location} → {ride.to_location}
                      </h3>
                      {ride.is_closed && (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                          Closed
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Departure</p>
                        <div className="font-medium text-gray-900 flex items-center">
                          <Clock size={14} className="mr-1 text-gray-400" />
                          {formatDateTimeSafe(ride.departure_date_time)}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Price per Passenger</p>
                        <div className="font-medium text-green-600">
                          {getCurrencySymbol(ride.currency || 'USD')}{ride.price}
                          {ride.negotiable && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-2">
                              Negotiable
                            </span>
                          )}
                        </div>
                      </div>
                      {ride.intermediate_stops && ride.intermediate_stops.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Stops</p>
                          <div className="flex flex-wrap gap-1">
                            {ride.intermediate_stops.slice(0, 2).map((stop, index) => (
                              <span key={index} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
                                <Navigation size={8} className="mr-1" />
                                {stop.address.split(',')[0]}
                              </span>
                            ))}
                            {ride.intermediate_stops.length > 2 && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                +{ride.intermediate_stops.length - 2} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <TripClosureControls ride={ride} onUpdate={onRefresh} />
                    
                    <button
                      onClick={() => onViewRideHistory(ride)}
                      className="flex items-center space-x-1 text-gray-600 hover:text-gray-700 font-medium transition-colors text-sm"
                    >
                      <History size={14} />
                      <span>History</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setSelectedRide(ride)
                        setShowPassengerManagement(true)
                      }}
                      className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 font-medium transition-colors text-sm"
                    >
                      <User size={14} />
                      <span>Passengers</span>
                    </button>
                    
                    <button
                      onClick={() => onEditRide(ride)}
                      className="flex items-center space-x-1 text-green-600 hover:text-green-700 font-medium transition-colors text-sm"
                    >
                      <Edit size={14} />
                      <span>Edit</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        const rideName = `${ride.from_location} → ${ride.to_location}`
                        showDeleteConfirmation('ride', ride.id, rideName)
                      }}
                      className="flex items-center space-x-1 text-red-600 hover:text-red-700 font-medium transition-colors text-sm"
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Passenger Management Modal */}
        {showPassengerManagement && selectedRide && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Manage Passengers</h2>
                <button
                  onClick={() => {
                    setShowPassengerManagement(false)
                    setSelectedRide(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-6">
                <PassengerManagement
                  ride={selectedRide}
                  onStartChat={onStartChat}
                  onUpdate={onRefresh}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (rideView === 'joined') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setRideView('selector')}
              className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Rides You've Joined</h2>
          </div>
        </div>
        {/* Implementation would go here - similar to trips */}
      </div>
    )
  }

  if (rideView === 'requested') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setRideView('selector')}
              className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Rides You've Requested</h2>
          </div>
          <span className="text-gray-600">{requestedRides.length} request{requestedRides.length !== 1 ? 's' : ''}</span>
        </div>

        {requestedRides.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Ride Requests</h3>
            <p className="text-gray-600">You haven't requested any rides yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requestedRides.map((request) => (
              <div key={request.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <Send size={20} className="text-purple-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {request.departure_location} → {request.destination_location}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        request.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {request.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">When</p>
                        <div className="font-medium text-gray-900 flex items-center">
                          <Calendar size={14} className="mr-1 text-gray-400" />
                          {formatRequestDateDisplay(request)}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Search Radius</p>
                        <div className="font-medium text-gray-900">
                          {request.search_radius_miles} miles
                        </div>
                      </div>
                      {request.max_price && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Max Budget</p>
                          <div className="font-medium text-green-600">
                            {getCurrencySymbol(request.currency || 'USD')}{request.max_price}
                          </div>
                        </div>
                      )}
                    </div>

                    {request.additional_notes && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-1">Notes</p>
                        <p className="text-gray-900 text-sm">{request.additional_notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewRequestDetails(request)}
                      className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 font-medium transition-colors text-sm"
                    >
                      <History size={14} />
                      <span>Details</span>
                    </button>
                    
                    <button
                      onClick={() => handleEditRequest(request)}
                      className="flex items-center space-x-1 text-green-600 hover:text-green-700 font-medium transition-colors text-sm"
                    >
                      <Edit size={14} />
                      <span>Edit</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        const requestName = `${request.departure_location} → ${request.destination_location}`
                        showDeleteConfirmation('request', request.id, requestName)
                      }}
                      className="flex items-center space-x-1 text-red-600 hover:text-red-700 font-medium transition-colors text-sm"
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (rideView === 'joined') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setRideView('selector')}
              className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Rides You've Joined</h2>
          </div>
        </div>
        {/* Implementation would go here */}
      </div>
    )
  }

  return (
    <>
      {/* Delete Confirmation Modal */}
      {showDeleteModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} className="text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Delete {showDeleteModal.type === 'ride' ? 'Ride' : 'Request'}
              </h2>
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
                    {showDeleteModal.type === 'ride' ? (
                      <>
                        <li>• All associated confirmations will be removed</li>
                        <li>• Passengers will be notified if they had confirmed requests</li>
                      </>
                    ) : (
                      <li>• You will stop receiving notifications for matching rides</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteModal({ show: false, type: 'ride', id: '', name: '' })}
                className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (showDeleteModal.type === 'ride') {
                    handleDeleteRide(showDeleteModal.id)
                  } else {
                    handleDeleteRequest(showDeleteModal.id)
                  }
                }}
                className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Request Modal */}
      {showEditModal && editingRequest && (
        <RideRequestEditModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingRequest(null)
          }}
          request={editingRequest}
          onSave={handleSaveRequest}
        />
      )}

      {/* Request Details Modal */}
      {showRequestDetails && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <Send size={24} className="text-purple-600" />
                <h2 className="text-xl font-bold text-gray-900">Ride Request Details</h2>
              </div>
              <button
                onClick={() => {
                  setShowRequestDetails(false)
                  setSelectedRequest(null)
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Route Information */}
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-semibold text-purple-900 mb-3">Route Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">From</p>
                    <div className="font-medium text-gray-900 flex items-center">
                      <MapPin size={14} className="mr-1 text-gray-400" />
                      {selectedRequest.departure_location}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">To</p>
                    <div className="font-medium text-gray-900 flex items-center">
                      <MapPin size={14} className="mr-1 text-gray-400" />
                      {selectedRequest.destination_location}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Search Radius</p>
                    <div className="font-medium text-gray-900">
                      {selectedRequest.search_radius_miles} miles
                    </div>
                  </div>
                </div>
              </div>

              {/* Timing Information */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3">Timing Preferences</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Request Type</p>
                    <div className="font-medium text-gray-900 capitalize">
                      {selectedRequest.request_type.replace('_', ' ')}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">When</p>
                    <div className="font-medium text-gray-900">
                      {formatRequestDateDisplay(selectedRequest)}
                    </div>
                  </div>
                  {selectedRequest.departure_time_preference && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Preferred Time</p>
                      <div className="font-medium text-gray-900">
                        {selectedRequest.departure_time_preference}
                      </div>
                    </div>
                  )}
                </div>

                {selectedRequest.request_type === 'multiple_dates' && selectedRequest.multiple_dates && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-2">Selected Dates</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedRequest.multiple_dates.map((date, index) => (
                        <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          {formatDateSafe(date)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Budget Information */}
              {selectedRequest.max_price && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-3">Budget Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Maximum Budget</p>
                      <div className="font-medium text-green-600">
                        {getCurrencySymbol(selectedRequest.currency || 'USD')}{selectedRequest.max_price}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Currency</p>
                      <div className="font-medium text-gray-900">{selectedRequest.currency || 'USD'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Notes */}
              {selectedRequest.additional_notes && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Additional Notes</h3>
                  <p className="text-gray-700">{selectedRequest.additional_notes}</p>
                </div>
              )}

              {/* Request Status */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Request Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1">Status</p>
                    <div className={`font-medium ${request.is_active ? 'text-green-600' : 'text-gray-600'}`}>
                      {request.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Created</p>
                    <div className="font-medium text-gray-900">
                      {formatDateTimeSafe(selectedRequest.created_at)}
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Last Updated</p>
                    <div className="font-medium text-gray-900">
                      {formatDateTimeSafe(selectedRequest.updated_at)}
                    </div>
                  </div>
                </div>
                {selectedRequest.expires_at && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Expires</p>
                    <div className="font-medium text-orange-600">
                      {formatDateTimeSafe(selectedRequest.expires_at)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => handleEditRequest(selectedRequest)}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                <Edit size={16} />
                <span>Edit Request</span>
              </button>
              <button
                onClick={() => {
                  setShowRequestDetails(false)
                  setSelectedRequest(null)
                }}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )

  return null
}