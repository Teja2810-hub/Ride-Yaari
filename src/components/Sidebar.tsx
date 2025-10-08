import React, { useEffect } from 'react'
import { X, HelpCircle, Bell, MessageCircle, Send, User, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  onHelp: () => void
  onProfile: () => void
  onNotifications: () => void
  onMessages: () => void
  onRideRequests: () => void
  onSignOut: () => void
}

export default function Sidebar({
  isOpen,
  onClose,
  onHelp,
  onProfile,
  onNotifications,
  onMessages,
  onRideRequests,
  onSignOut
}: SidebarProps) {
  const { userProfile } = useAuth()

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handleMenuItemClick = (action: () => void) => {
    action()
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      <div
        className={`fixed left-0 top-0 h-full w-80 max-w-[80vw] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600">
            <div className="flex items-center space-x-3">
              {userProfile?.profile_image_url ? (
                <img
                  src={userProfile.profile_image_url}
                  alt={userProfile.full_name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <span className="text-xl font-bold text-white">
                    {userProfile?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              <div className="text-white">
                <p className="text-xs opacity-90">Welcome back,</p>
                <p className="font-semibold text-sm truncate max-w-[150px]">
                  {userProfile?.full_name || 'User'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
              aria-label="Close sidebar"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-4">
            <div className="px-3 space-y-1">
              <button
                onClick={() => handleMenuItemClick(onHelp)}
                className="flex items-center space-x-3 w-full px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
              >
                <HelpCircle size={20} />
                <span className="font-medium">Help</span>
              </button>

              <div className="border-t border-gray-200 my-2"></div>

              <button
                onClick={() => handleMenuItemClick(onProfile)}
                className="flex items-center space-x-3 w-full px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
              >
                <User size={20} />
                <span className="font-medium">Profile</span>
              </button>

              <button
                onClick={() => handleMenuItemClick(onSignOut)}
                className="flex items-center space-x-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut size={20} />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </nav>

          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500 text-center">
              RideYaari &copy; {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
