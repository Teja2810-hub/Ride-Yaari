import React from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { popupManager } from '../utils/popupManager'
import { useAuth } from '../contexts/AuthContext'

interface DisclaimerContent {
  title: string
  points: string[]
  explanation: string
}

interface DisclaimerModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  loading: boolean
  type: 'trip' | 'ride' | 'chat-trip' | 'chat-ride'
  content?: DisclaimerContent
}

const getDisclaimerContent = (type: string): DisclaimerContent => {
  switch (type) {
    case 'ride-confirmation':
      return {
        title: 'Send Ride Confirmation Request',
        points: [
          'This will send a formal request to join the selected ride or trip',
          'The ride owner will be notified and can accept or reject your request',
          'You can only send one confirmation request per ride or trip',
          'Make sure you have discussed the details in chat before sending',
          'Once accepted, you are committed to the agreed arrangements',
          'Canceling after acceptance may affect your reputation on the platform'
        ],
        explanation: 'A ride confirmation request is a formal way to request a spot in someone\'s ride or trip. Only send this when you are serious about joining and have agreed on the details.'
      }
    case 'trip':
      return {
        title: 'Airport Trip Safety Guidelines',
        points: [
          'Verify the identity and legitimacy of all users before agreeing to any services',
          'Exchange personal contact details for high-value items at your own risk',
          'Meet in public places at airports and verify identities before any exchange',
          'Never share sensitive personal or financial information through our platform',
          'Be cautious when handling packages or items for others - inspect contents if possible',
          'Report any suspicious activity or requests to our support team immediately'
        ],
        explanation: 'Airport trips involve package delivery, pickup services, and travel assistance. Exercise extra caution when dealing with valuable items or unfamiliar requests.'
      }
    case 'ride':
      return {
        title: 'Car Ride Safety Guidelines',
        points: [
          'Verify driver/passenger identity and vehicle details before the trip',
          'Meet in public, well-lit locations for pickup and drop-off',
          'Share your trip details with a trusted friend or family member',
          'Never share sensitive personal or financial information',
          'Trust your instincts - cancel if something feels unsafe',
          'Keep emergency contacts readily available during the journey'
        ],
        explanation: 'Car rides involve sharing vehicles with other people. Always prioritize your personal safety and use common sense when carpooling.'
      }
    case 'chat-trip':
      return {
        title: 'Airport Trip Communication Guidelines',
        points: [
          'Keep all initial communication within our secure chat system',
          'Be specific about pickup/delivery locations and timing',
          'Discuss package contents and handling requirements clearly',
          'Agree on compensation and payment methods beforehand',
          'Exchange contact details only when necessary for coordination',
          'Report inappropriate messages or suspicious requests immediately'
        ],
        explanation: 'When discussing airport trip services, maintain clear communication about expectations and safety requirements.'
      }
    case 'chat-ride':
      return {
        title: 'Car Ride Communication Guidelines',
        points: [
          'Keep all initial communication within our secure chat system',
          'Discuss pickup/drop-off locations and exact timing',
          'Confirm vehicle details, license plate, and driver information',
          'Agree on cost sharing and payment methods in advance',
          'Share contact details only when ready to coordinate the ride',
          'Report inappropriate messages or unsafe requests immediately'
        ],
        explanation: 'When arranging car rides, ensure all safety details are discussed and confirmed before meeting in person.'
      }
    case 'owner-accept-request':
      return {
        title: 'Accept Ride Request',
        points: [
          'This will confirm the passenger for your ride',
          'The passenger will be notified of your acceptance',
          'You are committing to provide the ride as discussed',
          'Make sure you have agreed on pickup details and payment',
          'Once accepted, both parties are committed to the arrangement'
        ],
        explanation: 'You are accepting a passenger for this ride. This is a commitment to provide the ride as discussed.'
      }
    case 'owner-reject-request':
      return {
        title: 'Reject Ride Request',
        points: [
          'This will decline the passenger\'s request',
          'The passenger will be notified of your decision',
          'The passenger can request again if they wish',
          'Consider explaining your reason in chat',
          'This action can be reversed if you change your mind'
        ],
        explanation: 'You are rejecting a request for this ride. The passenger will be able to request again.'
      }
    case 'cancel-confirmed-ride':
      return {
        title: 'Cancel Confirmed Ride',
        points: [
          'This will cancel the confirmed ride arrangement',
          'The other party will be notified immediately',
          'This may affect your reputation on the platform',
          'Consider discussing the reason in chat first',
          'This should only be done if absolutely necessary'
        ],
        explanation: 'You are cancelling a confirmed ride. This should only be done if absolutely necessary.'
      }
    case 'request-ride-again':
      return {
        title: 'Request Ride Again',
        points: [
          'This will send a new request to join this ride',
          'The ride owner will be notified of your request',
          'Make sure you still want to join this ride',
          'The other party can request again if the ride becomes available',
          'Consider discussing the reason in chat first',
          'This action can be reversed within 24 hours if accidental'
        ],
        explanation: 'You are cancelling the confirmed ride. The other party will be notified and can request again.'
      }
    case 'reverse-action':
      return {
        title: 'Reverse Previous Action',
        points: [
          'This will reverse your previous rejection or cancellation',
          'The confirmation will be restored to accepted status',
          'The other party will be notified of this reversal',
          'This action can only be done within 24 hours',
          'Make sure you want to proceed with the original arrangement'
        ],
        explanation: 'You are reversing your previous action. This will restore the confirmation and notify the other party.'
      }
    default:
      return {
        title: 'Safety Guidelines',
        points: ['Please exercise caution when using our services'],
        explanation: 'Your safety is our priority.'
      }
  }
}

export default function DisclaimerModal({ isOpen, onClose, onConfirm, loading, type, content }: DisclaimerModalProps) {
  const { user } = useAuth()
  
  // Check if disclaimer should be shown
  React.useEffect(() => {
    if (isOpen && !popupManager.shouldShowDisclaimer(type, user?.id)) {
      // If disclaimer shouldn't be shown, auto-confirm
      onConfirm()
      return
    }
  }, [isOpen, type, user?.id, onConfirm])

  if (!isOpen) return null

  // Mark disclaimer as shown when user interacts with it
  const handleConfirm = () => {
    popupManager.markDisclaimerShown(type, user?.id)
    onConfirm()
  }

  const handleClose = () => {
    popupManager.markDisclaimerShown(type, user?.id)
    onClose()
  }

  const disclaimerContent = content || getDisclaimerContent(type)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm sm:max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <AlertTriangle size={18} className="sm:w-6 sm:h-6 text-yellow-600" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">{disclaimerContent.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="mb-4 sm:mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
            <p className="text-xs sm:text-sm text-yellow-800 leading-relaxed">
              <strong>Please read carefully:</strong> RideYaari is not responsible for your safety 
              or the outcome of services arranged through our platform. We strongly advise you to:
            </p>
          </div>

          <ul className="text-xs sm:text-sm text-gray-700 space-y-1 sm:space-y-2 mb-3 sm:mb-4">
            {disclaimerContent.points.map((point, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></span>
                <span>{point}</span>
              </li>
            ))}
          </ul>

          <p className="text-xs text-gray-600">
            {disclaimerContent.explanation} By proceeding, you acknowledge that you understand 
            these guidelines and agree to use RideYaari responsibly.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            onClick={handleClose}
            className="flex-1 border border-gray-300 text-gray-700 py-2 sm:py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm sm:text-base"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-2 sm:py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            {loading ? 'Processing...' : 'I Understand, Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}