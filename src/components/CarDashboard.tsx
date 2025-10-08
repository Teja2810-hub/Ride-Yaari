import React from 'react'
import { Car, CirclePlus as PlusCircle, Search, ArrowLeft, Send, Menu } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import ConfirmationExpiryBanner from './ConfirmationExpiryBanner'
import MessagesNotification from './MessagesNotification'
import ReviewDisplay from './ReviewDisplay'
import ConfirmationsNotification from './ConfirmationsNotification'
import NotificationBadge from './NotificationBadge'
import Sidebar from './Sidebar'

interface CarDashboardProps {
  onPostRide: () => void
  onFindRide: () => void
  onRequestRide: () => void
  onProfile: () => void
  onBack: () => void
  onStartChat?: (userId: string, userName: string) => void
  onViewConfirmations: () => void
  isGuest?: boolean
}

export default function CarDashboard({ onPostRide, onFindRide, onRequestRide, onProfile, onBack, onStartChat, onViewConfirmations, isGuest = false }: CarDashboardProps) {
  const { userProfile, signOut, setGuestMode } = useAuth()
  const [activeNotification, setActiveNotification] = React.useState<'messages' | 'notifications' | 'confirmations' | null>(null)
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  const handleStartChat = (userId: string, userName: string) => {
    setActiveNotification(null)
    if (onStartChat) {
      onStartChat(userId, userName)
    }
  }
  return (
    <div className="min-h-screen bg-neutral-bg travel-bg">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-8 space-y-2 sm:space-y-0">
          <div>
            {!isGuest && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:text-blue-700 font-medium transition-colors rounded-xl"
              >
                <Menu size={20} />
                <span className="hidden sm:inline">Menu</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:space-x-6">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 px-4 py-2 text-green-500 hover:text-green-600 font-medium transition-colors text-sm rounded-xl"
            >
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>
            {isGuest ? (
              <button
                onClick={() => setGuestMode(false)}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm"
              >
                Sign Up / Sign In
              </button>
            ) : (
              <>
                {onStartChat && (
                  <MessagesNotification
                    onStartChat={handleStartChat}
                    isOpen={activeNotification === 'messages'}
                    onOpen={() => setActiveNotification('messages')}
                    onClose={() => setActiveNotification(null)}
                  />
                )}
                <NotificationBadge
                  onStartChat={handleStartChat}
                  onViewConfirmations={onViewConfirmations}
                  isOpen={activeNotification === 'notifications'}
                  onOpen={() => setActiveNotification('notifications')}
                  onClose={() => setActiveNotification(null)}
                />
                <ConfirmationsNotification
                  onStartChat={handleStartChat}
                  onViewConfirmations={onViewConfirmations}
                  isOpen={activeNotification === 'confirmations'}
                  onOpen={() => setActiveNotification('confirmations')}
                  onClose={() => setActiveNotification(null)}
                />
                {userProfile?.profile_image_url && (
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden">
                    <img
                      src={userProfile.profile_image_url}
                      alt={userProfile.full_name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="max-w-full sm:max-w-xl md:max-w-4xl mx-auto">
          {/* Expiry Banner */}
          {!isGuest && <ConfirmationExpiryBanner onRefresh={() => {
            // Trigger a refresh of any confirmation-related data
            console.log('CarDashboard: Confirmation expiry triggered refresh')
          }} />}

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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {/* Post a Ride Card - FIRST */}
            <div
              className="group cursor-pointer bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 p-4 sm:p-8"
              onClick={onPostRide}
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

            {/* Find a Ride Card - SECOND */}
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

            {/* Request a Ride Card - THIRD */}
            <div
              className="group cursor-pointer bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 p-4 sm:p-8"
              onClick={onRequestRide}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Send size={28} className="sm:w-9 sm:h-9 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-4">Request a Ride</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 leading-relaxed">
                  Let drivers in your area know you need a ride and get notified when matching rides are posted
                </p>
                <div className="inline-flex items-center text-purple-600 font-semibold group-hover:text-purple-700 text-sm sm:text-base">
                  Request Your Ride
                  <div className="ml-2 transform group-hover:translate-x-1 transition-transform">→</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 sm:mt-16 bg-white rounded-2xl shadow-lg p-4 sm:p-8 mx-2">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 text-center">How Car Rides Work</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs sm:text-sm">1</span>
                  </div>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Request a Ride</h4>
                <p className="text-gray-600 text-xs sm:text-sm">Let drivers know you need a ride with your preferred route and timing</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs sm:text-sm">2</span>
                  </div>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Post Your Ride</h4>
                <p className="text-gray-600 text-xs sm:text-sm">Offer your ride to help others and split costs</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs sm:text-sm">3</span>
                  </div>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Connect</h4>
                <p className="text-gray-600 text-xs sm:text-sm">Use our secure chat to discuss pickup points and payment details</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs sm:text-sm">4</span>
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

      {!isGuest && (
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onHelp={() => {
            setSidebarOpen(false)
          }}
          onProfile={() => {
            setSidebarOpen(false)
            onProfile()
          }}
          onSignOut={() => {
            setSidebarOpen(false)
            signOut()
          }}
        />
      )}
    </div>
  )
}