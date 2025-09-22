import React, { useState } from 'react'
import { User, Mail, Lock, Eye, EyeOff, Send, UserCheck, Chrome } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getDefaultAvatarUrl } from '../../utils/avatarHelpers'

interface AuthFormProps {
  onClose?: () => void
}

type AuthStep = 'signin' | 'signup' | 'signup-otp-verification' | 'magic-link-otp-verification'

export default function AuthForm({ onClose }: AuthFormProps) {
  const [currentStep, setCurrentStep] = useState<AuthStep>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [otpToken, setOtpToken] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  
  const { signIn, sendSignUpOtp, verifySignUpOtp, sendMagicLinkOtp, verifyMagicLinkOtp, signInWithGoogle, setGuestMode } = useAuth()

  // Cooldown timer effect
  React.useEffect(() => {
    let interval: NodeJS.Timeout
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown(prev => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [resendCooldown])

  const startResendCooldown = () => {
    setResendCooldown(60)
  }

  const handleContinueAsGuest = () => {
    setGuestMode(true)
    if (onClose) onClose()
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)

    try {
      const { error } = await signInWithGoogle()
      if (error) throw error
      
      if (onClose) onClose()
    } catch (error: any) {
      console.error('Google sign in error:', error)
      setError(error?.message || 'Failed to sign in with Google. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await signIn(email, password)
      if (error) throw error
      
      if (onClose) onClose()
    } catch (error: any) {
      console.error('Sign in error:', error)
      if (error?.status === 504) {
        setError('Connection to server timed out. Please check your internet connection or try again later.')
      } else {
        setError(error?.message || 'Failed to sign in. Please check your credentials.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLinkSignIn = async () => {
    if (!email) {
      setError('Please enter your email address first')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error } = await sendMagicLinkOtp(email)
      if (error) throw error
      
      setSuccess('Magic link sent to your email! Please check your inbox.')
      startResendCooldown()
    } catch (error: any) {
      console.error('Magic link error:', error)
      if (error?.status === 504) {
        setError('Connection to server timed out. Please check your internet connection or try again later.')
      } else if (error?.status === 429) {
        setError('Too many requests. Please wait before trying again.')
      } else {
        setError(error?.message || 'Failed to send magic link. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await sendSignUpOtp(email, password, fullName)
      if (error) throw error
      
      // Move to OTP verification step
      setCurrentStep('signup-otp-verification')
      setSuccess('Verification code sent to your email!')
      startResendCooldown()
    } catch (error: any) {
      console.error('Sign up error:', error)
      if (error?.status === 504) {
        setError('Connection to server timed out. Please check your internet connection or try again later.')
      } else if (error?.status === 429) {
        setError('Too many requests. Please wait before trying again.')
      } else {
        setError(error?.message || 'Failed to create account. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSignUpOTPVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await verifySignUpOtp(email, otpToken, password, fullName)
      if (error) throw error
      
      setSuccess('Account created successfully! You can now sign in.')
      setTimeout(() => {
        setCurrentStep('signin')
        setOtpToken('')
        setError(null)
        setSuccess(null)
      }, 2000)
    } catch (error: any) {
      console.error('OTP verification error:', error)
      if (error?.status === 504) {
        setError('Connection to server timed out. Please check your internet connection or try again later.')
      } else {
        setError(error?.message || 'Invalid verification code. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLinkOTPVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await verifyMagicLinkOtp(email, otpToken)
      if (error) throw error
      
      if (onClose) onClose()
    } catch (error: any) {
      console.error('Magic link OTP verification error:', error)
      if (error?.status === 504) {
        setError('Connection to server timed out. Please check your internet connection or try again later.')
      } else {
        setError(error?.message || 'Invalid verification code. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setFullName('')
    setOtpToken('')
    setError(null)
    setSuccess(null)
    setCurrentStep('signin')
  }

  if (currentStep === 'signup-otp-verification') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send size={32} className="text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Verify Your Email</h2>
            <p className="text-gray-600 mt-2">
              We've sent a verification code to <strong>{email}</strong>
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSignUpOTPVerification} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                value={otpToken}
                onChange={(e) => setOtpToken(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-center text-lg tracking-widest"
                placeholder="Enter 6-digit code"
                required
                maxLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading || otpToken.length !== 6}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <button
              onClick={async () => {
                setLoading(true)
                setError(null)
                try {
                  const { error } = await sendSignUpOtp(email, password, fullName)
                  if (error) throw error
                  setSuccess('Verification code sent!')
                  startResendCooldown()
                } catch (error: any) {
                  if (error?.status === 429) {
                    setError('Too many requests. Please wait before trying again.')
                  } else {
                    setError(error?.message || 'Failed to resend code.')
                  }
                } finally {
                  setLoading(false)
                }
              }}
              disabled={loading || resendCooldown > 0}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              {resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : 'Resend Code'}
            </button>
            <div>
              <button
                onClick={resetForm}
                className="text-gray-600 hover:text-gray-700 font-medium text-sm"
              >
                Back to Sign In
              </button>
            </div>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-6">
            <button
              onClick={handleContinueAsGuest}
              className="w-full flex items-center justify-center space-x-2 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              <UserCheck size={20} />
              <span>Continue as Guest</span>
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Browse and search rides without creating an account
            </p>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          )}
        </div>
      </div>
    )
  }

  if (currentStep === 'magic-link-otp-verification') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send size={32} className="text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Verify Your Email</h2>
            <p className="text-gray-600 mt-2">
              We've sent a verification code to <strong>{email}</strong>
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleMagicLinkOTPVerification} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                value={otpToken}
                onChange={(e) => setOtpToken(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-center text-lg tracking-widest"
                placeholder="Enter 6-digit code"
                required
                maxLength={6}
                autoComplete="one-time-code"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otpToken.length !== 6}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <button
              onClick={async () => {
                setLoading(true)
                setError(null)
                try {
                  const { error } = await sendMagicLinkOtp(email)
                  if (error) throw error
                  setSuccess('Verification code sent!')
                  startResendCooldown()
                } catch (error: any) {
                  if (error?.status === 429) {
                    setError('Too many requests. Please wait before trying again.')
                  } else {
                    setError(error?.message || 'Failed to resend code.')
                  }
                } finally {
                  setLoading(false)
                }
              }}
              disabled={loading || resendCooldown > 0}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              {resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : 'Resend Code'}
            </button>
            <div>
              <button
                onClick={resetForm}
                className="text-gray-600 hover:text-gray-700 font-medium text-sm"
              >
                Back to Sign In
              </button>
            </div>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-6">
            <button
              onClick={handleContinueAsGuest}
              className="w-full flex items-center justify-center space-x-2 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              <UserCheck size={20} />
              <span>Continue as Guest</span>
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Browse and search rides without creating an account
            </p>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          )}
        </div>
      </div>
    )
  }

  if (currentStep === 'signup') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
            <p className="text-gray-600 mt-2">Join our rideshare community - we'll verify your email with a code</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Create a password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Sending Verification Code...' : 'Send Verification Code'}
            </button>
          </form>

          <div className="mt-4">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Chrome size={20} />
              <span>{loading ? 'Signing Up...' : 'Continue with Google'}</span>
            </button>
          </div>
          <div className="mt-4">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Chrome size={20} />
              <span>{loading ? 'Signing In...' : 'Continue with Google'}</span>
            </button>
          </div>
          <div className="mt-6 text-center">
            <button
              onClick={() => setCurrentStep('signin')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Already have an account? Sign in
            </button>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-6">
            <button
              onClick={handleContinueAsGuest}
              className="w-full flex items-center justify-center space-x-2 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              <UserCheck size={20} />
              <span>Continue as Guest</span>
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Browse and search rides without creating an account
            </p>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          )}
        </div>
      </div>
    )
  }

  // Sign In Form (default)
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter your password"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4">
          <button
            onClick={async () => {
              if (!email) {
                setError('Please enter your email address first')
                return
              }
              setLoading(true)
              setError(null)
              try {
                const { error } = await sendMagicLinkOtp(email)
                if (error) throw error
                setCurrentStep('magic-link-otp-verification')
                setSuccess('Magic link code sent to your email!')
                startResendCooldown()
              } catch (error: any) {
                console.error('Magic link error:', error)
                if (error?.status === 504) {
                  setError('Connection to server timed out. Please check your internet connection or try again later.')
                } else if (error?.status === 429) {
                  setError('Too many requests. Please wait before trying again.')
                } else {
                  setError(error?.message || 'Failed to send magic link. Please try again.')
                }
              } finally {
                setLoading(false)
              }
            }}
            disabled={loading || !email}
            className="w-full border border-blue-600 text-blue-600 py-3 px-4 rounded-lg font-medium hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Sending...' : 'Sign In with Magic Link'}
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Enter your email above, then click to receive a magic link
          </p>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => setCurrentStep('signup')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Don't have an account? Create one
          </button>
        </div>

        <div className="mt-6 border-t border-gray-200 pt-6">
          <button
            onClick={handleContinueAsGuest}
            className="w-full flex items-center justify-center space-x-2 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            <UserCheck size={20} />
            <span>Continue as Guest</span>
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Browse and search rides without creating an account
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}