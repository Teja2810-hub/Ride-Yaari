import React, { useState, useEffect } from 'react'
import { Star, MessageSquare, Calendar } from 'lucide-react'
import { supabase } from '../utils/supabase'
import { Review } from '../types'
import { formatDateShort } from '../utils/dateHelpers'

interface ReviewDisplayProps {
  title?: string
  maxReviews?: number
}

export default function ReviewDisplay({ title = "What Our Users Say", maxReviews = 10 }: ReviewDisplayProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchReviews()
  }, [])

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setReviews(data || [])
    } catch (error: any) {
      setError('Failed to load reviews')
      console.error('Error fetching reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            className={star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}
          />
        ))}
      </div>
    )
  }

  const getAverageRating = () => {
    if (reviews.length === 0) return 0
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0)
    return (sum / reviews.length).toFixed(1)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reviews...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center">
          <MessageSquare size={32} className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center">
          <MessageSquare size={32} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Reviews Yet</h3>
          <p className="text-gray-600">Be the first to share your RideYaari experience!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-8 sm:p-12">
      <div className="text-center mb-8">
        <h3 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-4">{title}</h3>
        <div className="flex items-center justify-center space-x-2">
          {renderStars(Math.round(parseFloat(getAverageRating())))}
          <span className="text-lg font-semibold text-text-primary">{getAverageRating()}</span>
          <span className="text-text-secondary">({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
        </div>
      </div>

      <div className="space-y-8 max-h-96 overflow-y-auto">
        {reviews.map((review) => (
          <div key={review.id} className="border-b border-gray-100 pb-8 last:border-b-0 last:pb-0">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-2xl">
                  <span className="font-semibold text-accent-blue text-base">
                    {review.reviewer_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary text-lg">{review.reviewer_name}</h4>
                  <div className="flex items-center space-x-2">
                    {renderStars(review.rating)}
                    <span className="text-sm text-text-secondary flex items-center">
                      <Calendar size={12} className="mr-1" />
                      {formatDateShort(review.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-text-secondary leading-relaxed text-base font-light">{review.review_content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}