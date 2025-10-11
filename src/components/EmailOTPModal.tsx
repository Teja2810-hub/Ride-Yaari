import React, { useState, useEffect } from 'react'
import { X, Mail, AlertCircle } from 'lucide-react'
import { supabase } from '../utils/supabase'
import LoadingSpinner from './LoadingSpinner'

interface EmailOTPModalProps {
  newEmail: string
  onClose: () => void
  onSuccess: () => void
}

export default function EmailOTPModal({ newEmail, onClose, onSuccess }: EmailOTPModalProps) {
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resending, setResending] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendTimer])

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: newEmail,
        token: otp,
        type: 'email_change'
      })

      if (verifyError) {
        throw new Error(verifyError.message)
      }

      onSuccess()
    } catch (err: any) {
      console.error('OTP verification error:', err)
      setError(err.message || 'Invalid or expired code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    setResending(true)
    setError('')

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('Unable to get user information')
      }

      const { error: resendError } = await supabase.auth.updateUser({
        email: newEmail
      })

      if (resendError) {
        throw new Error(resendError.message)
      }

      setResendTimer(60)
      setOtp('')
    } catch (err: any) {
      console.error('Resend OTP error:', err)
      setError(err.message || 'Failed to resend code. Please try again.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Verify Email</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleVerifyOTP} className="p-6 space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail size={32} className="text-blue-600" />
            </div>
            <p className="text-gray-600">
              We've sent a 6-digit verification code to
            </p>
            <p className="font-semibold text-gray-900 mt-1">{newEmail}</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle size={20} className="text-red-600 mt-0.5" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter 6-digit code
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                setOtp(value)
              }}
              className="w-full px-4 py-3 text-center text-2xl tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="000000"
              maxLength={6}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <LoadingSpinner text="Verifying..." /> : 'Verify Email'}
          </button>

          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              Didn't receive the code?
            </p>
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={resending || resendTimer > 0}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending ? 'Sending...' : resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
