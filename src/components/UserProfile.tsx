import React, { useState, useEffect } from 'react'
import { ArrowLeft, User, Mail, Calendar, Users, Camera, Save, Eye, EyeOff, Upload, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { Trip, CarRide, ChatMessage } from '../types'
import ReviewForm from './ReviewForm'

interface UserProfileProps {
  onBack: () => void
  onStartChat: (userId: string, userName: string) => void
  onEditTrip: (trip: Trip) => void
  onEditRide: (ride: CarRide) => void
}

export default function UserProfile({ onBack, onStartChat, onEditTrip, onEditRide }: UserProfileProps) {
  const { user, userProfile, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState<'profile' | 'trips' | 'rides' | 'chats'>('profile')
  const [loading, setLoading] = useState(false)
  const [trips, setTrips] = useState<Trip[]>([])
  const [rides, setRides] = useState<CarRide[]>([])
  const [chats, setChats] = useState<ChatMessage[]>([])
  
  // Profile form state
  const [fullName, setFullName] = useState(userProfile?.full_name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [age, setAge] = useState(userProfile?.age || '')
  const [gender, setGender] = useState(userProfile?.gender || '')
  const [profileImageUrl, setProfileImageUrl] = useState(userProfile?.profile_image_url || '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [updateSuccess, setUpdateSuccess] = useState('')
  const [updateError, setUpdateError] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (userProfile) {
      setFullName(userProfile.full_name)
      setEmail(user?.email || '')
      setAge(userProfile.age || '')
      setGender(userProfile.gender || '')
      setProfileImageUrl(userProfile.profile_image_url || '')
      setPreviewUrl(userProfile.profile_image_url || null)
    }
  }, [userProfile])

  useEffect(() => {
    if (activeTab === 'trips') {
      fetchUserTrips()
    } else if (activeTab === 'rides') {
      fetchUserRides()
    } else if (activeTab === 'chats') {
      fetchUserChats()
    }
  }, [activeTab])

  const fetchUserTrips = async () => {
    if (!user) return
    
    const { data, error } = await supabase
      .from('trips')
      .select(`
        *,
        leaving_airport_info:airports!trips_leaving_airport_fkey (
          code,
          name,
          city,
          country
        ),
        destination_airport_info:airports!trips_destination_airport_fkey (
          code,
          name,
          city,
          country
        )
      `)
      .eq('user_id', user.id)
      .order('travel_date', { ascending: false })

    if (!error && data) {
      setTrips(data)
    }
  }

  const fetchUserRides = async () => {
    if (!user) return
    
    const { data, error } = await supabase
      .from('car_rides')
      .select('*')
      .eq('user_id', user.id)
      .order('departure_date_time', { ascending: false })

    if (!error && data) {
      setRides(data)
    }
  }

  const fetchUserChats = async () => {
    if (!user) return
    
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        sender:user_profiles!chat_messages_sender_id_fkey (
          id,
          full_name
        ),
        receiver:user_profiles!chat_messages_receiver_id_fkey (
          id,
          full_name
        )
      `)
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (!error && data) {
      // Group messages by conversation
      const conversations = new Map()
      data.forEach(message => {
        const otherUserId = message.sender_id === user.id ? message.receiver_id : message.sender_id
        const otherUser = message.sender_id === user.id ? message.receiver : message.sender
        
        if (!conversations.has(otherUserId)) {
          conversations.set(otherUserId, {
            ...message,
            other_user: otherUser,
            last_message: message.message_content,
            last_message_time: message.created_at
          })
        }
      })
      
      setChats(Array.from(conversations.values()))
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setUpdateError('Please select an image file')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setUpdateError('Image size must be less than 5MB')
        return
      }
      
      setSelectedFile(file)
      
      // Create preview URL
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      setUpdateError('')
    }
  }

  const handleImageUpload = async () => {
    if (!selectedFile || !user) return

    setUploadingImage(true)
    setUpdateError('')

    try {
      // Create unique filename
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      // Delete old image if exists
      if (profileImageUrl) {
        const oldPath = profileImageUrl.split('/').pop()
        if (oldPath) {
          await supabase.storage
            .from('avatars')
            .remove([`${user.id}/${oldPath}`])
        }
      }

      // Upload new image
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Update profile with new image URL
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ profile_image_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      setProfileImageUrl(publicUrl)
      setSelectedFile(null)
      setUpdateSuccess('Profile image updated successfully!')
      
      // Refresh the page to get updated profile
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error: any) {
      setUpdateError(error.message)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleRemoveImage = () => {
    setSelectedFile(null)
    setPreviewUrl(userProfile?.profile_image_url || null)
    setUpdateError('')
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setUpdateError('')
    setUpdateSuccess('')

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          full_name: fullName,
          age: age ? parseInt(age.toString()) : null,
          gender: gender || null,
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // Update email if changed
      if (email !== user?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email
        })

        if (emailError) throw emailError
        
        setUpdateSuccess('Profile updated! Please check your new email address to confirm the change.')
      } else {
        setUpdateSuccess('Profile updated successfully!')
      }

      // Update password if provided
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          throw new Error('Passwords do not match')
        }
        
        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword
        })

        if (passwordError) throw passwordError
      }

      if (!email || email === user?.email) {
        setUpdateSuccess('Profile updated successfully!')
      }
      setNewPassword('')
      setConfirmPassword('')
      
      // Refresh the page to get updated profile
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error: any) {
      setUpdateError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateTimeString: string) => {
    return new Date(dateTimeString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-2 sm:p-4">
      <div className="container mx-auto max-w-full sm:max-w-2xl md:max-w-4xl lg:max-w-6xl">
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center space-x-1 sm:space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors text-sm sm:text-base"
          >
            <ArrowLeft size={16} className="sm:w-5 sm:h-5" />
            <span>Back to Platform</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 sm:px-8 py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 text-center sm:text-left">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt="Profile"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User size={24} className="sm:w-8 sm:h-8 text-white" />
                )}
              </div>
              <div className="text-white">
                <h1 className="text-xl sm:text-2xl font-bold">{userProfile?.full_name}</h1>
                <p className="text-blue-100 text-sm sm:text-base">{user?.email}</p>
                <p className="text-blue-100 text-xs sm:text-sm">Member since {formatDate(userProfile?.created_at || '')}</p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto whitespace-nowrap px-4 sm:px-8 scrollbar-hide">
              {[
                { id: 'profile', label: 'Profile Settings', icon: User },
                { id: 'trips', label: 'My Trips', icon: Calendar },
                { id: 'rides', label: 'My Rides', icon: Calendar },
                { id: 'chats', label: 'Conversations', icon: Users },
                { id: 'review', label: 'Submit Review', icon: Users }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center space-x-1 sm:space-x-2 py-3 sm:py-4 px-2 sm:px-4 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={16} className="sm:w-[18px] sm:h-[18px]" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-4 sm:p-8">
            {activeTab === 'profile' && (
              <div className="max-w-full sm:max-w-2xl">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Profile Settings</h2>
                
                {updateSuccess && (
                  <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-xs sm:text-sm">
                    {updateSuccess}
                  </div>
                )}
                
                {updateError && (
                  <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs sm:text-sm">
                    {updateError}
                  </div>
                )}

                <form onSubmit={handleUpdateProfile} className="space-y-4 sm:space-y-6">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Profile Image
                    </label>
                    
                    {/* Image Preview */}
                    <div className="mb-4">
                      <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden mx-auto sm:mx-0">
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt="Profile preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User size={32} className="sm:w-12 sm:h-12 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* File Input */}
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3">
                        <label className="cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 sm:px-4 sm:py-2 rounded-lg border border-blue-200 transition-colors flex items-center space-x-2 text-sm">
                          <Camera size={16} className="sm:w-[18px] sm:h-[18px]" />
                          <span>Choose Image</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                        </label>
                        
                        {selectedFile && (
                          <>
                            <button
                              type="button"
                              onClick={handleImageUpload}
                              disabled={uploadingImage}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50 text-sm"
                            >
                              <Upload size={16} className="sm:w-[18px] sm:h-[18px]" />
                              <span>{uploadingImage ? 'Uploading...' : 'Upload'}</span>
                            </button>
                            
                            <button
                              type="button"
                              onClick={handleRemoveImage}
                              className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-colors flex items-center space-x-2 text-sm"
                            >
                              <X size={16} className="sm:w-[18px] sm:h-[18px]" />
                              <span>Cancel</span>
                            </button>
                          </>
                        )}
                      </div>
                      
                      {selectedFile && (
                        <p className="text-xs sm:text-sm text-gray-600">
                          Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      )}
                      
                      <p className="text-xs text-gray-500">
                        Supported formats: JPG, PNG, GIF. Maximum size: 5MB
                      </p>
                    </div>
                  </div>

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
                        required
                      />
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      Changing your email will require verification of the new email address
                    </p>
                  </div>

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
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        Age
                      </label>
                      <input
                        type="number"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm sm:text-base"
                        min="18"
                        max="100"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        Gender
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm sm:text-base"
                      >
                        <option value="">Prefer not to say</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4 sm:pt-6">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Change Password</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors pr-10 text-sm sm:text-base"
                            placeholder="Leave empty to keep current password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-2 sm:top-3 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? <EyeOff size={16} className="sm:w-5 sm:h-5" /> : <Eye size={16} className="sm:w-5 sm:h-5" />}
                          </button>
                        </div>
                      </div>

                      {newPassword && (
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                            Confirm New Password
                          </label>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm sm:text-base"
                            placeholder="Confirm your new password"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-center pt-4 sm:pt-6 space-y-3 sm:space-y-0">
                    <button
                      type="button"
                      onClick={signOut}
                      className="text-red-600 hover:text-red-700 font-medium transition-colors text-sm sm:text-base"
                    >
                      Sign Out
                    </button>
                    
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                    >
                      <Save size={16} className="sm:w-5 sm:h-5" />
                      <span>{loading ? 'Saving...' : 'Save Profile Changes'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'trips' && (
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">My Airport Trips</h2>
                {trips.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <Calendar size={32} className="sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No trips posted yet</h3>
                    <p className="text-sm sm:text-base text-gray-600">Start sharing your flight itinerary to help other travelers</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {trips.map((trip) => (
                      <div key={trip.id} className="border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Trip Details</h3>
                          <button
                            onClick={() => onEditTrip(trip)}
                            className="text-blue-600 hover:text-blue-700 font-medium text-xs sm:text-sm"
                          >
                            Edit Trip
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                          <div>
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">Departure</p>
                            <div className="font-semibold text-gray-900 text-sm sm:text-base">
                              {trip.leaving_airport_info?.code}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600">
                              {trip.leaving_airport_info?.city}, {trip.leaving_airport_info?.country}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">Destination</p>
                            <div className="font-semibold text-gray-900 text-sm sm:text-base">
                              {trip.destination_airport_info?.code}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600">
                              {trip.destination_airport_info?.city}, {trip.destination_airport_info?.country}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">Travel Date</p>
                            <div className="font-semibold text-gray-900 text-sm sm:text-base">
                              {formatDate(trip.travel_date)}
                            </div>
                            {trip.departure_time && (
                              <div className="text-xs sm:text-sm text-gray-600">
                                Departure: {trip.departure_time}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'rides' && (
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">My Car Rides</h2>
                {rides.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <Calendar size={32} className="sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No rides posted yet</h3>
                    <p className="text-sm sm:text-base text-gray-600">Start offering rides to help other travelers save money</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rides.map((ride) => (
                      <div key={ride.id} className="border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Ride Details</h3>
                          <button
                            onClick={() => onEditRide(ride)}
                            className="text-green-600 hover:text-green-700 font-medium text-xs sm:text-sm"
                          >
                            Edit Ride
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                          <div>
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">From</p>
                            <div className="font-semibold text-gray-900 text-sm sm:text-base">{ride.from_location}</div>
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">To</p>
                            <div className="font-semibold text-gray-900 text-sm sm:text-base">{ride.to_location}</div>
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">Departure</p>
                            <div className="font-semibold text-gray-900 text-sm sm:text-base">
                              {formatDateTime(ride.departure_date_time)}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">Price</p>
                            <div className="font-semibold text-green-600 text-sm sm:text-base">${ride.price}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'chats' && (
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">My Conversations</h2>
                {chats.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <Users size={32} className="sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No conversations yet</h3>
                    <p className="text-sm sm:text-base text-gray-600">Start chatting with other travelers to arrange services</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chats.map((chat) => (
                      <div 
                        key={chat.id} 
                        className="border border-gray-200 rounded-xl p-4 sm:p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => onStartChat(chat.other_user?.id || '', chat.other_user?.full_name || 'Unknown')}
                      >
                        <div className="flex items-center space-x-3 sm:space-x-4">
                          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 text-white rounded-full">
                            <span className="font-semibold text-sm sm:text-base">
                              {(chat.other_user?.full_name || 'U').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{chat.other_user?.full_name || 'Unknown'}</h3>
                            <p className="text-gray-600 text-xs sm:text-sm truncate">{chat.last_message}</p>
                            <p className="text-gray-400 text-xs">{formatDateTime(chat.last_message_time)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'review' && (
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Submit a Review</h2>
                <div className="max-w-full sm:max-w-2xl">
                  <ReviewForm onReviewSubmitted={() => {
                    // Optionally refresh reviews or show success message
                  }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}