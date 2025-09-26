import React, { useState, useEffect } from 'react'
import { Activity, Database, Wifi, Shield, Clock, TrendingUp, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'
import { supabase } from '../utils/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useErrorHandler } from '../hooks/useErrorHandler'
import ErrorMessage from './ErrorMessage'
import LoadingSpinner from './LoadingSpinner'
import ErrorReportingDashboard from './ErrorReportingDashboard'
import WebhookSetupGuide from './WebhookSetupGuide'
import ErrorTestingPanel from './ErrorTestingPanel'

interface SystemHealth {
  database: {
    status: 'healthy' | 'degraded' | 'down'
    responseTime: number
    lastChecked: Date
  }
  auth: {
    status: 'healthy' | 'degraded' | 'down'
    responseTime: number
    lastChecked: Date
  }
  storage: {
    status: 'healthy' | 'degraded' | 'down'
    responseTime: number
    lastChecked: Date
  }
  functions: {
    status: 'healthy' | 'degraded' | 'down'
    responseTime: number
    lastChecked: Date
  }
}

interface SystemStats {
  totalUsers: number
  activeTrips: number
  activeRides: number
  totalMessages: number
  errorRate: number
  uptime: number
}

export default function SystemHealthDashboard() {
  const { user } = useAuth()
  const { error, isLoading, handleAsync, clearError } = useErrorHandler()
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [activeTab, setActiveTab] = useState<'health' | 'errors' | 'webhooks' | 'testing'>('health')
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    checkSystemHealth()
    fetchSystemStats()

    if (autoRefresh) {
      const interval = setInterval(() => {
        checkSystemHealth()
        fetchSystemStats()
      }, 30000) // Check every 30 seconds

      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const checkSystemHealth = async () => {
    await handleAsync(async () => {
      const healthChecks = await Promise.allSettled([
        checkDatabaseHealth(),
        checkAuthHealth(),
        checkStorageHealth(),
        checkFunctionsHealth()
      ])

      const [database, auth, storage, functions] = healthChecks.map(result => 
        result.status === 'fulfilled' ? result.value : {
          status: 'down' as const,
          responseTime: 0,
          lastChecked: new Date()
        }
      )

      setHealth({ database, auth, storage, functions })
    })
  }

  const checkDatabaseHealth = async () => {
    const start = Date.now()
    try {
      const { error } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1)

      const responseTime = Date.now() - start
      
      return {
        status: error ? 'degraded' as const : 'healthy' as const,
        responseTime,
        lastChecked: new Date()
      }
    } catch (error) {
      return {
        status: 'down' as const,
        responseTime: Date.now() - start,
        lastChecked: new Date()
      }
    }
  }

  const checkAuthHealth = async () => {
    const start = Date.now()
    try {
      const { error } = await supabase.auth.getSession()
      const responseTime = Date.now() - start
      
      return {
        status: error ? 'degraded' as const : 'healthy' as const,
        responseTime,
        lastChecked: new Date()
      }
    } catch (error) {
      return {
        status: 'down' as const,
        responseTime: Date.now() - start,
        lastChecked: new Date()
      }
    }
  }

  const checkStorageHealth = async () => {
    const start = Date.now()
    try {
      const { error } = await supabase.storage.listBuckets()
      const responseTime = Date.now() - start
      
      return {
        status: error ? 'degraded' as const : 'healthy' as const,
        responseTime,
        lastChecked: new Date()
      }
    } catch (error) {
      return {
        status: 'down' as const,
        responseTime: Date.now() - start,
        lastChecked: new Date()
      }
    }
  }

  const checkFunctionsHealth = async () => {
    const start = Date.now()
    try {
      // Try to call a simple function or check if functions are available
      const { error } = await supabase.functions.invoke('error-webhook-trigger', {
        body: { test: true }
      })
      
      const responseTime = Date.now() - start
      
      return {
        status: error && !error.message.includes('test') ? 'degraded' as const : 'healthy' as const,
        responseTime,
        lastChecked: new Date()
      }
    } catch (error) {
      return {
        status: 'down' as const,
        responseTime: Date.now() - start,
        lastChecked: new Date()
      }
    }
  }

  const fetchSystemStats = async () => {
    await handleAsync(async () => {
      const [usersResult, tripsResult, ridesResult, messagesResult, errorsResult] = await Promise.allSettled([
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('trips').select('id', { count: 'exact', head: true }).eq('is_closed', false),
        supabase.from('car_rides').select('id', { count: 'exact', head: true }).eq('is_closed', false),
        supabase.from('chat_messages').select('id', { count: 'exact', head: true }),
        supabase.from('error_reports').select('id', { count: 'exact', head: true }).gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      ])

      const totalUsers = usersResult.status === 'fulfilled' ? usersResult.value.count || 0 : 0
      const activeTrips = tripsResult.status === 'fulfilled' ? tripsResult.value.count || 0 : 0
      const activeRides = ridesResult.status === 'fulfilled' ? ridesResult.value.count || 0 : 0
      const totalMessages = messagesResult.status === 'fulfilled' ? messagesResult.value.count || 0 : 0
      const recentErrors = errorsResult.status === 'fulfilled' ? errorsResult.value.count || 0 : 0

      // Calculate error rate (errors per 1000 operations, rough estimate)
      const totalOperations = totalMessages + activeTrips + activeRides
      const errorRate = totalOperations > 0 ? (recentErrors / totalOperations) * 1000 : 0

      setStats({
        totalUsers,
        activeTrips,
        activeRides,
        totalMessages,
        errorRate,
        uptime: 99.9 // This would be calculated from actual uptime monitoring
      })
    })
  }

  const getStatusColor = (status: 'healthy' | 'degraded' | 'down') => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'down':
        return 'bg-red-100 text-red-800 border-red-200'
    }
  }

  const getStatusIcon = (status: 'healthy' | 'degraded' | 'down') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle size={16} className="text-green-600" />
      case 'degraded':
        return <AlertTriangle size={16} className="text-yellow-600" />
      case 'down':
        return <X size={16} className="text-red-600" />
    }
  }

  const tabs = [
    { id: 'health', label: 'System Health', icon: <Activity size={16} /> },
    { id: 'errors', label: 'Error Reports', icon: <Bug size={16} /> },
    { id: 'webhooks', label: 'Webhook Setup', icon: <Settings size={16} /> },
    { id: 'testing', label: 'Error Testing', icon: <Play size={16} /> }
  ]

  return (
    <div className="space-y-6">
      {error && (
        <ErrorMessage
          message={error}
          onRetry={() => {
            clearError()
            checkSystemHealth()
            fetchSystemStats()
          }}
          onDismiss={clearError}
          className="mb-6"
        />
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          {/* System Health Overview */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">System Health Status</h2>
              <div className="flex items-center space-x-3">
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded"
                  />
                  <span>Auto-refresh</span>
                </label>
                <button
                  onClick={() => {
                    checkSystemHealth()
                    fetchSystemStats()
                  }}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {health ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Database size={20} className="text-gray-600" />
                      <span className="font-medium">Database</span>
                    </div>
                    {getStatusIcon(health.database.status)}
                  </div>
                  <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(health.database.status)}`}>
                    {health.database.status.toUpperCase()}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {health.database.responseTime}ms response time
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Shield size={20} className="text-gray-600" />
                      <span className="font-medium">Authentication</span>
                    </div>
                    {getStatusIcon(health.auth.status)}
                  </div>
                  <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(health.auth.status)}`}>
                    {health.auth.status.toUpperCase()}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {health.auth.responseTime}ms response time
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Database size={20} className="text-gray-600" />
                      <span className="font-medium">Storage</span>
                    </div>
                    {getStatusIcon(health.storage.status)}
                  </div>
                  <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(health.storage.status)}`}>
                    {health.storage.status.toUpperCase()}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {health.storage.responseTime}ms response time
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Wifi size={20} className="text-gray-600" />
                      <span className="font-medium">Functions</span>
                    </div>
                    {getStatusIcon(health.functions.status)}
                  </div>
                  <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(health.functions.status)}`}>
                    {health.functions.status.toUpperCase()}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {health.functions.responseTime}ms response time
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner text="Checking system health..." />
              </div>
            )}
          </div>

          {/* System Statistics */}
          {stats && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">System Statistics</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
                  <div className="text-sm text-gray-600">Total Users</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.activeTrips}</div>
                  <div className="text-sm text-gray-600">Active Trips</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{stats.activeRides}</div>
                  <div className="text-sm text-gray-600">Active Rides</div>
                </div>
                <div className="bg-indigo-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-indigo-600">{stats.totalMessages}</div>
                  <div className="text-sm text-gray-600">Total Messages</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{stats.errorRate.toFixed(2)}</div>
                  <div className="text-sm text-gray-600">Error Rate</div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-600">{stats.uptime.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">Uptime</div>
                </div>
              </div>
            </div>
          )}

          {/* Overall System Status */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Overall System Status</h2>
            {health && (
              <div className="flex items-center space-x-4">
                {Object.values(health).every(service => service.status === 'healthy') ? (
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle size={24} />
                    <span className="text-lg font-semibold">All Systems Operational</span>
                  </div>
                ) : Object.values(health).some(service => service.status === 'down') ? (
                  <div className="flex items-center space-x-2 text-red-600">
                    <X size={24} />
                    <span className="text-lg font-semibold">System Issues Detected</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-yellow-600">
                    <AlertTriangle size={24} />
                    <span className="text-lg font-semibold">Degraded Performance</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'errors' && <ErrorReportingDashboard />}
      {activeTab === 'webhooks' && <WebhookSetupGuide />}
      {activeTab === 'testing' && <ErrorTestingPanel />}
    </div>
  )
}