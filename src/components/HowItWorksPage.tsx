import React, { useState } from 'react'
import { ArrowLeft, Plane, Car, User, ChevronDown, ChevronUp, Bell, MessageCircle, Search, CirclePlus as PlusCircle, Send, Clock, Shield, Globe, Settings, Circle as XCircle, Calendar, MapPin, CreditCard, Users, CircleCheck as CheckCircle } from 'lucide-react'

interface HowItWorksPageProps {
  onBack: () => void
}

type SectionId = 'airport' | 'car' | 'profile' | null

export default function HowItWorksPage({ onBack }: HowItWorksPageProps) {
  const [expandedSection, setExpandedSection] = useState<SectionId>(null)

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/90 to-slate-100/90 travel-bg">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">How RideYaari Works</h1>
            <p className="text-xl text-gray-600">
              Your complete guide to connecting with travelers worldwide
            </p>
          </div>

          {/* Quick Navigation */}
          <div className="grid md:grid-cols-3 gap-4 mb-12">
            <button
              onClick={() => {
                setExpandedSection(expandedSection === 'airport' ? null : 'airport')
                scrollToSection('airport-section')
              }}
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 text-left"
            >
              <Plane className="text-blue-600 mb-3" size={32} />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Airport Trips</h3>
              <p className="text-sm text-gray-600">Package delivery, travel assistance, and airport services</p>
            </button>

            <button
              onClick={() => {
                setExpandedSection(expandedSection === 'car' ? null : 'car')
                scrollToSection('car-section')
              }}
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 text-left"
            >
              <Car className="text-green-600 mb-3" size={32} />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Car Rides</h3>
              <p className="text-sm text-gray-600">Ridesharing, cost splitting, and local travel</p>
            </button>

            <button
              onClick={() => {
                setExpandedSection(expandedSection === 'profile' ? null : 'profile')
                scrollToSection('profile-section')
              }}
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 text-left"
            >
              <User className="text-slate-600 mb-3" size={32} />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Profile & Settings</h3>
              <p className="text-sm text-gray-600">Manage your account, notifications, and preferences</p>
            </button>
          </div>

          {/* Airport Section */}
          <div id="airport-section" className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <Plane size={24} className="text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Airport Trips</h2>
              </div>
              <button
                onClick={() => setExpandedSection(expandedSection === 'airport' ? null : 'airport')}
                className="text-blue-600 hover:text-blue-700"
              >
                {expandedSection === 'airport' ? <ChevronUp size={28} /> : <ChevronDown size={28} />}
              </button>
            </div>

            <div className={`space-y-8 ${expandedSection === 'airport' ? 'block' : 'hidden'}`}>
              {/* Post a Trip */}
              <div className="border-l-4 border-blue-600 pl-6">
                <div className="flex items-center space-x-3 mb-4">
                  <PlusCircle className="text-blue-600" size={28} />
                  <h3 className="text-2xl font-bold text-gray-900">Post a Trip</h3>
                </div>
                <p className="text-gray-700 mb-4">
                  Share your upcoming flight details to help fellow travelers with deliveries, pickups, or companionship.
                </p>
                <div className="bg-blue-50 rounded-lg p-6 space-y-4">
                  <h4 className="font-semibold text-blue-900 mb-3">How to Post:</h4>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">1</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Select Departure & Destination Airports</p>
                        <p className="text-sm text-gray-600">Choose from thousands of airports worldwide using our autocomplete search</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">2</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Set Travel Dates & Times</p>
                        <p className="text-sm text-gray-600">Enter departure and arrival dates with timezones automatically detected</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">3</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Set Price & Currency</p>
                        <p className="text-sm text-gray-600">Specify your service fee in your preferred currency, or mark it as negotiable</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">4</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Add Details & Preferences</p>
                        <p className="text-sm text-gray-600">Include any special requirements, luggage capacity, or service limitations</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-blue-200">
                    <p className="font-semibold text-blue-900 mb-2">What happens after posting?</p>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start space-x-2">
                        <CheckCircle size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>Your trip appears in search results for travelers looking for your route</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>Users who have posted matching requests get notified automatically</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>Interested travelers can message you through our secure chat</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>Your trip remains active until you close it or the departure date passes</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Find a Trip */}
              <div className="border-l-4 border-slate-600 pl-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Search className="text-slate-600" size={28} />
                  <h3 className="text-2xl font-bold text-gray-900">Find a Trip</h3>
                </div>
                <p className="text-gray-700 mb-4">
                  Search for travelers on routes you need and connect with them for deliveries or assistance.
                </p>
                <div className="bg-slate-50 rounded-lg p-6 space-y-4">
                  <h4 className="font-semibold text-slate-900 mb-3">How to Find:</h4>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <Search size={20} className="text-slate-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">Enter Route & Dates</p>
                        <p className="text-sm text-gray-600">Specify departure/destination airports and your flexible date range</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <MapPin size={20} className="text-slate-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">Browse Available Trips</p>
                        <p className="text-sm text-gray-600">View all matching trips with traveler profiles, prices, and travel times</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <MessageCircle size={20} className="text-slate-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">Contact Travelers</p>
                        <p className="text-sm text-gray-600">Start a conversation to discuss details, negotiate terms, and finalize arrangements</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <p className="font-semibold text-slate-900 mb-2">Search Tips:</p>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start space-x-2">
                        <span className="w-2 h-2 bg-slate-600 rounded-full mt-2 flex-shrink-0"></span>
                        <span>Use flexible date ranges to see more options</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="w-2 h-2 bg-slate-600 rounded-full mt-2 flex-shrink-0"></span>
                        <span>Check traveler profiles and reviews before contacting</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="w-2 h-2 bg-slate-600 rounded-full mt-2 flex-shrink-0"></span>
                        <span>Save time by using the <a href="#request-trip" className="text-blue-600 hover:underline" onClick={(e) => { e.preventDefault(); scrollToSection('request-trip') }}>Request a Trip</a> feature instead</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Request a Trip */}
              <div id="request-trip" className="border-l-4 border-orange-600 pl-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Send className="text-orange-600" size={28} />
                  <h3 className="text-2xl font-bold text-gray-900">Request a Trip</h3>
                </div>
                <p className="text-gray-700 mb-4">
                  Post your needs and get automatically notified when matching trips are available.
                </p>
                <div className="bg-orange-50 rounded-lg p-6 space-y-4">
                  <h4 className="font-semibold text-orange-900 mb-3">How Requests Work:</h4>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">1</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Post Your Request</p>
                        <p className="text-sm text-gray-600">Specify your route, dates, and service needs (delivery, assistance, etc.)</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">2</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Enable Notifications</p>
                        <p className="text-sm text-gray-600">Get instant alerts when travelers post matching trips (see <a href="#notification-settings" className="text-blue-600 hover:underline" onClick={(e) => { e.preventDefault(); setExpandedSection('profile'); setTimeout(() => scrollToSection('notification-settings'), 100) }}>Notification Settings</a>)</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">3</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Connect Automatically</p>
                        <p className="text-sm text-gray-600">Receive notifications with traveler details and start chatting immediately</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-orange-200">
                    <p className="font-semibold text-orange-900 mb-2">Request Management:</p>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start space-x-2">
                        <Clock size={16} className="text-orange-600 mt-0.5 flex-shrink-0" />
                        <span>Requests remain active for 30 days by default</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <Settings size={16} className="text-orange-600 mt-0.5 flex-shrink-0" />
                        <span>Edit or delete requests anytime from your <a href="#profile-trips" className="text-blue-600 hover:underline" onClick={(e) => { e.preventDefault(); setExpandedSection('profile'); setTimeout(() => scrollToSection('profile-trips'), 100) }}>Profile</a></span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <Bell size={16} className="text-orange-600 mt-0.5 flex-shrink-0" />
                        <span>Manage all notification preferences in <a href="#notification-settings" className="text-blue-600 hover:underline" onClick={(e) => { e.preventDefault(); setExpandedSection('profile'); setTimeout(() => scrollToSection('notification-settings'), 100) }}>Settings</a></span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Use Cases */}
              <div className="bg-blue-50 rounded-lg p-6">
                <h4 className="font-semibold text-blue-900 mb-4 text-lg">Airport Trip Use Cases:</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs">📦</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Package Delivery</p>
                      <p className="text-sm text-gray-600">Send documents, gifts, or items with trusted travelers</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs">✈️</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Travel Assistance</p>
                      <p className="text-sm text-gray-600">Help first-time flyers navigate airports and check-in</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs">👴</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Elderly Care</p>
                      <p className="text-sm text-gray-600">Provide companionship and assistance for senior travelers</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs">🗺️</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Airport Navigation</p>
                      <p className="text-sm text-gray-600">Guide travelers through complex airport terminals</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Car Rides Section */}
          <div id="car-section" className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                  <Car size={24} className="text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Car Rides</h2>
              </div>
              <button
                onClick={() => setExpandedSection(expandedSection === 'car' ? null : 'car')}
                className="text-green-600 hover:text-green-700"
              >
                {expandedSection === 'car' ? <ChevronUp size={28} /> : <ChevronDown size={28} />}
              </button>
            </div>

            <div className={`space-y-8 ${expandedSection === 'car' ? 'block' : 'hidden'}`}>
              {/* Post a Ride */}
              <div className="border-l-4 border-green-600 pl-6">
                <div className="flex items-center space-x-3 mb-4">
                  <PlusCircle className="text-green-600" size={28} />
                  <h3 className="text-2xl font-bold text-gray-900">Post a Ride</h3>
                </div>
                <p className="text-gray-700 mb-4">
                  Share empty seats in your car to split costs and reduce environmental impact.
                </p>
                <div className="bg-green-50 rounded-lg p-6 space-y-4">
                  <h4 className="font-semibold text-green-900 mb-3">How to Post:</h4>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">1</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Set Route with Google Maps</p>
                        <p className="text-sm text-gray-600">Enter departure and destination locations with map-based selection and preview</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">2</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Add Intermediate Stops (Optional)</p>
                        <p className="text-sm text-gray-600">Include stops along the way to pick up more passengers</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">3</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Set Departure Time & Date</p>
                        <p className="text-sm text-gray-600">Choose when you're leaving with automatic timezone detection</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">4</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Specify Seats & Price</p>
                        <p className="text-sm text-gray-600">Set available seats and price per passenger in any currency</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-green-200">
                    <p className="font-semibold text-green-900 mb-2">After Posting:</p>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start space-x-2">
                        <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Your ride appears in searches for travelers on your route</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Matching ride requests get notified automatically</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Passengers can message you and request to join</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Manage passenger confirmations in your <a href="#profile-rides" className="text-blue-600 hover:underline" onClick={(e) => { e.preventDefault(); setExpandedSection('profile'); setTimeout(() => scrollToSection('profile-rides'), 100) }}>Profile</a></span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Find a Ride */}
              <div className="border-l-4 border-slate-600 pl-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Search className="text-slate-600" size={28} />
                  <h3 className="text-2xl font-bold text-gray-900">Find a Ride</h3>
                </div>
                <p className="text-gray-700 mb-4">
                  Search for available rides on your route and connect with drivers.
                </p>
                <div className="bg-slate-50 rounded-lg p-6 space-y-4">
                  <h4 className="font-semibold text-slate-900 mb-3">How to Find:</h4>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <MapPin size={20} className="text-slate-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">Enter Your Route</p>
                        <p className="text-sm text-gray-600">Specify where you're starting from and your destination</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Calendar size={20} className="text-slate-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">Set Date Range</p>
                        <p className="text-sm text-gray-600">Choose your travel dates with flexible ranges to see more options</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Users size={20} className="text-slate-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">View Available Rides</p>
                        <p className="text-sm text-gray-600">See driver profiles, available seats, prices, and departure times</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <MessageCircle size={20} className="text-slate-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">Request to Join</p>
                        <p className="text-sm text-gray-600">Message drivers to discuss details and request a seat</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <p className="font-semibold text-slate-900 mb-2">Pro Tips:</p>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start space-x-2">
                        <span className="w-2 h-2 bg-slate-600 rounded-full mt-2 flex-shrink-0"></span>
                        <span>Use <a href="#request-ride" className="text-blue-600 hover:underline" onClick={(e) => { e.preventDefault(); scrollToSection('request-ride') }}>Request a Ride</a> to get notified when matching rides are posted</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="w-2 h-2 bg-slate-600 rounded-full mt-2 flex-shrink-0"></span>
                        <span>Check intermediate stops to find rides along your route</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="w-2 h-2 bg-slate-600 rounded-full mt-2 flex-shrink-0"></span>
                        <span>Read driver reviews and check profiles before requesting</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Request a Ride */}
              <div id="request-ride" className="border-l-4 border-orange-600 pl-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Send className="text-orange-600" size={28} />
                  <h3 className="text-2xl font-bold text-gray-900">Request a Ride</h3>
                </div>
                <p className="text-gray-700 mb-4">
                  Post your ride needs and get notified automatically when drivers post matching rides.
                </p>
                <div className="bg-orange-50 rounded-lg p-6 space-y-4">
                  <h4 className="font-semibold text-orange-900 mb-3">How It Works:</h4>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">1</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Post Your Ride Request</p>
                        <p className="text-sm text-gray-600">Specify route, dates, number of seats needed, and budget</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">2</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Get Instant Notifications</p>
                        <p className="text-sm text-gray-600">Receive alerts when drivers post matching rides on your route</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">3</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Connect & Confirm</p>
                        <p className="text-sm text-gray-600">Chat with drivers and confirm your booking</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-orange-200">
                    <p className="font-semibold text-orange-900 mb-2">Managing Requests:</p>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start space-x-2">
                        <Settings size={16} className="text-orange-600 mt-0.5 flex-shrink-0" />
                        <span>View and edit all requests in your <a href="#profile-rides" className="text-blue-600 hover:underline" onClick={(e) => { e.preventDefault(); setExpandedSection('profile'); setTimeout(() => scrollToSection('profile-rides'), 100) }}>Profile</a></span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <Bell size={16} className="text-orange-600 mt-0.5 flex-shrink-0" />
                        <span>Configure notification preferences in <a href="#notification-settings" className="text-blue-600 hover:underline" onClick={(e) => { e.preventDefault(); setExpandedSection('profile'); setTimeout(() => scrollToSection('notification-settings'), 100) }}>Settings</a></span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <Clock size={16} className="text-orange-600 mt-0.5 flex-shrink-0" />
                        <span>Requests auto-expire after 30 days unless manually extended</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Passenger Management */}
              <div className="border-l-4 border-teal-600 pl-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Users className="text-teal-600" size={28} />
                  <h3 className="text-2xl font-bold text-gray-900">Passenger Management</h3>
                </div>
                <p className="text-gray-700 mb-4">
                  As a driver, manage who joins your rides with full control over confirmations.
                </p>
                <div className="bg-teal-50 rounded-lg p-6 space-y-4">
                  <h4 className="font-semibold text-teal-900 mb-3">Managing Passengers:</h4>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <MessageCircle size={20} className="text-teal-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">Receive Passenger Requests</p>
                        <p className="text-sm text-gray-600">Get notifications when passengers want to join your ride</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle size={20} className="text-teal-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">Accept or Decline</p>
                        <p className="text-sm text-gray-600">Review passenger profiles and chat history before confirming</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Users size={20} className="text-teal-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">Track Available Seats</p>
                        <p className="text-sm text-gray-600">System automatically updates seat availability as you confirm passengers</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <XCircle size={20} className="text-teal-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">Handle Cancellations</p>
                        <p className="text-sm text-gray-600">Remove passengers if plans change, automatically freeing up seats</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-teal-200">
                    <p className="font-semibold text-teal-900 mb-2">Access Management:</p>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start space-x-2">
                        <span className="w-2 h-2 bg-teal-600 rounded-full mt-2 flex-shrink-0"></span>
                        <span>View all confirmations in your <a href="#profile-confirmations" className="text-blue-600 hover:underline" onClick={(e) => { e.preventDefault(); setExpandedSection('profile'); setTimeout(() => scrollToSection('profile-confirmations'), 100) }}>Profile Confirmations</a> tab</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="w-2 h-2 bg-teal-600 rounded-full mt-2 flex-shrink-0"></span>
                        <span>Manage passengers directly from individual ride details</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Benefits */}
              <div className="bg-green-50 rounded-lg p-6">
                <h4 className="font-semibold text-green-900 mb-4 text-lg">Benefits of Car Sharing:</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <CreditCard size={16} className="text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Save Money</p>
                      <p className="text-sm text-gray-600">Split fuel and toll costs with passengers</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Globe size={16} className="text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Eco-Friendly</p>
                      <p className="text-sm text-gray-600">Reduce carbon footprint with fewer cars on the road</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Users size={16} className="text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Meet People</p>
                      <p className="text-sm text-gray-600">Connect with travelers and make new friends</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Shield size={16} className="text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Safe Travel</p>
                      <p className="text-sm text-gray-600">Travel with verified users through secure platform</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Profile & Settings Section */}
          <div id="profile-section" className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center">
                  <User size={24} className="text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Profile & Settings</h2>
              </div>
              <button
                onClick={() => setExpandedSection(expandedSection === 'profile' ? null : 'profile')}
                className="text-slate-600 hover:text-slate-700"
              >
                {expandedSection === 'profile' ? <ChevronUp size={28} /> : <ChevronDown size={28} />}
              </button>
            </div>

            <div className={`space-y-8 ${expandedSection === 'profile' ? 'block' : 'hidden'}`}>
              {/* Profile Management */}
              <div id="profile-overview" className="border-l-4 border-slate-600 pl-6">
                <div className="flex items-center space-x-3 mb-4">
                  <User className="text-slate-600" size={28} />
                  <h3 className="text-2xl font-bold text-gray-900">Profile Overview</h3>
                </div>
                <div className="bg-slate-50 rounded-lg p-6 space-y-4">
                  <p className="text-gray-700 mb-4">Your profile is your identity on RideYaari. Keep it updated to build trust.</p>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <User size={20} className="text-slate-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">Personal Information</p>
                        <p className="text-sm text-gray-600">Full name, age, gender, and bio visible to other users</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Settings size={20} className="text-slate-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">Edit Profile</p>
                        <p className="text-sm text-gray-600">Update your details, profile picture, email, and password anytime</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Calendar size={20} className="text-slate-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">Activity Statistics</p>
                        <p className="text-sm text-gray-600">Track trips posted, rides joined, and overall activity</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Airport Trips Management */}
              <div id="profile-trips" className="border-l-4 border-blue-600 pl-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Plane className="text-blue-600" size={28} />
                  <h3 className="text-2xl font-bold text-gray-900">Airport Trips</h3>
                </div>
                <div className="bg-blue-50 rounded-lg p-6 space-y-4">
                  <p className="text-gray-700 mb-4">Access and manage all your airport-related activities in one place.</p>
                  <div className="space-y-4">
                    <div>
                      <p className="font-semibold text-blue-900 mb-2">Offered Trips:</p>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-start space-x-2">
                          <CheckCircle size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                          <span>View all trips you've posted with departure dates and routes</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <Settings size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                          <span>Edit trip details, prices, or dates anytime before departure</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <XCircle size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                          <span>Close trips manually to stop receiving requests</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <Users size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                          <span>View passenger requests and manage confirmations</span>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold text-blue-900 mb-2">Joined Trips:</p>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-start space-x-2">
                          <CheckCircle size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                          <span>See all trips you're confirmed as a passenger for</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <MessageCircle size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                          <span>Quick access to chat with trip owners</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <Calendar size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                          <span>View trip details, dates, and traveler information</span>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold text-blue-900 mb-2">Trip Requests:</p>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-start space-x-2">
                          <Send size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                          <span>View all active trip requests you've posted</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <Settings size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                          <span>Edit request details, dates, or preferences</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <Clock size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                          <span>See request status and expiry dates</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <XCircle size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                          <span>Delete requests when no longer needed</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Car Rides Management */}
              <div id="profile-rides" className="border-l-4 border-green-600 pl-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Car className="text-green-600" size={28} />
                  <h3 className="text-2xl font-bold text-gray-900">Car Rides</h3>
                </div>
                <div className="bg-green-50 rounded-lg p-6 space-y-4">
                  <p className="text-gray-700 mb-4">Manage all your car ride activities, whether you're driving or riding.</p>
                  <div className="space-y-4">
                    <div>
                      <p className="font-semibold text-green-900 mb-2">Offered Rides:</p>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-start space-x-2">
                          <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                          <span>View all rides you're offering with routes and dates</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <Users size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Manage passengers: accept, decline, or remove confirmed passengers</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <Settings size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Edit ride details including route, time, price, and available seats</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <MapPin size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Update or add intermediate stops along your route</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <XCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Close rides when full or cancel if plans change</span>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold text-green-900 mb-2">Joined Rides:</p>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-start space-x-2">
                          <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                          <span>See all rides you're confirmed as a passenger for</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <MessageCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Contact drivers directly through chat</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <MapPin size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                          <span>View route details, stops, and departure times</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <XCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Cancel your booking if plans change</span>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold text-green-900 mb-2">Ride Requests:</p>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-start space-x-2">
                          <Send size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                          <span>View all active ride requests you've posted</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <Bell size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Get notified when matching rides are posted</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <Settings size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Edit request route, dates, or passenger count</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <XCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Delete requests once you've found a ride</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Confirmations */}
              <div id="profile-confirmations" className="border-l-4 border-orange-600 pl-6">
                <div className="flex items-center space-x-3 mb-4">
                  <MessageCircle className="text-orange-600" size={28} />
                  <h3 className="text-2xl font-bold text-gray-900">Confirmations</h3>
                </div>
                <div className="bg-orange-50 rounded-lg p-6 space-y-4">
                  <p className="text-gray-700 mb-4">Central hub for managing all passenger confirmations and booking requests.</p>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <Clock size={20} className="text-orange-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">Pending Confirmations</p>
                        <p className="text-sm text-gray-600">View requests awaiting your action with auto-expiry after 24 hours</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle size={20} className="text-orange-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">Accept or Decline</p>
                        <p className="text-sm text-gray-600">Review passenger profiles before confirming bookings</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <XCircle size={20} className="text-orange-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">Cancellations & Reversals</p>
                        <p className="text-sm text-gray-600">Cancel confirmations within 5 minutes, revert accidental actions</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Bell size={20} className="text-orange-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">Expiry Warnings</p>
                        <p className="text-sm text-gray-600">Get notified before confirmations auto-expire</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-orange-200">
                    <p className="font-semibold text-orange-900 mb-2">Important Notes:</p>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start space-x-2">
                        <span className="w-2 h-2 bg-orange-600 rounded-full mt-2 flex-shrink-0"></span>
                        <span>Pending confirmations expire after 24 hours automatically</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="w-2 h-2 bg-orange-600 rounded-full mt-2 flex-shrink-0"></span>
                        <span>Cancellations within 5 minutes can be reversed if accidental</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="w-2 h-2 bg-orange-600 rounded-full mt-2 flex-shrink-0"></span>
                        <span>View confirmation history in the Closure History section</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Notifications */}
              <div id="notification-settings" className="border-l-4 border-teal-600 pl-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Bell className="text-teal-600" size={28} />
                  <h3 className="text-2xl font-bold text-gray-900">Notification Settings</h3>
                </div>
                <div className="bg-teal-50 rounded-lg p-6 space-y-4">
                  <p className="text-gray-700 mb-4">Control how and when you receive notifications from RideYaari.</p>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <Bell size={20} className="text-teal-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">Browser Push Notifications</p>
                        <p className="text-sm text-gray-600">Enable desktop/mobile notifications for instant alerts</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Settings size={20} className="text-teal-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">Notification Preferences</p>
                        <p className="text-sm text-gray-600">Choose which events trigger notifications (messages, confirmations, matches)</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <MessageCircle size={20} className="text-teal-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">Chat Notifications</p>
                        <p className="text-sm text-gray-600">Get alerts for new messages and chat activity</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Search size={20} className="text-teal-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">Matching Alerts</p>
                        <p className="text-sm text-gray-600">Receive notifications when trips/rides matching your requests are posted</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-teal-200">
                    <p className="font-semibold text-teal-900 mb-2">Managing Alerts:</p>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start space-x-2">
                        <span className="w-2 h-2 bg-teal-600 rounded-full mt-2 flex-shrink-0"></span>
                        <span>Grant browser permission for push notifications when prompted</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="w-2 h-2 bg-teal-600 rounded-full mt-2 flex-shrink-0"></span>
                        <span>Use "Manage Alerts" tab to view and delete active notification subscriptions</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="w-2 h-2 bg-teal-600 rounded-full mt-2 flex-shrink-0"></span>
                        <span>Disable specific notification types without affecting others</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Blocked Users & Safety */}
              <div className="border-l-4 border-red-600 pl-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Shield className="text-red-600" size={28} />
                  <h3 className="text-2xl font-bold text-gray-900">Blocked Users & Safety</h3>
                </div>
                <div className="bg-red-50 rounded-lg p-6 space-y-4">
                  <p className="text-gray-700 mb-4">Control your interactions and maintain a safe environment.</p>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <Shield size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">Block Users</p>
                        <p className="text-sm text-gray-600">Block problematic users from messaging you or seeing your posts</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Settings size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">Manage Blocked List</p>
                        <p className="text-sm text-gray-600">View and unblock users anytime from your Blocked Users page</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <MessageCircle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">Chat Blocking</p>
                        <p className="text-sm text-gray-600">Block users directly from chat conversations</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-red-200">
                    <p className="font-semibold text-red-900 mb-2">What Blocking Does:</p>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start space-x-2">
                        <XCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                        <span>Blocked users cannot send you messages</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <XCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                        <span>They cannot see your new trips or rides in search results</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <XCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                        <span>Existing confirmations are automatically cancelled</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                        <span>You can unblock users at any time to restore access</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Closure History */}
              <div className="border-l-4 border-gray-600 pl-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Clock className="text-gray-600" size={28} />
                  <h3 className="text-2xl font-bold text-gray-900">Closure & History</h3>
                </div>
                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                  <p className="text-gray-700 mb-4">Access your past trips, rides, and closure history.</p>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <XCircle size={20} className="text-gray-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">Closed Trips & Rides</p>
                        <p className="text-sm text-gray-600">View trips/rides you've manually closed or that expired</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Settings size={20} className="text-gray-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">Reopen Closed Items</p>
                        <p className="text-sm text-gray-600">Reactivate closed trips/rides if you want to make them searchable again</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Calendar size={20} className="text-gray-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">History Tracking</p>
                        <p className="text-sm text-gray-600">All closed items remain in history with full details preserved</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-gray-300">
                    <p className="font-semibold text-gray-900 mb-2">Auto-Closure Rules:</p>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start space-x-2">
                        <span className="w-2 h-2 bg-gray-600 rounded-full mt-2 flex-shrink-0"></span>
                        <span>Trips/rides automatically close 24 hours after departure time</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="w-2 h-2 bg-gray-600 rounded-full mt-2 flex-shrink-0"></span>
                        <span>Manually close items anytime from their detail pages</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="w-2 h-2 bg-gray-600 rounded-full mt-2 flex-shrink-0"></span>
                        <span>Closed items don't appear in searches but remain in your profile</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Safety First Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Shield size={24} className="text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Safety Guidelines</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <MessageCircle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Communicate Through Platform</p>
                    <p className="text-sm text-gray-600">Use our secure chat for all discussions before meeting</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Users size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Meet in Public Places</p>
                    <p className="text-sm text-gray-600">Always meet at busy, well-lit public locations</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Shield size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Verify Identities</p>
                    <p className="text-sm text-gray-600">Check profiles and ask for ID verification before transactions</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Bell size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Share Trip Details</p>
                    <p className="text-sm text-gray-600">Inform trusted contacts about your travel plans</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Shield size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Trust Your Instincts</p>
                    <p className="text-sm text-gray-600">If something feels wrong, cancel and report the issue</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <XCircle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Block Problematic Users</p>
                    <p className="text-sm text-gray-600">Use the block feature to prevent unwanted interactions</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center mt-12">
            <div className="bg-gradient-to-r from-blue-600 to-green-600 rounded-2xl p-8 text-white">
              <h2 className="text-2xl font-bold mb-4">Ready to Start Your Journey?</h2>
              <p className="text-blue-100 mb-6">
                Join thousands of travelers who trust RideYaari for safe, affordable, and convenient connections
              </p>
              <div className="mb-6">
                <p className="text-blue-100 mb-4">
                  <strong>Support the Developer:</strong> Every API call drains my soul (and my bank account). Late-night coding, endless bug hunts, and servers that never sleep—send help (or coffee) ☕😭
                </p>
                <a
                  href="https://www.buymeacoffee.com/rideyaari"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block hover:scale-105 transition-transform"
                >
                  <img
                    src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=☕&slug=rideyaari&button_colour=FFDD00&font_colour=000000&font_family=Comic&outline_colour=000000&coffee_colour=ffffff"
                    alt="Buy me a coffee"
                    className="h-10"
                  />
                </a>
              </div>
              <button
                onClick={() => {
                  window.location.href = '/'
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Get Started Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
