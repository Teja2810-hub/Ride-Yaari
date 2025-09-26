import React, { Component, ErrorInfo, ReactNode } from 'react'
import { TriangleAlert as AlertTriangle, RefreshCw, Hop as Home, Circle as HelpCircle } from 'lucide-react'
import { reportErrorToBackend } from '../utils/errorUtils'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string
  userId?: string
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      userId: undefined
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: Math.random().toString(36).substr(2, 9)
    }
  }

  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Get user ID from auth context if available
    let userId: string | undefined
    try {
      const authData = localStorage.getItem('supabase.auth.token')
      if (authData) {
        const parsed = JSON.parse(authData)
        userId = parsed?.user?.id
      }
    } catch (authError) {
      console.warn('Could not extract user ID for error reporting:', authError)
    }

    this.setState({ userId })

    // Report to backend for developer notification
    await this.reportError(error, errorInfo, userId)
  }

  reportError = async (error: Error, errorInfo: ErrorInfo, userId?: string) => {
    try {
      // Report to backend for developer notification
      await reportErrorToBackend(
        error,
        'React Error Boundary',
        errorInfo.componentStack,
        userId
      )
    } catch (storageError) {
      console.error('Failed to report error:', storageError)
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      userId: undefined
    })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }


  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} className="text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h1>
              <p className="text-gray-600">
                We encountered an unexpected error. Don't worry, our team has been automatically notified and we'll fix it soon.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <HelpCircle size={20} className="text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-2">What happened?</h3>
                  <p className="text-sm text-blue-800 mb-2">
                    The application encountered an unexpected issue while processing your request.
                  </p>
                  <p className="text-sm text-blue-800">
                    <strong>Error ID:</strong> {this.state.errorId} (for support reference)
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle size={20} className="text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900 mb-2">We're on it!</h3>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Our development team has been automatically notified</li>
                    <li>• The error details have been logged for investigation</li>
                    <li>• We'll work to fix this issue as quickly as possible</li>
                    <li>• You can try refreshing the page or going back to the home page</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={this.handleRetry}
                  className="flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw size={20} />
                  <span>Try Again</span>
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="flex items-center justify-center space-x-2 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  <Home size={20} />
                  <span>Go Home</span>
                </button>
              </div>


              <div className="text-center">
                <p className="text-sm text-gray-500">
                  If this problem persists, please contact support at{' '}
                  <a 
                    href="mailto:support@rideyaari.com" 
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    support@rideyaari.com
                  </a>
                  {' '}with Error ID: <strong>{this.state.errorId}</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}