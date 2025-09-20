import React, { useState, useEffect } from 'react'
import { X, Plane, Calendar, Clock, DollarSign, Users, MessageCircle, Edit, Trash2, History } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Trip, RideConfirmation } from '../types'
import { getCurrencySymbol } from '../utils/currencies'
import PassengerManagement from './PassengerManagement'
import RideHistoryModal from './RideHistoryModal'

interface TripDetailModalProps {
  isOpen: boolean
  onClose: () => void
  trip: Trip
  onEdit: (trip: Trip) => void
  onDelete: (tripId: string) => void
  onStartChat: (userId: string, userName: string, ride?: any, trip?: Trip) => void
}

export default function TripDetailModal({ 
  isOpen, 
  onClose, 
  trip, 
  onEdit, 
  onDelete, 
  onStartChat 
}: TripDetailModalProps) {
  const { user } = useAuth()
  const [showHistory, setShowHistory] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <Plane size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Airport Trip Details</h2>
                <p className="text-sm text-gray-600">
                  {trip.leaving_airport} → {trip.destination_airport}
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
                onClick={() => onEdit(trip)}
                className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium transition-colors"
              >
                <Edit size={16} />
                <span>Edit</span>
              </button>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this trip? This action cannot be undone.')) {
                    onDelete(trip.id)
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
              {/* Trip Information */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Trip Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Departure Airport</p>
                    <div className="font-medium text-gray-900">
                      {trip.leaving_airport}
                    </div>
                    {trip.departure_time && (
                      <div className="text-sm text-gray-600 flex items-center mt-1">
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
                    <p className="text-sm text-gray-600 mb-1">Destination Airport</p>
                    <div className="font-medium text-gray-900">
                      {trip.destination_airport}
                    </div>
                    {trip.landing_time && (
                      <div className="text-sm text-gray-600 flex items-center mt-1">
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
                    <p className="text-sm text-gray-600 mb-1">Travel Date</p>
                    <div className="font-medium text-gray-900 flex items-center">
                      <Calendar size={14} className="mr-1 text-gray-400" />
                      {formatDate(trip.travel_date)}
                    </div>
                    {trip.landing_date && trip.landing_date !== trip.travel_date && (
                      <div className="text-sm text-gray-600 mt-1">
                        Landing: {formatDate(trip.landing_date)}
                      </div>
                    )}
                  </div>
                </div>

                {trip.price && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Service Price</p>
                        <div className="font-medium text-green-600 flex items-center">
                          <DollarSign size={14} className="mr-1 text-gray-400" />
                          {getCurrencySymbol(trip.currency || 'USD')}{trip.price}
                          {trip.negotiable && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-2">
                              Negotiable
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Posted on {new Date(trip.created_at).toLocaleDateString('en-US', {
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
                  trip={trip}
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
        trip={trip}
        onStartChat={onStartChat}
      />
    </>
  )
}