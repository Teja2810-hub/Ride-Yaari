import React, { useState } from 'react'
import { Plane, Mail, Lock, User, Shield, ArrowLeft, HelpCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../utils/supabase'

type AuthStep = 'credentials' | 'signup-otp-verification' | 'signin-otp-verification'

export default function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [authStep, setAuthStep] = useState<AuthStep>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [otpEmail, setOtpEmail] = useState('')
  const [canResendOtp, setCanResendOtp] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)
  const [showHelp, setShowHelp] = useState(false)

  const { signIn, signUp, sendEmailVerificationOtp, verifyOTP } = useAuth()

  // Countdown timer for OTP resend
  React.useEffect(() => {
    let interval: NodeJS.Timeout
    if (resendCountdown > 0) {
      interval = setInterval(() => {
        setResendCountdown(prev => {
          if (prev <= 1) {
            setCanResendOtp(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [resendCountdown])

  const sendMagicLink = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) throw error

      // Start countdown timer after successful magic link send
      setCanResendOtp(false)
      setResendCountdown(60) // 1 minute countdown
      return { success: true }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to send magic link')
    }
  }

  const handleResendOtp = async () => {
    if (!canResendOtp || !otpEmail) return
    
    setLoading(true)
    setError('')
    
    try {
      if (authStep === 'signup-otp-verification') {
        await sendEmailVerificationOtp(otpEmail)
      } else {
        await sendMagicLink(otpEmail)
      }
      setError('')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    try {
      const otpType = authStep === 'signup-otp-verification' ? 'email' : 'magiclink'
      const { data, error } = await verifyOTP(otpEmail, otpCode, otpType)

      if (error) throw error

      // If this is a signup email verification and we have a user, create the profile
      if (authStep === 'signup-otp-verification' && data.user && fullName) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            full_name: fullName,
          })

        if (profileError) {
          console.error('Profile creation error:', profileError)
          // Don't throw here as the user is already authenticated
        }
      }

      return data
    } catch (error: any) {
      throw new Error(error.message || 'Invalid verification code')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (authStep === 'credentials') {
        if (isSignUp) {
          // For signup, create account with password and send email verification
          const { error: signUpError } = await signUp(email, password, fullName)
          if (signUpError) throw signUpError
          
          // Send email verification OTP
          const { error: otpError } = await sendEmailVerificationOtp(email)
          if (otpError) throw otpError
          
          setOtpEmail(email)
          setAuthStep('signup-otp-verification')
        } else {
          // For signin, try traditional password login first
          const { error } = await signIn(email, password)
          if (error) {
            // If password login fails, offer magic link option
            if (error.message.includes('Invalid login credentials')) {
              setError('Invalid credentials. Would you like to sign in with a magic link instead?')
            } else {
              throw error
            }
          }
        }
      } else if (authStep === 'signup-otp-verification' || authStep === 'signin-otp-verification') {
        await handleVerifyOTP()
        // Success - user will be automatically signed in
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLinkSignIn = async () => {
    setLoading(true)
    setError('')

    try {
      await sendMagicLink(email)
      setOtpEmail(email)
      setAuthStep('signin-otp-verification')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBackToCredentials = () => {
    setAuthStep('credentials')
    setOtpCode('')
    setError('')
    setCanResendOtp(false)
    setResendCountdown(0)
  }

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleHelpSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // For now, we'll show contact information
    // In a real implementation, you might want to send this to a support system
    alert('Thank you for reaching out! Please email us at support@rideyaari.com or call 1-800-TRIPSHARE for immediate assistance.')
    setShowHelp(false)
  }

  if (showHelp) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-2 sm:p-4">
        <div className="w-full max-w-sm sm:max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-8">
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 text-white rounded-full mb-3 sm:mb-4">
                <HelpCircle size={20} className="sm:w-7 sm:h-7" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Need Help?</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-2">
                We're here to help you get started with RideYaari
              </p>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Common Issues & Solutions</h3>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li>• <strong>Didn't receive magic link:</strong> Check your spam folder and ensure your email is correct</li>
                  <li>• <strong>Account already exists:</strong> Try signing in instead, or use "Sign in with Magic Link"</li>
                  <li>• <strong>Magic link expired:</strong> Request a new verification link</li>
                  <li>• <strong>Email not working:</strong> Make sure you're using a valid email address</li>
                </ul>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Contact Support</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center space-x-3">
                    <Mail size={16} className="text-gray-600" />
                    <div>
                      <p className="font-medium">Email Support</p>
                      <p className="text-gray-600">support@rideyaari.com</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 flex items-center justify-center">
                      <span className="text-gray-600">📞</span>
                    </div>
                    <div>
                      <p className="font-medium">Whatsapp Support</p>
                      <p className="text-gray-600">+917093203981</p>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleHelpSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Quick Message (Optional)
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm sm:text-base resize-none"
                    placeholder="Describe your issue or question..."
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 sm:py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-sm sm:text-base"
                >
                  Send Message
                </button>
              </form>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => setShowHelp(false)}
                className="flex items-center justify-center space-x-2 w-full text-gray-600 hover:text-gray-800 font-medium transition-colors text-sm sm:text-base"
              >
                <ArrowLeft size={14} className="sm:w-4 sm:h-4" />
                <span>Back to {isSignUp ? 'Sign Up' : 'Sign In'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-8">
          {/* Help Button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowHelp(true)}
              className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition-colors text-sm"
            >
              <HelpCircle size={16} />
              <span>Help</span>
            </button>
          </div>

          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 text-white rounded-full mb-3 sm:mb-4">
              {authStep.includes('otp-verification') ? <Shield size={20} className="sm:w-7 sm:h-7" /> : <Plane size={20} className="sm:w-7 sm:h-7" />}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">RideYaari</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-2">
              {authStep === 'signup-otp-verification'
                ? 'Verify your email address'
                : authStep === 'signin-otp-verification'
                ? 'Enter verification code'
                : isSignUp ? 'Create your account' : 'Welcome'
              }
            </p>
          </div>

          {error && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs sm:text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {authStep === 'credentials' && (
              <>
                {isSignUp && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm sm:text-base"
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm sm:text-base"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm sm:text-base"
                      placeholder={isSignUp ? "Create a password" : "Enter your password"}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {authStep.includes('otp-verification') && (
              <div>
                <div className="text-center mb-4 sm:mb-6">
                  <p className="text-sm sm:text-base text-gray-600">
                    {authStep === 'signup-otp-verification' 
                      ? 'We\'ve sent a verification code to:'
                      : 'We\'ve sent a magic link to:'
                    }
                  </p>
                  <p className="font-semibold text-gray-900 text-sm sm:text-base">{otpEmail}</p>
                  <p className="text-xs sm:text-sm text-blue-600 mt-2">
                    {authStep === 'signup-otp-verification'
                      ? 'Enter the 6-digit verification code from your email to complete registration.'
                      : 'Click the link in your email to sign in, or enter the verification code below.'
                    }
                  </p>
                </div>
                
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 text-center">
                  {authStep === 'signup-otp-verification' 
                    ? 'Enter 6-digit verification code'
                    : 'Enter 6-digit verification code (optional)'
                  }
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-3 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-center text-base sm:text-lg tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                    required={authStep === 'signup-otp-verification'}
                  />
                </div>
                <p className="text-xs sm:text-sm text-gray-500 text-center mt-2">
                  {authStep === 'signup-otp-verification'
                    ? 'Check your email for the verification code'
                    : 'Check your email for the magic link or verification code'
                  }
                </p>
                
                <div className="text-center mt-4">
                  {!canResendOtp ? (
                    <p className="text-xs sm:text-sm text-gray-500">
                      Resend {authStep === 'signup-otp-verification' ? 'code' : 'link'} in {Math.floor(resendCountdown / 60)}:{(resendCountdown % 60).toString().padStart(2, '0')}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={loading}
                      className="text-blue-600 hover:text-blue-700 font-medium transition-colors disabled:opacity-50 text-sm"
                    >
                      Resend {authStep === 'signup-otp-verification' ? 'verification code' : 'magic link'}
                    </button>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
             className="w-full bg-blue-600 text-white py-2 sm:py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {loading ? 'Please wait...' : 
                authStep === 'signup-otp-verification' ? 'Verify Email' :
                authStep === 'signin-otp-verification' ? 'Verify Code' :
                isSignUp ? 'Create Account' : 'Sign In'
              }
            </button>
          </form>

          {authStep === 'credentials' && !isSignUp && (
            <div className="mt-4">
              <div className="text-center text-gray-500 text-xs sm:text-sm mb-3">or</div>
              <button
                onClick={handleMagicLinkSignIn}
                disabled={loading || !email || !isValidEmail(email)}
                className="w-full border border-gray-300 text-gray-700 py-2 sm:py-3 px-4 rounded-lg font-medium hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                Sign in with Magic Link
              </button>
            </div>
          )}

          {authStep.includes('otp-verification') && (
            <div className="mt-4">
              <button
                onClick={handleBackToCredentials}
               className="w-full flex items-center justify-center space-x-2 text-gray-600 hover:text-gray-800 font-medium transition-colors text-sm sm:text-base"
              >
               <ArrowLeft size={14} className="sm:w-4 sm:h-4" />
                <span>Back to {isSignUp ? 'Sign Up' : 'Sign In'}</span>
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            {authStep === 'credentials' && (
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setError('')
                  setPassword('')
                }}
               className="text-blue-600 hover:text-blue-700 font-medium transition-colors text-sm sm:text-base"
              >
                {isSignUp
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Sign up"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}