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

type AppView = 'platform-selector' | 'airport-dashboard' | 'car-dashboard' | 'post-trip' | 'find-trip' | 'post-ride' | 'find-ride' | 'profile' | 'help' | 'chat' | 'edit-trip' | 'edit-ride' | 'how-it-works' | 'reviews' | 'privacy-policy' | 'terms-of-service'

function AppContent() {
  const { user, loading } = useAuth()
  const [currentView, setCurrentView] = useState<AppView>('platform-selector')
  const [showWelcomePopup, setShowWelcomePopup] = useState<boolean>(false)
  const [chatUserId, setChatUserId] = useState<string>('')
  const [chatUserName, setChatUserName] = useState<string>('')
  const [selectedRideForChat, setSelectedRideForChat] = useState<CarRide | null>(null)
  const [selectedTripForChat, setSelectedTripForChat] = useState<Trip | null>(null)
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)
  const [editingRide, setEditingRide] = useState<CarRide | null>(null)

  // Check if user is visiting for the first time
  React.useEffect(() => {
    if (user && !loading) {
      const hasVisited = localStorage.getItem('rideyaari-visited')
      if (!hasVisited) {
        setShowWelcomePopup(true)
        localStorage.setItem('rideyaari-visited', 'true')
      }
    }
  }, [user, loading])

  const handleCloseWelcomePopup = () => {
    setShowWelcomePopup(false)
  }

  const handleStartChat = (userId: string, userName: string, ride?: CarRide, trip?: Trip) => {
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
    setCurrentView('profile')
  }

  const handleHelp = () => {
    setCurrentView('help')
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

  if (!user) {
    return (
      <>
        <AuthForm />
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
                  />
                )
              case 'post-trip':
                return <PostTrip onBack={handleBackToAirportDashboard} />
              case 'find-trip':
                return (
                  <FindTrip 
                    onBack={handleBackToAirportDashboard} 
                    onStartChat={handleStartChat}
                  />
                )
              case 'post-ride':
                return <PostRide onBack={handleBackToCarDashboard} />
              case 'find-ride':
                return (
                  <FindRide 
                    onBack={handleBackToCarDashboard} 
                    onStartChat={handleStartChat}
                  />
                )
              case 'profile':
                return <UserProfile onBack={handleBackToDashboard} onStartChat={handleStartChat} onEditTrip={handleEditTrip} onEditRide={handleEditRide} />
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
                } onProfile={handleProfile} onHelp={handleHelp} onStartChat={handleStartChat} />
            }
          })()}
        </div>
        {/* Footer */}
        {user && !['chat', 'edit-trip', 'edit-ride'].includes(currentView) && (
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