import { useState, useCallback } from 'react'

interface ErrorState {
  error: string | null
  isLoading: boolean
}

interface UseErrorHandlerReturn {
  error: string | null
  isLoading: boolean
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void
  handleAsync: <T>(asyncFn: () => Promise<T>) => Promise<T | null>
  clearError: () => void
}

export function useErrorHandler(): UseErrorHandlerReturn {
  const [state, setState] = useState<ErrorState>({
    error: null,
    isLoading: false
  })

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }))
  }, [])

  const setLoading = useCallback((isLoading: boolean) => {
    setState(prev => ({ ...prev, isLoading }))
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  const handleAsync = useCallback(async <T>(asyncFn: () => Promise<T>): Promise<T | null> => {
    try {
      setLoading(true)
      clearError()
      const result = await asyncFn()
      return result
    } catch (error: any) {
      console.error('Async operation failed:', error)
      
      // Handle different types of errors
      let errorMessage = 'An unexpected error occurred'
      
      if (error?.message) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (error?.status === 504) {
        errorMessage = 'Connection timeout. Please check your internet connection and try again.'
      } else if (error?.status >= 500) {
        errorMessage = 'Server error. Please try again later.'
      } else if (error?.status === 401) {
        errorMessage = 'Authentication failed. Please sign in again.'
      } else if (error?.status === 403) {
        errorMessage = 'You do not have permission to perform this action.'
      } else if (error?.status === 404) {
        errorMessage = 'The requested resource was not found.'
      }
      
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    error: state.error,
    isLoading: state.isLoading,
    setError,
    setLoading,
    handleAsync,
    clearError
  }
}