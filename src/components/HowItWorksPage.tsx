import React from 'react'
import { ArrowLeft, Plane, Car, MessageCircle, Shield, Users, Globe } from 'lucide-react'

interface HowItWorksPageProps {
  onBack: () => void
}

export default function HowItWorksPage({ onBack }: HowItWorksPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
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

        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">How RideYaari Works</h1>
            <p className="text-xl text-gray-600">
              Connect with travelers worldwide for convenient and affordable travel solutions
            </p>
          </div>

          {/* Airport Trips Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <Plane size={24} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Airport Trips</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">1</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Share Your Flight</h3>
                <p className="text-gray-600 text-sm">
                  Post your flight details including departure and destination airports, travel dates, and timing
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">2</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Connect Safely</h3>
                <p className="text-gray-600 text-sm">
                  Other travelers can find your trip and contact you through our secure chat system
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">3</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Help Each Other</h3>
                <p className="text-gray-600 text-sm">
                  Arrange package delivery, pickup services, or travel assistance at airports
                </p>
              </div>
            </div>

            <div className="mt-8 bg-blue-50 rounded-lg p-6">
              <h4 className="font-semibold text-blue-900 mb-3">Airport Trip Use Cases:</h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  <span>Package delivery and pickup</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  <span>Travel assistance for first-time flyers</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  <span>Elderly care and companionship</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  <span>Airport navigation help</span>
                </div>
              </div>
            </div>
          </div>

          {/* Car Rides Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                <Car size={24} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Car Rides</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-green-600">1</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Post Your Ride</h3>
                <p className="text-gray-600 text-sm">
                  Share your car ride details including route, departure time, and price per passenger
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-green-600">2</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Find Passengers</h3>
                <p className="text-gray-600 text-sm">
                  Travelers searching your route can contact you to join your ride
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-green-600">3</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Share Costs</h3>
                <p className="text-gray-600 text-sm">
                  Split fuel and travel costs while reducing environmental impact
                </p>
              </div>
            </div>

            <div className="mt-8 bg-green-50 rounded-lg p-6">
              <h4 className="font-semibold text-green-900 mb-3">Benefits of Car Sharing:</h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-green-800">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                  <span>Save money on travel costs</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                  <span>Reduce carbon footprint</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                  <span>Meet new people</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                  <span>Make travel more social</span>
                </div>
              </div>
            </div>
          </div>

          {/* Safety & Features */}
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Shield size={24} className="text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Safety First</h2>
              </div>
              <div className="space-y-4 text-sm text-gray-600">
                <div className="flex items-start space-x-3">
                  <span className="w-2 h-2 bg-red-500 rounded-full mt-2"></span>
                  <span>All communication happens within our secure platform</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="w-2 h-2 bg-red-500 rounded-full mt-2"></span>
                  <span>Meet in public places and verify identities</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="w-2 h-2 bg-red-500 rounded-full mt-2"></span>
                  <span>Share trip details with trusted contacts</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="w-2 h-2 bg-red-500 rounded-full mt-2"></span>
                  <span>Trust your instincts and report suspicious activity</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Globe size={24} className="text-purple-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Global Community</h2>
              </div>
              <div className="space-y-4 text-sm text-gray-600">
                <div className="flex items-start space-x-3">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mt-2"></span>
                  <span>Connect with travelers worldwide</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mt-2"></span>
                  <span>Support multiple currencies and languages</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mt-2"></span>
                  <span>Free to use forever</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mt-2"></span>
                  <span>Growing community of helpful travelers</span>
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
              <button
                onClick={onBack}
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