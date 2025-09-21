import React from 'react'
import { Plane, User, ArrowRight, Plus, Users } from 'lucide-react'

interface TripCategorySelectorProps {
  offeredCount: number
  joinedCount: number
  onSelectOffered: () => void
  onSelectJoined: () => void
}

export default function TripCategorySelector({ 
  offeredCount, 
  joinedCount, 
  onSelectOffered, 
  onSelectJoined 
}: TripCategorySelectorProps) {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Airport Trips</h2>
        <p className="text-gray-600">
          View trips you're offering to other travelers or trips you've joined as a passenger.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Trips You're Offering */}
        <div
          onClick={onSelectOffered}
          className="group cursor-pointer bg-white border border-gray-200 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 p-8"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Plane size={32} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Trips You're Offering</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Manage airport trips you've posted to help other travelers with deliveries and assistance
            </p>
            <div className="bg-blue-50 rounded-lg p-4 mb-6 w-full">
              <div className="flex items-center justify-center space-x-2">
                <Plus size={20} className="text-blue-600" />
                <span className="text-2xl font-bold text-blue-600">{offeredCount}</span>
                <span className="text-blue-800">Trip{offeredCount !== 1 ? 's' : ''} Posted</span>
              </div>
            </div>
            <div className="inline-flex items-center text-blue-600 font-semibold group-hover:text-blue-700">
              View Your Trips
              <ArrowRight size={20} className="ml-2 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

        {/* Trips You've Joined */}
        <div
          onClick={onSelectJoined}
          className="group cursor-pointer bg-white border border-gray-200 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 p-8"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Users size={32} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Trips You've Joined</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              View airport trips where you've been confirmed as a passenger or service recipient
            </p>
            <div className="bg-indigo-50 rounded-lg p-4 mb-6 w-full">
              <div className="flex items-center justify-center space-x-2">
                <User size={20} className="text-indigo-600" />
                <span className="text-2xl font-bold text-indigo-600">{joinedCount}</span>
                <span className="text-indigo-800">Trip{joinedCount !== 1 ? 's' : ''} Joined</span>
              </div>
            </div>
            <div className="inline-flex items-center text-indigo-600 font-semibold group-hover:text-indigo-700">
              View Joined Trips
              <ArrowRight size={20} className="ml-2 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Airport Trips Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">{offeredCount + joinedCount}</div>
            <div className="text-gray-700">Total Trips</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">{offeredCount}</div>
            <div className="text-gray-700">As Traveler</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">{joinedCount}</div>
            <div className="text-gray-700">As Passenger</div>
          </div>
        </div>
      </div>
    </div>
  )
}