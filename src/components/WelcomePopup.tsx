import React, { useState, useEffect } from 'react'
import { X, Heart } from 'lucide-react'
import { popupManager } from '../utils/popupManager'
import { useAuth } from '../contexts/AuthContext'

interface WelcomePopupProps {
  isOpen: boolean
  onClose: () => void
}

export default function WelcomePopup({ isOpen, onClose }: WelcomePopupProps) {
  const { user } = useAuth()
  
  const handleGetStarted = () => {
    handleClose()
    // Navigate to how it works page
    window.location.hash = '#how-it-works'
  }
  
  // Check if welcome popup should be shown
  React.useEffect(() => {
    if (isOpen && !popupManager.shouldShowWelcome(user?.id)) {
      // If welcome shouldn't be shown, auto-close
      onClose()
      return
    }
  }, [isOpen, user?.id, onClose])

  const handleClose = () => {
    popupManager.markWelcomeShown(user?.id)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="card bg-gradient-to-br from-neutral-bg to-white shadow-2xl w-full max-w-xs sm:max-w-xl max-h-[90vh] sm:max-h-[80vh] p-4 sm:p-6 relative animate-fade-in overflow-y-auto">
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <X size={20} className="sm:w-6 sm:h-6" />
        </button>

        <div className="text-center">
          {/* <div className="flex items-center justify-center mb-4">
            <span className="text-2xl sm:text-3xl mr-2">☕</span>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Support RideYaari</h2>
          </div> */}

          <div className="bg-gradient-to-r from-orange-50 to-green-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 border border-orange-200">
            <div className="flex items-center justify-center mb-3">
              <Heart size={16} className="sm:w-5 sm:h-5 text-red-500 mr-2" />
              <h3 className="text-sm sm:text-base font-semibold text-gray-900">Help RideYaari Grow! 🚀</h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mb-3">
              RideYaari is completely <strong>free to use</strong> and grows stronger with every new user. 
              The more people who join our community, the better connections and opportunities we can create for everyone.
            </p>

            {/* Solo Developer Support Section and Action Buttons Side by Side */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 sm:p-3 mb-3 sm:mb-4">
              <p className="text-xs sm:text-sm text-gray-700 mb-2">
                <strong>I'm a solo developer</strong> -  My servers eat API calls for breakfast, lunch, and dinner—and I pay the bill. Coding at midnight, crying at sunrise. Help me survive the grind with a coffee? 🥲
              </p>
              <p className="text-xs text-gray-600 mb-2 sm:mb-3 italic">
                "A coffee a day keeps the homelessness away" ☕
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
                <a 
                  href="https://www.buymeacoffee.com/rideyaari" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block hover:scale-105 transition-transform w-full sm:w-40"
                >
                  <img 
                    src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=☕&slug=rideyaari&button_colour=FFDD00&font_colour=000000&font_family=Comic&outline_colour=000000&coffee_colour=ffffff" 
                    alt="Buy me a coffee"
                    className="h-8 sm:h-10 w-full object-contain"
                  />
                </a>
                <button
                  onClick={handleGetStarted}
                  className="flex items-center justify-center px-3 sm:px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-xs sm:text-sm font-medium w-full sm:w-40 min-w-[120px]"
                  title="Learn How RideYaari Works"
                >
                  <span className="mr-1">📚</span>
                  <span>How It Works</span>
                </button>
                <button
                  onClick={async () => {
                    if (navigator.share && navigator.canShare && navigator.canShare({
                      title: 'RideYaari',
                      text: 'Check out RideYaari - Connect with travelers worldwide!',
                      url: window.location.origin
                    })) {
                      try {
                        await navigator.share({
                          title: 'RideYaari',
                          text: 'Check out RideYaari - Connect with travelers worldwide!',
                          url: window.location.origin
                        })
                      } catch (error) {
                        navigator.clipboard.writeText(window.location.origin)
                        alert('Website link copied to clipboard!')
                      }
                    } else {
                      navigator.clipboard.writeText(window.location.origin)
                      alert('Website link copied to clipboard!')
                    }
                  }}
                  className="flex items-center justify-center px-3 sm:px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-xs sm:text-sm font-medium w-full sm:w-40 min-w-[120px]"
                  title="Share Link"
                >
                  <span className="mr-1">🌐</span>
                  <span>Share</span>
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-full bg-blue-600 text-white py-2 sm:py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm sm:text-base"
          >
            Get Started with RideYaari
          </button>
        </div>
      </div>
    </div>
  )
}