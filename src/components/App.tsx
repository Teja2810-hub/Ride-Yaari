import EditRide from './components/EditRide'
import Footer from './components/Footer'
import HowItWorksPage from './components/HowItWorksPage'
import ReviewsPage from './components/ReviewsPage'
import PrivacyPolicy from './components/PrivacyPolicy'
import TermsOfService from './components/TermsOfService'
import AutoExpiryService from './components/AutoExpiryService'
import UserConfirmationsContent from './components/UserConfirmationsContent'
import { Trip, CarRide } from './types'
import WhatsAppChatButton from './components/WhatsAppChatButton'
import { createErrorMessage } from './utils/errorUtils'
import { User } from 'lucide-react'

type AppView = 'platform-selector' | 'airport-dashboard' | 'car-dashboard' | 'post-trip' | 'find-trip' | 'post-ride' | 'find-ride' | 'profile' | 'help' | 'chat' | 'edit-trip' | 'edit-ride' | 'how-it-works' | 'reviews' | 'privacy-policy' | 'terms-of-service' | 'confirmations'

function AppContent() {
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
                case 'confirmations':
                  return (
                    <ErrorBoundary>
                      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
                        <div className="container mx-auto max-w-6xl">
                          <div className="mb-6">
                            <button
                              onClick={handleBackToDashboard}
                              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                            >
                              <ArrowLeft size={20} />
                              <span>Back to Dashboard</span>
                            </button>
                          </div>
                          <div className="bg-white rounded-2xl shadow-xl p-8">
                            <div className="mb-6">
                              <h1 className="text-2xl font-bold text-gray-900 mb-2">Ride Confirmations</h1>
                              <p className="text-gray-600">
                                Manage your ride requests and confirmations. View pending requests, accepted rides, and handle cancellations.
                              </p>
                            </div>
                            <UserConfirmationsContent onStartChat={handleStartChat} />
                          </div>
                        </div>
                      </div>
                    </ErrorBoundary>
                  )
                case 'help':
  const handleViewConfirmations = () => {
    if (isGuest) {
      setShowAuthPrompt(true)
      return
    }
    setCurrentView('confirmations')
  }