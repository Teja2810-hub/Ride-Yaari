/**
 * Utility functions for error handling and user-friendly error messages
 */

import { supabase } from './supabase'
import { useAuth } from '../contexts/AuthContext'

export interface ErrorDetails {
  code?: string
  message: string
  userMessage: string
  retryable: boolean
  severity: 'low' | 'medium' | 'high'
}

/**
 * Parse and categorize errors for better user experience
 */
export function parseError(error: any): ErrorDetails {
  // Default error details
  let details: ErrorDetails = {
    message: error?.message || 'Unknown error',
    userMessage: 'An unexpected error occurred. Please try again.',
    retryable: true,
    severity: 'medium'
  }

  // Handle Supabase errors
  if (error?.code) {
    details.code = error.code
    
    switch (error.code) {
      case '23505': // Unique constraint violation
        details.userMessage = 'This action has already been performed. Please refresh the page.'
        details.retryable = false
        details.severity = 'low'
        break
        
      case '23503': // Foreign key constraint violation
        details.userMessage = 'Referenced data not found. Please refresh and try again.'
        details.retryable = true
        details.severity = 'medium'
        break
        
      case '42501': // Insufficient privilege
        details.userMessage = 'You do not have permission to perform this action.'
        details.retryable = false
        details.severity = 'high'
        break
        
      case 'PGRST116': // No rows found
        details.userMessage = 'The requested item was not found. It may have been deleted.'
        details.retryable = false
        details.severity = 'medium'
        break
        
      case 'PGRST301': // Row level security violation
        details.userMessage = 'Access denied. Please sign in and try again.'
        details.retryable = true
        details.severity = 'high'
        break
    }
  }

  // Handle HTTP status codes
  if (error?.status) {
    switch (error.status) {
      case 400:
        details.userMessage = 'Invalid request. Please check your input and try again.'
        details.retryable = true
        details.severity = 'medium'
        break
        
      case 401:
        details.userMessage = 'Authentication failed. Please sign in again.'
        details.retryable = true
        details.severity = 'high'
        break
        
      case 403:
        details.userMessage = 'You do not have permission to perform this action.'
        details.retryable = false
        details.severity = 'high'
        break
        
      case 404:
        details.userMessage = 'The requested resource was not found.'
        details.retryable = false
        details.severity = 'medium'
        break
        
      case 429:
        details.userMessage = 'Too many requests. Please wait a moment and try again.'
        details.retryable = true
        details.severity = 'medium'
        break
        
      case 500:
        details.userMessage = 'Server error. Please try again later.'
        details.retryable = true
        details.severity = 'high'
        break
        
      case 502:
      case 503:
      case 504:
        details.userMessage = 'Service temporarily unavailable. Please try again in a few minutes.'
        details.retryable = true
        details.severity = 'high'
        break
    }
  }

  // Handle network errors
  if (error?.name === 'NetworkError' || error?.message?.includes('fetch')) {
    details.userMessage = 'Network error. Please check your internet connection and try again.'
    details.retryable = true
    details.severity = 'high'
  }

  // Handle timeout errors
  if (error?.name === 'TimeoutError' || error?.message?.includes('timeout')) {
    details.userMessage = 'Request timed out. Please try again.'
    details.retryable = true
    details.severity = 'medium'
  }

  return details
}

/**
 * Report error to backend for developer notification
 */
