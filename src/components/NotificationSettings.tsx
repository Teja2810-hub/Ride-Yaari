import React, { useState, useEffect } from 'react'
import { Bell, Mail, Smartphone, Check, X, Settings, Volume2, VolumeX } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { notificationService } from '../utils/notificationService'

interface NotificationSettingsProps {
  onClose?: () => void
}

interface NotificationPreferences {
  email_notifications: boolean
  browser_notifications: boolean
  ride_requests: boolean
  ride_confirmations: boolean
  messages: boolean
  system_updates: boolean
  marketing_emails: boolean
  sound_enabled: boolean
}

export default function NotificationSettings({ onClose }: NotificationSettingsProps) {
  const { user, userProfile } = useAuth()
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_notifications: true,
    browser_notifications: true,
    ride_requests: true,
    ride_confirmations: true,
    messages: true,
    system_updates: true,
    marketing_emails: false,
    sound_enabled: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [browserPermission, setBrowserPermission] = useState<'default' | 'granted' | 'denied'>('default')

  useEffect(() => {
    fetchPreferences()
    checkBrowserPermission()
  }, [user])

  const checkBrowserPermission = () => {
    if ('Notification' in window) {
      setBrowserPermission(Notification.permission)
    }
  }

  const fetchPreferences = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('notification_preferences')
        .eq('id', user.id)
        .single()

      if (!error && data?.notification_preferences) {
        setPreferences({ ...preferences, ...data.notification_preferences })
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const savePreferences = async () => {
    if (!user) return

    setSaving(true)
    setError('')

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          notification_preferences: preferences
        })
        .eq('id', user.id)

      if (error) throw error

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error: any) {
      setError(error.message || 'Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  const enableBrowserNotifications = async () => {
    const granted = await notificationService.requestNotificationPermission()
    if (granted) {
      setBrowserPermission('granted')
      setPreferences(prev => ({ ...prev, browser_notifications: true }))
      await notificationService.sendTestNotification()
    } else {
      setBrowserPermission('denied')
      setPreferences(prev => ({ ...prev, browser_notifications: false }))
    }
  }

  const testNotification = async () => {
    if (browserPermission === 'granted') {
      await notificationService.sendTestNotification()
    } else {
      await enableBrowserNotifications()
    }
  }

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading notification settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Settings size={24} className="text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Notification Settings</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          Notification preferences saved successfully!
        </div>
      )}

      <div className="space-y-6">
        {/* Browser Notifications */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Smartphone size={20} className="text-purple-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Browser Notifications</h3>
                <p className="text-sm text-gray-600">Get instant notifications in your browser</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {browserPermission === 'granted' ? (
                <span className="flex items-center space-x-1 text-green-600 text-sm">
                  <Check size={16} />
                  <span>Enabled</span>
                </span>
              ) : browserPermission === 'denied' ? (
                <span className="flex items-center space-x-1 text-red-600 text-sm">
                  <X size={16} />
                  <span>Blocked</span>
                </span>
              ) : (
                <span className="text-gray-500 text-sm">Not Set</span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Enable browser notifications</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.browser_notifications && browserPermission === 'granted'}
                  onChange={(e) => {
                    if (e.target.checked && browserPermission !== 'granted') {
                      enableBrowserNotifications()
                    } else {
                      handlePreferenceChange('browser_notifications', e.target.checked)
                    }
                  }}
                  className="sr-only"
                />
                <div className={`w-11 h-6 rounded-full transition-colors ${
                  preferences.browser_notifications && browserPermission === 'granted' 
                    ? 'bg-blue-600' 
                    : 'bg-gray-300'
                }`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${
                    preferences.browser_notifications && browserPermission === 'granted' 
                      ? 'translate-x-6' 
                      : 'translate-x-1'
                  } mt-1`}></div>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Sound notifications</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.sound_enabled}
                  onChange={(e) => handlePreferenceChange('sound_enabled', e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-11 h-6 rounded-full transition-colors ${
                  preferences.sound_enabled ? 'bg-blue-600' : 'bg-gray-300'
                }`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${
                    preferences.sound_enabled ? 'translate-x-6' : 'translate-x-1'
                  } mt-1`}></div>
                </div>
              </label>
            </div>

            {browserPermission !== 'granted' && (
              <button
                onClick={enableBrowserNotifications}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Enable Browser Notifications
              </button>
            )}

            {browserPermission === 'granted' && (
              <button
                onClick={testNotification}
                className="w-full border border-blue-600 text-blue-600 py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
              >
                Send Test Notification
              </button>
            )}
          </div>
        </div>

        {/* Email Notifications */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-4">
            <Mail size={20} className="text-green-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Email Notifications</h3>
              <p className="text-sm text-gray-600">Receive notifications via email</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Enable email notifications</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.email_notifications}
                  onChange={(e) => handlePreferenceChange('email_notifications', e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-11 h-6 rounded-full transition-colors ${
                  preferences.email_notifications ? 'bg-green-600' : 'bg-gray-300'
                }`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${
                    preferences.email_notifications ? 'translate-x-6' : 'translate-x-1'
                  } mt-1`}></div>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Marketing emails</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.marketing_emails}
                  onChange={(e) => handlePreferenceChange('marketing_emails', e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-11 h-6 rounded-full transition-colors ${
                  preferences.marketing_emails ? 'bg-green-600' : 'bg-gray-300'
                }`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${
                    preferences.marketing_emails ? 'translate-x-6' : 'translate-x-1'
                  } mt-1`}></div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Notification Types */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Notification Types</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                <span className="text-sm text-gray-700">Ride requests (High Priority)</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.ride_requests}
                  onChange={(e) => handlePreferenceChange('ride_requests', e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-11 h-6 rounded-full transition-colors ${
                  preferences.ride_requests ? 'bg-yellow-500' : 'bg-gray-300'
                }`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${
                    preferences.ride_requests ? 'translate-x-6' : 'translate-x-1'
                  } mt-1`}></div>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-sm text-gray-700">Ride confirmations</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.ride_confirmations}
                  onChange={(e) => handlePreferenceChange('ride_confirmations', e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-11 h-6 rounded-full transition-colors ${
                  preferences.ride_confirmations ? 'bg-green-600' : 'bg-gray-300'
                }`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${
                    preferences.ride_confirmations ? 'translate-x-6' : 'translate-x-1'
                  } mt-1`}></div>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span className="text-sm text-gray-700">New messages</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.messages}
                  onChange={(e) => handlePreferenceChange('messages', e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-11 h-6 rounded-full transition-colors ${
                  preferences.messages ? 'bg-blue-600' : 'bg-gray-300'
                }`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${
                    preferences.messages ? 'translate-x-6' : 'translate-x-1'
                  } mt-1`}></div>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                <span className="text-sm text-gray-700">System updates</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.system_updates}
                  onChange={(e) => handlePreferenceChange('system_updates', e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-11 h-6 rounded-full transition-colors ${
                  preferences.system_updates ? 'bg-purple-600' : 'bg-gray-300'
                }`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${
                    preferences.system_updates ? 'translate-x-6' : 'translate-x-1'
                  } mt-1`}></div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          
          <div className="space-y-3">
            <button
              onClick={testNotification}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Bell size={16} />
              <span>Send Test Notification</span>
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setPreferences(prev => ({
                    ...prev,
                    email_notifications: true,
                    browser_notifications: true,
                    ride_requests: true,
                    ride_confirmations: true,
                    messages: true,
                    system_updates: true,
                    sound_enabled: true
                  }))
                }}
                className="flex items-center justify-center space-x-2 border border-green-600 text-green-600 py-2 px-4 rounded-lg font-medium hover:bg-green-50 transition-colors"
              >
                <Volume2 size={16} />
                <span>Enable All</span>
              </button>

              <button
                onClick={() => {
                  setPreferences(prev => ({
                    ...prev,
                    email_notifications: false,
                    browser_notifications: false,
                    ride_requests: false,
                    ride_confirmations: false,
                    messages: false,
                    system_updates: false,
                    sound_enabled: false
                  }))
                }}
                className="flex items-center justify-center space-x-2 border border-red-600 text-red-600 py-2 px-4 rounded-lg font-medium hover:bg-red-50 transition-colors"
              >
                <VolumeX size={16} />
                <span>Disable All</span>
              </button>
            </div>
          </div>
        </div>

        {/* Browser Permission Status */}
        <div className={`border rounded-lg p-4 ${
          browserPermission === 'granted' 
            ? 'border-green-200 bg-green-50' 
            : browserPermission === 'denied' 
              ? 'border-red-200 bg-red-50' 
              : 'border-yellow-200 bg-yellow-50'
        }`}>
          <div className="flex items-center space-x-3">
            {browserPermission === 'granted' ? (
              <Check size={20} className="text-green-600" />
            ) : browserPermission === 'denied' ? (
              <X size={20} className="text-red-600" />
            ) : (
              <AlertTriangle size={20} className="text-yellow-600" />
            )}
            <div>
              <h4 className={`font-semibold ${
                browserPermission === 'granted' 
                  ? 'text-green-900' 
                  : browserPermission === 'denied' 
                    ? 'text-red-900' 
                    : 'text-yellow-900'
              }`}>
                Browser Permission: {browserPermission === 'granted' ? 'Granted' : browserPermission === 'denied' ? 'Denied' : 'Not Set'}
              </h4>
              <p className={`text-sm ${
                browserPermission === 'granted' 
                  ? 'text-green-700' 
                  : browserPermission === 'denied' 
                    ? 'text-red-700' 
                    : 'text-yellow-700'
              }`}>
                {browserPermission === 'granted' 
                  ? 'You\'ll receive instant browser notifications for important updates.'
                  : browserPermission === 'denied' 
                    ? 'Browser notifications are blocked. Enable them in your browser settings.'
                    : 'Click "Enable Browser Notifications" above to allow notifications.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-8 flex space-x-3">
        <button
          onClick={savePreferences}
          disabled={saving}
          className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Saving...</span>
            </div>
          ) : (
            'Save Preferences'
          )}
        </button>
        
        {onClose && (
          <button
            onClick={onClose}
            className="border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        )}
      </div>
    </div>
  )
}