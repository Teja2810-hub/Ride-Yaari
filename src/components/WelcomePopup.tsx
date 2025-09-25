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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card bg-gradient-to-br from-neutral-bg to-white shadow-2xl max-w-sm w-full p-4 sm:p-6 relative animate-fade-in">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={24} />
        </button>

        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <span className="text-3xl mr-2">☕</span>
            <h2 className="text-xl font-bold text-gray-900">Support RideYaari</h2>
          </div>
          
          <p className="text-sm text-gray-700 mb-4">
            RideYaari is developed with love and dedication to connect travelers worldwide.
          </p>
          
          <div className="bg-gradient-to-r from-orange-50 to-green-50 rounded-lg p-4 mb-6 border border-orange-200">
            <div className="flex items-center justify-center mb-3">
              <Heart size={20} className="text-red-500 mr-2" />
              <h3 className="text-base font-semibold text-gray-900">Help Us Grow! 🚀</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              RideYaari is completely <strong>free to use</strong> and grows stronger with every new user. 
              The more people who join our community, the better connections and opportunities we can create for everyone.
            </p>
            <p className="text-xs text-blue-600 font-medium mb-4">
              Please share RideYaari with your friends, family, and fellow travelers. 
              Together, we can build the world's most helpful travel community! ✈️🚗
            </p>
            
            {/* Solo Developer Support Section */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-700 mb-2">
                <strong>I'm a solo developer</strong> - you can buy me a coffee below and help me!
              </p>
              <p className="text-xs text-gray-600 mb-3 italic">
                "A coffee a day keeps the homeless away" ☕
              </p>
              <div className="flex justify-center">
                <a 
                  href="https://www.buymeacoffee.com/rideyaari" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block hover:scale-105 transition-transform"
                >
                  <img 
                    src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=☕&slug=rideyaari&button_colour=FFDD00&font_colour=000000&font_family=Comic&outline_colour=000000&coffee_colour=ffffff" 
                    alt="Buy me a coffee"
                    className="h-10"
                  />
                </a>
              </div>
            </div>
            
            {/* Share buttons */}
            <div className="flex justify-center space-x-3">
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
                className="flex items-center justify-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm"
                title="Share Link"
              >
                <span className="mr-1">🌐</span>
                <span>Share RideYaari</span>
              </button>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Get Started with RideYaari
          </button>
        </div>
      </div>
    </div>
  )
}