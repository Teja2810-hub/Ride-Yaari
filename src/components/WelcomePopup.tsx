import React, { useState, useEffect } from 'react'
import { X, Heart } from 'lucide-react'

interface WelcomePopupProps {
  isOpen: boolean
  onClose: () => void
}

export default function WelcomePopup({ isOpen, onClose }: WelcomePopupProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card bg-gradient-to-br from-neutral-bg to-white shadow-2xl max-w-md w-full p-6 relative animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={24} />
        </button>

        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <span className="text-3xl mr-2">🇮🇳</span>
            <h2 className="text-2xl font-bold text-gray-900">Made in India</h2>
          </div>
          
          <p className="text-lg text-gray-700 mb-4">
            RideYaari is proudly developed in India with love and dedication to connect travelers worldwide.
          </p>
          
          <div className="bg-gradient-to-r from-orange-50 to-green-50 rounded-lg p-4 mb-6 border border-orange-200">
            <div className="flex items-center justify-center mb-3">
              <Heart size={20} className="text-red-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Help Us Grow! 🚀</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              RideYaari is completely <strong>free to use</strong> and grows stronger with every new user. 
              The more people who join our community, the better connections and opportunities we can create for everyone.
            </p>
            <p className="text-sm text-blue-600 font-medium mb-4">
              Please share RideYaari with your friends, family, and fellow travelers. 
              Together, we can build the world's most helpful travel community! ✈️🚗
            </p>
            
            {/* Share buttons */}
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => {
                  const url = encodeURIComponent(window.location.origin)
                  const text = encodeURIComponent('Check out RideYaari - Connect with travelers worldwide for airport trips and car rides!')
                  window.open(`https://wa.me/?text=${text}%20${url}`, '_blank')
                }}
                className="flex items-center justify-center px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm"
                title="Share on WhatsApp"
              >
                <span className="mr-1">📱</span>
                <span>WhatsApp</span>
              </button>
              
              <button
                onClick={() => {
                  const url = encodeURIComponent(window.location.origin)
                  window.open(`https://www.instagram.com/`, '_blank')
                }}
                className="flex items-center justify-center px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-colors text-sm"
                title="Share on Instagram"
              >
                <span className="mr-1">📷</span>
                <span>Instagram</span>
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
                className="flex items-center justify-center px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm"
                title="Share Link"
              >
                <span className="mr-1">🌐</span>
                <span>Share</span>
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Get Started with RideYaari
          </button>
        </div>
      </div>
    </div>
  )
}