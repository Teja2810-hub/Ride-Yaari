import React from 'react'
import { Plane, PlusCircle, Search, LogOut, User, ArrowLeft, HelpCircle, MessageCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import MessagesNotification from './MessagesNotification'
import ReviewDisplay from './ReviewDisplay'
import ConfirmationsNotification from './ConfirmationsNotification'

interface DashboardProps {
  onPostTrip: () => void
  onFindTrip: () => void
  onProfile: () => void
  onBack: () => void
  onHelp: () => void
  onStartChat?: (userId: string, userName: string) => void
  onViewConfirmations: () => void
  isGuest?: boolean
}

export default function Dashboard({ onPostTrip, onFindTrip, onProfile, onBack, onHelp, onStartChat, onViewConfirmations, isGuest = false }: DashboardProps) {
  const { userProfile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-neutral-bg">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-8 space-y-2 sm:space-y-0">
          <div></div>
          
          <div className="flex flex-wrap items-center justify-center gap-3 sm:space-x-6">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 px-4 py-2 text-accent-blue hover:text-accent-blue-hover font-medium transition-colors text-sm rounded-xl"
            >
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>
            <button
              onClick={onHelp}
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base"
            >
              <HelpCircle size={16} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Help</span>
            </button>
            {onStartChat && !isGuest && (
              <MessagesNotification onStartChat={onStartChat} />
            )}
            {!isGuest && (
              <>
                <ConfirmationsNotification onStartChat={onStartChat} onViewConfirmations={onViewConfirmations} />
                <button
                  onClick={onProfile}
                  className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base"
                >
                  <User size={16} className="sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Profile</span>
                </button>
                <div className="text-center sm:text-right">
                  <p className="text-xs sm:text-sm text-gray-600">Welcome back,</p>
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
              </>
            )}
            {isGuest && (
              <div className="text-center sm:text-right">
                <p className="text-xs sm:text-sm text-gray-600">Browsing as</p>
                <p className="font-semibold text-gray-900 text-sm sm:text-base">Guest</p>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-full sm:max-w-xl md:max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
              <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 text-white rounded-full mx-auto mb-2 sm:mb-4">
                <Plane size={20} className="sm:w-6 sm:h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Airport Trips</h1>
                <p className="text-sm sm:text-base text-gray-600 px-2">Share flight itineraries for deliveries and assistance</p>
              </div>
          </div>

          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 sm:mb-4 px-2">
              What would you like to do today?
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 px-2">
              Share your travel plans or find someone heading your way
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 px-2">
            {/* Post a Trip Card */}
            <div
              className="group cursor-pointer bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 p-4 sm:p-8"
              onClick={onPostTrip}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                  <PlusCircle size={28} className="sm:w-9 sm:h-9 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-4">Post a Trip</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 leading-relaxed">
                  Share your upcoming flight details and help fellow travelers with deliveries or pickups at airports
                </p>
                <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">
                  <p className="flex items-center justify-center">
                    <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                    Package delivery & pickup
                  </p>
                  <p className="flex items-center justify-center">
                    <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                    Travel assistance & companionship
                  </p>
                  <p className="flex items-center justify-center">
                    <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                    Elderly care support
                  </p>
                </div>
                <div className="inline-flex items-center text-blue-600 font-semibold group-hover:text-blue-700 text-sm sm:text-base">
                  Share Your Journey
                  <div className="ml-2 transform group-hover:translate-x-1 transition-transform">→</div>
                </div>
              </div>
            </div>

            {/* Find a Trip Card */}
            <div
              className="group cursor-pointer bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 p-4 sm:p-8"
              onClick={onFindTrip}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Search size={28} className="sm:w-9 sm:h-9 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-4">Find a Trip</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 leading-relaxed">
                  Search for travelers on routes you need and connect with them for convenient airport services
                </p>
                <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">
                  <p className="flex items-center justify-center">
                    <span className="w-2 h-2 bg-indigo-600 rounded-full mr-2"></span>
                    Find delivery services
                  </p>
                  <p className="flex items-center justify-center">
                    <span className="w-2 h-2 bg-indigo-600 rounded-full mr-2"></span>
                    Get travel assistance
                  </p>
                  <p className="flex items-center justify-center">
                    <span className="w-2 h-2 bg-indigo-600 rounded-full mr-2"></span>
                    Arrange companionship
                  </p>
                </div>
                <div className="inline-flex items-center text-indigo-600 font-semibold group-hover:text-indigo-700 text-sm sm:text-base">
                  Discover Travelers
                  <div className="ml-2 transform group-hover:translate-x-1 transition-transform">→</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 sm:mt-16 bg-white rounded-2xl shadow-lg p-4 sm:p-8 mx-2">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 text-center">How Airport Trips Work</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8">
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs sm:text-sm">1</span>
                  </div>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Share or Search</h4>
                <p className="text-gray-600 text-xs sm:text-sm">Post your flight details or search for travelers on your needed route</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs sm:text-sm">2</span>
                  </div>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Connect</h4>
                <p className="text-gray-600 text-xs sm:text-sm">Use our built-in chat to discuss details and arrange your service</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs sm:text-sm">3</span>
                  </div>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Complete</h4>
                <p className="text-gray-600 text-xs sm:text-sm">Meet at the airport and complete your delivery or pickup service</p>
              </div>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="mt-8 sm:mt-16 px-2">
            <ReviewDisplay title="Airport Trips Reviews" maxReviews={5} />
          </div>

        </div>
      </div>
    </div>
  )
}