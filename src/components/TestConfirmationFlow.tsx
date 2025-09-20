import React, { useState } from 'react'
import { Play, CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { useConfirmationFlow } from '../hooks/useConfirmationFlow'
import { useErrorHandler } from '../hooks/useErrorHandler'
import ErrorMessage from './ErrorMessage'
import LoadingSpinner from './LoadingSpinner'

interface TestResult {
  test: string
  status: 'pending' | 'success' | 'error'
  message: string
  duration?: number
}

export default function TestConfirmationFlow() {
  const { user } = useAuth()
  const { error, handleAsync, clearError } = useErrorHandler()
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const addTestResult = (test: string, status: 'pending' | 'success' | 'error', message: string, duration?: number) => {
    setTestResults(prev => {
      const existing = prev.find(r => r.test === test)
      if (existing) {
        return prev.map(r => r.test === test ? { ...r, status, message, duration } : r)
      }
      return [...prev, { test, status, message, duration }]
    })
  }

  const runTests = async () => {
    if (!user) {
      alert('Please sign in to run tests')
      return
    }

    setIsRunning(true)
    setTestResults([])
    clearError()

    const tests = [
      {
        name: 'Database Connection',
        test: async () => {
          const { data, error } = await supabase.from('user_profiles').select('id').limit(1)
          if (error) throw error
          return 'Database connection successful'
        }
      },
      {
        name: 'User Profile Access',
        test: async () => {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          if (error) throw error
          return `Profile loaded: ${data.full_name}`
        }
      },
      {
        name: 'Confirmation Table Access',
        test: async () => {
          const { data, error } = await supabase
            .from('ride_confirmations')
            .select('*')
            .eq('passenger_id', user.id)
            .limit(5)
          if (error) throw error
          return `Found ${data.length} confirmations`
        }
      },
      {
        name: 'Car Rides Table Access',
        test: async () => {
          const { data, error } = await supabase
            .from('car_rides')
            .select('*')
            .eq('user_id', user.id)
            .limit(5)
          if (error) throw error
          return `Found ${data.length} car rides`
        }
      },
      {
        name: 'Trips Table Access',
        test: async () => {
          const { data, error } = await supabase
            .from('trips')
            .select('*')
            .eq('user_id', user.id)
            .limit(5)
          if (error) throw error
          return `Found ${data.length} trips`
        }
      },
      {
        name: 'Chat Messages Access',
        test: async () => {
          const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('sender_id', user.id)
            .limit(5)
          if (error) throw error
          return `Found ${data.length} messages`
        }
      }
    ]

    for (const { name, test } of tests) {
      addTestResult(name, 'pending', 'Running...')
      
      const startTime = Date.now()
      try {
        const result = await test()
        const duration = Date.now() - startTime
        addTestResult(name, 'success', result, duration)
      } catch (error: any) {
        const duration = Date.now() - startTime
        addTestResult(name, 'error', error.message || 'Test failed', duration)
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setIsRunning(false)
  }

  const getStatusIcon = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending':
        return <Clock size={16} className="text-yellow-600 animate-pulse" />
      case 'success':
        return <CheckCircle size={16} className="text-green-600" />
      case 'error':
        return <XCircle size={16} className="text-red-600" />
    }
  }

  const getStatusColor = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-50 border-yellow-200'
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Play size={20} className="text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">System Health Check</h2>
        </div>
        <button
          onClick={runTests}
          disabled={isRunning}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={isRunning ? 'animate-spin' : ''} />
          <span>{isRunning ? 'Running Tests...' : 'Run Tests'}</span>
        </button>
      </div>

      {error && (
        <ErrorMessage
          message={error}
          onRetry={clearError}
          onDismiss={clearError}
          className="mb-6"
        />
      )}

      {isRunning && testResults.length === 0 && (
        <div className="mb-6">
          <LoadingSpinner text="Initializing tests..." />
        </div>
      )}

      {testResults.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 mb-4">Test Results</h3>
          {testResults.map((result) => (
            <div
              key={result.test}
              className={`border rounded-lg p-4 transition-colors ${getStatusColor(result.status)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(result.status)}
                  <div>
                    <h4 className="font-medium text-gray-900">{result.test}</h4>
                    <p className="text-sm text-gray-600">{result.message}</p>
                  </div>
                </div>
                {result.duration && (
                  <span className="text-xs text-gray-500">
                    {result.duration}ms
                  </span>
                )}
              </div>
            </div>
          ))}
          
          {!isRunning && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-green-600">
                    {testResults.filter(r => r.status === 'success').length}
                  </div>
                  <div className="text-sm text-gray-600">Passed</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-red-600">
                    {testResults.filter(r => r.status === 'error').length}
                  </div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-600">
                    {testResults.length}
                  </div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!isRunning && testResults.length === 0 && (
        <div className="text-center py-8">
          <Play size={32} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Test</h3>
          <p className="text-gray-600 mb-4">
            Run system health checks to verify all confirmation flows are working correctly.
          </p>
        </div>
      )}
    </div>
  )
}