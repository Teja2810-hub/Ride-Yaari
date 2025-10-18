import React, { useState } from 'react'
import { Star, Send, User, Mail, MessageSquare } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'

interface ReviewFormProps {
  onReviewSubmitted?: () => void
}

export default function ReviewForm({ onReviewSubmitted }: ReviewFormProps) {
  const { user, userProfile, isGuest, setGuestMode } = useAuth()
  const [reviewerName, setReviewerName] = useState(userProfile?.full_name || '')
  const [reviewerEmail, setReviewerEmail] = useState(user?.email || '')
  const [rating, setRating] = useState(0)
  const [reviewContent, setReviewContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [showSignUpPrompt, setShowSignUpPrompt] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check if user is a guest
    if (isGuest) {
      setShowSignUpPrompt(true)
      return
    }
    
    if (!reviewerName.trim() || !reviewContent.trim() || rating === 0) {
      setError('Please fill in all required fields and select a rating')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          reviewer_name: reviewerName.trim(),
          reviewer_email: reviewerEmail.trim() || null,
          rating: rating,
          review_content: reviewContent.trim()
        })

      if (error) throw error

      setSuccess(true)
      setReviewerName('')
      setReviewerEmail('')
      setRating(0)
      setReviewContent('')
      
      if (onReviewSubmitted) {
        onReviewSubmitted()
      }

      // Reset success message after 3 seconds
      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (error: any) {
      setError(error.message || 'Failed to submit review')
    } finally {
      setLoading(false)
    }
  }

  const handleStarClick = (starRating: number) => {
    setRating(starRating)
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Send size={24} className="text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-green-900 mb-2">Thank You!</h3>
        <p className="text-green-700">Your review has been submitted successfully. We appreciate your feedback!</p>
      </div>
    )
  }

  return (
    <>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Enter your name"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address (Optional)
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="email"
              value={reviewerEmail}
              onChange={(e) => setReviewerEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Enter your email (optional)"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rating <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleStarClick(star)}
                className={`p-1 transition-colors ${
                  star <= rating ? 'text-yellow-400' : 'text-gray-300'
                } hover:text-yellow-400`}
              >
                <Star size={24} fill={star <= rating ? 'currentColor' : 'none'} />
              </button>
            ))}
            <span className="ml-2 text-sm text-gray-600">
              {rating > 0 ? `${rating} star${rating !== 1 ? 's' : ''}` : 'Select a rating'}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Review <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <MessageSquare className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <textarea
              value={reviewContent}
              onChange={(e) => setReviewContent(e.target.value)}
              rows={4}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
              placeholder="Share your experience with RideYaari..."
              required
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Tell us about your experience using RideYaari. What did you like? How did it help you?
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !reviewerName.trim() || !reviewContent.trim() || rating === 0}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Submitting Review...' : 'Submit Review'}
        </button>
      </form>

      {/* Sign Up Prompt Modal */}
      {showSignUpPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star size={32} className="text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign Up to Leave a Review</h2>
              <p className="text-gray-600">
                To submit a review and help other travelers, please create an account or sign in.
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowSignUpPrompt(false)
                  setGuestMode(false)
                }}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Sign Up / Sign In
              </button>
              <button
                onClick={() => setShowSignUpPrompt(false)}
                className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Continue as Guest
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}