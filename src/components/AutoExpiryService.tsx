import React, { useEffect, useState } from 'react'
import { Clock, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { batchExpireConfirmations, getConfirmationStats } from '../utils/confirmationHelpers'

interface AutoExpiryServiceProps {
  onExpiryProcessed?: (expiredCount: number) => void
}

export default function AutoExpiryService({ onExpiryProcessed }: AutoExpiryServiceProps) {
  const { user } = useAuth()
  const [isRunning, setIsRunning] = useState(false)
  const [lastRun, setLastRun] = useState<Date | null>(null)
  const [stats, setStats] = useState({
    totalProcessed: 0,
    totalExpired: 0,
    lastBatchSize: 0
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      // Run initial check
      runExpiryCheck()
      
      // Set up periodic checks every 10 minutes
      const interval = setInterval(runExpiryCheck, 10 * 60 * 1000)
      
      return () => clearInterval(interval)
    }
  }, [user])

  const runExpiryCheck = async () => {
    if (!user || isRunning) return

    setIsRunning(true)
    setError('')

    try {
      console.log('Running automatic expiry check...')
      
      const result = await batchExpireConfirmations()
      
      setStats(prev => ({
        totalProcessed: prev.totalProcessed + result.processed,
        totalExpired: prev.totalExpired + result.expired,
        lastBatchSize: result.expired
      }))

      setLastRun(new Date())

      if (result.expired > 0) {
        console.log(`Auto-expired ${result.expired} confirmations`)
        if (onExpiryProcessed) {
          onExpiryProcessed(result.expired)
        }
      }

      if (result.errors.length > 0) {
        console.error('Auto-expiry errors:', result.errors)
        setError(`${result.errors.length} errors occurred during auto-expiry`)
      }
    } catch (error: any) {
      console.error('Error in auto-expiry service:', error)
      setError('Auto-expiry service encountered an error')
    } finally {
      setIsRunning(false)
    }
  }

  const formatLastRun = () => {
    if (!lastRun) return 'Never'
    
    const now = new Date()
    const diffInMinutes = (now.getTime() - lastRun.getTime()) / (1000 * 60)
    
    if (diffInMinutes < 1) {
      return 'Just now'
    } else if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)} minutes ago`
    } else {
      return lastRun.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }
  }

  // This component runs in the background and only shows status when there's activity
  if (!user) return null

  return (
    <div className="fixed bottom-4 left-4 z-40">
      {(isRunning || stats.lastBatchSize > 0 || error) && (
        <div className={`bg-white border rounded-lg shadow-lg p-3 max-w-xs transition-all duration-300 ${
          error ? 'border-red-200' : 
          stats.lastBatchSize > 0 ? 'border-yellow-200' : 
          'border-blue-200'
        }`}>
          <div className="flex items-center space-x-2 mb-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              error ? 'bg-red-100' :
              stats.lastBatchSize > 0 ? 'bg-yellow-100' :
              'bg-blue-100'
            }`}>
              {isRunning ? (
                <RefreshCw size={14} className="text-blue-600 animate-spin" />
              ) : error ? (
                <AlertTriangle size={14} className="text-red-600" />
              ) : stats.lastBatchSize > 0 ? (
                <Clock size={14} className="text-yellow-600" />
              ) : (
                <CheckCircle size={14} className="text-green-600" />
              )}
            </div>
            <h4 className="font-semibold text-gray-900 text-sm">Auto-Expiry Service</h4>
          </div>
          
          {isRunning && (
            <p className="text-xs text-blue-600">Checking for expired confirmations...</p>
          )}
          
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
          
          {stats.lastBatchSize > 0 && !isRunning && (
            <p className="text-xs text-yellow-600">
              Expired {stats.lastBatchSize} confirmation{stats.lastBatchSize !== 1 ? 's' : ''}
            </p>
          )}
          
          <div className="text-xs text-gray-500 mt-2 space-y-1">
            <p>Last run: {formatLastRun()}</p>
            {stats.totalExpired > 0 && (
              <p>Total expired: {stats.totalExpired}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}