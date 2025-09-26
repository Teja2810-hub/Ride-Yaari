import React, { useState, useEffect } from 'react'
import { TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Clock, TrendingUp, ListFilter as Filter, Search, Download, RefreshCw, Eye, X, Calendar, User, Globe, Smartphone } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { useErrorHandler } from '../hooks/useErrorHandler'
import ErrorMessage from './ErrorMessage'
import LoadingSpinner from './LoadingSpinner'

interface ErrorReport {
  id: string
  timestamp: string
  context: string
  error_message: string
  error_stack?: string
  component_stack?: string
  user_agent: string
  url: string
  user_id?: string
  is_resolved: boolean
  error_code?: string
  session_id: string
  metadata: any
  created_at: string
  user_profiles?: {
    full_name: string
  }
}

interface ErrorStats {
  total: number
  resolved: number
  unresolved: number
  critical: number
  high: number
  medium: number
  low: number
  last24h: number
  last7d: number
}

export default function ErrorReportingDashboard() {
  const { user } = useAuth()
  const { error, isLoading, handleAsync, clearError } = useErrorHandler()
  const [errors, setErrors] = useState<ErrorReport[]>([])
  const [stats, setStats] = useState<ErrorStats>({
    total: 0,
    resolved: 0,
    unresolved: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    last24h: 0,
    last7d: 0
  })
  const [selectedError, setSelectedError] = useState<ErrorReport | null>(null)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'resolved' | 'unresolved'>('all')
  const [timeFilter, setTimeFilter] = useState<'all' | '24h' | '7d' | '30d'>('7d')

  useEffect(() => {
    fetchErrors()
    fetchStats()
  }, [severityFilter, statusFilter, timeFilter])

  const fetchErrors = async () => {
    await handleAsync(async () => {
      let query = supabase
        .from('error_reports')
        .select(`
          *,
          user_profiles (
            full_name
          )
        `)

      // Apply filters
      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter)
      }

      if (statusFilter !== 'all') {
        query = query.eq('is_resolved', statusFilter === 'resolved')
      }

      // Apply time filter
      if (timeFilter !== 'all') {
        const now = new Date()
        let startDate: Date

        switch (timeFilter) {
          case '24h':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
            break
          case '7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case '30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            break
          default:
            startDate = new Date(0)
        }

        query = query.gte('timestamp', startDate.toISOString())
      }

      const { data, error } = await query
        .order('timestamp', { ascending: false })
        .limit(100)

      if (error) throw error

      setErrors(data || [])
    })
  }

  const fetchStats = async () => {
    await handleAsync(async () => {
      const { data, error } = await supabase
        .from('error_reports')
        .select('severity, is_resolved, timestamp')

      if (error) throw error

      const now = new Date()
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const stats: ErrorStats = {
        total: data?.length || 0,
        resolved: data?.filter(e => e.is_resolved).length || 0,
        unresolved: data?.filter(e => !e.is_resolved).length || 0,
        critical: data?.filter(e => e.severity === 'critical').length || 0,
        high: data?.filter(e => e.severity === 'high').length || 0,
        medium: data?.filter(e => e.severity === 'medium').length || 0,
        low: data?.filter(e => e.severity === 'low').length || 0,
        last24h: data?.filter(e => new Date(e.timestamp) > last24h).length || 0,
        last7d: data?.filter(e => new Date(e.timestamp) > last7d).length || 0
      }

      setStats(stats)
    })
  }

  const markAsResolved = async (errorId: string) => {
    await handleAsync(async () => {
      const { error } = await supabase
        .from('error_reports')
        .update({ is_resolved: true })
        .eq('id', errorId)

      if (error) throw error

      // Update local state
      setErrors(prev => prev.map(e => 
        e.id === errorId ? { ...e, is_resolved: true } : e
      ))
      
      // Update stats
      setStats(prev => ({
        ...prev,
        resolved: prev.resolved + 1,
        unresolved: prev.unresolved - 1
      }))
    })
  }

  const exportErrors = () => {
    const csvData = errors.map(error => ({
      'Timestamp': new Date(error.timestamp).toLocaleString(),
      'Severity': error.severity,
      'Context': error.context,
      'Error Message': error.error_message,
      'User': error.user_profiles?.full_name || 'Guest',
      'URL': error.url,
      'Resolved': error.is_resolved ? 'Yes' : 'No',
      'Error ID': error.id
    }))

    const csvContent = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rideyaari-errors-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '🚨'
      case 'high':
        return '⚠️'
      case 'medium':
        return '⚡'
      case 'low':
        return '📢'
      default:
        return '❓'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60)

    if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)}m ago`
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    }
  }

  const filteredErrors = errors.filter(error => {
    const searchMatch = error.error_message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       error.context.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       error.user_profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return searchMatch
  })

  if (isLoading && errors.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Loading error reports..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <ErrorMessage
          message={error}
          onRetry={() => {
            clearError()
            fetchErrors()
            fetchStats()
          }}
          onDismiss={clearError}
          className="mb-6"
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Error Reporting Dashboard</h2>
          <p className="text-gray-600">Monitor and manage application errors</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              fetchErrors()
              fetchStats()
            }}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          {errors.length > 0 && (
            <button
              onClick={exportErrors}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download size={16} />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
          <div className="text-sm text-gray-600">Resolved</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.unresolved}</div>
          <div className="text-sm text-gray-600">Unresolved</div>
        </div>
        <div className="bg-red-100 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-700">{stats.critical}</div>
          <div className="text-sm text-gray-600">Critical</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.high}</div>
          <div className="text-sm text-gray-600">High</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.medium}</div>
          <div className="text-sm text-gray-600">Medium</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.last24h}</div>
          <div className="text-sm text-gray-600">Last 24h</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.last7d}</div>
          <div className="text-sm text-gray-600">Last 7d</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search errors..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          >
            <option value="all">All Status</option>
            <option value="unresolved">Unresolved</option>
            <option value="resolved">Resolved</option>
          </select>

          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as any)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          >
            <option value="all">All Time</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Error List */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Error Reports ({filteredErrors.length})
          </h3>
        </div>

        {filteredErrors.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
            <h4 className="text-xl font-semibold text-gray-900 mb-2">No Errors Found</h4>
            <p className="text-gray-600">
              {searchTerm || severityFilter !== 'all' || statusFilter !== 'all' || timeFilter !== 'all'
                ? 'No errors match your current filters.'
                : 'No errors have been reported yet.'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredErrors.map((errorReport) => (
              <div
                key={errorReport.id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-lg">
                        {getSeverityIcon(errorReport.metadata?.severity || 'medium')}
                      </span>
                      <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getSeverityColor(errorReport.metadata?.severity || 'medium')}`}>
                        {(errorReport.metadata?.severity || 'medium').toUpperCase()}
                      </div>
                      <span className="text-sm text-gray-500">
                        {formatTimestamp(errorReport.timestamp)}
                      </span>
                      {errorReport.is_resolved ? (
                        <div className="flex items-center space-x-1 text-green-600">
                          <CheckCircle size={14} />
                          <span className="text-sm">Resolved</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 text-red-600">
                          <Clock size={14} />
                          <span className="text-sm">Unresolved</span>
                        </div>
                      )}
                    </div>

                    <h4 className="font-semibold text-gray-900 mb-1">
                      {errorReport.context}
                    </h4>
                    <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                      {errorReport.error_message}
                    </p>

                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <User size={12} />
                        <span>{errorReport.user_profiles?.full_name || 'Guest'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Globe size={12} />
                        <span>{new URL(errorReport.url).pathname}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Smartphone size={12} />
                        <span>{errorReport.session_id.slice(0, 8)}...</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedError(errorReport)
                        setShowErrorModal(true)
                      }}
                      className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                      <Eye size={14} />
                      <span>View</span>
                    </button>
                    
                    {!errorReport.is_resolved && (
                      <button
                        onClick={() => markAsResolved(errorReport.id)}
                        className="flex items-center space-x-1 bg-green-600 text-white px-3 py-1 rounded-lg font-medium hover:bg-green-700 transition-colors text-sm"
                      >
                        <CheckCircle size={14} />
                        <span>Resolve</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error Detail Modal */}
      {showErrorModal && selectedError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">
                  {getSeverityIcon(selectedError.metadata?.severity || 'medium')}
                </span>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Error Details</h2>
                  <p className="text-sm text-gray-600">{selectedError.context}</p>
                </div>
              </div>
              <button
                onClick={() => setShowErrorModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
              <div className="space-y-6">
                {/* Error Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Error Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 mb-1">Error ID</p>
                      <p className="font-mono text-gray-900">{selectedError.id}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Timestamp</p>
                      <p className="text-gray-900">{new Date(selectedError.timestamp).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">User</p>
                      <p className="text-gray-900">{selectedError.user_profiles?.full_name || 'Guest User'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Session</p>
                      <p className="font-mono text-gray-900">{selectedError.session_id}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">URL</p>
                      <p className="text-gray-900 break-all">{selectedError.url}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Status</p>
                      <div className="flex items-center space-x-2">
                        {selectedError.is_resolved ? (
                          <div className="flex items-center space-x-1 text-green-600">
                            <CheckCircle size={14} />
                            <span>Resolved</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1 text-red-600">
                            <Clock size={14} />
                            <span>Unresolved</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Error Message</h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <pre className="text-sm text-red-800 whitespace-pre-wrap font-mono">
                      {selectedError.error_message}
                    </pre>
                  </div>
                </div>

                {/* Stack Trace */}
                {selectedError.error_stack && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Stack Trace</h3>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                        {selectedError.error_stack}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Component Stack */}
                {selectedError.component_stack && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Component Stack</h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <pre className="text-xs text-blue-800 whitespace-pre-wrap font-mono">
                        {selectedError.component_stack}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Browser Info */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Browser Information</h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-700 font-mono break-all">
                      {selectedError.user_agent}
                    </p>
                  </div>
                </div>

                {/* Metadata */}
                {selectedError.metadata && Object.keys(selectedError.metadata).length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Additional Metadata</h3>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify(selectedError.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-6 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                Error ID: {selectedError.id}
              </div>
              <div className="flex items-center space-x-3">
                {!selectedError.is_resolved && (
                  <button
                    onClick={() => {
                      markAsResolved(selectedError.id)
                      setShowErrorModal(false)
                    }}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    Mark as Resolved
                  </button>
                )}
                <button
                  onClick={() => setShowErrorModal(false)}
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}