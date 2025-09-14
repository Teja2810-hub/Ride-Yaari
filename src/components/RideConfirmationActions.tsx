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
      const systemMessage = `🎉 Great news! Your request for the ${rideType} has been ACCEPTED! You can now coordinate pickup details and payment.`
      
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
      const systemMessage = `😔 Unfortunately, your request for the ${rideType} has been declined. Don't worry, there are many other rides available!`
      
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
            <span className="text-white font-semibold">
              {passenger.full_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{passenger.full_name}</h3>
            <p className="text-sm text-gray-600">wants to join your {ride ? 'car ride' : 'airport trip'}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
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
      </div>
    </div>
  )
}