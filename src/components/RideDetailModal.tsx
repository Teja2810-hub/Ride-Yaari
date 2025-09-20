import React, { useState, useEffect } from 'react'
import { X, Car, Calendar, Clock, MapPin, DollarSign, Users, MessageCircle, Edit, Trash2, History } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { CarRide, RideConfirmation } from '../types'
import { getCurrencySymbol } from '../utils/currencies'
import PassengerManagement from './PassengerManagement'
import RideHistoryModal from './RideHistoryModal'

interface RideDetailModalProps {
  isOpen: boolean
  onClose: () => void
  ride: CarRide
  onEdit: (ride: CarRide) => void
  onDelete: (rideId: string) => void
  onStartChat: (userId: string, userName: string, ride?: CarRide, trip?: any) => void
}

export default function RideDetailModal({ 
  isOpen, 
  onClose, 
  ride, 
  onEdit, 
  onDelete, 
  onStartChat 
}: RideDetailModalProps) {
  const { user } = useAuth()
  const [showHistory, setShowHistory] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

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

  const handleUpdate = () => {
    setRefreshKey(prev => prev + 1)
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                <Car size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Car Ride Details</h2>
                <p className="text-sm text-gray-600">
                  {ride.from_location} → {ride.to_location}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowHistory(true)}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                <History size={16} />
                <span>History</span>
              </button>
              <button
                onClick={() => onEdit(ride)}
                className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium transition-colors"
              >
                <Edit size={16} />
                <span>Edit</span>
              </button>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this ride? This action cannot be undone.')) {
                    onDelete(ride.id)
                    onClose()
                  }
                }}
                className="flex items-center space-x-2 text-red-600 hover:text-red-700 font-medium transition-colors"
              >
                <Trash2 size={16} />
                <span>Delete</span>
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
            <div className="p-6 space-y-6">
              {/* Ride Information */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ride Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Price</p>
                    <div className="font-medium text-green-600 flex items-center">
                      <DollarSign size={14} className="mr-1 text-gray-400" />
                      {getCurrencySymbol(ride.currency || 'USD')}{ride.price}
                      {ride.negotiable && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-2">
                          Negotiable
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {ride.intermediate_stops && ride.intermediate_stops.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-2">Intermediate Stops</p>
                    <div className="flex flex-wrap gap-2">
                      {ride.intermediate_stops.map((stop, index) => (
                        <span key={index} className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                          {stop.address}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Posted on {new Date(ride.created_at).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {/* Passenger Management */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <Users size={20} className="mr-3 text-blue-600" />
                  Passenger Requests
                </h3>
                <PassengerManagement
                  key={refreshKey}
                  ride={ride}
                  onStartChat={onStartChat}
                  onUpdate={handleUpdate}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History Modal */}
      <RideHistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        ride={ride}
        onStartChat={onStartChat}
      />
    </>
  )
}