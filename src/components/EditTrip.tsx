import React, { useState, useEffect } from 'react'
import { ArrowLeft, Calendar, Send, Clock, Globe, Save, DollarSign } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import AirportAutocomplete from './AirportAutocomplete'
import { timezones, getDefaultTimezone } from '../utils/timezones'
import { currencies, getCurrencySymbol } from '../utils/currencies'
import { Trip } from '../types'

interface EditTripProps {
  onBack: () => void
  trip: Trip
}

export default function EditTrip({ onBack, trip }: EditTripProps) {
  const { user } = useAuth()
  const [leavingAirport, setLeavingAirport] = useState(trip.leaving_airport)
  const [destinationAirport, setDestinationAirport] = useState(trip.destination_airport)
  const [travelDate, setTravelDate] = useState(trip.travel_date)
  const [departureTime, setDepartureTime] = useState(trip.departure_time || '')
  const [landingDate, setLandingDate] = useState(trip.landing_date || '')
  const [landingTime, setLandingTime] = useState(trip.landing_time || '')
  const [departureTimezone, setDepartureTimezone] = useState(getDefaultTimezone())
  const [landingTimezone, setLandingTimezone] = useState(getDefaultTimezone())
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [negotiable, setNegotiable] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Initialize form with existing trip data
    setLeavingAirport(trip.leaving_airport)
    setDestinationAirport(trip.destination_airport)
    setTravelDate(trip.travel_date)
    setDepartureTime(trip.departure_time || '')
    setLandingDate(trip.landing_date || '')
    setLandingTime(trip.landing_time || '')
    setPrice(trip.price ? trip.price.toString() : '')
    setCurrency(trip.currency || 'USD')
    setNegotiable(trip.negotiable || false)
  }, [trip])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase
        .from('trips')
        .update({
          leaving_airport: leavingAirport,
          destination_airport: destinationAirport,
          travel_date: travelDate,
          departure_time: departureTime || null,
          landing_date: landingDate || null,
          landing_time: landingTime || null,
          price: price ? parseFloat(price) : null,
          currency: price ? currency : null,
          negotiable: price ? negotiable : false,
        })
        .eq('id', trip.id)

      if (error) throw error

      setSuccess(true)
      setTimeout(() => {
        onBack()
      }, 2000)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const getTomorrowDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Save size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Trip Updated Successfully!</h2>
          <p className="text-gray-600 mb-8">
            Your trip has been updated. Redirecting back to your profile...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="container mx-auto max-w-2xl">
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Profile</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Your Trip</h1>
            <p className="text-gray-600">Update your flight details</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <AirportAutocomplete
              value={leavingAirport}
              onChange={setLeavingAirport}
              placeholder="Search for departure airport..."
              label="Leaving Airport"
              required
            />

            <AirportAutocomplete
              value={destinationAirport}
              onChange={setDestinationAirport}
              placeholder="Search for destination airport..."
              label="Destination Airport"
              required
            />

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Travel Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    min={getTomorrowDate()}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Departure Time
                </label>
                <div className="space-y-3">
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="time"
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                  </div>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <select
                      value={departureTimezone}
                      onChange={(e) => setDepartureTimezone(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    >
                      {timezones.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label} ({tz.offset})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-1">Optional - specify if you want to share exact timing</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Landing Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    value={landingDate}
                    onChange={(e) => setLandingDate(e.target.value)}
                    min={travelDate}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">Optional - leave empty if same day or unknown</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Landing Time
                </label>
                <div className="space-y-3">
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="time"
                      value={landingTime}
                      onChange={(e) => setLandingTime(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                  </div>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <select
                      value={landingTimezone}
                      onChange={(e) => setLandingTimezone(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    >
                      {timezones.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label} ({tz.offset})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-1">Optional - specify if you want to share exact timing</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-3">💰 Service Pricing (Optional)</h3>
              <p className="text-sm text-blue-800 mb-4">
                Set a price for your airport assistance service. Leave empty if offering free assistance.
              </p>
              
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Price
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    disabled={!price}
                  >
                    {currencies.map((curr) => (
                      <option key={curr.code} value={curr.code}>
                        {curr.symbol} {curr.code} - {curr.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {price && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="negotiable"
                    checked={negotiable}
                    onChange={(e) => setNegotiable(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <label htmlFor="negotiable" className="text-sm font-medium text-gray-700">
                    Price is negotiable
                  </label>
                </div>
              )}
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
                disabled={loading || !leavingAirport || !destinationAirport || !travelDate}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating Trip...' : 'Update Trip'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}