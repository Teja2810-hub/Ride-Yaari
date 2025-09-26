import React, { useState } from 'react'
import { ArrowLeft, Calendar, Clock, DollarSign, Send, MapPin, Plus, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { LocationAutocomplete } from './LocationAutocomplete'
import { DisclaimerModal } from './DisclaimerModal'
import { currencies, getCurrencySymbol } from '../utils/currencies'
import { popupManager } from '../utils/popupManager'

interface LocationData {
  address: string
  latitude: number | null
  longitude: number | null
}

interface PostRideProps {
  onBack: () => void
  isGuest?: boolean
}

export default function PostRide({ onBack, isGuest = false }: PostRideProps) {
  const { user, setGuestMode } = useAuth()
  const [fromLocation, setFromLocation] = useState<LocationData | null>(null)
  const [toLocation, setToLocation] = useState<LocationData | null>(null)
  const [intermediateStops, setIntermediateStops] = useState<LocationData[]>([])
  const [departureDateTime, setDepartureDateTime] = useState('')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [negotiable, setNegotiable] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check if user is a guest
    if (isGuest) {
      setShowAuthPrompt(true)
      return
    }
    
    // Check if disclaimer should be shown
    if (popupManager.shouldShowDisclaimer('ride', user?.id)) {
      setShowDisclaimer(true)
    } else {
      // Auto-proceed if disclaimer was already shown
      handleConfirmPost()
    }
  }

  const handleConfirmPost = async () => {
    if (!user || !fromLocation || !toLocation) return
    
    setLoading(true)
    setError('')
    setShowDisclaimer(false)
    
    // Mark disclaimer as shown
    popupManager.markDisclaimerShown('ride', user.id)

    try {
      console.log('Posting ride with locations:', { fromLocation, toLocation, intermediateStops })
      
      const { error } = await supabase
        .from('car_rides')
        .insert({
          user_id: user.id,
          from_location: fromLocation.address,
          to_location: toLocation.address,
          from_latitude: fromLocation.latitude,
          from_longitude: fromLocation.longitude,
          to_latitude: toLocation.latitude,
          to_longitude: toLocation.longitude,
          departure_date_time: new Date(departureDateTime).toISOString(),
          price: parseFloat(price),
          currency: currency,
          negotiable: negotiable,
          intermediate_stops: intermediateStops.map(stop => ({
            address: stop.address,
            latitude: stop.latitude,
            longitude: stop.longitude
          }))
        })

      if (error) throw error

      setSuccess(true)
      // Reset form
      setFromLocation(null)
      setToLocation(null)
      setIntermediateStops([])
      setDepartureDateTime('')
      setPrice('')
      setCurrency('USD')
      setNegotiable(false)
    } catch (error: any) {
      console.error('Error posting ride:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const addIntermediateStop = () => {
    if (intermediateStops.length < 3) { // Limit to 3 intermediate stops
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
    tomorrow.setHours(9, 0, 0, 0) // Default to 9 AM
    return tomorrow.toISOString().slice(0, 16) // Format for datetime-local input
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Send size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ride Posted Successfully!</h2>
          <p className="text-gray-600 mb-8">
            Your ride has been added to our platform. Other travelers can now find and contact you for carpooling.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => setSuccess(false)}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Post Another Ride
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
    <>
      <div className="min-h-screen bg-gradient-to-br from-green-50/90 to-emerald-100/90 travel-bg p-4">
      <div className="container mx-auto max-w-2xl">
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Dashboard</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Post Your Ride</h1>
            <p className="text-gray-600">Share your car ride to help others save money and reduce emissions</p>
            {isGuest && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Browsing as Guest:</strong> You can fill out the form, but you'll need to sign up to post your ride.
                </p>
              </div>
            )}
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
              placeholder="Enter city, neighborhood, or landmark (not exact address)"
              label="To Location"
              required
            />
            <p className="text-xs text-gray-500 mt-1 mb-4">
              For better discoverability, use a city, neighborhood, or landmark as your destination. If your ride is within a city, you can provide an exact location. Broader locations help more people find your ride!
            </p>

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
              
              {intermediateStops.length === 0 && (
                <p className="text-sm text-gray-500">Add stops along your route to attract more passengers</p>
              )}
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
                  <span className="absolute left-3 top-3 text-gray-400 font-medium">
                    {getCurrencySymbol(currency)}
                  </span>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
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

            <div className="flex items-center space-x-2 mb-6">
              <input
                type="checkbox"
                id="negotiable"
                checked={negotiable}
                onChange={(e) => setNegotiable(e.target.checked)}
                className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
              />
              <label htmlFor="negotiable" className="text-sm font-medium text-gray-700">
                Price is negotiable
              </label>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">💡 Tips for a Great Ride Post</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Set a fair price that covers gas and wear-and-tear</li>
                <li>• Be specific about pickup and drop-off locations</li>
                <li>• Add intermediate stops to attract more passengers</li>
                <li>• Post your ride at least a day in advance</li>
                <li>• Be responsive to passenger messages</li>
              </ul>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">What happens next?</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Your ride will be visible to users searching your route</li>
                <li>• Interested passengers can contact you through our secure chat</li>
                <li>• You can discuss pickup details and payment privately</li>
                <li>• All communication stays within the platform for safety</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading || !fromLocation || !toLocation || !departureDateTime || !price}
              className={`w-full py-3 px-4 rounded-lg font-medium focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isGuest 
                  ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {loading ? 'Posting Ride...' : isGuest ? 'Sign Up to Post Ride' : 'Post My Ride'}
            </button>
          </form>
        </div>
        
        <DisclaimerModal
          isOpen={showDisclaimer}
          onClose={() => setShowDisclaimer(false)}
          onConfirm={handleConfirmPost}
          loading={loading}
          type="ride"
        />
      </div>
    </div>

      {/* Auth Prompt Modal */}
      {showAuthPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User size={32} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign Up to Post Ride</h2>
              <p className="text-gray-600">
                To post your ride and connect with passengers, please create an account or sign in.
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowAuthPrompt(false)
                  setGuestMode(false)
                }}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Sign Up / Sign In
              </button>
              <button
                onClick={() => setShowAuthPrompt(false)}
                className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Continue as Guest
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}