import React, { useState } from 'react'
import { X, Car, Plane, Calendar, MapPin, Clock } from 'lucide-react'

interface RideConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (rideId: string | null, tripId: string | null) => void
  rides: any[]
  trips: any[]
  passengerName: string
  preSelectedRide?: CarRide
  preSelectedTrip?: Trip
}

export default function RideConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  rides,
  trips,
  passengerName,
  preSelectedRide,
  preSelectedTrip
}: RideConfirmationModalProps) {
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null)
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)

  // Auto-select pre-selected ride or trip
  React.useEffect(() => {
    if (preSelectedRide) {
      setSelectedRideId(preSelectedRide.id)
      setSelectedTripId(null)
    } else if (preSelectedTrip) {
      setSelectedTripId(preSelectedTrip.id)
      setSelectedRideId(null)
    }
  }, [preSelectedRide, preSelectedTrip])

  if (!isOpen) return null

  const handleConfirm = () => {
    if (selectedRideId || selectedTripId) {
      onConfirm(selectedRideId, selectedTripId)
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            Send Ride Confirmation to {passengerName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 mb-6">
            Select which ride or trip you'd like to formally invite {passengerName} to join:
          </p>

          {/* Car Rides Section */}
          {rides.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Car size={20} className="mr-2 text-green-600" />
                Your Car Rides
              </h3>
              <div className="space-y-3">
                {rides.map((ride) => (
                  <div
                    key={ride.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedRideId === ride.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                    onClick={() => {
                      setSelectedRideId(ride.id)
                      setSelectedTripId(null)
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        checked={selectedRideId === ride.id}
                        onChange={() => {
                          setSelectedRideId(ride.id)
                          setSelectedTripId(null)
                        }}
                        className="text-green-600"
                      />
                      <div className="flex-1">
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
                        <div className="mt-2">
                          <span className="text-sm font-medium text-green-600">
                            ${ride.price} per person
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Airport Trips Section */}
          {trips.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Plane size={20} className="mr-2 text-blue-600" />
                Your Airport Trips
              </h3>
              <div className="space-y-3">
                {trips.map((trip) => (
                  <div
                    key={trip.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedTripId === trip.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => {
                      setSelectedTripId(trip.id)
                      setSelectedRideId(null)
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        checked={selectedTripId === trip.id}
                        onChange={() => {
                          setSelectedTripId(trip.id)
                          setSelectedRideId(null)
                        }}
                        className="text-blue-600"
                      />
                      <div className="flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">From</p>
                            <div className="font-medium text-gray-900">
                              {trip.leaving_airport}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">To</p>
                            <div className="font-medium text-gray-900">
                              {trip.destination_airport}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Travel Date</p>
                            <div className="font-medium text-gray-900 flex items-center">
                              <Calendar size={14} className="mr-1 text-gray-400" />
                              {formatDate(trip.travel_date)}
                            </div>
                          </div>
                        </div>
                        {trip.price && (
                          <div className="mt-2">
                            <span className="text-sm font-medium text-blue-600">
                              ${trip.price} service fee
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {rides.length === 0 && trips.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-600">
                You don't have any upcoming rides or trips to confirm passengers for.
              </p>
            </div>
          )}
        </div>

        <div className="flex space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedRideId && !selectedTripId}
            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send Confirmation Request
          </button>
        </div>
      </div>
    </div>
  )
}