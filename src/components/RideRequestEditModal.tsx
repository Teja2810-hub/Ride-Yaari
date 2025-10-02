import React, { useState, useEffect } from 'react'
import { X, Calendar, Clock, Save, Plus, Trash2, TriangleAlert as AlertTriangle, Car, DollarSign } from 'lucide-react'
import { supabase } from '../utils/supabase'
import { RideRequest } from '../types'
import { currencies, getCurrencySymbol } from '../utils/currencies'
import LocationAutocomplete from './LocationAutocomplete'
import { useErrorHandler } from '../hooks/useErrorHandler'
import ErrorMessage from './ErrorMessage'
import LoadingSpinner from './LoadingSpinner'

interface LocationData {
  address: string
  latitude: number | null
  longitude: number | null
}

interface RideRequestEditModalProps {
  isOpen: boolean
  onClose: () => void
  request: RideRequest
  onUpdate: () => void
}

export default function RideRequestEditModal({
  isOpen,
  onClose,
  request,
  onUpdate
}: RideRequestEditModalProps) {
  const { error, isLoading, handleAsync, clearError } = useErrorHandler()
  const [departureLocation, setDepartureLocation] = useState<LocationData | null>(null)
  const [destinationLocation, setDestinationLocation] = useState<LocationData | null>(null)
  const [requestType, setRequestType] = useState<'specific_date' | 'multiple_dates' | 'month'>('specific_date')
  const [specificDate, setSpecificDate] = useState('')
  const [multipleDates, setMultipleDates] = useState<string[]>([''])
  const [requestMonth, setRequestMonth] = useState('')
  const [departureTimePreference, setDepartureTimePreference] = useState('')
  const [searchRadius, setSearchRadius] = useState(25)
  const [maxPrice, setMaxPrice] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (request) {
      setDepartureLocation({
        address: request.departure_location,
        latitude: request.departure_latitude || null,
        longitude: request.departure_longitude || null
      })
      setDestinationLocation({
        address: request.destination_location,
        latitude: request.destination_latitude || null,
        longitude: request.destination_longitude || null
      })
      setRequestType(request.request_type)
      setSpecificDate(request.specific_date || '')
      setMultipleDates(request.multiple_dates || [''])
      setRequestMonth(request.request_month || '')
      setDepartureTimePreference(request.departure_time_preference || '')
      setSearchRadius(request.search_radius_miles)
      setMaxPrice(request.max_price?.toString() || '')
      setCurrency(request.currency || 'USD')
      setAdditionalNotes(request.additional_notes || '')
      setIsActive(request.is_active)
    }
  }, [request])

  const handleSave = async () => {
    await handleAsync(async () => {
      // Calculate expiry date
      let expiresAt: string | null = null
      
      if (requestType === 'specific_date' && specificDate) {
        const expiry = new Date(specificDate)
        expiry.setHours(23, 59, 59, 999)
        expiresAt = expiry.toISOString()
      } else if (requestType === 'multiple_dates' && multipleDates.length > 0) {
        const validDates = multipleDates.filter(d => d)
        if (validDates.length > 0) {
          const latestDate = validDates.sort().pop()
          if (latestDate) {
            const expiry = new Date(latestDate)
            expiry.setHours(23, 59, 59, 999)
            expiresAt = expiry.toISOString()
          }
        }
      } else if (requestType === 'month' && requestMonth) {
        const [year, month] = requestMonth.split('-')
        const expiry = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999)
        expiresAt = expiry.toISOString()
      }

      const updateData = {
        departure_location: departureLocation?.address || '',
        departure_latitude: departureLocation?.latitude,
        departure_longitude: departureLocation?.longitude,
        destination_location: destinationLocation?.address || '',
        destination_latitude: destinationLocation?.latitude,
        destination_longitude: destinationLocation?.longitude,
        request_type: requestType,
        specific_date: requestType === 'specific_date' ? specificDate : null,
        multiple_dates: requestType === 'multiple_dates' ? multipleDates.filter(d => d) : null,
        request_month: requestType === 'month' ? requestMonth : null,
        departure_time_preference: departureTimePreference || null,
        search_radius_miles: searchRadius,
        max_price: maxPrice ? parseFloat(maxPrice) : null,
        currency: maxPrice ? currency : null,
        additional_notes: additionalNotes || null,
        is_active: isActive,
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('ride_requests')
        .update(updateData)
        .eq('id', request.id)

      if (error) throw error

      onUpdate()
      onClose()
    })
  }

  const addDate = () => {
    if (multipleDates.length < 10) {
      setMultipleDates([...multipleDates, ''])
    }
  }

  const removeDate = (index: number) => {
    setMultipleDates(multipleDates.filter((_, i) => i !== index))
  }

  const updateDate = (index: number, value: string) => {
    const newDates = [...multipleDates]
    newDates[index] = value
    setMultipleDates(newDates)
  }

  const getTomorrowDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  const getTodayMonth = () => {
    return new Date().toISOString().slice(0, 7)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Car size={24} className="text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">Edit Ride Request</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <ErrorMessage
              message={error}
              onRetry={clearError}
              onDismiss={clearError}
              className="mb-6"
            />
          )}

          {isLoading && (
            <div className="mb-6">
              <LoadingSpinner text="Saving changes..." />
            </div>
          )}

          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <LocationAutocomplete
                value={departureLocation}
                onChange={setDepartureLocation}
                placeholder="Enter departure location..."
                label="From Location"
                required
              />

              <LocationAutocomplete
                value={destinationLocation}
                onChange={setDestinationLocation}
                placeholder="Enter destination location..."
                label="To Location"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Radius
              </label>
              <select
                value={searchRadius}
                onChange={(e) => setSearchRadius(parseInt(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
              >
                <option value={5}>5 miles</option>
                <option value={10}>10 miles</option>
                <option value={15}>15 miles</option>
                <option value={20}>20 miles</option>
                <option value={25}>25 miles</option>
                <option value={30}>30 miles</option>
                <option value={40}>40 miles</option>
                <option value={50}>50 miles</option>
                <option value={75}>75 miles</option>
                <option value={100}>100 miles</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                When do you need the ride?
              </label>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="requestType"
                    value="specific_date"
                    checked={requestType === 'specific_date'}
                    onChange={(e) => setRequestType(e.target.value as any)}
                    className="mr-3"
                  />
                  <span className="text-sm text-gray-700">Specific Date</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="requestType"
                    value="multiple_dates"
                    checked={requestType === 'multiple_dates'}
                    onChange={(e) => setRequestType(e.target.value as any)}
                    className="mr-3"
                  />
                  <span className="text-sm text-gray-700">Multiple Dates</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="requestType"
                    value="month"
                    checked={requestType === 'month'}
                    onChange={(e) => setRequestType(e.target.value as any)}
                    className="mr-3"
                  />
                  <span className="text-sm text-gray-700">Entire Month</span>
                </label>
              </div>
            </div>

            {requestType === 'specific_date' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    value={specificDate}
                    onChange={(e) => setSpecificDate(e.target.value)}
                    min={getTomorrowDate()}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                    required
                  />
                </div>
              </div>
            )}

            {requestType === 'multiple_dates' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Preferred Dates
                  </label>
                  {multipleDates.length < 10 && (
                    <button
                      type="button"
                      onClick={addDate}
                      className="flex items-center space-x-1 text-green-600 hover:text-green-700 text-sm font-medium"
                    >
                      <Plus size={16} />
                      <span>Add Date</span>
                    </button>
                  )}
                </div>
                
                {multipleDates.map((date, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-3">
                    <div className="flex-1 relative">
                      <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => updateDate(index, e.target.value)}
                        min={getTomorrowDate()}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                      />
                    </div>
                    {multipleDates.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDate(index)}
                        className="flex items-center justify-center w-10 h-10 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {requestType === 'month' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Month
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="month"
                    value={requestMonth}
                    onChange={(e) => setRequestMonth(e.target.value)}
                    min={getTodayMonth()}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Time (Optional)
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="time"
                  value={departureTimePreference}
                  onChange={(e) => setDepartureTimePreference(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Budget (Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-400 font-medium">
                    {getCurrencySymbol(currency)}
                  </span>
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                  disabled={!maxPrice}
                >
                  {currencies.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.symbol} {curr.code} - {curr.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Any special requirements or preferences..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors resize-none"
                rows={3}
                maxLength={200}
              />
              <div className="text-xs text-gray-500 mt-1">
                {additionalNotes.length}/200 characters
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Keep request active
              </label>
            </div>

            {!isActive && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle size={16} className="text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    Inactive requests will not receive notifications and won't be visible to drivers. 
                    You can reactivate it anytime by editing again.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || !departureLocation || !destinationLocation}
            className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}