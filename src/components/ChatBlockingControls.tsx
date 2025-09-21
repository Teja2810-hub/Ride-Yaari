import React, { useState } from 'react'
import { Shield, Trash2, AlertTriangle, MessageCircle, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { blockUser, unblockUser, deleteChatConversation, isUserBlocked } from '../utils/blockingHelpers'
import { useErrorHandler } from '../hooks/useErrorHandler'
import ErrorMessage from './ErrorMessage'

interface ChatBlockingControlsProps {
  otherUserId: string
  otherUserName: string
  onBlock?: () => void
  onUnblock?: () => void
  onDeleteChat?: () => void
}

export default function ChatBlockingControls({ 
  otherUserId, 
  otherUserName, 
  onBlock, 
  onUnblock,
  onDeleteChat 
}: ChatBlockingControlsProps) {
  const { user } = useAuth()
  const { error, isLoading, handleAsync, clearError } = useErrorHandler()
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [showUnblockModal, setShowUnblockModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [blockReason, setBlockReason] = useState('')
  const [isBlocked, setIsBlocked] = useState(false)

  // Check blocking status on mount
  React.useEffect(() => {
    checkBlockingStatus()
  }, [user, otherUserId])

  const checkBlockingStatus = async () => {
    if (!user) return
    
    try {
      const blocked = await isUserBlocked(user.id, otherUserId)
      setIsBlocked(blocked)
    } catch (error) {
      console.error('Error checking blocking status:', error)
    }
  }

  const handleBlock = async () => {
    if (!user) return

    await handleAsync(async () => {
      const result = await blockUser(user.id, otherUserId, blockReason.trim() || undefined)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to block user')
      }

      setShowBlockModal(false)
      setBlockReason('')
      setIsBlocked(true)
      if (onBlock) onBlock()
    })
  }

  const handleUnblock = async () => {
    if (!user) return

    await handleAsync(async () => {
      const result = await unblockUser(user.id, otherUserId)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to unblock user')
      }

      setShowUnblockModal(false)
      setIsBlocked(false)
      if (onUnblock) onUnblock()
    })
  }
  const handleDeleteChat = async () => {
    if (!user) return

    await handleAsync(async () => {
      console.log('Attempting to delete chat between:', user.id, 'and', otherUserId)
      const result = await deleteChatConversation(user.id, otherUserId)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete chat')
      }

      console.log('Chat deletion successful')
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
        
        {isBlocked ? (
          <button
            onClick={() => setShowUnblockModal(true)}
            className="flex items-center space-x-1 text-gray-600 hover:text-green-600 transition-colors text-sm"
          >
            <Shield size={14} />
            <span>Unblock User</span>
          </button>
        ) : (
          <button
            onClick={() => setShowBlockModal(true)}
            className="flex items-center space-x-1 text-gray-600 hover:text-red-600 transition-colors text-sm"
          >
            <Shield size={14} />
            <span>Block User</span>
          </button>
        )}
      </div>

      {error && (
        <ErrorMessage
          message={error}
          onDismiss={clearError}
          className="mt-4"
        />
      )}

      {/* Unblock User Modal */}
      {showUnblockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Shield size={20} className="text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Unblock User</h2>
              </div>
              <button
                onClick={() => setShowUnblockModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Are you sure you want to unblock <strong>{otherUserName}</strong>?
              </p>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Shield size={16} className="text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-900 mb-1">What happens when you unblock:</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• They can send you messages again</li>
                      <li>• They can see your new trips and rides</li>
                      <li>• Previous conversations will be restored</li>
                      <li>• They can request to join your rides/trips</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowUnblockModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUnblock}
                disabled={isLoading}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Unblocking...' : 'Unblock User'}
              </button>
            </div>
          </div>
        </div>
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
    </>
  )
}