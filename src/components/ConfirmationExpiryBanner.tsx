import React, { useState, useEffect } from 'react'
import { Clock, AlertTriangle, X, RefreshCw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { checkConfirmationExpiry, batchExpireConfirmations, getConfirmationStats } from '../utils/confirmationHelpers'

interface ConfirmationExpiryBannerProps {
  onRefresh?: () => void
}

export default function ConfirmationExpiryBanner({ onRefresh }: ConfirmationExpiryBannerProps) {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    expiringSoon: 0,
    expired: 0,
    total: 0
  })
  const [loading, setLoading] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  useEffect(() => {
    if (user) {
      checkExpiryStats()
      
      // Check every 5 minutes
      const interval = setInterval(checkExpiryStats, 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [user])

  const checkExpiryStats = async () => {
    if (!user) return

    try {
      const confirmationStats = await getConfirmationStats(user.id)
      setStats({
        expiringSoon: confirmationStats.expiringSoon,
        expired: confirmationStats.expired,
        total: confirmationStats.total
      })
      
      setShowBanner(confirmationStats.expiringSoon > 0 || confirmationStats.expired > 0)
      setLastChecked(new Date())
    } catch (error) {
      console.error('Error checking expiry stats:', error)
    }
  }

  const handleCleanupExpired = async () => {
    if (!user) return

    setLoading(true)
    try {
      const result = await batchExpireConfirmations()
      
      if (result.expired > 0) {
        alert(`${result.expired} expired confirmations have been cleaned up.`)
        if (onRefresh) onRefresh()
        checkExpiryStats()
      } else {
        alert('No expired confirmations found.')
      }
    } catch (error: any) {
      console.error('Error cleaning up expired confirmations:', error)
      alert('Failed to cleanup expired confirmations.')
    } finally {
      setLoading(false)
    }
  }

  if (!showBanner || (!stats.expiringSoon && !stats.expired)) {
    return null
  }

  return (
    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
            <Clock size={20} className="text-yellow-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-900 mb-2">
              Confirmation Expiry Notice
            </h3>
            
            {stats.expiringSoon > 0 && (
              <div className="mb-2">
                <p className="text-sm text-yellow-800">
                  <strong>{stats.expiringSoon}</strong> confirmation{stats.expiringSoon !== 1 ? 's' : ''} 
                  {stats.expiringSoon === 1 ? ' is' : ' are'} expiring soon (within 24 hours of departure).
                </p>
              </div>
            )}
            
            {stats.expired > 0 && (
              <div className="mb-2">
                <p className="text-sm text-red-800">
                  <AlertTriangle size={14} className="inline mr-1" />
                  <strong>{stats.expired}</strong> confirmation{stats.expired !== 1 ? 's have' : ' has'} expired 
                  and {stats.expired === 1 ? 'needs' : 'need'} cleanup.
                </p>
              </div>
            )}

            <div className="flex items-center space-x-4 mt-3">
              <button
                onClick={checkExpiryStats}
                disabled={loading}
                className="flex items-center space-x-2 text-yellow-700 hover:text-yellow-800 font-medium text-sm transition-colors"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
              
              {stats.expired > 0 && (
                <button
                  onClick={handleCleanupExpired}
                  disabled={loading}
                  className="flex items-center space-x-2 bg-yellow-600 text-white px-3 py-1 rounded-lg font-medium hover:bg-yellow-700 transition-colors text-sm"
                >
                  <AlertTriangle size={14} />
                  <span>Cleanup Expired</span>
                </button>
              )}
            </div>

            {lastChecked && (
              <p className="text-xs text-yellow-600 mt-2">
                Last checked: {lastChecked.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
        
        <button
          onClick={() => setShowBanner(false)}
          className="text-yellow-600 hover:text-yellow-700 transition-colors"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  )
}