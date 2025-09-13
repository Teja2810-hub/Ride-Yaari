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
    <div className="min-h-screen bg-neutral-bg">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 sm:mb-16 space-y-4 sm:space-y-0">
          <div></div>
          
          <div className="flex flex-wrap items-center justify-center gap-3 sm:space-x-6">
            <button
              onClick={onHelp}
              className="flex items-center space-x-2 px-4 py-2 text-text-secondary hover:text-text-primary transition-colors text-sm font-medium rounded-xl"
            >
              <HelpCircle size={18} />
              <span>Help</span>
            </button>
            <MessagesNotification onStartChat={onStartChat} />
            <button
              onClick={onProfile}
              className="flex items-center space-x-2 px-4 py-2 text-text-secondary hover:text-text-primary transition-colors text-sm font-medium rounded-xl"
            >
              <User size={18} />
              <span>Profile</span>
            </button>
            <div className="text-right">
              <p className="text-sm text-text-secondary font-light">Welcome,</p>
              <p className="font-semibold text-text-primary text-base truncate max-w-32">{userProfile?.full_name}</p>
            </div>
            {userProfile?.profile_image_url && (
              <div className="w-10 h-10 rounded-full overflow-hidden shadow-md">
                <img
                  src={userProfile.profile_image_url}
                  alt={userProfile.full_name}
                  className="w-full h-full object-cover"
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
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-16 sm:mb-24">
          <h1 className="hero-title text-5xl sm:text-6xl md:text-7xl gradient-text mb-6">
            RideYaari
          </h1>
          <p className="subtitle text-xl sm:text-2xl mb-12 max-w-3xl mx-auto font-light">
            Your global platform for sharing rides and airport trips
          </p>
          
          {/* Product Image */}
          <div className="mb-16">
            <div className="relative max-w-2xl mx-auto">
              <img
                src="https://placehold.co/800x500/f0f0f0/007aff?text=Connect+Travelers+Worldwide"
                alt="RideYaari Platform"
                className="w-full h-auto rounded-3xl shadow-2xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-3xl"></div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold text-text-primary mb-4">
              Choose Your Service
            </h2>
            <p className="text-lg sm:text-xl text-text-secondary font-light max-w-2xl mx-auto">
              Select the type of sharing service you need
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 mb-20">
            {/* Airport Trips Card */}
            <div
              onClick={() => onSelectPlatform('airport')}
              className="group cursor-pointer card p-8 sm:p-12"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 sm:w-28 sm:h-28 bg-gradient-to-r from-accent-blue to-blue-600 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500 shadow-lg">
                  <Plane size={32} className="sm:w-12 sm:h-12 text-white" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-4">Airport Trips</h3>
                <p className="text-base sm:text-lg text-text-secondary mb-8 leading-relaxed font-light max-w-md">
                  Share your flight itinerary with other travelers for convenient airport deliveries, pickups, or assistance services
                </p>
                <div className="space-y-3 text-sm text-text-secondary mb-8">
                  <p className="flex items-center justify-center">
                    <span className="w-2 h-2 bg-accent-blue rounded-full mr-3"></span>
                    Package delivery & pickup
                  </p>
                  <p className="flex items-center justify-center">
                    <span className="w-2 h-2 bg-accent-blue rounded-full mr-3"></span>
                    Travel assistance
                  </p>
                  <p className="flex items-center justify-center">
                    <span className="w-2 h-2 bg-accent-blue rounded-full mr-3"></span>
                    Airport companionship
                  </p>
                </div>
                <div className="inline-flex items-center text-accent-blue font-medium group-hover:text-accent-blue-hover text-base transition-colors">
                  Explore Airport Trips
                  <ArrowRight size={20} className="ml-3 transform group-hover:translate-x-2 transition-transform duration-300" />
                </div>
              </div>
            </div>

            {/* Car Rides Card */}
            <div
              onClick={() => onSelectPlatform('car')}
              className="group cursor-pointer card p-8 sm:p-12"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 sm:w-28 sm:h-28 bg-gradient-to-r from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500 shadow-lg">
                  <Car size={32} className="sm:w-12 sm:h-12 text-white" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-4">Car Rides</h3>
                <p className="text-base sm:text-lg text-text-secondary mb-8 leading-relaxed font-light max-w-md">
                  Find or offer car rides to share travel costs and reduce environmental impact through carpooling
                </p>
                <div className="space-y-3 text-sm text-text-secondary mb-8">
                  <p className="flex items-center justify-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    Cost-effective travel
                  </p>
                  <p className="flex items-center justify-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    Eco-friendly carpooling
                  </p>
                  <p className="flex items-center justify-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    Flexible scheduling
                  </p>
                </div>
                <div className="inline-flex items-center text-green-500 font-medium group-hover:text-green-600 text-base transition-colors">
                  Explore Car Rides
                  <ArrowRight size={20} className="ml-3 transform group-hover:translate-x-2 transition-transform duration-300" />
                </div>
              </div>
            </div>
          </div>

          {/* Why Choose Section */}
          <div className="card p-8 sm:p-12 mb-20">
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
                <h4 className="font-semibold text-text-primary mb-3 text-lg">Global Network</h4>
                <p className="text-text-secondary text-base font-light leading-relaxed">Connect with travelers and drivers worldwide for maximum convenience</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <div className="w-8 h-8 bg-accent-blue rounded-xl flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">3</span>
                  </div>
                </div>
                <h4 className="font-semibold text-text-primary mb-3 text-lg">Easy to Use</h4>
                <p className="text-text-secondary text-base font-light leading-relaxed">Intuitive interface makes posting and finding trips simple and fast</p>
              </div>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="mb-20">
            <ReviewDisplay title="What Our Community Says" maxReviews={6} />
          </div>
          
          {/* Call to Action */}
          <div className="text-center">
            <button className="btn-primary text-lg px-12 py-4">
              Get Started Today
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}