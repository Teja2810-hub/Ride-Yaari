import React, { useState, useEffect } from 'react'
import { Bell, X, Check, AlertTriangle, Smartphone, LampDesk as Desktop } from 'lucide-react'
import { notificationService } from '../utils/notificationService'

interface NotificationPermissionPromptProps {
  isOpen: boolean
  onClose: () => void
  onPermissionGranted?: () => void
}

export default function NotificationPermissionPrompt({ 
  isOpen, 
  onClose, 
  onPermissionGranted 
}: NotificationPermissionPromptProps) {
  const [permissionStatus, setPermissionStatus] = useState<'default' | 'granted' | 'denied'>('default')
  const [isRequesting, setIsRequesting] = useState(false)
  const [deviceType, setDeviceType] = useState<'mobile' | 'desktop'>('desktop')

  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission)
    }
    
    // Detect device type
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    setDeviceType(isMobile ? 'mobile' : 'desktop')
  }, [])

  const requestPermission = async () => {
    setIsRequesting(true)
    
    try {
      const granted = await notificationService.requestNotificationPermission()
      
      if (granted) {
        setPermissionStatus('granted')
        await notificationService.sendTestNotification()
        
        if (onPermissionGranted) {
          onPermissionGranted()
        }
        
        // Auto-close after success
        setTimeout(() => {
          onClose()
        }, 2000)
      } else {
        setPermissionStatus('denied')
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      setPermissionStatus('denied')
    } finally {
      setIsRequesting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Bell size={24} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Enable Notifications</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {permissionStatus === 'granted' ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Notifications Enabled! 🎉</h3>
            <p className="text-gray-600 mb-4">
              You'll now receive instant notifications for ride requests, messages, and important updates.
            </p>
            <p className="text-sm text-green-600 font-medium">
              Test notification sent successfully!
            </p>
          </div>
        ) : permissionStatus === 'denied' ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Notifications Blocked</h3>
            <p className="text-gray-600 mb-4">
              Notifications have been blocked. You can enable them manually in your browser settings.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
              <h4 className="font-semibold text-yellow-900 mb-2">How to enable manually:</h4>
              <ol className="text-sm text-yellow-800 space-y-1">
                <li>1. Click the lock icon in your address bar</li>
                <li>2. Select "Allow" for notifications</li>
                <li>3. Refresh the page</li>
              </ol>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {deviceType === 'mobile' ? (
                  <Smartphone size={32} className="text-blue-600" />
                ) : (
                  <Desktop size={32} className="text-blue-600" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Stay Updated with RideYaari</h3>
              <p className="text-gray-600">
                Get instant notifications for ride requests, confirmations, and messages so you never miss important updates.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-blue-900 mb-3">You'll be notified about:</h4>
              <div className="space-y-2 text-sm text-blue-800">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                  <span>New ride requests (High Priority)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>Request acceptances and confirmations</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span>New messages from other travelers</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  <span>Important system updates</span>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2 mb-2">
                <Check size={16} className="text-green-600" />
                <span className="font-semibold text-green-900">Benefits:</span>
              </div>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Never miss urgent ride requests</li>
                <li>• Respond faster to increase acceptance rates</li>
                <li>• Stay connected with your travel community</li>
                <li>• Get real-time updates on your trips</li>
              </ul>
            </div>

            <div className="space-y-3">
              <button
                onClick={requestPermission}
                disabled={isRequesting}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRequesting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Enabling Notifications...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <Bell size={20} />
                    <span>Enable Notifications</span>
                  </div>
                )}
              </button>
              
              <button
                onClick={onClose}
                className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Maybe Later
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-4 text-center">
              You can change notification preferences anytime in your profile settings.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}