export async function reportErrorToBackend(
  error: any,
  context?: string,
  componentStack?: string,
  userId?: string
): Promise<void> {
  try {
    const errorDetails = parseError(error)
    const sessionId = sessionStorage.getItem('rideyaari-session-id') || 
                     `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Store session ID for tracking
    if (!sessionStorage.getItem('rideyaari-session-id')) {
      sessionStorage.setItem('rideyaari-session-id', sessionId)
    }

    const errorReport = {
      context: context || 'Unknown Context',
      error_message: errorDetails.message,
      error_stack: error?.stack || null,
      component_stack: componentStack || null,
      user_agent: navigator.userAgent,
      url: window.location.href,
      user_id: userId || null,
      severity: errorDetails.severity,
      error_code: errorDetails.code || null,
      session_id: sessionId,
      metadata: {
        timestamp: new Date().toISOString(),
        retryable: errorDetails.retryable,
        userMessage: errorDetails.userMessage,
        browserInfo: {
          language: navigator.language,
          platform: navigator.platform,
          cookieEnabled: navigator.cookieEnabled,
          onLine: navigator.onLine
        },
        windowInfo: {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio
        }
      }
    }

    // Send to Supabase
    const { error: insertError } = await supabase
      .from('error_reports')
      .insert(errorReport)

    if (insertError) {
      console.error('Failed to report error to backend:', insertError)
      // Store in localStorage as fallback
      const fallbackErrors = JSON.parse(localStorage.getItem('rideyaari-unreported-errors') || '[]')
      fallbackErrors.push({
        ...errorReport,
        failedToReport: true,
        reportError: insertError.message
      })
      localStorage.setItem('rideyaari-unreported-errors', JSON.stringify(fallbackErrors.slice(-10)))
    } else {
      console.log('Error reported to backend successfully')
    }
  } catch (reportingError) {
    console.error('Critical error in error reporting system:', reportingError)
    // Last resort - store in localStorage
    try {
      const criticalErrors = JSON.parse(localStorage.getItem('rideyaari-critical-errors') || '[]')
      criticalErrors.push({
        originalError: error?.message || 'Unknown error',
        reportingError: reportingError?.message || 'Unknown reporting error',
        timestamp: new Date().toISOString(),
        context: context || 'Unknown'
      })
      localStorage.setItem('rideyaari-critical-errors', JSON.stringify(criticalErrors.slice(-5)))
    } catch (storageError) {
      console.error('Complete error reporting failure:', storageError)
    }
  }
}

/**
 * Log error for debugging and analytics
 */
export function logError(error: any, context?: string) {
  const errorDetails = parseError(error)
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    context: context || 'Unknown',
    error: {
      message: errorDetails.message,
      code: errorDetails.code,
      severity: errorDetails.severity
    },
    userAgent: navigator.userAgent,
    url: window.location.href,
    userId: null
  }

  console.error('RideYaari Error:', logEntry)

  // Report to backend for developer notification
  reportErrorToBackend(error, context, undefined, logEntry.userId || undefined)
    .catch(reportingError => {
      console.warn('Failed to report error to backend:', reportingError)
    })

  // Store in localStorage for debugging
  try {
    const existingLogs = JSON.parse(localStorage.getItem('rideyaari-error-logs') || '[]')
    existingLogs.push(logEntry)
    
    // Keep only last 50 errors
    if (existingLogs.length > 50) {
      existingLogs.splice(0, existingLogs.length - 50)
    }
    
    localStorage.setItem('rideyaari-error-logs', JSON.stringify(existingLogs))
  } catch (storageError) {
    console.warn('Failed to store error log:', storageError)
  }
}

/**
 * Create user-friendly error message with retry option
 */
export function createErrorMessage(error: any, context?: string): {
  title: string
  message: string
  retryable: boolean
  severity: 'low' | 'medium' | 'high'
} {
  logError(error, context)
  const details = parseError(error)
  
  return {
    title: getErrorTitle(details.severity),
    message: details.userMessage,
    retryable: details.retryable,
    severity: details.severity
  }
}

function getErrorTitle(severity: 'low' | 'medium' | 'high'): string {
  switch (severity) {
    case 'high':
      return 'Critical Error'
    case 'medium':
      return 'Error'
    case 'low':
      return 'Notice'
    default:
      return 'Error'
  }
}

/**
 * Validate confirmation flow prerequisites
 */
export function validateConfirmationFlow(
  user: any,
  otherUserId: string,
  ride?: CarRide,
  trip?: Trip
): { isValid: boolean; error?: string } {
  if (!user) {
    return { isValid: false, error: 'You must be signed in to perform this action.' }
  }

  if (!otherUserId) {
    return { isValid: false, error: 'Invalid user ID provided.' }
  }

  if (user.id === otherUserId) {
    return { isValid: false, error: 'You cannot request your own ride.' }
  }

  if (!ride && !trip) {
    return { isValid: false, error: 'No ride or trip selected for confirmation.' }
  }

  // Check if ride/trip is in the future
  if (ride) {
    const departureTime = new Date(ride.departure_date_time)
    if (departureTime <= new Date()) {
      return { isValid: false, error: 'Cannot request confirmation for past rides.' }
    }
  }

  if (trip) {
    const travelDate = new Date(trip.travel_date)
    if (travelDate <= new Date()) {
      return { isValid: false, error: 'Cannot request confirmation for past trips.' }
    }
  }

  return { isValid: true }
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      
      // Don't retry on client errors (4xx) or specific business logic errors
      if (error?.status && error.status >= 400 && error.status < 500) {
        throw error
      }
      
      if (error?.code === '23505' || error?.code === '42501') {
        throw error
      }
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break
      }
      
      // Calculate delay with exponential backoff and jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000
      console.warn(`Operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`, error)
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}