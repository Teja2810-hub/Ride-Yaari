import React, { useState } from 'react'
import { ArrowLeft, Star } from 'lucide-react'
import ReviewDisplay from './ReviewDisplay'
import ReviewForm from './ReviewForm'

interface ReviewsPageProps {
  onBack: () => void
}

export default function ReviewsPage({ onBack }: ReviewsPageProps) {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleReviewSubmitted = () => {
    // Refresh the reviews display
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/90 to-indigo-100/90 travel-bg">
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
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Star size={32} className="text-yellow-400 fill-current" />
              <h1 className="text-4xl font-bold text-gray-900">Reviews</h1>
              <Star size={32} className="text-yellow-400 fill-current" />
            </div>
            <p className="text-xl text-gray-600">
              See what our community says about RideYaari
            </p>
          </div>

          {/* Reviews Display */}
          <div className="mb-12">
            <ReviewDisplay key={refreshKey} title="Community Reviews" maxReviews={20} />
          </div>

          {/* Review Form */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Share Your Experience</h2>
              <p className="text-gray-600">
                Help other travelers by sharing your RideYaari experience
              </p>
            </div>
            <ReviewForm onReviewSubmitted={handleReviewSubmitted} />
          </div>

          {/* Community Stats */}
          <div className="mt-12 bg-gradient-to-r from-blue-600 to-green-600 rounded-2xl p-8 text-white text-center">
            <h3 className="text-2xl font-bold mb-4">Join Our Growing Community</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="text-3xl font-bold mb-2">1000+</div>
                <div className="text-blue-100">Happy Travelers</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-2">500+</div>
                <div className="text-blue-100">Successful Trips</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-2">50+</div>
                <div className="text-blue-100">Countries Connected</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}