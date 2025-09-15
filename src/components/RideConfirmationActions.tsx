import React, { useState } from 'react'
import { Check, X, MessageCircle, Car, Plane, Calendar, MapPin, Clock, User } from 'lucide-react'
import { supabase } from '../utils/supabase'
import { RideConfirmation } from '../types'
import { getCurrencySymbol } from '../utils/currencies'

interface RideConfirmationActionsProps {
  confirmation: RideConfirmation
  onUpdate: () => void
  onStartChat: (userId: string, userName: string) => void
}

export default function RideConfirmationActions({ confirmation, onUpdate, onStartChat }: RideConfirmationActionsProps) {
  const [loading, setLoading] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  const handleCancel = async () => {
    setShowCancelDialog(false)

    setLoading(true)
    try {
      // Update confirmation status to rejected
      const { error } = await supabase
        .from('ride_confirmations')
        .update({ 
          status: 'rejected',
          confirmed_at: new Date().toISOString()
        })
        .eq('id', confirmation.id)

      if (error) throw error

      // Send system message to passenger
      const rideType = confirmation.ride_id ? 'car ride' : 'airport trip'
      const systemMessage = `😔 Unfortunately, the ${rideType} you were confirmed for has been cancelled by the ride owner. You can request to join this ride again using the button below.`
      
      await supabase
        .from('chat_messages')
        .insert({
          sender_id: confirmation.ride_owner_id,
          receiver_id: confirmation.passenger_id,
          message_content: systemMessage,
          message_type: 'system',
          is_read: false
        })

      onUpdate()
    } catch (error: any) {
      console.error('Error cancelling ride:', error)
      alert('Failed to process request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    setLoading(true)
    try {
      // Update confirmation status
      const { error } = await supabase
        .from('ride_confirmations')
        .update({ 
          status: 'accepted',
          confirmed_at: new Date().toISOString()
        })
        .eq('id', confirmation.id)

      if (error) throw error

      // Send system message to passenger
      const rideType = confirmation.ride_id ? 'car ride' : 'airport trip'
      const systemMessage = `🎉 Great news! Your request for the ${rideType} has been ACCEPTED! You can now coordinate pickup details and payment. You can cancel anytime if needed.`
      
      await supabase
        .from('chat_messages')
        .insert({
          sender_id: confirmation.ride_owner_id,
          receiver_id: confirmation.passenger_id,
          message_content: systemMessage,
          message_type: 'system',
          is_read: false
        })

      onUpdate()
    } catch (error: any) {
      console.error('Error accepting confirmation:', error)
      alert('Failed to accept passenger. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    setLoading(true)
    try {
      // Update confirmation status
      const { error } = await supabase
        .from('ride_confirmations')
        .update({ 
          status: 'rejected',
          confirmed_at: new Date().toISOString()
        })
        .eq('id', confirmation.id)

      if (error) throw error

      // Send system message to passenger
      const rideType = confirmation.ride_id ? 'car ride' : 'airport trip'
      const systemMessage = `😔 Unfortunately, your request for the ${rideType} has been declined. You can request to join this ride again using the button below if needed.`
      
      await supabase
        .from('chat_messages')
        .insert({
          sender_id: confirmation.ride_owner_id,
          receiver_id: confirmation.passenger_id,
          message_content: systemMessage,
          message_type: 'system',
          is_read: false
        })

      onUpdate()
    } catch (error: any) {
      console.error('Error rejecting confirmation:', error)
      alert('Failed to reject passenger. Please try again.')
    } finally {
      setLoading(false)
    }
  }

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const ride = confirmation.car_rides
  const trip = confirmation.trips
  const passenger = confirmation.user_profiles

  return (
    <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {confirmation.status === 'accepted' ? 'Cancel Confirmed Ride' : 'Cancel Ride Request'}
                  </h3>
              {passenger.full_name.charAt(0).toUpperCase()}
            </span>
                      ? 'Are you sure you want to cancel this confirmed ride? This will remove the passenger from your ride and they will be notified. They can request to join again if needed.'
                      : 'Are you sure you want to cancel this ride request? The passenger will be notified and can request again if needed.'
            <h3 className="text-lg font-semibold text-gray-900">{passenger.full_name}</h3>
            <p className="text-sm text-gray-600">
              {confirmation.status === 'pending' ? 'wants to join your' : 
               confirmation.status === 'accepted' ? 'confirmed for your' : 
               'was rejected from your'} {ride ? 'car ride' : 'airport trip'}
            </p>
          </div>
        </div>
                    {confirmation.status === 'accepted' ? 'Keep Ride' : 'Keep Request'}
          <span className={`text-xs px-2 py-1 rounded-full ${
            confirmation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
            confirmation.status === 'accepted' ? 'bg-green-100 text-green-800' :
            'bg-red-100 text-red-800'
          }`}>
            {confirmation.status.charAt(0).toUpperCase() + confirmation.status.slice(1)}
          </span>
          {ride ? (
            <Car size={20} className="text-green-600" />
          ) : (
            <Plane size={20} className="text-blue-600" />
          )}
        </div>
      </div>

      {/* Ride/Trip Details */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        {ride && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>
        )}

        {trip && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">From</p>
              <div className="font-medium text-gray-900">{trip.leaving_airport}</div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">To</p>
              <div className="font-medium text-gray-900">{trip.destination_airport}</div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Travel Date</p>
              <div className="font-medium text-gray-900 flex items-center">
                <Calendar size={14} className="mr-1 text-gray-400" />
                {formatDate(trip.travel_date)}
              </div>
            </div>
          </div>
        )}

        {(ride?.price || trip?.price) && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <span className="text-sm font-medium text-green-600">
              Price: {getCurrencySymbol((ride?.currency || trip?.currency) || 'USD')}{ride?.price || trip?.price}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onStartChat(passenger.id, passenger.full_name)}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          <MessageCircle size={16} />
          <span>Chat with {passenger.full_name}</span>
        </button>

        {confirmation.status === 'pending' && (
          <div className="flex items-center space-x-3">
            <button
              onClick={handleReject}
              disabled={loading}
              className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <X size={16} />
              <span>Reject</span>
            </button>
            <button
              onClick={handleAccept}
              disabled={loading}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <Check size={16} />
              <span>Accept</span>
            </button>
          </div>
        )}

        {confirmation.status === 'accepted' && (
          <button
            onClick={() => setShowCancelDialog(true)}
            disabled={loading}
            className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <X size={16} />
            <span>Cancel Ride</span>
          </button>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X size={24} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Cancel Ride Confirmation</h3>
              <p className="text-gray-600">
                {confirmation.status === 'accepted' 
                  ? 'Are you sure you want to cancel this accepted ride? This will remove the passenger from your ride and they will be notified. They can request to join again if needed.'
                  : 'Are you sure you want to reject this ride request? The passenger will be notified and can request again if needed.'
                }
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCancelDialog(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Keep Ride
              </button>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}