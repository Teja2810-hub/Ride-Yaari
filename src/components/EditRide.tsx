import React, { useState, useEffect } from 'react'
import { ArrowLeft, Calendar, Clock, DollarSign, Save, MapPin, Plus, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import LocationAutocomplete from './LocationAutocomplete'
import { currencies, getCurrencySymbol } from '../utils/currencies'
import { CarRide } from '../types'

interface LocationData {
  address: string
  latitude: number | null
  longitude: number | null
}

interface EditRideProps {
  onBack: () => void
  ride: CarRide
}

export default function EditRide({ onBack, ride }: EditRideProps) {
  const { user } = useAuth()
  const [fromLocation, setFromLocation] = useState<LocationData | null>(null)
  const [toLocation, setToLocation] = useState<LocationData | null>(null)
  const [intermediateStops, setIntermediateStops] = useState<LocationData[]>([])
  const [departureDateTime, setDepartureDateTime] = useState('')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Initialize form with existing ride data
    setFromLocation({
      address: ride.from_location,
      latitude: ride.from_latitude || null,
      longitude: ride.from_longitude || null
    })
    
    setToLocation({
      address: ride.to_location,
      latitude: ride.to_latitude || null,
      longitude: ride.to_longitude || null
    })
    
    setDepartureDateTime(ride.departure_date_time.slice(0, 16)) // Format for datetime-local
    setPrice(ride.price.toString())
    setCurrency(ride.currency || 'USD')
    
    // Initialize intermediate stops if they exist
    if (ride.intermediate_stops && Array.isArray(ride.intermediate_stops)) {
      setIntermediateStops(ride.intermediate_stops.map(stop => ({
        address: stop.address,
        latitude: stop.latitude || null,
        longitude: stop.longitude || null
      })))
    }
  }, [ride])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !fromLocation || !toLocation) return
    
    setLoading(true)
    setError('')

    try {
      console.log('Updating ride with locations:', { fromLocation, toLocation, intermediateStops })
      
      const { error } = await supabase
        .from('car_rides')
        .update({
          from_location: fromLocation.address,
          to_location: toLocation.address,
          from_latitude: fromLocation.latitude,
          from_longitude: fromLocation.longitude,
          to_latitude: toLocation.latitude,
          to_longitude: toLocation.longitude,
          departure_date_time: new Date(departureDateTime).toISOString(),
          price: parseFloat(price),
          currency: currency,
          intermediate_stops: intermediateStops.map(stop => ({
            address: stop.address,
            latitude: stop.latitude,
            longitude: stop.longitude
          }))
        })
        .eq('id', ride.id)

      if (error) throw error

      setSuccess(true)
      setTimeout(() => {
        onBack()
      }, 2000)
    } catch (error: any) {
      console.error('Error updating ride:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const addIntermediateStop = () => {
    if (intermediateStops.length < 3) {
      setIntermediateStops([...intermediateStops, { address: '', latitude: null, longitude: null }])
    }
  }

  const removeIntermediateStop = (index: number) => {
    setIntermediateStops(intermediateStops.filter((_, i) => i !== index))
  }

  const updateIntermediateStop = (index: number, location: LocationData | null) => {
    if (location) {
      const newStops = [...intermediateStops]
      newStops[index] = location
      setIntermediateStops(newStops)
    }
  }

  const getTomorrowDateTime = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    return tomorrow.toISOString().slice(0, 16)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Save size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ride Updated Successfully!</h2>
          <p className="text-gray-600 mb-8">
            Your ride has been updated. Redirecting back to your profile...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="container mx-auto max-w-2xl">
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Profile</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Your Ride</h1>
            <p className="text-gray-600">Update your ride details</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <LocationAutocomplete
              value={fromLocation}
              onChange={setFromLocation}
              placeholder="Enter departure location..."
              label="From Location"
              required
            />

            <LocationAutocomplete
              value={toLocation}
              onChange={setToLocation}
              placeholder="Enter destination location..."
              label="To Location"
              required
            />

            {/* Intermediate Stops */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Intermediate Stops (Optional)
                </label>
                {intermediateStops.length < 3 && (
                  <button
                    type="button"
                    onClick={addIntermediateStop}
                    className="flex items-center space-x-1 text-green-600 hover:text-green-700 text-sm font-medium"
                  >
                    <Plus size={16} />
                    <span>Add Stop</span>
                  </button>
                )}
              </div>
              
              {intermediateStops.map((stop, index) => (
                <div key={index} className="flex items-end space-x-2 mb-3">
                  <div className="flex-1">
                    <LocationAutocomplete
                      value={stop}
                      onChange={(location) => updateIntermediateStop(index, location)}
                      placeholder={`Stop ${index + 1} location...`}
                      label=""
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeIntermediateStop(index)}
                    className="flex items-center justify-center w-10 h-10 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Departure Date & Time <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="datetime-local"
                  value={departureDateTime}
                  onChange={(e) => setDepartureDateTime(e.target.value)}
                  min={getTomorrowDateTime()}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price per Passenger <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                >
                  {currencies.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.symbol} {curr.code} - {curr.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={onBack}
                className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !fromLocation || !toLocation || !departureDateTime || !price}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating Ride...' : 'Update Ride'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}