import React, { useEffect, useState } from 'react'
import { Clock, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { autoExpireConfirmations, getConfirmationStats } from '../utils/confirmationHelpers'

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
      
      // Set up periodic checks every 5 minutes for more responsive cleanup
      const interval = setInterval(runExpiryCheck, 5 * 60 * 1000)
      
      return () => clearInterval(interval)
    }
  }, [user])

  const runExpiryCheck = async () => {
    if (!user || isRunning) return

    setIsRunning(true)
    setError('')

    try {
      console.log('Running automatic confirmation expiry check...')
      
      // Add a small delay to prevent rapid successive calls
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const result = await autoExpireConfirmations()
      
      setStats(prev => ({
        totalProcessed: prev.totalProcessed + result.processed,
        totalExpired: prev.totalExpired + result.expired,
        lastBatchSize: result.expired
      }))

      setLastRun(new Date())

      if (result.expired > 0) {
        console.log(`Automatically expired ${result.expired} confirmations`)
        
        if (onExpiryProcessed) {
          onExpiryProcessed(result.expired)
        }
      }

      if (result.errors.length > 0) {
        console.error('Auto-expiry errors:', result.errors)
        // Log errors but don't show them to user - handle silently in background
        console.warn(`Auto-expiry service: ${result.errors.length} errors occurred but continuing operation`)
      }
    } catch (error: any) {
      console.error('Error in auto-expiry service:', error)
      // Log error but don't show to user - this is a background service
      console.warn('Auto-expiry service encountered an error but continuing operation:', error)
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

  // Component now runs silently in the background
  return null
}