import React, { useState } from 'react'
import { Shield, Trash2, AlertTriangle, MessageCircle, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { blockUser, deleteChatConversation } from '../utils/blockingHelpers'
import { useErrorHandler } from '../hooks/useErrorHandler'
import ErrorMessage from './ErrorMessage'

interface ChatBlockingControlsProps {
  otherUserId: string
  otherUserName: string
  onBlock?: () => void
  onDeleteChat?: () => void
}

export default function ChatBlockingControls({ 
  otherUserId, 
  otherUserName, 
  onBlock, 
  onDeleteChat 
}: ChatBlockingControlsProps) {
  const { user } = useAuth()
  const { error, isLoading, handleAsync, clearError } = useErrorHandler()
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [blockReason, setBlockReason] = useState('')

  const handleBlock = async () => {
    if (!user) return

    await handleAsync(async () => {
      const result = await blockUser(user.id, otherUserId, blockReason.trim() || undefined)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to block user')
      }

      setShowBlockModal(false)
      setBlockReason('')
      if (onBlock) onBlock()
    })
  }

  const handleDeleteChat = async () => {
    if (!user) return

    await handleAsync(async () => {
      const result = await deleteChatConversation(user.id, otherUserId)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete chat')
      }

      setShowDeleteModal(false)
      if (onDeleteChat) onDeleteChat()
    })
  }

  return (
    <>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setShowDeleteModal(true)}
          className="flex items-center space-x-1 text-gray-600 hover:text-red-600 transition-colors text-sm"
        >
          <Trash2 size={14} />
          <span>Delete Chat</span>
        </button>
        
        <button
          onClick={() => setShowBlockModal(true)}
          className="flex items-center space-x-1 text-gray-600 hover:text-red-600 transition-colors text-sm"
        >
          <Shield size={14} />
          <span>Block User</span>
        </button>
      </div>

      {error && (
        <ErrorMessage
          message={error}
          onDismiss={clearError}
          className="mt-4"
        />
      )}

      {/* Block User Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Shield size={20} className="text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Block User</h2>
              </div>
              <button
                onClick={() => setShowBlockModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Are you sure you want to block <strong>{otherUserName}</strong>?
              </p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle size={16} className="text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-900 mb-1">What happens when you block someone:</h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      <li>• They won't be able to send you messages</li>
                      <li>• They won't see your new trips or rides</li>
                      <li>• Existing conversations will be hidden</li>
                      <li>• You can unblock them anytime</li>
                      <li>• They won't be notified about being blocked</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (Optional)
                </label>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Why are you blocking this user? (for your reference)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors resize-none"
                  rows={3}
                  maxLength={200}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {blockReason.length}/200 characters
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowBlockModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBlock}
                disabled={isLoading}
                className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Blocking...' : 'Block User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Chat Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Trash2 size={20} className="text-orange-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Delete Chat</h2>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete your chat with <strong>{otherUserName}</strong>?
              </p>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle size={16} className="text-orange-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-orange-900 mb-1">What happens:</h4>
                    <ul className="text-sm text-orange-800 space-y-1">
                      <li>• The conversation will be hidden from your messages</li>
                      <li>• You can still receive new messages from this user</li>
                      <li>• The other user will still see the conversation</li>
                      <li>• You can restore the chat by messaging them again</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteChat}
                disabled={isLoading}
                className="flex-1 bg-orange-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Deleting...' : 'Delete Chat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blocked Users List */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Blocked Users ({filteredUsers.length})
        </h3>

        {filteredUsers.length === 0 ? (
          <div className="text-center py-8">
            <Shield size={32} className="text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              {blockedUsers.length === 0 ? 'No Blocked Users' : 'No Matching Users'}
            </h4>
            <p className="text-gray-600">
              {blockedUsers.length === 0 
                ? 'You haven\'t blocked anyone yet.'
                : 'Try adjusting your search criteria.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((blockedUser) => (
              <div
                key={blockedUser.id}
                className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center overflow-hidden">
                    {blockedUser.user_profiles.profile_image_url ? (
                      <img
                        src={blockedUser.user_profiles.profile_image_url}
                        alt={blockedUser.user_profiles.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-semibold text-sm">
                        {blockedUser.user_profiles.full_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {blockedUser.user_profiles.full_name}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Blocked {formatDate(blockedUser.created_at)}
                      {blockedUser.reason && ` • ${blockedUser.reason}`}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleUnblock(blockedUser.blocked_id)}
                  disabled={unblockingUserId === blockedUser.blocked_id}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
                >
                  {unblockingUserId === blockedUser.blocked_id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Unblocking...</span>
                    </>
                  ) : (
                    <>
                      <MessageCircle size={14} />
                      <span>Unblock</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}