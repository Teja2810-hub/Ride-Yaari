import React from 'react'
import { Car, User, ArrowRight, Plus, Users } from 'lucide-react'

interface RideCategorySelectorProps {
  offeredCount: number
  joinedCount: number
  onSelectOffered: () => void
  onSelectJoined: () => void
}

export default function RideCategorySelector({ 
  offeredCount, 
  joinedCount, 
  onSelectOffered, 
  onSelectJoined 
}: RideCategorySelectorProps) {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Car Rides</h2>
        <p className="text-gray-600">
          View rides you're offering to passengers or rides you've joined as a passenger.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Rides You're Offering */}
        <div
          onClick={onSelectOffered}
          className="group cursor-pointer bg-white border border-gray-200 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 p-8"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-green-600 to-green-700 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Car size={32} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Rides You're Offering</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Manage car rides you've posted to share costs and help other travelers
            </p>
            <div className="bg-green-50 rounded-lg p-4 mb-6 w-full">
              <div className="flex items-center justify-center space-x-2">
                <Plus size={20} className="text-green-600" />
                <span className="text-2xl font-bold text-green-600">{offeredCount}</span>
                <span className="text-green-800">Ride{offeredCount !== 1 ? 's' : ''} Posted</span>
              </div>
            </div>
            <div className="inline-flex items-center text-green-600 font-semibold group-hover:text-green-700">
              View Your Rides
              <ArrowRight size={20} className="ml-2 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

        {/* Rides You've Joined */}
        <div
          onClick={onSelectJoined}
          className="group cursor-pointer bg-white border border-gray-200 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 p-8"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Users size={32} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Rides You've Joined</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              View car rides where you've been confirmed as a passenger
            </p>
            <div className="bg-emerald-50 rounded-lg p-4 mb-6 w-full">
              <div className="flex items-center justify-center space-x-2">
                <User size={20} className="text-emerald-600" />
                <span className="text-2xl font-bold text-emerald-600">{joinedCount}</span>
                <span className="text-emerald-800">Ride{joinedCount !== 1 ? 's' : ''} Joined</span>
              </div>
            </div>
            <div className="inline-flex items-center text-emerald-600 font-semibold group-hover:text-emerald-700">
              View Joined Rides
              <ArrowRight size={20} className="ml-2 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-12 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Car Rides Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">{offeredCount + joinedCount}</div>
            <div className="text-gray-700">Total Rides</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">{offeredCount}</div>
            <div className="text-gray-700">As Driver</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-600 mb-2">{joinedCount}</div>
            <div className="text-gray-700">As Passenger</div>
          </div>
        </div>
      </div>
    </div>
  )
}