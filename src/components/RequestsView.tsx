import React, { useState, useEffect } from 'react'
import { ArrowLeft, Car, Plane, User, Calendar, Clock, MapPin, MessageCircle, Search, ListFilter as Filter, CreditCard as Edit, Trash2, CircleCheck as CheckCircle, X, TriangleAlert as AlertTriangle, Lock, Clock as Unlock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { RideRequest, TripRequest } from '../types'
import { useErrorHandler } from '../hooks/useErrorHandler'
import ErrorMessage from './ErrorMessage'
import LoadingSpinner from './LoadingSpinner'
import { formatDateSafe, formatDateTimeSafe } from '../utils/dateHelpers'

interface RequestsViewProps {
  type: 'ride' | 'trip'
  onBack: () => void
  onStartChat: (userId: string, userName: string, ride?: any, trip?: any) => void
}

type StatusFilter = 'all' | 'active' | 'expired'
type SortOption = 'date-desc' | 'date-asc' | 'expiry-asc' | 'expiry-desc'

export default function RequestsView({ type, onBack, onStartChat }: RequestsViewProps) {
  const { user } = useAuth()
  const { error, isLoading, handleAsync, clearError } = useErrorHandler()
  const [requests, setRequests] = useState<(RideRequest | TripRequest)[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')
  const [showFilters, setShowFilters] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState<{
    show: boolean
    request: RideRequest | TripRequest | null
  }>({ show: false, request: null })
  const [showEditModal, setShowEditModal] = useState<{
    show: boolean
    request: RideRequest | TripRequest | null
  }>({ show: false, request: null })
  const [editFormData, setEditFormData] = useState<any>({})

  const [expandedRequest, setExpandedRequest] = useState<string | null>(null)

  const toggleRequest = (requestId: string) => {
    setExpandedRequest(expandedRequest === requestId ? null : requestId)
  }

  useEffect(() => {
    if (user) {
      fetchRequests()
    }
  }, [user, type])

  const fetchRequests = async () => {
    if (!user) return

    await handleAsync(async () => {
      const tableName = type === 'ride' ? 'ride_requests' : 'trip_requests'
      
      const { data, error } = await supabase
        .from(tableName)
        .select(`
          *,
          user_profiles!${tableName}_passenger_id_fkey (
            id,
            full_name,
            profile_image_url
          )
        `)
        .eq('passenger_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setRequests(data || [])
    })
  }

  const handleDeleteRequest = async (requestId: string) => {
    if (!user) return

    setShowDeleteModal({ show: false, request: null })
    setDeletingId(requestId)

    await handleAsync(async () => {
      const tableName = type === 'ride' ? 'ride_requests' : 'trip_requests'
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', requestId)
        .eq('passenger_id', user.id)

      if (error) throw error

      // Remove from local state
      setRequests(prev => prev.filter(r => r.id !== requestId))
      
      setSuccessMessage('Request deleted successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
    }).finally(() => {
      setDeletingId(null)
    })
  }

  const handleEditRequest = async (requestId: string, updateData: any) => {
    if (!user) return

    setShowEditModal({ show: false, request: null })

    await handleAsync(async () => {
      const tableName = type === 'ride' ? 'ride_requests' : 'trip_requests'
      
      const { error } = await supabase
        .from(tableName)
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('passenger_id', user.id)

      if (error) throw error

      // Update local state
      setRequests(prev => prev.map(r => 
        r.id === requestId ? { ...r, ...updateData } : r
      ))
      
      setSuccessMessage('Request updated successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
    })
  }

  const toggleRequestStatus = async (requestId: string, currentStatus: boolean) => {
    if (!user) return

    await handleAsync(async () => {
      const tableName = type === 'ride' ? 'ride_requests' : 'trip_requests'
      
      const { error } = await supabase
        .from(tableName)
        .update({ is_active: !currentStatus })
        .eq('id', requestId)
        .eq('passenger_id', user.id)

      if (error) throw error

      // Update local state
      setRequests(prev => prev.map(r => 
        r.id === requestId ? { ...r, is_active: !currentStatus } : r
      ))
      
      setSuccessMessage(`Request ${!currentStatus ? 'activated' : 'deactivated'} successfully!`)
      setTimeout(() => setSuccessMessage(''), 3000)
    })
  }

  const getRequestStatus = (request: RideRequest | TripRequest) => {
    if (!request.is_active) {
      return { status: 'inactive', color: 'bg-gray-100 text-gray-800', label: 'Inactive' }
    }
    
    if (request.expires_at && new Date(request.expires_at) <= new Date()) {
      return { status: 'expired', color: 'bg-red-100 text-red-800', label: 'Expired' }
    }
    
    return { status: 'active', color: 'bg-green-100 text-green-800', label: 'Active' }
  }

  const getDateDisplay = (request: RideRequest | TripRequest) => {
    switch (request.request_type) {
      case 'specific_date':
        return request.specific_date ? formatDateSafe(request.specific_date) : 'Specific date'
      case 'multiple_dates':
        return request.multiple_dates && request.multiple_dates.length > 0
          ? `${request.multiple_dates.length} selected dates`
          : 'Multiple dates'
      case 'month':
        return request.request_month || 'Month'
      default:
        return 'Unknown'
    }
  }

  const getLocationDisplay = (request: RideRequest | TripRequest) => {
    if ('departure_location' in request) {
      // Ride request
      return `${request.departure_location} → ${request.destination_location}`
    } else {
      // Trip request
      return `${(request as TripRequest).departure_airport} → ${(request as TripRequest).destination_airport}`
    }
  }

  const filteredAndSortedRequests = () => {
    let filtered = requests.filter(request => {
      // Status filter
      if (statusFilter === 'active') {
        return request.is_active && (!request.expires_at || new Date(request.expires_at) > new Date())
      } else if (statusFilter === 'expired') {
        return !request.is_active || (request.expires_at && new Date(request.expires_at) <= new Date())
      }
      return true // 'all'
    })

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(request => 
        getLocationDisplay(request).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (request.additional_notes || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'date-desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'expiry-asc':
          if (!a.expires_at && !b.expires_at) return 0
          if (!a.expires_at) return 1
          if (!b.expires_at) return -1
          return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime()
        case 'expiry-desc':
          if (!a.expires_at && !b.expires_at) return 0
          if (!a.expires_at) return -1
          if (!b.expires_at) return 1
          return new Date(b.expires_at).getTime() - new Date(a.expires_at).getTime()
        default:
          return 0
      }
    })

    return filtered
  }

  const getStats = () => {
    const total = requests.length
    const active = requests.filter(r => r.is_active && (!r.expires_at || new Date(r.expires_at) > new Date())).length
    const expired = requests.filter(r => !r.is_active || (r.expires_at && new Date(r.expires_at) <= new Date())).length

    return { total, active, expired }
  }

  if (isLoading && requests.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text={`Loading ${type} requests...`} />
      </div>
    )
  }

  const filteredRequests = filteredAndSortedRequests()
  const stats = getStats()

  return (
    <div>
      <div className="space-y-6">
        {error && (
          <ErrorMessage
            message={error}
            onRetry={() => {
              clearError()
              fetchRequests()
            }}
            onDismiss={clearError}
            className="mb-6"
          />
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle size={20} className="text-green-600" />
              <p className="text-green-800">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-bold text-gray-900">
              {type === 'ride' ? 'Ride' : 'Trip'} Requests
            </h2>
          </div>
          <span className="text-gray-600">{filteredRequests.length} of {requests.length} requests</span>
        </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-sm text-gray-600">Active</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
          <div className="text-sm text-gray-600">Expired</div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 sm:mb-0">Filter & Search</h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Filter size={16} />
            <span>{showFilters ? 'Hide' : 'Show'} Filters</span>
          </button>
        </div>

        {showFilters && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Search ${type} requests by location or notes...`}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired/Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="expiry-asc">Expiring Soon</option>
                  <option value="expiry-desc">Expiring Last</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {type === 'ride' ? (
              <Car size={32} className="text-gray-400" />
            ) : (
              <Plane size={32} className="text-gray-400" />
            )}
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {requests.length === 0 ? `No ${type} Requests` : 'No Matching Requests'}
          </h3>
          <p className="text-gray-600">
            {requests.length === 0 
              ? `You haven't created any ${type} requests yet.`
              : 'Try adjusting your search or filter criteria.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => {
            const status = getRequestStatus(request)
            const isRideRequest = 'departure_location' in request
            const isExpanded = expandedRequest === request.id
            
            return (
              <div 
                key={request.id}
                className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Request Header - Always Visible */}
                <div 
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleRequest(request.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        type === 'ride' ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        {type === 'ride' ? (
                          <Car size={24} className="text-green-600" />
                        ) : (
                          <Plane size={24} className="text-blue-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {getLocationDisplay(request)}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>Created {formatDateTimeSafe(request.created_at)}</span>
                          <span>{getDateDisplay(request)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                        <span>{status.label}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {isExpanded ? 'Hide Details' : 'Show Details'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    <div className="p-6 space-y-6">
                      {/* Request Details */}
                      <div className={`rounded-lg p-4 ${
                        type === 'ride' ? 'bg-green-50' : 'bg-blue-50'
                      }`}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Route</p>
                            <div className="font-medium text-gray-900 flex items-center">
                              <MapPin size={14} className="mr-1 text-gray-400" />
                              {getLocationDisplay(request)}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Date Preference</p>
                            <div className="font-medium text-gray-900 flex items-center">
                              <Calendar size={14} className="mr-1 text-gray-400" />
                              {request.request_type === 'multiple_dates' && request.multiple_dates && request.multiple_dates.length > 0 ? (
                                <div className="space-y-1">
                                  {request.multiple_dates.map((date, index) => (
                                    <div key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full inline-block mr-1 mb-1">
                                      {formatDateSafe(date)}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                getDateDisplay(request)
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">
                              {type === 'ride' ? 'Search Radius' : 'Request Type'}
                            </p>
                            <div className="font-medium text-gray-900">
                              {isRideRequest 
                                ? `${(request as RideRequest).search_radius_miles} miles`
                                : request.request_type.replace('_', ' ')
                              }
                            </div>
                          </div>
                        </div>

                        {request.additional_notes && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-sm text-gray-600 mb-1">Additional Notes</p>
                            <p className="text-sm text-gray-900">{request.additional_notes}</p>
                          </div>
                        )}

                        {request.expires_at && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex items-center space-x-2 text-sm">
                              <Clock size={14} className="text-gray-400" />
                              <span className="text-gray-600">Expires:</span>
                              <span className="font-medium text-gray-900">
                                {formatDateTimeSafe(request.expires_at)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                          ID: {request.id.slice(0, 8)}...
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => toggleRequestStatus(request.id, request.is_active)}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                              request.is_active
                                ? 'bg-gray-600 hover:bg-gray-700 text-white'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                          >
                            {request.is_active ? <Lock size={16} /> : <Unlock size={16} />}
                            <span>{request.is_active ? 'Deactivate' : 'Activate'}</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              setEditFormData(request)
                              setShowEditModal({ show: true, request })
                            }}
                            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                          >
                            <Edit size={16} />
                            <span>Edit</span>
                          </button>
                          
                          <button
                            onClick={() => setShowDeleteModal({ show: true, request })}
                            disabled={deletingId === request.id}
                            className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
                          >
                            {deletingId === request.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Deleting...</span>
                              </>
                            ) : (
                              <>
                                <Trash2 size={16} />
                                <span>Delete</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Information Panel */}
      <div className={`mt-8 rounded-xl p-6 ${
        type === 'ride' ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'
      }`}>
        <h3 className={`font-semibold mb-4 ${
          type === 'ride' ? 'text-green-900' : 'text-blue-900'
        }`}>
          📋 About {type === 'ride' ? 'Ride' : 'Trip'} Requests
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className={`font-semibold mb-2 ${
              type === 'ride' ? 'text-green-900' : 'text-blue-900'
            }`}>
              {type === 'ride' ? '🚗 Ride Requests' : '✈️ Trip Requests'}
            </h4>
            <ul className={`text-sm space-y-1 ${
              type === 'ride' ? 'text-green-800' : 'text-blue-800'
            }`}>
              <li>• Let {type === 'ride' ? 'drivers' : 'travelers'} know you need a {type}</li>
              <li>• Get notified when matching {type === 'ride' ? 'rides' : 'trips'} are posted</li>
              <li>• Set flexible date preferences</li>
              <li>• Automatically expire after your selected dates</li>
            </ul>
          </div>
          <div>
            <h4 className={`font-semibold mb-2 ${
              type === 'ride' ? 'text-green-900' : 'text-blue-900'
            }`}>
              Request Management
            </h4>
            <ul className={`text-sm space-y-1 ${
              type === 'ride' ? 'text-green-800' : 'text-blue-800'
            }`}>
              <li>• Activate/deactivate requests anytime</li>
              <li>• Delete requests you no longer need</li>
              <li>• View request history and responses</li>
              <li>• Track expiry dates and status</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal.show && showDeleteModal.request && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} className="text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Delete Request</h2>
              <p className="text-gray-600">
                Are you sure you want to delete this {type} request?
              </p>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-gray-900 mb-2">Request Details:</h4>
              <div className="text-sm text-gray-700 space-y-1">
                <p><strong>Route:</strong> {getLocationDisplay(showDeleteModal.request)}</p>
                <p><strong>Date:</strong> {getDateDisplay(showDeleteModal.request)}</p>
                <p><strong>Status:</strong> {getRequestStatus(showDeleteModal.request).label}</p>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle size={16} className="text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-900 mb-1">What happens:</h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• This request will be permanently deleted</li>
                    <li>• You will stop receiving notifications for this route</li>
                    <li>• This action cannot be undone</li>
                    <li>• You can create a new request anytime</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteModal({ show: false, request: null })}
                className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteRequest(showDeleteModal.request!.id)}
                disabled={isLoading}
                className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Deleting...' : 'Delete Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Request Modal */}
      {showEditModal.show && showEditModal.request && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Edit size={32} className="text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Edit {type} Request</h2>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault()
              handleEditRequest(showEditModal.request!.id, editFormData)
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={editFormData.additional_notes || ''}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, additional_notes: e.target.value }))}
                  placeholder="Update your requirements or preferences..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                  rows={3}
                  maxLength={200}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {(editFormData.additional_notes || '').length}/200 characters
                </div>
              </div>

              {type === 'ride' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Radius
                  </label>
                  <select
                    value={editFormData.search_radius_miles || 25}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, search_radius_miles: parseInt(e.target.value) }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value={5}>5 miles</option>
                    <option value={10}>10 miles</option>
                    <option value={15}>15 miles</option>
                    <option value={20}>20 miles</option>
                    <option value={25}>25 miles</option>
                    <option value={30}>30 miles</option>
                    <option value={50}>50 miles</option>
                    <option value={75}>75 miles</option>
                    <option value={100}>100 miles</option>
                  </select>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal({ show: false, request: null })}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Updating...' : 'Update Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}