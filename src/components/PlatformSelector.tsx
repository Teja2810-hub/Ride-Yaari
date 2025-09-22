import React from 'react'
import { Plane, Car, ArrowRight, User, HelpCircle, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import MessagesNotification from './MessagesNotification'
import ReviewDisplay from './ReviewDisplay'
import ConfirmationsNotification from './ConfirmationsNotification'
import NotificationBadge from './NotificationBadge'

interface PlatformSelectorProps {
  onSelectPlatform: (platform: 'airport' | 'car') => void
  onProfile: () => void
  onHelp: () => void
  onStartChat: (userId: string, userName: string) => void
  onViewConfirmations: () => void
  isGuest?: boolean
}

export default function PlatformSelector({ onSelectPlatform, onProfile, onHelp, onStartChat, onViewConfirmations, isGuest = false }: PlatformSelectorProps) {
  const { userProfile, signOut, setGuestMode } = useAuth()

  return (
    <div className="min-h-screen bg-neutral-bg travel-bg">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
            className="group cursor-pointer card p-6 sm:p-8 min-h-[360px] sm:min-h-[400px] flex items-center justify-center hover:shadow-2xl"
          <div></div>
          
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-accent-blue to-blue-600 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
            {isGuest && (
              <button
                onClick={() => setGuestMode(false)}
              <p className="text-sm sm:text-base text-text-secondary mb-4 font-light max-w-xs leading-relaxed">
              >
                <User size={18} />
              <div className="space-y-2 text-sm text-text-secondary mb-6">
              </button>
            )}
            <button
              onClick={onHelp}
              className="flex items-center space-x-2 px-4 py-2 text-text-secondary hover:text-text-primary transition-colors text-sm font-medium rounded-xl"
            >
              <HelpCircle size={18} />
              <span>Help</span>
            </button>
            {!isGuest && (
              <>
                <NotificationBadge onStartChat={onStartChat} onViewConfirmations={onViewConfirmations} />
                <MessagesNotification onStartChat={onStartChat} />
                <ConfirmationsNotification onStartChat={onStartChat} onViewConfirmations={onViewConfirmations} />
                <button
                  onClick={onProfile}
                  className="flex items-center space-x-2 px-4 py-2 text-text-secondary hover:text-text-primary transition-colors text-sm font-medium rounded-xl"
                >
                  <User size={18} />
                  <span>Profile</span>
                </button>
                <div className="text-right">
                  <p className="text-sm text-text-secondary font-light">Welcome,</p>
            className="group cursor-pointer card p-6 sm:p-8 min-h-[360px] sm:min-h-[400px] flex items-center justify-center hover:shadow-2xl"
                </div>
                {userProfile?.profile_image_url && (
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <img
                      src={userProfile.profile_image_url}
                      alt={userProfile.full_name}
              <p className="text-sm sm:text-base text-text-secondary mb-4 font-light max-w-xs leading-relaxed">
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
              <div className="space-y-2 text-sm text-text-secondary mb-6">
                    />
                  </div>
                )}
                <button
                  onClick={signOut}
                  className="flex items-center space-x-2 px-4 py-2 text-text-secondary hover:text-text-primary transition-colors text-sm font-medium rounded-xl"
                >
                  <LogOut size={18} />
                  <span>Sign Out</span>
                </button>
              </>
            )}
            {isGuest && (
              <div className="text-center sm:text-right">
                <p className="text-sm text-text-secondary font-light">Browsing as</p>
                <p className="font-semibold text-text-primary text-base">Guest</p>
              </div>
            )}
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="hero-title text-3xl sm:text-4xl md:text-5xl gradient-text mb-2">
            RideYaari
          </h1>
          <p className="subtitle text-lg sm:text-xl mb-1 max-w-3xl mx-auto font-light whitespace-nowrap">
            Your global platform for sharing rides and airport trips
          </p>
          {/* Product Image
          <div className="mb-16">
            <div className="relative max-w-2xl mx-auto">
              <img
                src="https://placehold.co/800x500/f0f0f0/007aff?text=Connect+Travelers+Worldwide"
                alt="RideYaari Platform"
                className="w-full h-auto rounded-3xl shadow-2xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-3xl"></div>
            </div>
          </div> */}
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-semibold text-text-primary mb-1 sm:mb-2">
              Choose Your Service
            </h2>
            <p className="text-sm sm:text-base text-text-secondary font-light max-w-xl mx-auto mb-0">
              Select the type of sharing service you need
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-14 mb-10">
            {/* Airport Trips Card */}
            <div
              onClick={() => onSelectPlatform('airport')}
              className="group cursor-pointer card p-4 sm:p-6 min-h-[320px] sm:min-h-[360px] flex items-center justify-center"
            >
              <div className="flex flex-col items-center text-center w-full">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-accent-blue to-blue-600 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-300 shadow-md">
                  <Plane size={20} className="sm:w-8 sm:h-8 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-text-primary mb-2">Airport Trips</h3>
                <p className="text-sm sm:text-base text-text-secondary mb-3 font-light max-w-xs">
                  Share your flight itinerary for airport deliveries, pickups, or assistance
                </p>
                <div className="space-y-2 text-sm text-text-secondary mb-3">
                  <p className="flex items-center justify-center">
                    <span className="w-2 h-2 bg-accent-blue rounded-full mr-2"></span>
                    Package delivery & pickup
                  </p>
                  <p className="flex items-center justify-center">
                    <span className="w-2 h-2 bg-accent-blue rounded-full mr-2"></span>
                    Travel assistance
                  </p>
                  <p className="flex items-center justify-center">
                    <span className="w-2 h-2 bg-accent-blue rounded-full mr-2"></span>
                    Airport companionship
                  </p>
                </div>
                <div className="inline-flex items-center text-accent-blue font-medium group-hover:text-accent-blue-hover text-base transition-colors">
                  Explore Airport Trips
                  <ArrowRight size={16} className="ml-2 transform group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </div>
            </div>

            {/* Car Rides Card */}
            <div
              onClick={() => onSelectPlatform('car')}
              className="group cursor-pointer card p-4 sm:p-6 min-h-[320px] sm:min-h-[360px] flex items-center justify-center"
            >
              <div className="flex flex-col items-center text-center w-full">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-300 shadow-md">
                  <Car size={20} className="sm:w-8 sm:h-8 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-text-primary mb-2">Car Rides</h3>
                <p className="text-sm sm:text-base text-text-secondary mb-3 font-light max-w-xs">
                  Find or offer car rides to share travel costs and reduce environmental impact
                </p>
                <div className="space-y-2 text-sm text-text-secondary mb-3">
                  <p className="flex items-center justify-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Cost-effective travel
                  </p>
                  <p className="flex items-center justify-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Eco-friendly carpooling
                  </p>
                  <p className="flex items-center justify-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Flexible scheduling
                  </p>
                </div>
                <div className="inline-flex items-center text-green-500 font-medium group-hover:text-green-600 text-base transition-colors">
                  Explore Car Rides
                  <ArrowRight size={16} className="ml-2 transform group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </div>
            </div>
          </div>

          {/* Why Choose Section */}
          <div className="card p-8 sm:p-12 mb-20 mt-16 sm:mt-24">
            <h3 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-12 text-center">Why Choose RideYaari?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <div className="w-8 h-8 bg-accent-blue rounded-xl flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">1</span>
                  </div>
                </div>
                <h4 className="font-semibold text-text-primary mb-3 text-lg">Safe & Secure</h4>
                <p className="text-text-secondary text-base font-light leading-relaxed">All communications happen within our secure platform with user verification</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <div className="w-8 h-8 bg-accent-blue rounded-xl flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">2</span>
                  </div>
                </div>
        <div className="card p-10 sm:p-16 mb-20 mt-16 sm:mt-24">
                <p className="text-text-secondary text-base font-light leading-relaxed">Connect with travelers and drivers worldwide for maximum convenience</p>
              </div>
              <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <div className="w-10 h-10 bg-accent-blue rounded-2xl flex items-center justify-center shadow-md">
                    <span className="text-white font-semibold text-sm">3</span>
                  </div>
                </div>
                <h4 className="font-semibold text-text-primary mb-3 text-lg">Easy to Use</h4>
                <p className="text-text-secondary text-base font-light leading-relaxed">Intuitive interface makes posting and finding trips simple and fast</p>
              </div>
            </div>
              <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <div className="w-10 h-10 bg-accent-blue rounded-2xl flex items-center justify-center shadow-md">
          {/* Reviews Section */}
          <div className="mb-20">
            <ReviewDisplay title="What Our Community Says" maxReviews={6} />
          </div>
          
          {/* Call to Action */}
          <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <div className="w-10 h-10 bg-accent-blue rounded-2xl flex items-center justify-center shadow-md">
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Get Started Today
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}