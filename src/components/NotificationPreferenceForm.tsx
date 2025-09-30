import React, { useState } from 'react'
import { Bell, Calendar, Plus, X, Info } from 'lucide-react'

export interface NotificationPreferenceData {
  enabled: boolean
  dateType: 'specific_date' | 'multiple_dates' | 'month'
  specificDate: string
  multipleDates: string[]
  notificationMonth: string
}

interface NotificationPreferenceFormProps {
  value: NotificationPreferenceData
  onChange: (data: NotificationPreferenceData) => void
  type: 'ride' | 'trip'
  className?: string
}

export default function NotificationPreferenceForm({
  value,
  onChange,
  type,
  className = ''
}: NotificationPreferenceFormProps) {
  const addMultipleDate = () => {
    if (value.multipleDates.length < 5) {
      onChange({
        ...value,
        multipleDates: [...value.multipleDates, '']
      })
    }
  }

  const removeMultipleDate = (index: number) => {
    onChange({
      ...value,
      multipleDates: value.multipleDates.filter((_, i) => i !== index)
    })
  }

  const updateMultipleDate = (index: number, date: string) => {
    const newDates = [...value.multipleDates]
    newDates[index] = date
    onChange({
      ...value,
      multipleDates: newDates
    })
  }

  const getTomorrowDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  const getTodayMonth = () => {
    return new Date().toISOString().slice(0, 7)
  }

  const getNotificationDescription = () => {
    if (type === 'ride') {
      return 'Get notified when passengers request rides matching your route and timing preferences'
    } else {
      return 'Get notified when passengers request assistance on trips matching your route and timing preferences'
    }
  }

  const getHowItWorksText = () => {
    if (type === 'ride') {
      return 'When passengers request rides matching your route and selected dates, you\'ll receive notifications. This helps you find passengers even after posting your ride.'
    } else {
      return 'When passengers request assistance on trips matching your route and selected dates, you\'ll receive notifications. This helps you find people who need your travel assistance.'
    }
  }

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-center space-x-3 mb-4">
        <Bell size={20} className="text-blue-600" />
        <h3 className="font-semibold text-blue-900">
          Get Notified of Future {type === 'ride' ? 'Ride' : 'Trip'} Requests
        </h3>
      </div>
      
      <div className="flex items-start space-x-2 mb-4">
        <input
          type="checkbox"
          id={`enableNotifications-${type}`}
          checked={value.enabled}
          onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 mt-1"
        />
        <label htmlFor={`enableNotifications-${type}`} className="text-sm font-medium text-gray-700">
          {getNotificationDescription()}
        </label>
      </div>

      {value.enabled && (
        <div className="space-y-4 bg-white rounded-lg p-4 border border-blue-200">
          <div className="bg-blue-100 rounded-lg p-3 mb-4">
            <div className="flex items-start space-x-2">
              <Info size={16} className="text-blue-600 mt-0.5" />
              <p className="text-sm text-blue-800">
                <strong>💡 How it works:</strong> {getHowItWorksText()}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              When should you be notified?
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name={`notificationDateType-${type}`}
                  value="specific_date"
                  checked={value.dateType === 'specific_date'}
                  onChange={(e) => onChange({ ...value, dateType: e.target.value as any })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Specific Date</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name={`notificationDateType-${type}`}
                  value="multiple_dates"
                  checked={value.dateType === 'multiple_dates'}
                  onChange={(e) => onChange({ ...value, dateType: e.target.value as any })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Multiple Dates</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name={`notificationDateType-${type}`}
                  value="month"
                  checked={value.dateType === 'month'}
                  onChange={(e) => onChange({ ...value, dateType: e.target.value as any })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Entire Month</span>
              </label>
            </div>
          </div>

          {/* Date Selection Based on Type */}
          {value.dateType === 'specific_date' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notification Date
              </label>
              <input
                type="date"
                value={value.specificDate}
                onChange={(e) => onChange({ ...value, specificDate: e.target.value })}
                min={getTomorrowDate()}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>
          )}

          {value.dateType === 'multiple_dates' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Notification Dates
                </label>
                {value.multipleDates.length < 5 && (
                  <button
                    type="button"
                    onClick={addMultipleDate}
                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    <Plus size={16} />
                    <span>Add Date</span>
                  </button>
                )}
              </div>
              
              {value.multipleDates.map((date, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => updateMultipleDate(index, e.target.value)}
                    min={getTomorrowDate()}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                  {value.multipleDates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMultipleDate(index)}
                      className="flex items-center justify-center w-8 h-8 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {value.dateType === 'month' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notification Month
              </label>
              <input
                type="month"
                value={value.notificationMonth}
                onChange={(e) => onChange({ ...value, notificationMonth: e.target.value })}
                min={getTodayMonth()}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>
          )}

          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">
              <strong>✅ Benefits:</strong> Stay informed about {type === 'ride' ? 'ride' : 'trip'} requests even after posting. 
              You can manage these notifications anytime in your Profile → Manage Alerts section.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}