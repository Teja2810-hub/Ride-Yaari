import React, { useState } from 'react'
import { X, Car, Plane, Calendar, MapPin, Clock } from 'lucide-react'

interface RideConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  passengerName: string
  preSelectedRide?: CarRide
  preSelectedTrip?: Trip
}

export default function RideConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  passengerName,
  preSelectedRide,
  preSelectedTrip
}: RideConfirmationModalProps) {

  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm()
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

  const selectedRide = preSelectedRide
  const selectedTrip = preSelectedTrip
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {selectedRide || selectedTrip ? 'Confirm Ride Request' : `Send Ride Confirmation to ${passengerName}`}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {selectedRide && (
            <>
              <p className="text-gray-600 mb-6">
                You are requesting to join this car ride:
              </p>
              <div className="border border-green-200 bg-green-50 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Car size={20} className="text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Car Ride</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">From</p>
                    <div className="font-medium text-gray-900 flex items-center">
                      <MapPin size={14} className="mr-1 text-gray-400" />
                      {selectedRide.from_location}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">To</p>
                    <div className="font-medium text-gray-900 flex items-center">
                      <MapPin size={14} className="mr-1 text-gray-400" />
                      {selectedRide.to_location}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Departure</p>
                    <div className="font-medium text-gray-900 flex items-center">
                      <Clock size={14} className="mr-1 text-gray-400" />
                      {formatDateTime(selectedRide.departure_date_time)}
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-sm font-medium text-green-600">
                    ${selectedRide.price} per person
                  </span>
                </div>
              </div>
            </>
          )}

          {selectedTrip && (
            <>
              <p className="text-gray-600 mb-6">
                You are requesting to join this airport trip:
              </p>
              <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Plane size={20} className="text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Airport Trip</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">From</p>
                    <div className="font-medium text-gray-900">
                      {selectedTrip.leaving_airport}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">To</p>
                    <div className="font-medium text-gray-900">
                      {selectedTrip.destination_airport}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Travel Date</p>
                    <div className="font-medium text-gray-900 flex items-center">
                      <Calendar size={14} className="mr-1 text-gray-400" />
                      {formatDate(selectedTrip.travel_date)}
                    </div>
                  </div>
                </div>
                {selectedTrip.price && (
                  <div className="mt-2">
                    <span className="text-sm font-medium text-blue-600">
                      ${selectedTrip.price} service fee
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {!selectedRide && !selectedTrip && (
            <div className="text-center py-8">
              <p className="text-gray-600">
                No ride or trip selected for confirmation.
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
            disabled={!selectedRide && !selectedTrip}
            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {selectedRide || selectedTrip ? 'Send Request' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}