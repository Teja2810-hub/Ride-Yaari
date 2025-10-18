import React, { useState, useEffect } from 'react'
import { ArrowLeft, Shield, User, Trash2, MessageCircle, TriangleAlert as AlertTriangle, Search, Calendar, CircleCheck as CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getBlockedUsers, unblockUser, BlockedUser } from '../utils/blockingHelpers'
import { useErrorHandler } from '../hooks/useErrorHandler'
import ErrorMessage from './ErrorMessage'
import LoadingSpinner from './LoadingSpinner'
import { formatDateTimeSafe } from '../utils/dateHelpers'

interface BlockedUsersViewProps {
  onBack: () => void
}

export default function BlockedUsersView({ onBack }: BlockedUsersViewProps) {
  const { user } = useAuth()
  const { error, isLoading, handleAsync, clearError } = useErrorHandler()
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [showUnblockModal, setShowUnblockModal] = useState<{
    show: boolean
    userId: string
    userName: string
  }>({ show: false, userId: '', userName: '' })

  useEffect(() => {
    if (user) {
      fetchBlockedUsers()
    }
  }, [user])

  const fetchBlockedUsers = async () => {
    if (!user) return

    await handleAsync(async () => {
      const users = await getBlockedUsers(user.id)
      setBlockedUsers(users)
    })
  }

  const handleUnblock = async (blockedUserId: string) => {
    if (!user) return

    setShowUnblockModal({ show: false, userId: '', userName: '' })
    setUnblockingUserId(blockedUserId)

    await handleAsync(async () => {
      const result = await unblockUser(user.id, blockedUserId)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to unblock user')
      }

      // Remove from local state
      setBlockedUsers(prev => prev.filter(u => u.blocked_id !== blockedUserId))
      
      // Show success message in UI
      setSuccessMessage('User unblocked successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
    }).finally(() => {
      setUnblockingUserId(null)
    })
  }

  const showUnblockConfirmation = (blockedUserId: string, userName: string) => {
    setShowUnblockModal({ show: true, userId: blockedUserId, userName })
  }


  const filteredUsers = blockedUsers.filter(user =>
    user.user_profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading && blockedUsers.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Loading blocked users..." />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div className="flex items-center space-x-2 md:space-x-3">
          <button
            onClick={onBack}
            className="flex items-center space-x-1 md:space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors text-sm md:text-base"
          >
            <ArrowLeft size={16} className="md:w-5 md:h-5" />
            <span>Back</span>
          </button>
          <div className="flex items-center space-x-2 md:space-x-3">
            <Shield size={20} className="text-red-600 md:w-6 md:h-6" />
            <h2 className="text-lg md:text-2xl font-bold text-gray-900">Blocked Users</h2>
          </div>
        </div>
        <span className="text-xs md:text-sm text-gray-600">{filteredUsers.length}</span>
      </div>

      {error && (
        <ErrorMessage
          message={error}
          onRetry={clearError}
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
      {/* Search */}
      <div className="mb-4 md:mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 md:top-3 h-4 w-4 md:h-5 md:w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search blocked users..."
            className="w-full pl-9 md:pl-10 pr-3 md:pr-4 py-2 md:py-3 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-3 md:p-6 mb-4 md:mb-6">
        <div className="flex items-start space-x-2 md:space-x-3">
          <Shield size={16} className="text-red-600 mt-0.5 md:w-5 md:h-5" />
          <div>
            <h3 className="font-semibold text-sm md:text-base text-red-900 mb-2">About Blocking</h3>
            <ul className="text-xs md:text-sm text-red-800 space-y-1">
              <li>• Can't send messages or see your trips/rides</li>
              <li>• Conversations hidden from messages</li>
              <li>• Can unblock anytime</li>
              <li>• Private - user won't be notified</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Blocked Users List */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield size={32} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {blockedUsers.length === 0 ? 'No Blocked Users' : 'No Matching Users'}
          </h3>
          <p className="text-gray-600">
            {blockedUsers.length === 0 
              ? 'You haven\'t blocked any users yet. You can block users from chat conversations.'
              : 'Try adjusting your search criteria.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {filteredUsers.map((blockedUser) => (
            <div
              key={blockedUser.id}
              className="border border-gray-200 rounded-xl p-3 md:p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 md:space-x-4 flex-1 min-w-0">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-red-600 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                    {blockedUser.user_profiles.profile_image_url ? (
                      <img
                        src={blockedUser.user_profiles.profile_image_url}
                        alt={blockedUser.user_profiles.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-semibold text-sm md:text-base">
                        {blockedUser.user_profiles.full_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm md:text-lg font-semibold text-gray-900 truncate">
                      {blockedUser.user_profiles.full_name}
                    </h3>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 text-xs md:text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Calendar size={10} className="md:w-3 md:h-3" />
                        <span>{formatDateSafe(blockedUser.created_at.split('T')[0])}</span>
                      </div>
                      {blockedUser.reason && (
                        <div className="flex items-center space-x-1 truncate">
                          <AlertTriangle size={10} className="md:w-3 md:h-3 shrink-0" />
                          <span className="truncate">{blockedUser.reason}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 md:space-x-3 shrink-0">
                  <div className="flex items-center space-x-1 bg-red-100 text-red-800 px-2 py-0.5 md:px-3 md:py-1 rounded-full text-xs font-medium">
                    <Shield size={10} className="md:w-3.5 md:h-3.5" />
                    <span className="hidden sm:inline">Blocked</span>
                  </div>

                  <button
                    onClick={() => showUnblockConfirmation(blockedUser.blocked_id, blockedUser.user_profiles.full_name)}
                    disabled={unblockingUserId === blockedUser.blocked_id}
                    className="flex items-center space-x-1 md:space-x-2 bg-green-600 hover:bg-green-700 text-white px-2 md:px-4 py-1 md:py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-xs md:text-sm"
                  >
                    {unblockingUserId === blockedUser.blocked_id ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-b-2 border-white"></div>
                        <span>Unblocking...</span>
                      </>
                    ) : (
                      <>
                        <MessageCircle size={12} className="md:w-4 md:h-4" />
                        <span>Unblock</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom Unblock Confirmation Modal */}
      {showUnblockModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle size={32} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Unblock User</h2>
              <p className="text-gray-600">
                Are you sure you want to unblock <strong>{showUnblockModal.userName}</strong>?
              </p>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-green-900 mb-2">What will happen:</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• They will be able to contact you again</li>
                <li>• They can see your new trips and rides</li>
                <li>• Previous conversations will be restored</li>
                <li>• They can request to join your rides/trips</li>
              </ul>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowUnblockModal({ show: false, userId: '', userName: '' })}
                className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUnblock(showUnblockModal.userId)}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Yes, Unblock User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}