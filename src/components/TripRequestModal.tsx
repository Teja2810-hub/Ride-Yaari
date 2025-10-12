import React, { useState, useEffect } from 'react'
import { X, Plane, Clock, DollarSign, Loader, Calendar } from 'lucide-react'
import { Trip } from '../types'
import { supabase } from '../utils/supabase'
import { getCurrencySymbol } from '../utils/currencies'
import { formatDateSafe } from '../utils/dateHelpers'
import LoadingSpinner from './LoadingSpinner'

interface TripRequestModalProps {
  isOpen: boolean
  onClose: () => void
  travelerId: string
  travelerName: string
  onRequestSubmit: (tripId: string) => Promise<void>
}

export default function TripRequestModal({
  isOpen,
  onClose,
  travelerId,
  travelerName,
  onRequestSubmit
}: TripRequestModalProps) {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen && travelerId) {
      fetchTravelerTrips()
    }
  }, [isOpen, travelerId])

  const fetchTravelerTrips = async () => {
    setLoading(true)
    setError('')

    try {
      const now = new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', travelerId)
        .eq('is_closed', false)
        .is('is_trip_request', false)
        .gte('travel_date', now)
        .order('travel_date', { ascending: true })

      if (error) throw error

      setTrips(data || [])

      if (data && data.length === 1) {
        setSelectedTrip(data[0])
      }
    } catch (err) {
      console.error('Error fetching traveler trips:', err)
      setError('Failed to load available trips')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedTrip) {
      setError('Please select a trip')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await onRequestSubmit(selectedTrip.id)
      onClose()
    } catch (err: any) {
      console.error('Error submitting request:', err)
      setError(err.message || 'Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex-shrink-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Request Trip Assistance</h2>
            <p className="text-sm text-gray-600 mt-1">
              Select a trip from {travelerName}'s available trips
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner text="Loading available trips..." />
            </div>
          ) : trips.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plane size={32} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Available Trips</h3>
              <p className="text-gray-600">
                {travelerName} doesn't have any active trips at the moment.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {trips.map((trip) => {
                  const isSelected = selectedTrip?.id === trip.id

                  return (
                    <div
                      key={trip.id}
                      onClick={() => setSelectedTrip(trip)}
                      className={`border rounded-xl p-4 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Departure</p>
                          <div className="font-semibold text-gray-900 flex items-start">
                            <Plane size={14} className="mr-1 mt-1 flex-shrink-0 text-gray-400" />
                            <span>{trip.leaving_airport}</span>
                          </div>
                          {trip.departure_time && (
                            <div className="text-xs text-gray-600 flex items-center mt-1">
                              <Clock size={10} className="mr-1" />
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
                          <p className="text-xs text-gray-600 mb-1">Destination</p>
                          <div className="font-semibold text-gray-900 flex items-start">
                            <Plane size={14} className="mr-1 mt-1 flex-shrink-0 text-gray-400" />
                            <span>{trip.destination_airport}</span>
                          </div>
                          {trip.landing_time && (
                            <div className="text-xs text-gray-600 flex items-center mt-1">
                              <Clock size={10} className="mr-1" />
                              {trip.landing_time}
                              {trip.landing_timezone && (
                                <span className="text-xs text-gray-500 ml-1">
                                  ({trip.landing_timezone})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-gray-600">
                          <Calendar size={14} className="mr-1" />
                          <span>{formatDateSafe(trip.travel_date)}</span>
                          {trip.landing_date && trip.landing_date !== trip.travel_date && (
                            <span className="ml-2 text-xs">
                              → {formatDateSafe(trip.landing_date)}
                            </span>
                          )}
                        </div>
                        {trip.price && (
                          <div className="flex items-center text-green-600 font-semibold">
                            <DollarSign size={14} className="mr-1" />
                            <span>{getCurrencySymbol(trip.currency || 'USD')}{trip.price}</span>
                            {trip.negotiable && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                Negotiable
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {selectedTrip && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Selected Trip</h3>
                  <div className="text-sm text-gray-700">
                    <p className="mb-1">
                      <span className="font-medium">Route:</span> {selectedTrip.leaving_airport} → {selectedTrip.destination_airport}
                    </p>
                    <p className="mb-1">
                      <span className="font-medium">Date:</span> {formatDateSafe(selectedTrip.travel_date)}
                    </p>
                    {selectedTrip.price && (
                      <p>
                        <span className="font-medium">Service Price:</span> {getCurrencySymbol(selectedTrip.currency || 'USD')}{selectedTrip.price}
                      </p>
                    )}
                  </div>
                </div>
              )}

            </>
          )}
        </div>

        {!loading && trips.length > 0 && selectedTrip && (
          <div className="flex-shrink-0 bg-white border-t border-gray-200 p-6 flex space-x-4 sticky bottom-0">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedTrip || submitting}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center justify-center">
                  <Loader className="animate-spin mr-2" size={16} />
                  Sending Request...
                </span>
              ) : (
                'Send Request'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
