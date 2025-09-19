import React, { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AuthForm from './components/Auth/AuthForm'
import WelcomePopup from './components/WelcomePopup'
import PlatformSelector from './components/PlatformSelector'
import Dashboard from './components/Dashboard'
import CarDashboard from './components/CarDashboard'
import PostTrip from './components/PostTrip'
import FindTrip from './components/FindTrip'
import PostRide from './components/PostRide'
import FindRide from './components/FindRide'
import UserProfile from './components/UserProfile'
import HelpPage from './components/HelpPage'
import Chat from './components/Chat'
import EditTrip from './components/EditTrip'
import EditRide from './components/EditRide'
import Footer from './components/Footer'
import HowItWorksPage from './components/HowItWorksPage'
import ReviewsPage from './components/ReviewsPage'
import PrivacyPolicy from './components/PrivacyPolicy'
import TermsOfService from './components/TermsOfService'
import { Trip, CarRide } from './types'
import WhatsAppChatButton from './components/WhatsAppChatButton'
import { User } from 'lucide-react'

type AppView = 'platform-selector' | 'airport-dashboard' | 'car-dashboard' | 'post-trip' | 'find-trip' | 'post-ride' | 'find-ride' | 'profile' | 'help' | 'chat' | 'edit-trip' | 'edit-ride' | 'how-it-works' | 'reviews' | 'privacy-policy' | 'terms-of-service'

function AppContent() {
  const { user, loading, isGuest } = useAuth()
  const [currentView, setCurrentView] = useState<AppView>('platform-selector')
  const [showWelcomePopup, setShowWelcomePopup] = useState<boolean>(false)
  const [chatUserId, setChatUserId] = useState<string>('')
  const [chatUserName, setChatUserName] = useState<string>('')
  const [selectedRideForChat, setSelectedRideForChat] = useState<CarRide | null>(null)
  const [selectedTripForChat, setSelectedTripForChat] = useState<Trip | null>(null)
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)
  const [editingRide, setEditingRide] = useState<CarRide | null>(null)
  const [initialProfileTab, setInitialProfileTab] = useState<string | undefined>(undefined)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)

  // Check if user is visiting for the first time
  React.useEffect(() => {
    if ((user && !loading && !isGuest) || (!user && !loading && isGuest)) {
      const hasVisited = localStorage.getItem('rideyaari-visited')
      if (!hasVisited) {
        setShowWelcomePopup(true)
        localStorage.setItem('rideyaari-visited', 'true')
      }
    }
  }, [user, loading, isGuest])

  const handleCloseWelcomePopup = () => {
    setShowWelcomePopup(false)
  }

  const handleStartChat = (userId: string, userName: string, ride?: CarRide, trip?: Trip) => {
    if (isGuest) {
      setShowAuthPrompt(true)
      return
    }
    setChatUserId(userId)
    setChatUserName(userName)
    setSelectedRideForChat(ride || null)
    setSelectedTripForChat(trip || null)
    setCurrentView('chat')
  }

  const handleBackToDashboard = () => {
    setCurrentView('platform-selector')
    setChatUserId('')
    setChatUserName('')
    setSelectedRideForChat(null)
    setSelectedTripForChat(null)
    setEditingTrip(null)
    setEditingRide(null)
    setInitialProfileTab(undefined)
  }

  const handleEditTrip = (trip: Trip) => {
    setEditingTrip(trip)
    setCurrentView('edit-trip')
  }

  const handleEditRide = (ride: CarRide) => {
    setEditingRide(ride)
    setCurrentView('edit-ride')
  }

  const handleBackToAirportDashboard = () => {
    setCurrentView('airport-dashboard')
  }

  const handleBackToCarDashboard = () => {
    setCurrentView('car-dashboard')
  }

  const handleProfile = () => {
    if (isGuest) {
      setShowAuthPrompt(true)
      return
    }
    setCurrentView('profile')
  }

  const handleHelp = () => {
    setCurrentView('help')
  }

  const handleViewConfirmations = () => {
    if (isGuest) {
      setShowAuthPrompt(true)
      return
    }
    setCurrentView('profile')
    setInitialProfileTab('confirmations')
  }
  const handleHowItWorks = () => {
    setCurrentView('how-it-works')
  }

  const handleReviews = () => {
    setCurrentView('reviews')
  }

  const handlePrivacyPolicy = () => {
    setCurrentView('privacy-policy')
  }

  const handleTermsOfService = () => {
    setCurrentView('terms-of-service')
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading RideYaari...</p>
        </div>
      </div>
    )
  }

  if (!user && !isGuest) {
    return (
      <>
        <AuthForm onClose={() => {}} />
        <WhatsAppChatButton />
      </>
    )
  }

  return (
    <>
      <WelcomePopup 
        isOpen={showWelcomePopup} 
        onClose={handleCloseWelcomePopup} 
      />
      <div className="min-h-screen flex flex-col">
        <div className="flex-1">
          {(() => {
            switch (currentView) {
              case 'platform-selector':
                return (
                  <PlatformSelector 
                    onSelectPlatform={(platform) => 
                      setCurrentView(platform === 'airport' ? 'airport-dashboard' : 'car-dashboard')
                    }
                    onProfile={handleProfile}
                    onHelp={handleHelp}
                    onStartChat={handleStartChat}
                    onViewConfirmations={handleViewConfirmations}
                    isGuest={isGuest}
                  />
                )
              case 'airport-dashboard':
                return (
                  <Dashboard
                    onPostTrip={() => setCurrentView('post-trip')}
                    onFindTrip={() => setCurrentView('find-trip')}
                    onProfile={() => setCurrentView('profile')}
                    onBack={() => setCurrentView('platform-selector')}
                    onHelp={() => setCurrentView('help')}
                    onStartChat={handleStartChat}
                    onViewConfirmations={handleViewConfirmations}
                    isGuest={isGuest}
                  />
                )
              case 'car-dashboard':
                return (
                  <CarDashboard
                    onPostRide={() => setCurrentView('post-ride')}
                    onFindRide={() => setCurrentView('find-ride')}
                    onProfile={() => setCurrentView('profile')}
                    onBack={() => setCurrentView('platform-selector')}
                    onStartChat={handleStartChat}
                    onViewConfirmations={handleViewConfirmations}
                    isGuest={isGuest}
                  />
                )
              case 'post-trip':
                return <PostTrip onBack={handleBackToAirportDashboard} isGuest={isGuest} />
              case 'find-trip':
                return (
                  <FindTrip 
                    onBack={handleBackToAirportDashboard} 
                    onStartChat={handleStartChat}
                    isGuest={isGuest}
                  />
                )
              case 'post-ride':
                return <PostRide onBack={handleBackToCarDashboard} isGuest={isGuest} />
              case 'find-ride':
                return (
                  <FindRide 
                    onBack={handleBackToCarDashboard} 
                    onStartChat={handleStartChat}
                    isGuest={isGuest}
                  />
                )
              case 'profile':
                return <UserProfile onBack={handleBackToDashboard} onStartChat={handleStartChat} onEditTrip={handleEditTrip} onEditRide={handleEditRide} initialTab={initialProfileTab} />
              case 'help':
                return <HelpPage onBack={handleBackToDashboard} />
              case 'how-it-works':
                return <HowItWorksPage onBack={handleBackToDashboard} />
              case 'reviews':
                return <ReviewsPage onBack={handleBackToDashboard} />
              case 'privacy-policy':
                return <PrivacyPolicy onBack={handleBackToDashboard} />
              case 'terms-of-service':
                return <TermsOfService onBack={handleBackToDashboard} />
              case 'chat':
                return (
                  <Chat
                    onBack={handleBackToDashboard}
                    otherUserId={chatUserId}
                    otherUserName={chatUserName}
                    preSelectedRide={selectedRideForChat}
                    preSelectedTrip={selectedTripForChat}
                  />
                )
              case 'edit-trip':
                return editingTrip ? (
                  <EditTrip onBack={handleBackToDashboard} trip={editingTrip} />
                ) : (
                  <div>Error: No trip to edit</div>
                )
              case 'edit-ride':
                return editingRide ? (
                  <EditRide onBack={handleBackToDashboard} ride={editingRide} />
                ) : (
                  <div>Error: No ride to edit</div>
                )
              default:
                return <PlatformSelector onSelectPlatform={(platform) => 
                  setCurrentView(platform === 'airport' ? 'airport-dashboard' : 'car-dashboard')
                } onProfile={handleProfile} onHelp={handleHelp} onStartChat={handleStartChat} onViewConfirmations={handleViewConfirmations} />
            }
          })()}
        </div>
        {/* Footer */}
        {(user || isGuest) && !['chat', 'edit-trip', 'edit-ride'].includes(currentView) && (
          <Footer 
            onHelp={handleHelp}
            onReviews={handleReviews}
            onHowItWorks={handleHowItWorks}
            onPrivacyPolicy={handlePrivacyPolicy}
            onTermsOfService={handleTermsOfService}
          />
        )}
      </div>
      <WhatsAppChatButton />
      <AutoExpiryService onExpiryProcessed={(count) => console.log(`Auto-expired ${count} confirmations`)} />
      
      {/* Auth Prompt Modal */}
      {showAuthPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User size={32} className="text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign Up Required</h2>
              <p className="text-gray-600">
                To post rides or send messages, you need to create an account or sign in. It's quick and free!
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowAuthPrompt(false)
                  setGuestMode(false)
                }}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Sign Up / Sign In
              </button>
              <button
                onClick={() => setShowAuthPrompt(false)}
                className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}