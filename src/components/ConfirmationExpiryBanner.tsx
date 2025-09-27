import React, { useState, useEffect } from 'react'
import { Clock, AlertTriangle, X, RefreshCw, CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { autoExpireConfirmations, getConfirmationStats } from '../utils/confirmationHelpers'
import { useErrorHandler } from '../hooks/useErrorHandler'
import ErrorMessage from './ErrorMessage'
import LoadingSpinner from './LoadingSpinner'

interface ConfirmationExpiryBannerProps {
  onRefresh?: () => void
}

export default function ConfirmationExpiryBanner({ onRefresh }: ConfirmationExpiryBannerProps) {
  const { user } = useAuth()
  const { error, isLoading, handleAsync, clearError } = useErrorHandler()
  const [stats, setStats] = useState({
    expiringSoon: 0,
    expired: 0,
    total: 0
  })
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [autoCleanupEnabled, setAutoCleanupEnabled] = useState(true)
  const [lastAutoCleanup, setLastAutoCleanup] = useState<Date | null>(null)

  useEffect(() => {
    if (user) {
      checkExpiryStats()
      
      // Check every 3 minutes and auto-cleanup if enabled
      const interval = setInterval(() => {
        checkExpiryStats()
        if (autoCleanupEnabled) {
          performAutoCleanup()
        }
      }, 3 * 60 * 1000)
      
      return () => clearInterval(interval)
    }
  }, [user])

  const performAutoCleanup = async () => {
    if (!user || isLoading) return

    // Prevent multiple simultaneous cleanup operations
    const cleanupKey = `cleanup-${user.id}-${Date.now()}`
    const existingCleanup = sessionStorage.getItem('rideyaari-cleanup-running')
    
    if (existingCleanup) {
      console.log('Cleanup already running, skipping')
      return
    }
    
    sessionStorage.setItem('rideyaari-cleanup-running', cleanupKey)
    try {
      const result = await autoExpireConfirmations()
      
      if (result.expired > 0) {
        console.log(`Auto-cleanup: expired ${result.expired} confirmations`)
        setLastAutoCleanup(new Date())
        
        // Update stats after cleanup
        await checkExpiryStats()
        
        if (onRefresh) {
          onRefresh()
        }
      }
    } catch (error: any) {
      console.error('Error in auto-cleanup:', error)
      // Don't show error to user for background cleanup
    } finally {
      // Clear the cleanup lock
      sessionStorage.removeItem('rideyaari-cleanup-running')
    }
  }
  const checkExpiryStats = async () => {
    if (!user) return

    await handleAsync(async () => {
      const confirmationStats = await getConfirmationStats(user.id)
      setStats({
        expiringSoon: confirmationStats.expiringSoon,
        expired: confirmationStats.expired,
        total: confirmationStats.total
      })
      
      setLastChecked(new Date())
    })
  }

  // Only show banner if there are confirmations expiring soon (within 6 hours for urgency)
  if (stats.expiringSoon === 0) {
    return null
  }

  return (
    <>
      {error && (
        <ErrorMessage
          message={error}
          onRetry={clearError}
          onDismiss={clearError}
          type="warning"
          className="mb-4"
        />
      )}
      
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6 mb-6">
        {isLoading && (
          <div className="mb-4">
            <LoadingSpinner size="sm" text="Checking expiry status..." />
          </div>
        )}
        
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
            <Clock size={20} className="text-yellow-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-900 mb-2">
              Confirmations Expiring Soon
            </h3>
            
            {stats.expiringSoon > 0 && (
              <div className="mb-2">
                <p className="text-sm text-yellow-800">
                  <strong>{stats.expiringSoon}</strong> confirmation{stats.expiringSoon !== 1 ? 's' : ''} 
                  {stats.expiringSoon === 1 ? ' is' : ' are'} expiring soon (within 24 hours of departure). 
                  These will be automatically cleaned up when they expire.
                </p>
              </div>
            )}
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
              <div className="flex items-center space-x-2">
                <CheckCircle size={16} className="text-green-600" />
                <div>
                  <h4 className="font-semibold text-green-900 text-sm">Automatic Cleanup Enabled</h4>
                  <p className="text-xs text-green-800">
                    Expired confirmations are automatically cleaned up in the background. No action required.
                  </p>
                  {lastAutoCleanup && (
                    <p className="text-xs text-green-700 mt-1">
                      Last auto-cleanup: {lastAutoCleanup.toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4 mt-3">
              <button
                onClick={checkExpiryStats}
                disabled={isLoading}
                className="flex items-center space-x-2 text-yellow-700 hover:text-yellow-800 font-medium text-sm transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
              
              <button
                onClick={() => setAutoCleanupEnabled(!autoCleanupEnabled)}
                className={`text-sm font-medium transition-colors ${
                  autoCleanupEnabled 
                    ? 'text-green-700 hover:text-green-800' 
                    : 'text-gray-600 hover:text-gray-700'
                }`}
              >
                Auto-cleanup: {autoCleanupEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {lastChecked && (
              <p className="text-xs text-yellow-600 mt-2">
                Last checked: {lastChecked.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
        
      </div>
    </div>
    </>
  )
}