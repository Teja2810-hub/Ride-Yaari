import React, { useState } from 'react'
import { ArrowLeft, HelpCircle, Mail, Phone, MessageSquare, Send } from 'lucide-react'

interface HelpPageProps {
  onBack: () => void
}

export default function HelpPage({ onBack }: HelpPageProps) {
  const [submitted, setSubmitted] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-2 sm:p-4">
      <div className="container mx-auto max-w-full sm:max-w-xl md:max-w-4xl">
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center space-x-1 sm:space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors text-sm sm:text-base"
          >
            <ArrowLeft size={16} className="sm:w-5 sm:h-5" />
            <span>Back</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <HelpCircle size={24} className="sm:w-8 sm:h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Help & Support</h1>
            <p className="text-sm sm:text-base text-gray-600">Get help with RideYaari or contact our support team</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-8 sm:mb-12">
            {/* FAQ Section */}
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Frequently Asked Questions</h2>
              
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">How does RideYaari work?</h3>
                  <p className="text-gray-600 text-xs sm:text-sm">
                    RideYaari connects travelers through two services: Airport Trips for sharing flight itineraries 
                    and arranging deliveries/assistance, and Car Rides for carpooling to share travel costs.
                  </p>
                </div>

                <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Is RideYaari safe to use?</h3>
                  <p className="text-gray-600 text-xs sm:text-sm">
                    We provide a secure platform for communication, but users are responsible for their own safety. 
                    Always meet in public places, verify identities, and use your best judgment.
                  </p>
                </div>

                <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">How do I contact other users?</h3>
                  <p className="text-gray-600 text-xs sm:text-sm">
                    Use our built-in chat system to communicate with other users. All conversations are stored 
                    securely and can be accessed from your profile dashboard.
                  </p>
                </div>

                <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">What are the additional use cases for Airport Trips?</h3>
                  <p className="text-gray-600 text-xs sm:text-sm">
                    Beyond package delivery, you can request caretakers for elderly parents, find assistance 
                    for first-time travelers, or arrange airport companionship services.
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Contact Us</h2>
              
              {submitted ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 sm:p-6 text-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <Send size={20} className="sm:w-6 sm:h-6 text-green-600" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-green-900 mb-2">Message Sent!</h3>
                  <p className="text-sm sm:text-base text-green-700">We'll get back to you within 24 hours.</p>
                </div>
              ) : (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault()
                    setSubmitted(true)
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input
                      type="text"
                      name="name"
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm sm:text-base"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      name="email"
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm sm:text-base"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Subject</label>
                    <select
                      name="subject"
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm sm:text-base"
                      required
                    >
                      <option value="">Select a subject</option>
                      <option value="general">General Inquiry</option>
                      <option value="technical">Technical Support</option>
                      <option value="safety">Safety Concern</option>
                      <option value="feedback">Feedback & Suggestions</option>
                      <option value="feature_request">Feature Request</option>
                      <option value="bug_report">Bug Report</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Message</label>
                    <textarea
                      name="message"
                      rows={4}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm sm:text-base"
                      placeholder="You can submit feedback, ask any questions, suggest new features, or report any bugs you've found. We appreciate all input to help improve RideYaari!"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 sm:py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm sm:text-base"
                  >
                    Send Message
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="border-t border-gray-200 pt-6 sm:pt-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 text-center">Other Ways to Reach Us</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              <div className="text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                  <Mail size={20} className="sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">Email Support</h3>
                <p className="text-gray-600 text-xs sm:text-sm">support@rideyaari.com</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                  <Phone size={20} className="sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">Phone Support</h3>
                <p className="text-gray-600 text-xs sm:text-sm">CALL</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                  <MessageSquare size={20} className="sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">Live Chat</h3>
                <p className="text-gray-600 text-xs sm:text-sm">Available 24/7</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}