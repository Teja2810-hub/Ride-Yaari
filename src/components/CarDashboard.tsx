import React from 'react'
import { Car, PlusCircle, Search, LogOut, User, ArrowLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import MessagesNotification from './MessagesNotification'
import ReviewDisplay from './ReviewDisplay'
import ConfirmationsNotification from './ConfirmationsNotification'

interface CarDashboardProps {
  onPostRide: () => void
  onFindRide: () => void
  onProfile: () => void
  onBack: () => void
  onStartChat?: (userId: string, userName: string) => void
  onViewConfirmations: () => void
  isGuest?: boolean
}

export default function CarDashboard({ onPostRide, onFindRide, onProfile, onBack, onStartChat, onViewConfirmations, isGuest = false }: CarDashboardProps) {
  const { userProfile, signOut, setGuestMode } = useAuth()

  return (
    <div className="min-h-screen bg-neutral-bg">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-8 space-y-2 sm:space-y-0">
          <div></div>
          
          <div className="flex flex-wrap items-center justify-center gap-3 sm:space-x-6">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 px-4 py-2 text-green-500 hover:text-green-600 font-medium transition-colors text-sm rounded-xl"
            >
              <ArrowLeft size={18} />
              <span>Back</span>
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
              <>
                <button
                  onClick={() => {
                    setGuestMode(false)
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium rounded-xl"
                >
                  <User size={18} />
                  <span>Sign Up</span>
                </button>
                <div className="text-center sm:text-right">
                  <p className="text-xs sm:text-sm text-gray-600">Browsing as</p>
                  <p className="font-semibold text-gray-900 text-sm sm:text-base">Guest</p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="max-w-full sm:max-w-xl md:max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
              <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-green-600 text-white rounded-full mx-auto mb-2 sm:mb-4">
                <Car size={20} className="sm:w-6 sm:h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Car Rides</h1>
                <p className="text-sm sm:text-base text-gray-600">Share rides, save money, help the environment</p>
              </div>
            </div>

          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 sm:mb-4 px-2">
              What would you like to do today?
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 px-2">
              Offer a ride or find someone to share the journey with
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 px-2">
            {/* Post a Ride Card */}
            <div
              className="group cursor-pointer bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 p-4 sm:p-8"
              onClick={() => setCurrentView('post-ride')}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-green-600 to-green-700 rounded-full flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                  <PlusCircle size={28} className="sm:w-9 sm:h-9 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-4">Post a Ride</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 leading-relaxed">
                  Share your car ride with other travelers to split costs and reduce environmental impact
                </p>
                <div className="inline-flex items-center text-green-600 font-semibold group-hover:text-green-700 text-sm sm:text-base">
                  Offer Your Ride
                  <div className="ml-2 transform group-hover:translate-x-1 transition-transform">→</div>
                </div>
              </div>
            </div>

            {/* Find a Ride Card */}
            <div
              className="group cursor-pointer bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 p-4 sm:p-8"
              onClick={onFindRide}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Search size={28} className="sm:w-9 sm:h-9 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-4">Find a Ride</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 leading-relaxed">
                  Search for available rides in your area and connect with drivers for affordable travel
                </p>
                <div className="inline-flex items-center text-emerald-600 font-semibold group-hover:text-emerald-700 text-sm sm:text-base">
                  Find Available Rides
                  <div className="ml-2 transform group-hover:translate-x-1 transition-transform">→</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 sm:mt-16 bg-white rounded-2xl shadow-lg p-4 sm:p-8 mx-2">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 text-center">How Car Rides Work</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8">
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs sm:text-sm">1</span>
                  </div>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Post or Search</h4>
                <p className="text-gray-600 text-xs sm:text-sm">Offer your ride or search for available rides on your route</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs sm:text-sm">2</span>
                  </div>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Connect</h4>
                <p className="text-gray-600 text-xs sm:text-sm">Use our secure chat to discuss pickup points and payment details</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs sm:text-sm">3</span>
                  </div>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Travel Together</h4>
                <p className="text-gray-600 text-xs sm:text-sm">Meet at the agreed location and enjoy cost-effective, eco-friendly travel</p>
              </div>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="mt-8 sm:mt-16 px-2">
            <ReviewDisplay title="Car Rides Reviews" maxReviews={5} />
          </div>

        </div>
      </div>
    </div>
  )
}