import React, { useState } from 'react'
import { ArrowLeft, Calendar, Send, Clock, AlertTriangle, Globe } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import AirportAutocomplete from './AirportAutocomplete'
import DisclaimerModal from './DisclaimerModal'
import { timezones, getDefaultTimezone } from '../utils/timezones'

interface PostTripProps {
  onBack: () => void
}

export default function PostTrip({ onBack }: PostTripProps) {
  const { user } = useAuth()
  const [leavingAirport, setLeavingAirport] = useState('')
  const [destinationAirport, setDestinationAirport] = useState('')
  const [travelDate, setTravelDate] = useState('')
  const [departureTime, setDepartureTime] = useState('')
  const [landingDate, setLandingDate] = useState('')
  const [landingTime, setLandingTime] = useState('')
  const [timezone, setTimezone] = useState(getDefaultTimezone())
  const [departureTimezone, setDepartureTimezone] = useState(getDefaultTimezone())
  const [landingTimezone, setLandingTimezone] = useState(getDefaultTimezone())
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [showDisclaimer, setShowDisclaimer] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setShowDisclaimer(true)
  }

  const handleConfirmPost = async () => {
    if (!user) return
    
    setLoading(true)
    setError('')
    setShowDisclaimer(false)

    try {
      const { error } = await supabase
        .from('trips')
        .insert({
          user_id: user.id,
          leaving_airport: leavingAirport,
          destination_airport: destinationAirport,
          travel_date: travelDate,
          departure_time: departureTime || null,
          landing_date: landingDate || null,
          landing_time: landingTime || null,
        })

      if (error) throw error

      setSuccess(true)
      // Reset form
      setLeavingAirport('')
      setDestinationAirport('')
      setTravelDate('')
      setDepartureTime('')
      setLandingDate('')
      setLandingTime('')
      setTimezone(getDefaultTimezone())
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
            <Send size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Trip Posted Successfully!</h2>
          <p className="text-gray-600 mb-8">
            Your trip has been added to our platform. Other travelers can now find and contact you for potential collaborations.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => setSuccess(false)}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Post Another Trip
            </button>
            <button
              onClick={onBack}
              className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
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
            <span>Back to Dashboard</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Post Your Trip</h1>
            <p className="text-gray-600">Share your flight details to help other travelers</p>
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
              <div className="flex items-start space-x-3">
                <AlertTriangle size={20} className="text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">Additional Use Cases</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Request a caretaker to accompany an elderly parent</li>
                    <li>• Find a rider to assist a first-time traveler</li>
                    <li>• Package delivery and pickup services</li>
                    <li>• Airport companionship and assistance</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">What happens next?</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Your trip will be visible to other users searching for this route</li>
                <li>• Interested travelers can contact you through our secure chat system</li>
                <li>• You can discuss delivery or pickup details privately</li>
                <li>• All communication stays within the platform for your safety</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading || !leavingAirport || !destinationAirport || !travelDate}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Posting Trip...' : 'Post My Trip'}
            </button>
          </form>
        </div>
        
        <DisclaimerModal
          isOpen={showDisclaimer}
          onClose={() => setShowDisclaimer(false)}
          onConfirm={handleConfirmPost}
          loading={loading}
          type="trip"
        />
      </div>
    </div>
  )
}