import React, { useState } from 'react'
import { Plane, Mail, Lock, User, Shield, ArrowLeft, HelpCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../utils/supabase'

type AuthStep = 'credentials' | 'otp-verification'

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

  const { signIn, signUp } = useAuth()

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
  const sendOTP = async (email: string, type: 'signup' | 'signin') => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/signup-otp-with-domain-check`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, type })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP')
      }

      // Start countdown timer after successful OTP send
      setCanResendOtp(false)
      setResendCountdown(60) // 1 minute countdown
      return data
    } catch (error: any) {
      throw new Error(error.message || 'Failed to send OTP')
    }
  }

  const handleResendOtp = async () => {
    if (!canResendOtp || !otpEmail) return
    
    setLoading(true)
    setError('')
    
    try {
      await sendOTP(otpEmail, isSignUp ? 'signup' : 'signin')
      setError('')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }
  const verifyOTP = async () => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: otpEmail,
        token: otpCode,
        type: 'magiclink'
      })

      if (error) throw error

      // If this is a signup and we have a user, create the profile
      if (isSignUp && data.user && fullName) {
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
      throw new Error(error.message || 'Invalid OTP code')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (authStep === 'credentials') {
        if (isSignUp) {
          // For signup, send OTP instead of creating account directly
          await sendOTP(email, 'signup')
          setOtpEmail(email)
          setAuthStep('otp-verification')
        } else {
          // For signin, try traditional password login first
          const { error } = await signIn(email, password)
          if (error) {
            // If password login fails, offer OTP option
            if (error.message.includes('Invalid login credentials')) {
              setError('Invalid credentials. Would you like to sign in with OTP instead?')
            } else {
              throw error
            }
          }
        }
      } else if (authStep === 'otp-verification') {
        await verifyOTP()
        // Success - user will be automatically signed in
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOTPSignIn = async () => {
    setLoading(true)
    setError('')

    try {
      await sendOTP(email, 'signin')
      setOtpEmail(email)
      setAuthStep('otp-verification')
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

  const getEmailDomainInfo = (email: string) => {
    if (!email) return ''
    
    // Only validate if email contains @ and appears complete
    if (!email.includes('@') || !email.includes('.')) return ''
    
    // Check if email looks complete (has @ and at least one . after @)
    const emailParts = email.split('@')
    if (emailParts.length !== 2) return ''
    
    const domainPart = emailParts[1]
    if (!domainPart || !domainPart.includes('.')) return ''
    
    const domain = email.toLowerCase().split('@')[1]
    if (!domain) return ''
    
    // Expanded list of allowed domains
    const allowedDomains = [
      'gmail.com', 'googlemail.com',
      'yahoo.com', 'yahoo.co.uk', 'yahoo.ca', 'yahoo.in',
      'outlook.com', 'hotmail.com', 'live.com',
      'icloud.com', 'me.com', 'mac.com',
      'aol.com', 'protonmail.com', 'proton.me'
    ]
    
    if (allowedDomains.includes(domain)) {
      return '✅ Gmail domain accepted'
    } else if (domain.endsWith('.edu')) {
      return '✅ Educational domain accepted'
    } else if (domain.endsWith('.ac.uk')) {
      return '✅ UK academic domain accepted'
    } else {
      return '❌ Domain not allowed. Only Gmail, Yahoo, Outlook, educational institutions, and approved domains are permitted.'
    }
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
                  <li>• <strong>Email domain not allowed:</strong> Only Gmail, Yahoo, Outlook, and educational domains (.edu, .ac.uk) are permitted</li>
                  <li>• <strong>Didn't receive OTP:</strong> Check your spam folder and ensure your email is correct</li>
                  <li>• <strong>Account already exists:</strong> Try signing in instead, or use "Sign in with Email OTP"</li>
                  <li>• <strong>OTP expired:</strong> Request a new verification code</li>
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
                      <p className="font-medium">Phone Support</p>
                      <p className="text-gray-600">CALL</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 flex items-center justify-center">
                      <span className="text-gray-600">💬</span>
                    </div>
                    <div>
                      <p className="font-medium">Live Chat</p>
                      <p className="text-gray-600">Available 24/7 on our website</p>
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
              {authStep === 'otp-verification' ? <Shield size={20} className="sm:w-7 sm:h-7" /> : <Plane size={20} className="sm:w-7 sm:h-7" />}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">RideYaari</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-2">
              {authStep === 'otp-verification' 
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
                  {email && isValidEmail(email) && (
                    <p className={`text-xs sm:text-sm mt-1 ${getEmailDomainInfo(email).startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
                      {getEmailDomainInfo(email)}
                    </p>
                  )}
                  {isSignUp && (
                    <p className="text-xs text-gray-500 mt-1">
                      Only Gmail, educational (.edu, .ac.uk), and approved domains are allowed
                    </p>
                  )}
                </div>

                {!isSignUp && (
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
                        placeholder="Enter your password"
                        required
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {authStep === 'otp-verification' && (
              <div>
                <div className="text-center mb-4 sm:mb-6">
                  <p className="text-sm sm:text-base text-gray-600">
                    We've sent a verification code to:
                  </p>
                  <p className="font-semibold text-gray-900 text-sm sm:text-base">{otpEmail}</p>
                  {isSignUp && (
                    <p className="text-xs sm:text-sm text-blue-600 mt-2">
                      If you previously started signup with this email, this code will complete your registration.
                    </p>
                  )}
                </div>
                
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 text-center">
                  Enter 6-digit verification code
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
                    required
                  />
                </div>
                <p className="text-xs sm:text-sm text-gray-500 text-center mt-2">
                  Check your email for the verification code
                </p>
                
                <div className="text-center mt-4">
                  {!canResendOtp ? (
                    <p className="text-xs sm:text-sm text-gray-500">
                      Resend code in {Math.floor(resendCountdown / 60)}:{(resendCountdown % 60).toString().padStart(2, '0')}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={loading}
                      className="text-blue-600 hover:text-blue-700 font-medium transition-colors disabled:opacity-50 text-sm"
                    >
                      Resend verification code
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
                authStep === 'otp-verification' ? 'Verify Code' :
                isSignUp ? 'Send Verification Code' : 'Sign In'
              }
            </button>
          </form>

          {authStep === 'credentials' && !isSignUp && (
            <div className="mt-4">
              <div className="text-center text-gray-500 text-xs sm:text-sm mb-3">or</div>
              <button
                onClick={handleOTPSignIn}
                disabled={loading || !email || !isValidEmail(email)}
                className="w-full border border-gray-300 text-gray-700 py-2 sm:py-3 px-4 rounded-lg font-medium hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                Sign in with Email OTP
              </button>
            </div>
          )}

          {authStep === 'otp-verification' && (
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