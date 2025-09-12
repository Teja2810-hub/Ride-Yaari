import React from 'react'
import { Plane, Car, ArrowRight, User, HelpCircle, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import MessagesNotification from './MessagesNotification'
import ReviewDisplay from './ReviewDisplay'

interface PlatformSelectorProps {
  onSelectPlatform: (platform: 'airport' | 'car') => void
  onProfile: () => void
  onHelp: () => void
  onStartChat: (userId: string, userName: string) => void
}

export default function PlatformSelector({ onSelectPlatform, onProfile, onHelp, onStartChat }: PlatformSelectorProps) {
  const { userProfile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-8 space-y-2 sm:space-y-0">
          <div></div>
          
          <div className="flex flex-wrap items-center justify-center gap-2 sm:space-x-4">
            <button
              onClick={onHelp}
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base"
            >
              <HelpCircle size={16} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Help</span>
            </button>
            <MessagesNotification onStartChat={onStartChat} />
            <button
              onClick={onProfile}
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base"
            >
              <User size={16} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Profile</span>
            </button>
            <div className="text-center sm:text-right">
              <p className="text-xs sm:text-sm text-gray-600">Welcome,</p>
              <p className="font-semibold text-gray-900 text-sm sm:text-base truncate max-w-24 sm:max-w-none">{userProfile?.full_name}</p>
            </div>
            {userProfile?.profile_image_url && (
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden">
                <img
                  src={userProfile.profile_image_url}
                  alt={userProfile.full_name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <button
              onClick={signOut}
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base"
            >
              <LogOut size={16} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-2 sm:mb-4">RideYaari</h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-4 sm:mb-8 px-2">
            Your global platform for sharing rides and airport trips
          </p>
        </div>

        <div className="max-w-full sm:max-w-xl md:max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-4 px-2">
              Choose Your Service
            </h2>
            <p className="text-base sm:text-lg text-gray-600 px-2">
              Select the type of sharing service you need
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 px-2">
            {/* Airport Trips Card */}
            <div
              onClick={() => onSelectPlatform('airport')}
              className="group cursor-pointer bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 p-4 sm:p-8"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Plane size={28} className="sm:w-10 sm:h-10 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-4">Airport Trips</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 leading-relaxed">
                  Share your flight itinerary with other travelers for convenient airport deliveries, pickups, or assistance services
                </p>
                <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">
                  <p className="flex items-center justify-center">
                    <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                    Package delivery & pickup
                  </p>
                  <p className="flex items-center justify-center">
                    <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                    Travel assistance
                  </p>
                  <p className="flex items-center justify-center">
                    <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                    Airport companionship
                  </p>
                </div>
                <div className="inline-flex items-center text-blue-600 font-semibold group-hover:text-blue-700 text-sm sm:text-base">
                  Explore Airport Trips
                  <ArrowRight size={16} className="sm:w-5 sm:h-5 ml-2 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            {/* Car Rides Card */}
            <div
              onClick={() => onSelectPlatform('car')}
              className="group cursor-pointer bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 p-4 sm:p-8"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-r from-green-600 to-green-700 rounded-full flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Car size={28} className="sm:w-10 sm:h-10 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-4">Car Rides</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 leading-relaxed">
                  Find or offer car rides to share travel costs and reduce environmental impact through carpooling
                </p>
                <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">
                  <p className="flex items-center justify-center">
                    <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                    Cost-effective travel
                  </p>
                  <p className="flex items-center justify-center">
                    <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                    Eco-friendly carpooling
                  </p>
                  <p className="flex items-center justify-center">
                    <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                    Flexible scheduling
                  </p>
                </div>
                <div className="inline-flex items-center text-green-600 font-semibold group-hover:text-green-700 text-sm sm:text-base">
                  Explore Car Rides
                  <ArrowRight size={16} className="sm:w-5 sm:h-5 ml-2 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 sm:mt-16 bg-white rounded-2xl shadow-lg p-4 sm:p-8 mx-2">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 text-center">Why Choose RideYaari?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8">
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs sm:text-sm">1</span>
                  </div>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Safe & Secure</h4>
                <p className="text-gray-600 text-xs sm:text-sm">All communications happen within our secure platform with user verification</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs sm:text-sm">2</span>
                  </div>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Global Network</h4>
                <p className="text-gray-600 text-xs sm:text-sm">Connect with travelers and drivers worldwide for maximum convenience</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs sm:text-sm">3</span>
                  </div>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Easy to Use</h4>
                <p className="text-gray-600 text-xs sm:text-sm">Intuitive interface makes posting and finding trips simple and fast</p>
              </div>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="mt-8 sm:mt-16 px-2">
            <ReviewDisplay title="What Our Community Says" maxReviews={6} />
          </div>
        </div>
      </div>
    </div>
  )
}