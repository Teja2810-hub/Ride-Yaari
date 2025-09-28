import React, { useState } from 'react'
import { Bug, TriangleAlert as AlertTriangle, Zap, Info, Play, CircleCheck as CheckCircle, X } from 'lucide-react'
import { reportErrorToBackend } from '../utils/errorUtils'
import { reportCriticalError } from '../utils/errorReporting'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from './LoadingSpinner'

export default function ErrorTestingPanel() {
  const { user } = useAuth()
  const [testing, setTesting] = useState(false)
  const [testResults, setTestResults] = useState<{
    type: string
    success: boolean
    message: string
  }[]>([])

  const runErrorTest = async (
    errorType: 'low' | 'medium' | 'high' | 'critical',
    testName: string
  ) => {
    setTesting(true)
    
    try {
      const testError = new Error(`Test ${errorType} severity error: ${testName}`)
      
      if (errorType === 'critical') {
        await reportCriticalError(
          testError,
          `Error Testing Panel - ${testName}`,
          user?.id,
          {
            testType: errorType,
            testName: testName,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
          }
        )
      } else {
        await reportErrorToBackend(
          testError,
          `Error Testing Panel - ${testName}`,
          undefined,
          user?.id
        )
      }

      setTestResults(prev => [...prev, {
        type: testName,
        success: true,
        message: `${errorType} severity error reported successfully`
      }])
    } catch (error: any) {
      setTestResults(prev => [...prev, {
        type: testName,
        success: false,
        message: `Failed to report error: ${error.message}`
      }])
    } finally {
      setTesting(false)
    }
  }

  const testScenarios = [
    {
      type: 'low' as const,
      name: 'UI Glitch',
      description: 'Test a low-severity UI rendering issue',
      icon: <Info size={16} className="text-blue-600" />,
      color: 'bg-blue-50 border-blue-200 text-blue-800'
    },
    {
      type: 'medium' as const,
      name: 'API Timeout',
      description: 'Test a medium-severity network timeout',
      icon: <AlertTriangle size={16} className="text-yellow-600" />,
      color: 'bg-yellow-50 border-yellow-200 text-yellow-800'
    },
    {
      type: 'high' as const,
      name: 'Data Corruption',
      description: 'Test a high-severity data integrity issue',
      icon: <Bug size={16} className="text-orange-600" />,
      color: 'bg-orange-50 border-orange-200 text-orange-800'
    },
    {
      type: 'critical' as const,
      name: 'System Crash',
      description: 'Test a critical system failure (sends immediate notifications)',
      icon: <Zap size={16} className="text-red-600" />,
      color: 'bg-red-50 border-red-200 text-red-800'
    }
  ]

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Error Testing Panel</h2>
        <p className="text-gray-600">
          Test your error reporting and notification system with different severity levels.
        </p>
      </div>

      {testing && (
        <div className="mb-6">
          <LoadingSpinner text="Sending test error..." />
        </div>
      )}

      {/* Test Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {testScenarios.map((scenario) => (
          <div
            key={scenario.name}
            className={`border rounded-lg p-4 ${scenario.color}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                {scenario.icon}
                <h3 className="font-semibold">{scenario.name}</h3>
              </div>
              <button
                onClick={() => runErrorTest(scenario.type, scenario.name)}
                disabled={testing}
                className="flex items-center space-x-1 bg-white text-gray-700 px-3 py-1 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
              >
                <Play size={14} />
                <span>Test</span>
              </button>
            </div>
            <p className="text-sm">{scenario.description}</p>
          </div>
        ))}
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Test Results</h3>
          <div className="space-y-2">
            {testResults.map((result, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
              >
                <div className="flex items-center space-x-3">
                  {result.success ? (
                    <CheckCircle size={16} className="text-green-600" />
                  ) : (
                    <X size={16} className="text-red-600" />
                  )}
                  <span className="font-medium text-gray-900">{result.type}</span>
                </div>
                <span className={`text-sm ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                  {result.message}
                </span>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Next Steps:</strong> Check your configured notification channels (Discord, Slack, Email) 
              to see if you received the test notifications. Critical errors should trigger immediate alerts.
            </p>
          </div>
        </div>
      )}

      {/* Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">📋 Testing Information</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>• <strong>Low Severity:</strong> UI glitches, minor issues - logged but no notifications</p>
          <p>• <strong>Medium Severity:</strong> API timeouts, recoverable errors - notifications sent</p>
          <p>• <strong>High Severity:</strong> Data issues, authentication problems - immediate notifications</p>
          <p>• <strong>Critical Severity:</strong> System crashes, security issues - urgent notifications + browser alerts</p>
        </div>
        
        <div className="mt-4 p-3 bg-blue-100 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>💡 Pro Tip:</strong> Test each severity level to ensure your notification channels are working correctly. 
            Critical errors will also trigger browser notifications for immediate attention.
          </p>
        </div>
      </div>
    </div>
  )
}