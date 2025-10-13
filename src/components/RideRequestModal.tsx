import React, { useState, useEffect } from 'react'
import { X, MapPin, Clock, DollarSign, Users, Loader } from 'lucide-react'
import { CarRide } from '../types'
import { supabase } from '../utils/supabase'
import { getCurrencySymbol } from '../utils/currencies'
import { formatDateTimeSafe } from '../utils/dateHelpers'
import LoadingSpinner from './LoadingSpinner'

interface RideRequestModalProps {
  isOpen: boolean
  onClose: () => void
  driverId: string
  driverName: string
  onRequestSubmit: (rideId: string, seatsRequested: number) => Promise<void>
}

export default function RideRequestModal({
  isOpen,
  onClose,
  driverId,
  driverName,
  onRequestSubmit
}: RideRequestModalProps) {
  const [rides, setRides] = useState<CarRide[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRide, setSelectedRide] = useState<CarRide | null>(null)
  const [seatsRequested, setSeatsRequested] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen && driverId) {
      fetchDriverRides()
    }
  }, [isOpen, driverId])

  const fetchDriverRides = async () => {
    setLoading(true)
    setError('')

    try {
      const now = new Date().toISOString()

      const { data, error } = await supabase
        .from('car_rides')
        .select('*')
        .eq('user_id', driverId)
        .eq('is_closed', false)
        .is('trip_id', null)
        .gte('departure_date_time', now)
        .order('departure_date_time', { ascending: true })

      if (error) throw error

      setRides(data || [])

      if (data && data.length === 1) {
        setSelectedRide(data[0])
      }
    } catch (err) {
      console.error('Error fetching driver rides:', err)
      setError('Failed to load available rides')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedRide) {
      setError('Please select a ride')
      return
    }

    if (selectedRide.seats_available === 0) {
      setError('This ride has no available seats')
      return
    }

    if (seatsRequested < 1 || seatsRequested > selectedRide.seats_available) {
      setError(`Please select between 1 and ${selectedRide.seats_available} seats`)
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await onRequestSubmit(selectedRide.id, seatsRequested)
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 flex flex-col max-h-[calc(100vh-4rem)]">
        <div className="flex-shrink-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Request a Ride</h2>
            <p className="text-sm text-gray-600 mt-1">
              Select a ride from {driverName}'s available rides
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
              <LoadingSpinner text="Loading available rides..." />
            </div>
          ) : rides.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin size={32} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Available Rides</h3>
              <p className="text-gray-600">
                {driverName} doesn't have any active rides at the moment.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {rides.map((ride) => {
                  const isSelected = selectedRide?.id === ride.id
                  const hasSeats = ride.seats_available > 0

                  return (
                    <div
                      key={ride.id}
                      onClick={() => hasSeats && setSelectedRide(ride)}
                      className={`border rounded-xl p-4 cursor-pointer transition-all ${
                        !hasSeats
                          ? 'bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed'
                          : isSelected
                          ? 'border-green-500 bg-green-50 shadow-md'
                          : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                      }`}
                    >
                      {!hasSeats && (
                        <div className="mb-2">
                          <span className="inline-block bg-red-100 text-red-800 text-xs font-semibold px-2 py-1 rounded">
                            Fully Booked
                          </span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">From</p>
                          <div className="font-semibold text-gray-900 flex items-start">
                            <MapPin size={14} className="mr-1 mt-1 flex-shrink-0 text-gray-400" />
                            <span className="line-clamp-2">{ride.from_location}</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">To</p>
                          <div className="font-semibold text-gray-900 flex items-start">
                            <MapPin size={14} className="mr-1 mt-1 flex-shrink-0 text-gray-400" />
                            <span className="line-clamp-2">{ride.to_location}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-gray-600">
                          <Clock size={14} className="mr-1" />
                          <span>{formatDateTimeSafe(ride.departure_date_time)}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center text-green-600 font-semibold">
                            <DollarSign size={14} className="mr-1" />
                            <span>{getCurrencySymbol(ride.currency || 'USD')}{ride.price}</span>
                          </div>
                          <div className="flex items-center">
                            <Users size={14} className="mr-1 text-gray-600" />
                            <span className={`font-semibold ${hasSeats ? 'text-green-600' : 'text-red-600'}`}>
                              {ride.seats_available} / {ride.total_seats}
                            </span>
                          </div>
                        </div>
                      </div>

                      {ride.intermediate_stops && Array.isArray(ride.intermediate_stops) && ride.intermediate_stops.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-600 mb-1">Stops along the way:</p>
                          <p className="text-sm text-gray-700">
                            {ride.intermediate_stops.map((stop: any) => stop.address).join(' → ')}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {selectedRide && selectedRide.seats_available > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    How many seats do you need?
                  </label>
                  <div className="flex items-center space-x-4">
                    <select
                      value={seatsRequested}
                      onChange={(e) => setSeatsRequested(parseInt(e.target.value, 10))}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      {Array.from({ length: selectedRide.seats_available }, (_, i) => i + 1).map((num) => (
                        <option key={num} value={num}>
                          {num} seat{num > 1 ? 's' : ''}
                        </option>
                      ))}
                    </select>
                    <div className="text-sm text-gray-600">
                      Available: {selectedRide.seats_available}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Total price: {getCurrencySymbol(selectedRide.currency || 'USD')}
                    {(selectedRide.price * seatsRequested).toFixed(2)}
                  </p>
                </div>
              )}

            </>
          )}
        </div>

        {!loading && rides.length > 0 && (
          <div className="flex-shrink-0 bg-white border-t border-gray-200 p-6 flex space-x-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedRide || selectedRide.seats_available === 0 || submitting}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
