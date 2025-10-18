import { supabase } from './supabase'
import { reportErrorToBackend } from './errorUtils'
import { notificationService } from './notificationService'

/**
 * Global error handler for unhandled promise rejections
 */
export function setupGlobalErrorHandling(userId?: string) {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason)
    
    // Send browser notification for critical errors
    if (typeof event.reason === 'object' && event.reason?.severity === 'critical') {
      notificationService.sendBrowserNotification(
        'Critical Error Detected',
        'A critical error occurred in RideYaari. Our team has been notified.',
        '🚨'
      ).catch(console.warn)
    }
    
    reportErrorToBackend(
      event.reason,
      'Unhandled Promise Rejection',
      undefined,
      userId
    ).catch(console.warn)
    
    // Prevent the default browser behavior
    event.preventDefault()
  })

  // Handle global JavaScript errors
  window.addEventListener('error', (event) => {
    console.error('Global JavaScript error:', event.error)
    
    // Send browser notification for critical JavaScript errors
    if (event.error && event.filename?.includes('main') || event.error?.name === 'ChunkLoadError') {
      notificationService.sendBrowserNotification(
        'Application Error',
        'An application error occurred. Please refresh the page.',
        '⚠️'
      ).catch(console.warn)
    }
    
    reportErrorToBackend(
      event.error || new Error(event.message),
      `Global Error - ${event.filename}:${event.lineno}:${event.colno}`,
      undefined,
      userId
    ).catch(console.warn)
  })

  // Handle resource loading errors
  window.addEventListener('error', (event) => {
    if (event.target !== window) {
      console.error('Resource loading error:', event.target)
      
      // Send browser notification for critical resource failures
      const target = event.target as any
      if (target?.src?.includes('main') || target?.href?.includes('main')) {
        notificationService.sendBrowserNotification(
          'Resource Loading Error',
          'Failed to load critical application resources. Please refresh the page.',
          '📡'
        ).catch(console.warn)
      }
      
      reportErrorToBackend(
        new Error(`Failed to load resource: ${(event.target as any)?.src || (event.target as any)?.href || 'unknown'}`),
        'Resource Loading Error',
        undefined,
        userId
      ).catch(console.warn)
    }
  }, true)
}

/**
 * Report critical application errors that should trigger immediate notifications
 */
export async function reportCriticalError(
  error: any,
  context: string,
  userId?: string,
  additionalMetadata?: Record<string, any>,
  sendNotification: boolean = true
): Promise<void> {
  try {
    // Send immediate browser notification for critical errors
    if (sendNotification) {
      notificationService.sendBrowserNotification(
        'Critical System Error',
        'A critical error has been detected and reported to our development team.',
        '🚨'
      ).catch(console.warn)
    }
    
    const errorReport = {
      context,
      error_message: error?.message || 'Critical error occurred',
      error_stack: error?.stack || null,
      component_stack: null,
      user_agent: navigator.userAgent,
      url: window.location.href,
      user_id: userId || null,
      severity: 'critical',
      error_code: error?.code || null,
      session_id: sessionStorage.getItem('rideyaari-session-id') || 'unknown',
      metadata: {
        timestamp: new Date().toISOString(),
        additionalMetadata: additionalMetadata || {},
        criticalFlag: true,
        browserInfo: {
          language: navigator.language,
          platform: navigator.platform,
          cookieEnabled: navigator.cookieEnabled,
          onLine: navigator.onLine
        }
      }
    }

    const { error: insertError } = await supabase
      .from('error_reports')
      .insert(errorReport)

    if (insertError) {
      console.error('Failed to report critical error:', insertError)
      
      // Send fallback notification
      if (sendNotification) {
        notificationService.sendBrowserNotification(
          'Error Reporting Failed',
          'Failed to report error to backend. Please contact support if issues persist.',
          '❌'
        ).catch(console.warn)
      }
      
      // Store in localStorage as absolute fallback
      const criticalErrors = JSON.parse(localStorage.getItem('rideyaari-critical-errors') || '[]')
      criticalErrors.push({
        ...errorReport,
        failedToReport: true,
        reportError: insertError.message
      })
      localStorage.setItem('rideyaari-critical-errors', JSON.stringify(criticalErrors.slice(-5)))
    }
  } catch (reportingError) {
    console.error('Complete failure in critical error reporting:', reportingError)
    
    // Last resort notification
    if (sendNotification) {
      notificationService.sendBrowserNotification(
        'System Error',
        'Multiple system errors detected. Please refresh the page and contact support.',
        '💥'
      ).catch(console.warn)
    }
  }
}

/**
 * Get error statistics for admin dashboard
 */
export async function getErrorStats(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<{
  total: number
  bySeverity: Record<string, number>
  byContext: Record<string, number>
  resolved: number
  unresolved: number
}> {
  try {
    const now = new Date()
    let startTime: Date

    switch (timeframe) {
      case 'hour':
        startTime = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case 'week':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      default: // day
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }

    const { data: errors, error } = await supabase
      .from('error_reports')
      .select('severity, context, is_resolved')
      .gte('timestamp', startTime.toISOString())

    if (error) {
      throw error
    }

    const stats = {
      total: errors?.length || 0,
      bySeverity: {} as Record<string, number>,
      byContext: {} as Record<string, number>,
      resolved: 0,
      unresolved: 0
    }

    errors?.forEach(errorReport => {
      // Count by severity
      stats.bySeverity[errorReport.severity] = (stats.bySeverity[errorReport.severity] || 0) + 1
      
      // Count by context
      stats.byContext[errorReport.context] = (stats.byContext[errorReport.context] || 0) + 1
      
      // Count resolution status
      if (errorReport.is_resolved) {
        stats.resolved++
      } else {
        stats.unresolved++
      }
    })

    return stats
  } catch (error) {
    console.error('Error fetching error stats:', error)
    return {
      total: 0,
      bySeverity: {},
      byContext: {},
      resolved: 0,
      unresolved: 0
    }
  }
}

/**
 * Mark error as resolved
 */
export async function markErrorAsResolved(errorId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('error_reports')
      .update({ is_resolved: true })
      .eq('id', errorId)

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}