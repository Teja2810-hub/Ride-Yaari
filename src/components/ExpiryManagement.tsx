import React, { useState, useEffect } from 'react'
import { Clock, AlertTriangle, Settings, Play, Pause, RotateCcw, TrendingUp } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { 
  expireOldConfirmations, 
  getConfirmationStats, 
  ExpirySettings,
  batchExpireConfirmations 
} from '../utils/confirmationHelpers'

interface ExpiryManagementProps {
  onUpdate?: () => void
}

export default function ExpiryManagement({ onUpdate }: ExpiryManagementProps) {
  const { user } = useAuth()
  const [settings, setSettings] = useState<ExpirySettings>({
    pendingExpiryHours: 72,
    acceptedExpiryDays: 30,
    enableAutoExpiry: true
  })
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
    canRequestAgain: 0,
    canReverse: 0,
    expiringSoon: 0
  })
  const [loading, setLoading] = useState(false)
  const [lastExpiry, setLastExpiry] = useState<{ count: number; timestamp: Date } | null>(null)
  const [autoExpiryEnabled, setAutoExpiryEnabled] = useState(true)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    if (user) {
      fetchStats()
      
      // Set up auto-expiry check every 30 minutes
      const interval = setInterval(() => {
        if (autoExpiryEnabled) {
          runAutoExpiry()
        }
      }, 30 * 60 * 1000) // 30 minutes

      return () => clearInterval(interval)
    }
  }, [user, autoExpiryEnabled])

  const fetchStats = async () => {
    if (!user) return

    try {
      const confirmationStats = await getConfirmationStats(user.id)
      setStats(confirmationStats)
    } catch (error) {
      console.error('Error fetching confirmation stats:', error)
    }
  }

  const runAutoExpiry = async () => {
    if (!settings.enableAutoExpiry) return

    try {
      const result = await batchExpireConfirmations(settings)
      
      if (result.expiredCount > 0) {
        setLastExpiry({
          count: result.expiredCount,
          timestamp: new Date()
        })
        
        if (onUpdate) {
          onUpdate()
        }
        
        await fetchStats()
      }
    } catch (error) {
      console.error('Error running auto-expiry:', error)
    }
  }

  const runManualExpiry = async () => {
    setLoading(true)

    try {
      const result = await batchExpireConfirmations(settings)
      
      setLastExpiry({
        count: result.expiredCount,
        timestamp: new Date()
      })
      
      if (onUpdate) {
        onUpdate()
      }
      
      await fetchStats()
    } catch (error) {
      console.error('Error running manual expiry:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatLastExpiry = () => {
    if (!lastExpiry) return 'Never'
    
    const now = new Date()
    const diffMinutes = (now.getTime() - lastExpiry.timestamp.getTime()) / (1000 * 60)
    
    if (diffMinutes < 60) {
      return `${Math.floor(diffMinutes)} minutes ago (${lastExpiry.count} expired)`
    } else if (diffMinutes < 1440) {
      return `${Math.floor(diffMinutes / 60)} hours ago (${lastExpiry.count} expired)`
    } else {
      return lastExpiry.timestamp.toLocaleDateString() + ` (${lastExpiry.count} expired)`
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Clock size={24} className="text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Confirmation Management</h2>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <Settings size={16} />
          <span>Settings</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-blue-800">Total</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.expiringSoon}</div>
          <div className="text-sm text-yellow-800">Expiring Soon</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.canRequestAgain}</div>
          <div className="text-sm text-green-800">Can Re-request</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.canReverse}</div>
          <div className="text-sm text-purple-800">Can Reverse</div>
        </div>
      </div>

      {/* Auto-Expiry Status */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${autoExpiryEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="font-medium text-gray-900">
              Auto-Expiry: {autoExpiryEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <button
            onClick={() => setAutoExpiryEnabled(!autoExpiryEnabled)}
            className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              autoExpiryEnabled 
                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {autoExpiryEnabled ? <Pause size={14} /> : <Play size={14} />}
            <span>{autoExpiryEnabled ? 'Disable' : 'Enable'}</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <span className="font-medium">Pending Expiry:</span> {settings.pendingExpiryHours} hours
          </div>
          <div>
            <span className="font-medium">Last Check:</span> {formatLastExpiry()}
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-4">Expiry Settings</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pending Request Expiry (Hours)
              </label>
              <input
                type="number"
                min="1"
                max="168"
                value={settings.pendingExpiryHours}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  pendingExpiryHours: parseInt(e.target.value) || 72
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
              <p className="text-xs text-gray-500 mt-1">
                Pending requests will automatically expire after this many hours
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Accepted Confirmation Archive (Days)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={settings.acceptedExpiryDays}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  acceptedExpiryDays: parseInt(e.target.value) || 30
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
              <p className="text-xs text-gray-500 mt-1">
                Accepted confirmations will be archived after this many days
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enableAutoExpiry"
                checked={settings.enableAutoExpiry}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  enableAutoExpiry: e.target.checked
                }))}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <label htmlFor="enableAutoExpiry" className="text-sm font-medium text-gray-700">
                Enable automatic expiry
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Manual Actions */}
      <div className="space-y-3">
        <button
          onClick={runManualExpiry}
          disabled={loading}
          className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Processing Expiry...</span>
            </>
          ) : (
            <>
              <RotateCcw size={16} />
              <span>Run Expiry Check Now</span>
            </>
          )}
        </button>

        <button
          onClick={fetchStats}
          className="w-full flex items-center justify-center space-x-2 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          <TrendingUp size={16} />
          <span>Refresh Stats</span>
        </button>
      </div>

      {/* Help Text */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle size={20} className="text-yellow-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-yellow-900 mb-2">How Expiry Works</h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• <strong>Pending Requests:</strong> Automatically expire after {settings.pendingExpiryHours} hours without response</li>
              <li>• <strong>Request Again:</strong> Available for rejected confirmations on future rides</li>
              <li>• <strong>Reversal:</strong> Undo cancellations within 24 hours</li>
              <li>• <strong>Auto-Check:</strong> System checks for expired confirmations every 30 minutes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}