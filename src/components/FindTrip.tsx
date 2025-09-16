import React, { useState } from 'react'
import { ArrowLeft, Calendar, MessageCircle, User, Plane, AlertTriangle, Clock } from 'lucide-react'
import { supabase } from '../utils/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Trip } from '../types'
import AirportAutocomplete from './AirportAutocomplete'
import DisclaimerModal from './DisclaimerModal'
import { getCurrencySymbol } from '../utils/currencies'

interface FindTripProps {
  onBack: () => void
  onStartChat: (userId: string, userName: string, ride?: CarRide, trip?: Trip) => void
}

export default function FindTrip({ onBack, onStartChat }: FindTripProps) {
  const { user } = useAuth()
  const [departureAirport, setDepartureAirport] = useState('')
  const [destinationAirport, setDestinationAirport] = useState('')
  const [travelDate, setTravelDate] = useState('')
  const [travelMonth, setTravelMonth] = useState('')
  const [searchByMonth, setSearchByMonth] = useState(false)
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [selectedChatUser, setSelectedChatUser] = useState<{userId: string, userName: string}>({userId: '', userName: ''})
  const [selectedChatTrip, setSelectedChatTrip] = useState<Trip | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Get current date to filter out past trips
      const now = new Date().toISOString().split('T')[0]
      
      let query = supabase
        .from('trips')
        .select(`
          *,
          user_profiles:user_id (
            id,
            full_name
          )
        `)

      if (departureAirport) {
        query = query.eq('leaving_airport', departureAirport)
      }
      if (destinationAirport) {
        query = query.eq('destination_airport', destinationAirport)
      }
      
      if (searchByMonth && travelMonth) {
        const startOfMonth = `${travelMonth}-01`
        const endOfMonth = new Date(travelMonth + '-01')
        endOfMonth.setMonth(endOfMonth.getMonth() + 1)
        const endOfMonthStr = endOfMonth.toISOString().split('T')[0]
        
        query = query.gte('travel_date', startOfMonth).lt('travel_date', endOfMonthStr)
      } else if (!searchByMonth && travelDate) {
        query = query.eq('travel_date', travelDate)
      }

      // Always filter for future trips
      query = query.gte('travel_date', now)

      const { data, error } = await query.order('travel_date')

      if (error) throw error

      setTrips(data || [])
      setSearched(true)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChatClick = (userId: string, userName: string, trip: Trip) => {
    setSelectedChatUser({ userId, userName })
    setSelectedChatTrip(trip)
    setShowDisclaimer(true)
  }

  const handleConfirmChat = () => {
    setShowDisclaimer(false)
    onStartChat(selectedChatUser.userId, selectedChatUser.userName, undefined, selectedChatTrip || undefined)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0]
  }

  const getTodayMonth = () => {
    return new Date().toISOString().slice(0, 7)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Dashboard</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Find a Trip</h1>
            <p className="text-gray-600">Search for travelers on your needed route</p>
          </div>

          <form onSubmit={handleSearch} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <AirportAutocomplete
                value={departureAirport}
                onChange={setDepartureAirport}
                placeholder="Any departure airport"
                label="Departure Airport"
              />

              <AirportAutocomplete
                value={destinationAirport}
                onChange={setDestinationAirport}
                placeholder="Any destination airport"
                label="Destination Airport"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Search by Date or Month
              </label>
              <div className="flex space-x-4 mb-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="searchType"
                    checked={!searchByMonth}
                    onChange={() => setSearchByMonth(false)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Specific Date</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="searchType"
                    checked={searchByMonth}
                    onChange={() => setSearchByMonth(true)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Entire Month</span>
                </label>
              </div>
            </div>

            {!searchByMonth ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Travel Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    min={getTodayDate()}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Any date"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">Leave empty to search all dates</p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Travel Month
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="month"
                    value={travelMonth}
                    onChange={(e) => setTravelMonth(e.target.value)}
                    min={getTodayMonth()}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">Search for all trips in the selected month</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Searching...' : 'Search Trips'}
            </button>
          </form>
        </div>

        {/* Search Results */}
        {searched && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Search Results
              </h2>
              <span className="text-gray-600">
                {trips.length} trip{trips.length !== 1 ? 's' : ''} found
              </span>
            </div>

            {trips.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plane size={32} className="text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No trips found</h3>
                <p className="text-gray-600 mb-6">
                  Try adjusting your search criteria or check back later for new trips
                </p>
                <button
                  onClick={() => {
                    setDepartureAirport('')
                    setDestinationAirport('')
                    setTravelDate('')
                    setTravelMonth('')
                    setSearched(false)
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Clear Search
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {trips.map((trip) => (
                  <div
                    key={trip.id}
                    className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-4">
                          <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full">
                            <User size={24} className="text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900">
                              {trip.user_profiles?.full_name}
                            </h3>
                            <p className="text-gray-600">Traveler</p>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Departure</p>
                            <div className="font-semibold text-gray-900">
                              {trip.leaving_airport}
                            </div>
                          </div>

                          <div>
                            <p className="text-sm text-gray-600 mb-1">Destination</p>
                            <div className="font-semibold text-gray-900">
                              {trip.destination_airport}
                            </div>
                          </div>

                          <div>
                            <p className="text-sm text-gray-600 mb-1">Travel Date</p>
                            <div className="font-semibold text-gray-900">
                              {formatDate(trip.travel_date)}
                            </div>
                          </div>
                        </div>

                        {trip.price && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center space-x-4">
                              <div>
                                <p className="text-sm text-gray-600 mb-1">Service Price</p>
                                <div className="flex items-center space-x-2">
                                  <span className="font-semibold text-green-600 flex items-center">
                                    <DollarSign size={16} className="mr-1" />
                                    {getCurrencySymbol(trip.currency || 'USD')}{trip.price}
                                  </span>
                                  {trip.negotiable && (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                      Negotiable
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="ml-6">
                        {trip.user_id === user?.id ? (
                          <div className="flex items-center space-x-2 bg-gray-100 text-gray-500 px-6 py-3 rounded-lg font-medium cursor-not-allowed">
                            <AlertTriangle size={20} />
                            <span>Your Trip</span>
                          </div>
                        ) : (
                          <div className="flex flex-col space-y-2">
                            <button
                              onClick={() => handleChatClick(trip.user_id, trip.user_profiles?.full_name || 'Unknown', trip)}
                              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                            >
                              <MessageCircle size={20} />
                              <span>Start Chat</span>
                            </button>
                            <p className="text-xs text-gray-500 text-center">
                              Chat first, then request confirmation
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DisclaimerModal
          isOpen={showDisclaimer}
          onClose={() => setShowDisclaimer(false)}
          onConfirm={handleConfirmChat}
          loading={false}
          type="chat-trip"
        />
      </div>
    </div>
  )
}