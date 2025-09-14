import React from 'react'
import { HelpCircle, Star, Info, Heart } from 'lucide-react'

interface FooterProps {
  onHelp: () => void
  onReviews: () => void
  onHowItWorks: () => void
  onPrivacyPolicy?: () => void
  onTermsOfService?: () => void
}

export default function Footer({ onHelp, onReviews, onHowItWorks, onPrivacyPolicy, onTermsOfService }: FooterProps) {
  return (
    <footer className="bg-white border-t border-gray-200 mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="md:col-span-1">
            <h3 className="text-xl font-bold text-gray-900 mb-4">RideYaari</h3>
            <p className="text-gray-600 text-sm mb-4">
              Connect travelers worldwide for airport trips and car rides. Made in India with love.
            </p>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span className="text-lg">🇮🇳</span>
              <span>Proudly Made in India</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-1">
            <h4 className="font-semibold text-gray-900 mb-4">Quick Links</h4>
            <div className="space-y-3">
              <button
                onClick={() => {
                  onHowItWorks();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors text-sm"
              >
                <Info size={16} />
                <span>How It Works</span>
              </button>
              <button
                onClick={() => {
                  onReviews();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors text-sm"
              >
                <Star size={16} />
                <span>Reviews</span>
              </button>
              <button
                onClick={() => {
                  onHelp();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors text-sm"
              >
                <HelpCircle size={16} />
                <span>Help & Support</span>
              </button>
            </div>
          </div>

          {/* Services */}
          <div className="md:col-span-1">
            <h4 className="font-semibold text-gray-900 mb-4">Services</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <p>✈️ Airport Trips</p>
              <p>🚗 Car Rides</p>
              <p>📦 Package Delivery</p>
              <p>🤝 Travel Assistance</p>
              <p>👥 Airport Companionship</p>
            </div>
          </div>

          {/* Community */}
          <div className="md:col-span-1">
            <h4 className="font-semibold text-gray-900 mb-4">Community</h4>
            <p className="text-sm text-gray-600 mb-4">
              Join thousands of travelers who trust RideYaari for safe, affordable, and convenient travel connections.
            </p>
            <div className="flex items-center space-x-2 text-sm text-red-500">
              <Heart size={16} />
              <span>Free to use forever</span>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-200 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-gray-500">
              © 2025 RideYaari. All rights reserved.
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <button
                onClick={() => {
                  if (onPrivacyPolicy) onPrivacyPolicy()
                  if (typeof window !== 'undefined') {
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }
                }}
                className="hover:text-blue-600 transition-colors focus:outline-none"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => {
                  if (onTermsOfService) onTermsOfService()
                  if (typeof window !== 'undefined') {
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }
                }}
                className="hover:text-blue-600 transition-colors focus:outline-none"
              >
                Terms of Service
              </button>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }
                  onHelp()
                }}
                className="hover:text-blue-600 transition-colors focus:outline-none"
              >
                Contact Us
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}