import React, { useState, useRef } from 'react'
import { User, Lock, Eye, EyeOff, Camera, X, Check, AlertTriangle, Upload, Trash2, Mail } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import LoadingSpinner from './LoadingSpinner'
import ErrorMessage from './ErrorMessage'
import PasswordStrengthIndicator from './PasswordStrengthIndicator'
import {
  updateUserProfile,
  changeUserPassword,
  uploadProfileImage,
  deleteProfileImage,
  validateProfileData,
  validatePasswordData
} from '../utils/profileHelpers'
import { getDefaultAvatarUrl } from '../utils/avatarHelpers'

interface ProfileEditFormProps {
  onClose: () => void
  onSuccess?: () => void
}

interface ProfileData {
  full_name: string
  age: string
  gender: string
  profile_image_url: string
}

interface PasswordData {
  current_password: string
  new_password: string
  confirm_password: string
}

interface EmailChangeState {
  step: 'idle' | 'password' | 'otp'
  newEmail: string
  currentPassword: string
  otp: string
}

export default function ProfileEditForm({ onClose, onSuccess }: ProfileEditFormProps) {
  const { user, userProfile, refreshUserProfile } = useAuth()
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'email'>('profile')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [imageUploading, setImageUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [emailChange, setEmailChange] = useState<EmailChangeState>({
    step: 'idle',
    newEmail: '',
    currentPassword: '',
    otp: ''
  })

  // Form states
  const [profileData, setProfileData] = useState<ProfileData>({
    full_name: userProfile?.full_name || '',
    age: userProfile?.age?.toString() || '',
    gender: userProfile?.gender || '',
    profile_image_url: userProfile?.profile_image_url || ''
  })

  const [passwordData, setPasswordData] = useState<PasswordData>({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })


  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    setImageUploading(true)
    setError('')
    setSuccess('')

    try {
      const result = await uploadProfileImage(user.id, file)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to upload image')
      }

      // Delete old image after successful upload
      if (profileData.profile_image_url && profileData.profile_image_url !== result.imageUrl) {
        try {
          await deleteProfileImage(profileData.profile_image_url)
        } catch (deleteError) {
          console.warn('Failed to delete old image:', deleteError)
          // Don't fail the upload if deletion fails
        }
      }

      setProfileData(prev => ({ ...prev, profile_image_url: result.imageUrl || '' }))
      setSuccess('Image uploaded successfully! Don\'t forget to save your changes.')
    } catch (error: any) {
      console.error('Error uploading image:', error)
      setError(error.message || 'Failed to upload image. Please try again.')
    } finally {
      setImageUploading(false)
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // Validate data
    const validation = validateProfileData({
      full_name: profileData.full_name,
      age: profileData.age ? parseInt(profileData.age) : undefined,
      gender: profileData.gender || undefined,
      profile_image_url: profileData.profile_image_url || undefined
    })

    if (!validation.isValid) {
      setError(validation.errors.join(', '))
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const updateData = {
        full_name: profileData.full_name.trim(),
        profile_image_url: profileData.profile_image_url || null,
        age: profileData.age ? parseInt(profileData.age) : undefined,
        gender: profileData.gender || undefined
      }

      const result = await updateUserProfile(user.id, updateData)

      if (!result.success) {
        throw new Error(result.error || 'Failed to update profile')
      }

      setSuccess('Profile updated successfully!')
      // Refresh the profile in context to update UI immediately
      await refreshUserProfile()
      if (onSuccess) onSuccess()
    } catch (error: any) {
      console.error('Error updating profile:', error)
      setError(error.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // Validate passwords match
    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('New passwords do not match')
      return
    }

    // Validate password data
    const validation = validatePasswordData({
      currentPassword: passwordData.current_password,
      newPassword: passwordData.new_password
    })

    if (!validation.isValid) {
      setError(validation.errors.join(', '))
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const result = await changeUserPassword(user.email!, {
        currentPassword: passwordData.current_password,
        newPassword: passwordData.new_password
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to update password')
      }

      // Log password change for security
      await supabase
        .from('password_change_log')
        .insert({
          user_id: user.id,
          ip_address: 'unknown', // Could be enhanced with actual IP detection
          user_agent: navigator.userAgent
        })

      setSuccess('Password updated successfully!')
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      })
    } catch (error: any) {
      console.error('Error updating password:', error)
      setError(error.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }


  const removeProfileImage = () => {
    if (profileData.profile_image_url) {
      // Delete from storage in background
      deleteProfileImage(profileData.profile_image_url).catch(console.warn)
    }
    setProfileData(prev => ({ ...prev, profile_image_url: '' }))
    setSuccess('Profile image removed! Don\'t forget to save your changes.')
  }

  const handleInitiateEmailChange = async () => {
    if (!emailChange.newEmail || !emailChange.currentPassword) {
      setError('Please fill in all fields')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailChange.newEmail)) {
      setError('Please enter a valid email address')
      return
    }

    if (emailChange.newEmail === user?.email) {
      setError('New email must be different from current email')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !sessionData.session) {
        throw new Error('Session not found')
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${sessionData.session.access_token}`
        },
        body: JSON.stringify({
          type: 'password',
          email: user?.email,
          password: emailChange.currentPassword
        })
      })

      if (!response.ok) {
        throw new Error('Current password is incorrect')
      }

      const { error: updateError } = await supabase.auth.updateUser(
        { email: emailChange.newEmail }
      )

      if (updateError) {
        throw new Error(updateError.message)
      }

      setEmailChange(prev => ({ ...prev, step: 'otp' }))
      setSuccess('Verification code sent to your current email!')
    } catch (error: any) {
      setError(error.message || 'Failed to initiate email change')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (!emailChange.otp || emailChange.otp.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: user?.email!,
        token: emailChange.otp,
        type: 'email_change'
      })

      if (verifyError) {
        throw new Error(verifyError.message)
      }

      if (!data?.user) {
        throw new Error('Verification failed')
      }

      setSuccess('Email updated successfully!')
      await refreshUserProfile()

      setTimeout(() => {
        setEmailChange({ step: 'idle', newEmail: '', currentPassword: '', otp: '' })
        if (onSuccess) onSuccess()
      }, 2000)
    } catch (error: any) {
      setError(error.message || 'Invalid or expired verification code')
      setLoading(false)
    }
  }

  const resetEmailChange = () => {
    setEmailChange({ step: 'idle', newEmail: '', currentPassword: '', otp: '' })
    setError('')
    setSuccess('')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Edit Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex">
            {[
              { id: 'profile', label: 'Profile Info', icon: <User size={16} /> },
              { id: 'password', label: 'Password', icon: <Lock size={16} /> },
              { id: 'email', label: 'Email', icon: <Mail size={16} /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-6 py-4 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {error && (
            <ErrorMessage
              message={error}
              onDismiss={() => setError('')}
              className="mb-6"
            />
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <Check size={20} className="text-green-600" />
                <p className="text-green-800">{success}</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="mb-6">
              <LoadingSpinner text="Updating..." />
            </div>
          )}

          {/* Profile Info Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              {/* Profile Image */}
              <div className="text-center">
                <div className="relative inline-block">
                  <div className="w-24 h-24 bg-gray-200 rounded-full overflow-hidden">
                    {profileData.profile_image_url ? (
                      <img
                        src={profileData.profile_image_url}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.warn('Profile image failed to load, showing default avatar')
                          // Hide the broken image element
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-blue-100">
                        <User size={32} className="text-blue-600" />
                      </div>
                    )}
                  </div>
                  
                  {imageUploading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    </div>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={imageUploading}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Camera size={16} />
                  </button>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                
                <div className="mt-3 space-x-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={imageUploading}
                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 font-medium text-sm disabled:opacity-50"
                  >
                    <Upload size={14} />
                    {profileData.profile_image_url ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  {profileData.profile_image_url && (
                    <button
                      type="button"
                      onClick={removeProfileImage}
                      className="flex items-center space-x-1 text-red-600 hover:text-red-700 font-medium text-sm"
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Upload a profile picture (max 5MB, JPG/PNG)
                </p>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={profileData.full_name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>

              {/* Age */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age
                </label>
                <input
                  type="number"
                  value={profileData.age}
                  onChange={(e) => setProfileData(prev => ({ ...prev, age: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter your age"
                  min="13"
                  max="120"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <select
                  value={profileData.gender}
                  onChange={(e) => {
                    const newGender = e.target.value
                    setProfileData(prev => {
                      // Update avatar if no custom image is set
                      const shouldUpdateAvatar = !prev.profile_image_url || 
                        prev.profile_image_url.includes('ui-avatars.com') ||
                        prev.profile_image_url.includes('avatar.iran.liara.run')
                      
                      return {
                        ...prev,
                        gender: newGender,
                        profile_image_url: shouldUpdateAvatar 
                          ? getDefaultAvatarUrl(newGender || 'default', prev.full_name)
                          : prev.profile_image_url
                      }
                    })
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Selecting a gender will update your default avatar if you haven't uploaded a custom image
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !profileData.full_name.trim()}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordUpdate} className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle size={20} className="text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-900 mb-1">Password Security</h4>
                    <p className="text-sm text-yellow-800">
                      Choose a strong password with at least 6 characters. Your current password is required to make changes.
                    </p>
                  </div>
                </div>
              </div>

              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, current_password: e.target.value }))}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Enter current password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Enter new password"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Confirm new password"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {passwordData.new_password && passwordData.confirm_password && 
                 passwordData.new_password !== passwordData.confirm_password && (
                  <p className="text-sm text-red-600 mt-1">Passwords do not match</p>
                )}
              </div>

              {/* Password Strength Indicator */}
              {passwordData.new_password && (
                <PasswordStrengthIndicator 
                  password={passwordData.new_password}
                  className="mt-4"
                />
              )}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !passwordData.current_password || !passwordData.new_password || 
                           passwordData.new_password !== passwordData.confirm_password}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          )}

          {/* Email Tab */}
          {activeTab === 'email' && (
            <div className="space-y-6">
              {emailChange.step === 'idle' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Mail size={20} className="text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-blue-900 mb-1">Email Change Process</h4>
                        <p className="text-sm text-blue-800">
                          We'll send a verification code to your current email address to confirm the change.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="email"
                        value={user?.email || ''}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                        disabled
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="email"
                        value={emailChange.newEmail}
                        onChange={(e) => setEmailChange(prev => ({ ...prev, newEmail: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        placeholder="Enter new email address"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="password"
                        value={emailChange.currentPassword}
                        onChange={(e) => setEmailChange(prev => ({ ...prev, currentPassword: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        placeholder="Enter current password"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleInitiateEmailChange}
                      disabled={loading || !emailChange.newEmail || !emailChange.currentPassword}
                      className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Processing...' : 'Change Email'}
                    </button>
                  </div>
                </div>
              )}

              {emailChange.step === 'otp' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Mail size={32} className="text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Verify Your Email</h3>
                    <p className="text-gray-600">
                      We've sent a 6-digit verification code to
                    </p>
                    <p className="font-semibold text-gray-900 mt-1">{user?.email}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enter 6-digit code
                    </label>
                    <input
                      type="text"
                      value={emailChange.otp}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                        setEmailChange(prev => ({ ...prev, otp: value }))
                      }}
                      className="w-full px-4 py-3 text-center text-2xl tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="000000"
                      maxLength={6}
                      autoFocus
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={resetEmailChange}
                      className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleVerifyOTP}
                      disabled={loading || emailChange.otp.length !== 6}
                      className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Verifying...' : 'Verify Code'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

    </div>
  )
}