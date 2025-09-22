import React from 'react'
import { Plane, Car, User, HelpCircle, MessageCircle, Bell } from 'lucide-react'

interface PlatformSelectorProps {
  onSelectPlatform: (platform: 'airport' | 'car') => void
  onProfile: () => void
  onHelp: () => void
  onStartChat: (userId: string, userName: string) => void
  onViewConfirmations: () => void
  isGuest?: boolean
}

export default function PlatformSelector({
  onSelectPlatform,
  onProfile,
  onHelp,
  onStartChat,
  onViewConfirmations,
  isGuest = false
}: PlatformSelectorProps) {
  return (
    <div className="min-h-screen travel-bg flex flex-col">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">R</span>
              </div>
              <h1 className="text-2xl font-bold gradient-text">RideYaari</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {!isGuest && (
                <>
                  <button
                    onClick={onViewConfirmations}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View Confirmations"
                  >
                    <Bell size={20} />
                  </button>
                  <button
                    onClick={onProfile}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Profile"
                  >
                    <User size={20} />
                  </button>
                </>
              )}
              <button
                onClick={onHelp}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Help"
              >
                <HelpCircle size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h2 className="hero-title gradient-text mb-6">
              Choose Your Journey
            </h2>
            <p className="subtitle text-xl max-w-2xl mx-auto">
              Whether you're heading to the airport or exploring the city, 
              find your perfect ride companion
            </p>
          </div>

          {/* Platform Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Airport Rides */}
            <div 
              onClick={() => onSelectPlatform('airport')}
              className="card p-8 cursor-pointer group"
            >
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Plane size={40} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Airport Rides</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Share rides to and from the airport. Split costs, reduce traffic, 
                  and travel with fellow passengers on the same flight.
                </p>
                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Flight-based matching</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Cost sharing</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Verified travelers</span>
                  </div>
                </div>
              </div>
            </div>

            {/* City Rides */}
            <div 
              onClick={() => onSelectPlatform('car')}
              className="card p-8 cursor-pointer group"
            >
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Car size={40} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">City Rides</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Find rides within the city for daily commutes, events, or any destination. 
                  Connect with drivers and passengers in your area.
                </p>
                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Local connections</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Flexible timing</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Eco-friendly</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Guest Notice */}
          {isGuest && (
            <div className="mt-8 text-center">
              <div className="inline-flex items-center space-x-2 bg-amber-50 text-amber-800 px-4 py-2 rounded-lg border border-amber-200">
                <span className="text-sm">
                  You're browsing as a guest. Sign up to post rides and send messages.
                </span>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}