import React, { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AuthForm from './components/Auth/AuthForm'
import ErrorBoundary from './components/ErrorBoundary'
import WelcomePopup from './components/WelcomePopup'
import PlatformSelector from './components/PlatformSelector'
import Dashboard from './components/Dashboard'
import CarDashboard from './components/CarDashboard'
import PostTrip from './components/PostTrip'
import FindTrip from './components/FindTrip'
import RequestTrip from './components/RequestTrip'
import PostRide from './components/PostRide'
import FindRide from './components/FindRide'
import UserProfile from './components/UserProfile'
import HelpPage from './components/HelpPage'
import Chat from './components/Chat'
import EditTrip from './components/EditTrip'
import EditRide from './components/EditRide'
import RequestRide from './components/RequestRide'
import Footer from './components/Footer'
import HowItWorksPage from './components/HowItWorksPage'
import ReviewsPage from './components/ReviewsPage'
import PrivacyPolicy from './components/PrivacyPolicy'
import TermsOfService from './components/TermsOfService'
import AutoExpiryService from './components/AutoExpiryService'
import { Trip, CarRide } from './types'
import WhatsAppChatButton from './components/WhatsAppChatButton'
import { createErrorMessage } from './utils/errorUtils'
import { User } from 'lucide-react'
import { popupManager } from './utils/popupManager'
import { setupGlobalErrorHandling } from './utils/errorReporting'

type AppView = 'platform-selector' | 'airport-dashboard' | 'car-dashboard' | 'post-trip' | 'find-trip' | 'request-trip' | 'post-ride' | 'find-ride' | 'request-ride' | 'profile' | 'help' | 'chat' | 'edit-trip' | 'edit-ride' | 'how-it-works' | 'reviews' | 'privacy-policy' | 'terms-of-service'

function AppContent() {
  const { user, loading, isGuest, setGuestMode } = useAuth()
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

  // Set up global error handling with user context
  React.useEffect(() => {
    if (user) {
      setupGlobalErrorHandling(user.id)
    }
  }, [user])
  // Global error handler
  const handleGlobalError = (error: Error, errorInfo: any) => {
    console.error('Global error caught by App ErrorBoundary:', error)
    // Error reporting is now handled automatically by ErrorBoundary component
  }

  // Check if user is visiting for the first time
  React.useEffect(() => {
    if ((user && !loading && !isGuest) || (!user && !loading && isGuest)) {
      if (popupManager.shouldShowWelcome(user?.id)) {
        setShowWelcomePopup(true)
      }
    }
  }, [user, loading, isGuest])

  const handleCloseWelcomePopup = () => {
    popupManager.markWelcomeShown(user?.id)
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
    // Reset all chat-related state to prevent stale state issues
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

  // Handle hash-based navigation for how it works
  React.useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#how-it-works') {
        setCurrentView('how-it-works')
        window.location.hash = '' // Clear the hash
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    // Check initial hash
    handleHashChange()

    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

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
      <ErrorBoundary onError={handleGlobalError}>
        <div className="min-h-screen flex flex-col">
          <div className="flex-1">
            {(() => {
              switch (currentView) {
                case 'platform-selector':
                  return (
                    <ErrorBoundary>
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
                    </ErrorBoundary>
                  )
                case 'airport-dashboard':
                  return (
                    <ErrorBoundary>
                      <Dashboard
                        onPostTrip={() => setCurrentView('post-trip')}
                        onFindTrip={() => setCurrentView('find-trip')}
                        onRequestTrip={() => setCurrentView('request-trip')}
                        onProfile={() => setCurrentView('profile')}
                        onBack={() => setCurrentView('platform-selector')}
                        onHelp={() => setCurrentView('help')}
                        onStartChat={handleStartChat}
                        onViewConfirmations={handleViewConfirmations}
                        isGuest={isGuest}
                      />
                    </ErrorBoundary>
                  )
                case 'car-dashboard':
                  return (
                    <ErrorBoundary>
                      <CarDashboard
                        onPostRide={() => setCurrentView('post-ride')}
                        onFindRide={() => setCurrentView('find-ride')}
                        onRequestRide={() => setCurrentView('request-ride')}
                        onProfile={() => setCurrentView('profile')}
                        onBack={() => setCurrentView('platform-selector')}
                        onStartChat={handleStartChat}
                        onViewConfirmations={handleViewConfirmations}
                        isGuest={isGuest}
                      />
                    </ErrorBoundary>
                  )
                case 'post-trip':
                  return (
                    <ErrorBoundary>
                      <PostTrip onBack={handleBackToAirportDashboard} isGuest={isGuest} />
                    </ErrorBoundary>
                  )
                case 'find-trip':
                  return (
                    <ErrorBoundary>
                      <FindTrip 
                        onBack={handleBackToAirportDashboard} 
                        onStartChat={handleStartChat}
                        isGuest={isGuest}
                      />
                    </ErrorBoundary>
                  )
                case 'request-trip':
                  return (
                    <ErrorBoundary>
                      <RequestTrip 
                        onBack={handleBackToAirportDashboard} 
                        isGuest={isGuest}
                      />
                    </ErrorBoundary>
                  )
                case 'post-ride':
                  return (
                    <ErrorBoundary>
                      <PostRide onBack={handleBackToCarDashboard} isGuest={isGuest} />
                    </ErrorBoundary>
                  )
                case 'find-ride':
                  return (
                    <ErrorBoundary>
                      <FindRide 
                        onBack={handleBackToCarDashboard} 
                        onStartChat={handleStartChat}
                        isGuest={isGuest}
                      />
                    </ErrorBoundary>
                  )
                case 'request-ride':
                  return (
                    <ErrorBoundary>
                      <RequestRide 
                        onBack={handleBackToCarDashboard} 
                        isGuest={isGuest}
                      />
                    </ErrorBoundary>
                  )
                case 'profile':
                  return (
                    <ErrorBoundary>
                      <UserProfile 
                        onBack={handleBackToDashboard} 
                        onStartChat={handleStartChat} 
                        onEditTrip={handleEditTrip} 
                        onEditRide={handleEditRide} 
                        initialTab={initialProfileTab} 
                      />
                    </ErrorBoundary>
                  )
                case 'help':
                  return (
                    <ErrorBoundary>
                      <HelpPage onBack={handleBackToDashboard} />
                    </ErrorBoundary>
                  )
                case 'how-it-works':
                  return (
                    <ErrorBoundary>
                      <HowItWorksPage onBack={handleBackToDashboard} />
                    </ErrorBoundary>
                  )
                case 'reviews':
                  return (
                    <ErrorBoundary>
                      <ReviewsPage onBack={handleBackToDashboard} />
                    </ErrorBoundary>
                  )
                case 'privacy-policy':
                  return (
                    <ErrorBoundary>
                      <PrivacyPolicy onBack={handleBackToDashboard} />
                    </ErrorBoundary>
                  )
                case 'terms-of-service':
                  return (
                    <ErrorBoundary>
                      <TermsOfService onBack={handleBackToDashboard} />
                    </ErrorBoundary>
                  )
                case 'chat':
                  return (
                    <ErrorBoundary>
                      <Chat
                        key={`chat-${chatUserId}`}
                        onBack={handleBackToDashboard}
                        otherUserId={chatUserId}
                        otherUserName={chatUserName}
                        preSelectedRide={selectedRideForChat}
                        preSelectedTrip={selectedTripForChat}
                      />
                    </ErrorBoundary>
                  )
                case 'edit-trip':
                  return editingTrip ? (
                    <ErrorBoundary>
                      <EditTrip onBack={handleBackToDashboard} trip={editingTrip} />
                    </ErrorBoundary>
                  ) : (
                    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center">
                      <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Error: No trip to edit</h2>
                        <button
                          onClick={handleBackToDashboard}
                          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                          Back to Dashboard
                        </button>
                      </div>
                    </div>
                  )
                case 'edit-ride':
                  return editingRide ? (
                    <ErrorBoundary>
                      <EditRide onBack={handleBackToDashboard} ride={editingRide} />
                    </ErrorBoundary>
                  ) : (
                    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center">
                      <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Error: No ride to edit</h2>
                        <button
                          onClick={handleBackToDashboard}
                          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                          Back to Dashboard
                        </button>
                      </div>
                    </div>
                  )
                default:
                  return (
                    <ErrorBoundary>
                      <PlatformSelector 
                        onSelectPlatform={(platform) => 
                          setCurrentView(platform === 'airport' ? 'airport-dashboard' : 'car-dashboard')
                        } 
                        onProfile={handleProfile} 
                        onHelp={handleHelp} 
                        onStartChat={handleStartChat} 
                        onViewConfirmations={handleViewConfirmations} 
                      />
                    </ErrorBoundary>
                  )
              }
            })()}
          </div>
          {/* Footer */}
          {(user || isGuest) && !['chat', 'edit-trip', 'edit-ride'].includes(currentView) && (
            <ErrorBoundary>
              <Footer 
                onHelp={handleHelp}
                onReviews={handleReviews}
                onHowItWorks={handleHowItWorks}
                onPrivacyPolicy={handlePrivacyPolicy}
                onTermsOfService={handleTermsOfService}
              />
            </ErrorBoundary>
          )}
        </div>
      </ErrorBoundary>
      <WhatsAppChatButton />
      <ErrorBoundary>
        <AutoExpiryService onExpiryProcessed={(count) => {
          // Handle cleanup silently in background
          if (count > 0) {
            console.log(`Background cleanup: processed ${count} expired confirmations`)
          }
        }} />
      </ErrorBoundary>
      
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
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  )
}