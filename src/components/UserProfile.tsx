import React, { useState, useEffect } from 'react'
import { ArrowLeft, User, Mail, Calendar, Users, Camera, Save, Eye, EyeOff, Upload, X, Car, Plane, Check, Clock, MapPin, MessageCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { Trip, CarRide, ChatMessage, RideConfirmation } from '../types'
import ReviewForm from './ReviewForm'
import { getCurrencySymbol } from '../utils/currencies'
import RideConfirmationActions from './RideConfirmationActions'

interface UserProfileProps {
  onBack: () => void
  onStartChat: (userId: string, userName: string) => void
  onEditTrip: (trip: Trip) => void
  onEditRide: (ride: CarRide) => void
  initialTab?: string
}

export default function UserProfile({ onBack, onStartChat, onEditTrip, onEditRide, initialTab }: UserProfileProps) {
  const { user, userProfile, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState<'profile' | 'rides-posted' | 'rides-taken' | 'chats' | 'confirmations' | 'review'>(initialTab as any || 'profile')
  const [loading, setLoading] = useState(false)
  const [trips, setTrips] = useState<Trip[]>([])
  const [rides, setRides] = useState<CarRide[]>([])
  const [chats, setChats] = useState<ChatMessage[]>([])
  const [ridesPosted, setRidesPosted] = useState<{ carRides: CarRide[], airportTrips: Trip[] }>({ carRides: [], airportTrips: [] })
  const [ridesTaken, setRidesTaken] = useState<{ carRides: any[], airportTrips: any[] }>({ carRides: [], airportTrips: [] })
  const [receivedConfirmations, setReceivedConfirmations] = useState<RideConfirmation[]>([])
  const [sentRequests, setSentRequests] = useState<RideConfirmation[]>([])
  
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

  // Update active tab when initialTab changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab as any)
    }
  }, [initialTab])
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
    if (activeTab === 'rides-posted') {
      fetchRidesPosted()
    } else if (activeTab === 'rides-taken') {
      fetchRidesTaken()
    } else if (activeTab === 'chats') {
      fetchUserChats()
    } else if (activeTab === 'confirmations') {
      fetchReceivedConfirmations()
      fetchSentRequests()
    }
  }, [activeTab])

  // Helper function to check if a ride/trip is in the past
  const isRidePast = (departureDateTime: string) => {
    return new Date(departureDateTime) <= new Date()
  }

  const isTripPast = (travelDate: string) => {
    const tripDate = new Date(travelDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return tripDate < today
  }

  const fetchRidesPosted = async () => {
    if (!user) return
    
    // Fetch car rides posted by user
    const { data: carRides } = await supabase
      .from('car_rides')
      .select(`
        *,
        ride_confirmations!ride_confirmations_ride_id_fkey (
          id,
          passenger_id,
          status,
          confirmed_at,
          user_profiles!ride_confirmations_passenger_id_fkey (
            id,
            full_name,
            profile_image_url
          )
        )
      `)
      .eq('user_id', user.id)
      .order('departure_date_time', { ascending: false })

    // Fetch airport trips posted by user
    const { data: airportTrips } = await supabase
      .from('trips')
      .select(`
        *,
        ride_confirmations!ride_confirmations_trip_id_fkey (
          id,
          passenger_id,
          status,
          confirmed_at,
          user_profiles!ride_confirmations_passenger_id_fkey (
            id,
            full_name,
            profile_image_url
          )
        )
      `)
      .eq('user_id', user.id)
      .order('travel_date', { ascending: false })

    setRidesPosted({
      carRides: carRides || [],
      airportTrips: airportTrips || []
    })
  }

  const fetchRidesTaken = async () => {
    if (!user) return
    
    // Fetch car rides user has been accepted to
    const { data: carRides } = await supabase
      .from('ride_confirmations')
      .select(`
        *,
        car_rides!ride_confirmations_ride_id_fkey (
          *,
          user_profiles!car_rides_user_id_fkey (
            id,
            full_name,
            profile_image_url
          )
        )
      `)
      .eq('passenger_id', user.id)
      .eq('status', 'accepted')
      .not('ride_id', 'is', null)
      .order('confirmed_at', { ascending: false })

    // Fetch airport trips user has been accepted to
    const { data: airportTrips } = await supabase
      .from('ride_confirmations')
      .select(`
        *,
        trips!ride_confirmations_trip_id_fkey (
          *,
          user_profiles!trips_user_id_fkey (
            id,
            full_name,
            profile_image_url
          )
        )
      `)
      .eq('passenger_id', user.id)
      .eq('status', 'accepted')
      .not('trip_id', 'is', null)
      .order('confirmed_at', { ascending: false })

    setRidesTaken({
      carRides: carRides || [],
      airportTrips: airportTrips || []
    })
  }

  const fetchReceivedConfirmations = async () => {
    if (!user) return
    
    const { data } = await supabase
      .from('ride_confirmations')
      .select(`
        *,
        user_profiles!ride_confirmations_passenger_id_fkey (
          id,
          full_name,
          profile_image_url
        ),
        car_rides!ride_confirmations_ride_id_fkey (
          id,
          from_location,
          to_location,
          departure_date_time,
          price,
          currency
        ),
        trips!ride_confirmations_trip_id_fkey (
          id,
          leaving_airport,
          destination_airport,
          travel_date,
          price,
          currency
        )
      `)
      .eq('ride_owner_id', user.id)
      .eq('status', 'pending')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })

    setReceivedConfirmations(data || [])
  }

  const fetchSentRequests = async () => {
    if (!user) return
    
    const { data } = await supabase
      .from('ride_confirmations')
      .select(`
        *,
        user_profiles!ride_confirmations_ride_owner_id_fkey (
          id,
          full_name,
          profile_image_url
        ),
        car_rides!ride_confirmations_ride_id_fkey (
          id,
          from_location,
          to_location,
          departure_date_time,
          price,
          currency
        ),
        trips!ride_confirmations_trip_id_fkey (
          id,
          leaving_airport,
          destination_airport,
          travel_date,
          price,
          currency
        )
      `)
      .eq('passenger_id', user.id)
      .order('created_at', { ascending: false })

    setSentRequests(data || [])
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
                { id: 'rides-posted', label: 'Rides Posted', icon: Calendar },
                { id: 'rides-taken', label: 'Rides Taken', icon: Users },
                { id: 'chats', label: 'Conversations', icon: Users },
                { id: 'confirmations', label: 'Confirmations', icon: Check },
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

            {activeTab === 'rides-posted' && (
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Rides Posted</h2>
                
                {/* Car Rides Posted */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Car size={20} className="mr-2 text-green-600" />
                    Car Rides ({ridesPosted.carRides.length})
                  </h3>
                  {ridesPosted.carRides.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <p className="text-gray-600">No car rides posted yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {ridesPosted.carRides.map((ride) => (
                        <div key={ride.id} className="border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-4">
                            <h4 className="text-base sm:text-lg font-semibold text-gray-900">Car Ride</h4>
                            {!isRidePast(ride.departure_date_time) && (
                              <button
                                onClick={() => onEditRide(ride)}
                                className="text-green-600 hover:text-green-700 font-medium text-xs sm:text-sm"
                              >
                                Edit Ride
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4">
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
                              <div className="font-semibold text-green-600 text-sm sm:text-base">
                                {getCurrencySymbol(ride.currency || 'USD')}{ride.price}
                              </div>
                            </div>
                          </div>
                          
                          {/* Accepted Passengers */}
                          {ride.ride_confirmations && ride.ride_confirmations.length > 0 && (
                            <div className="border-t border-gray-200 pt-4">
                              <h5 className="text-sm font-medium text-gray-900 mb-2">
                                Accepted Passengers ({ride.ride_confirmations.filter((c: any) => c.status === 'accepted').length})
                              </h5>
                              <div className="flex flex-wrap gap-2">
                                {ride.ride_confirmations
                                  .filter((confirmation: any) => confirmation.status === 'accepted')
                                  .map((confirmation: any) => (
                                    <div key={confirmation.id} className="flex items-center space-x-2 bg-green-50 px-3 py-1 rounded-full">
                                      <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                                        <span className="text-white text-xs font-medium">
                                          {confirmation.user_profiles.full_name.charAt(0)}
                                        </span>
                                      </div>
                                      <span className="text-sm text-green-800">{confirmation.user_profiles.full_name}</span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Airport Trips Posted */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Plane size={20} className="mr-2 text-blue-600" />
                    Airport Trips ({ridesPosted.airportTrips.length})
                  </h3>
                  {ridesPosted.airportTrips.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <p className="text-gray-600">No airport trips posted yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {ridesPosted.airportTrips.map((trip) => (
                        <div key={trip.id} className="border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-4">
                            <h4 className="text-base sm:text-lg font-semibold text-gray-900">Airport Trip</h4>
                            {!isTripPast(trip.travel_date) && (
                              <button
                                onClick={() => onEditTrip(trip)}
                                className="text-blue-600 hover:text-blue-700 font-medium text-xs sm:text-sm"
                              >
                                Edit Trip
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4">
                            <div>
                              <p className="text-xs sm:text-sm text-gray-600 mb-1">Departure</p>
                              <div className="font-semibold text-gray-900 text-sm sm:text-base">{trip.leaving_airport}</div>
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm text-gray-600 mb-1">Destination</p>
                              <div className="font-semibold text-gray-900 text-sm sm:text-base">{trip.destination_airport}</div>
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm text-gray-600 mb-1">Travel Date</p>
                              <div className="font-semibold text-gray-900 text-sm sm:text-base">
                                {formatDate(trip.travel_date)}
                              </div>
                            </div>
                          </div>
                          
                          {/* Accepted Passengers */}
                          {trip.ride_confirmations && trip.ride_confirmations.length > 0 && (
                            <div className="border-t border-gray-200 pt-4">
                              <h5 className="text-sm font-medium text-gray-900 mb-2">
                                Accepted Passengers ({trip.ride_confirmations.filter((c: any) => c.status === 'accepted').length})
                              </h5>
                              <div className="flex flex-wrap gap-2">
                                {trip.ride_confirmations
                                  .filter((confirmation: any) => confirmation.status === 'accepted')
                                  .map((confirmation: any) => (
                                    <div key={confirmation.id} className="flex items-center space-x-2 bg-blue-50 px-3 py-1 rounded-full">
                                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                        <span className="text-white text-xs font-medium">
                                          {confirmation.user_profiles.full_name.charAt(0)}
                                        </span>
                                      </div>
                                      <span className="text-sm text-blue-800">{confirmation.user_profiles.full_name}</span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'rides-taken' && (
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Rides Taken</h2>
                
                {/* Car Rides Taken */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Car size={20} className="mr-2 text-green-600" />
                    Car Rides ({ridesTaken.carRides.length})
                  </h3>
                  {ridesTaken.carRides.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <p className="text-gray-600">No car rides taken yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {ridesTaken.carRides.map((confirmation: any) => (
                        <div key={confirmation.id} className="border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-4">
                            <h4 className="text-base sm:text-lg font-semibold text-gray-900">Car Ride</h4>
                            <div className="flex items-center space-x-2">
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                                Confirmed
                              </span>
                              <button
                                onClick={() => onStartChat(confirmation.car_rides.user_profiles.id, confirmation.car_rides.user_profiles.full_name)}
                                className="text-blue-600 hover:text-blue-700 font-medium text-xs sm:text-sm flex items-center space-x-1"
                              >
                                <MessageCircle size={14} />
                                <span>Chat</span>
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4">
                            <div>
                              <p className="text-xs sm:text-sm text-gray-600 mb-1">From</p>
                              <div className="font-semibold text-gray-900 text-sm sm:text-base">{confirmation.car_rides.from_location}</div>
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm text-gray-600 mb-1">To</p>
                              <div className="font-semibold text-gray-900 text-sm sm:text-base">{confirmation.car_rides.to_location}</div>
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm text-gray-600 mb-1">Departure</p>
                              <div className="font-semibold text-gray-900 text-sm sm:text-base">
                                {formatDateTime(confirmation.car_rides.departure_date_time)}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm text-gray-600 mb-1">Price</p>
                              <div className="font-semibold text-green-600 text-sm sm:text-base">
                                {getCurrencySymbol(confirmation.car_rides.currency || 'USD')}{confirmation.car_rides.price}
                              </div>
                            </div>
                          </div>
                          
                          {/* Driver Info */}
                          <div className="border-t border-gray-200 pt-4">
                            <h5 className="text-sm font-medium text-gray-900 mb-2">Driver</h5>
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-medium">
                                  {confirmation.car_rides.user_profiles.full_name.charAt(0)}
                                </span>
                              </div>
                              <span className="text-sm text-gray-900">{confirmation.car_rides.user_profiles.full_name}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Airport Trips Taken */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Plane size={20} className="mr-2 text-blue-600" />
                    Airport Trips ({ridesTaken.airportTrips.length})
                  </h3>
                  {ridesTaken.airportTrips.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <p className="text-gray-600">No airport trips taken yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {ridesTaken.airportTrips.map((confirmation: any) => (
                        <div key={confirmation.id} className="border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-4">
                            <h4 className="text-base sm:text-lg font-semibold text-gray-900">Airport Trip</h4>
                            <div className="flex items-center space-x-2">
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                Confirmed
                              </span>
                              <button
                                onClick={() => onStartChat(confirmation.trips.user_profiles.id, confirmation.trips.user_profiles.full_name)}
                                className="text-blue-600 hover:text-blue-700 font-medium text-xs sm:text-sm flex items-center space-x-1"
                              >
                                <MessageCircle size={14} />
                                <span>Chat</span>
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4">
                            <div>
                              <p className="text-xs sm:text-sm text-gray-600 mb-1">Departure</p>
                              <div className="font-semibold text-gray-900 text-sm sm:text-base">{confirmation.trips.leaving_airport}</div>
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm text-gray-600 mb-1">Destination</p>
                              <div className="font-semibold text-gray-900 text-sm sm:text-base">{confirmation.trips.destination_airport}</div>
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm text-gray-600 mb-1">Travel Date</p>
                              <div className="font-semibold text-gray-900 text-sm sm:text-base">
                                {formatDate(confirmation.trips.travel_date)}
                              </div>
                            </div>
                          </div>
                          
                          {/* Trip Organizer Info */}
                          <div className="border-t border-gray-200 pt-4">
                            <h5 className="text-sm font-medium text-gray-900 mb-2">Trip Organizer</h5>
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-medium">
                                  {confirmation.trips.user_profiles.full_name.charAt(0)}
                                </span>
                              </div>
                              <span className="text-sm text-gray-900">{confirmation.trips.user_profiles.full_name}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'chats' && (
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Conversations</h2>
                {chats.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <MessageCircle size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">No conversations yet</p>
                    <p className="text-sm text-gray-500 mt-2">Start chatting with other users to see your conversations here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chats.map((chat) => (
                      <div key={chat.id} className="border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-md transition-shadow cursor-pointer"
                           onClick={() => onStartChat(chat.other_user.id, chat.other_user.full_name)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-medium">
                                {chat.other_user.full_name.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{chat.other_user.full_name}</h3>
                              <p className="text-sm text-gray-600 truncate max-w-xs">{chat.last_message}</p>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDateTime(chat.last_message_time)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'confirmations' && (
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Ride Confirmations</h2>
                
                {/* Received Confirmations */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Clock size={20} className="mr-2 text-orange-600" />
                    Pending Requests ({receivedConfirmations.length})
                  </h3>
                  {receivedConfirmations.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <p className="text-gray-600">No pending ride requests</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {receivedConfirmations.map((confirmation) => (
                        <div key={confirmation.id} className="border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-md transition-shadow">
                          <RideConfirmationActions
                            confirmation={confirmation}
                            onUpdate={() => {
                              fetchReceivedConfirmations()
                              fetchSentRequests()
                            }}
                            onStartChat={onStartChat}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sent Requests */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <MapPin size={20} className="mr-2 text-blue-600" />
                    My Requests ({sentRequests.length})
                  </h3>
                  {sentRequests.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <p className="text-gray-600">No ride requests sent</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sentRequests.map((request) => (
                        <div key={request.id} className="border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="text-base sm:text-lg font-semibold text-gray-900">
                                {request.car_rides ? 'Car Ride Request' : 'Airport Trip Request'}
                              </h4>
                              <div className="flex items-center space-x-2 mt-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  request.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                  request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                </span>
                              </div>
                            </div>
                            {request.status === 'accepted' && (
                              <button
                                onClick={() => onStartChat(request.user_profiles.id, request.user_profiles.full_name)}
                                className="text-blue-600 hover:text-blue-700 font-medium text-xs sm:text-sm flex items-center space-x-1"
                              >
                                <MessageCircle size={14} />
                                <span>Chat</span>
                              </button>
                            )}
                          </div>
                          
                          {/* Ride/Trip Details */}
                          {request.car_rides && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4">
                              <div>
                                <p className="text-xs sm:text-sm text-gray-600 mb-1">From</p>
                                <div className="font-semibold text-gray-900 text-sm sm:text-base">{request.car_rides.from_location}</div>
                              </div>
                              <div>
                                <p className="text-xs sm:text-sm text-gray-600 mb-1">To</p>
                                <div className="font-semibold text-gray-900 text-sm sm:text-base">{request.car_rides.to_location}</div>
                              </div>
                              <div>
                                <p className="text-xs sm:text-sm text-gray-600 mb-1">Departure</p>
                                <div className="font-semibold text-gray-900 text-sm sm:text-base">
                                  {formatDateTime(request.car_rides.departure_date_time)}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs sm:text-sm text-gray-600 mb-1">Price</p>
                                <div className="font-semibold text-green-600 text-sm sm:text-base">
                                  {getCurrencySymbol(request.car_rides.currency || 'USD')}{request.car_rides.price}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {request.trips && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4">
                              <div>
                                <p className="text-xs sm:text-sm text-gray-600 mb-1">Departure</p>
                                <div className="font-semibold text-gray-900 text-sm sm:text-base">{request.trips.leaving_airport}</div>
                              </div>
                              <div>
                                <p className="text-xs sm:text-sm text-gray-600 mb-1">Destination</p>
                                <div className="font-semibold text-gray-900 text-sm sm:text-base">{request.trips.destination_airport}</div>
                              </div>
                              <div>
                                <p className="text-xs sm:text-sm text-gray-600 mb-1">Travel Date</p>
                                <div className="font-semibold text-gray-900 text-sm sm:text-base">
                                  {formatDate(request.trips.travel_date)}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Ride Owner Info */}
                          <div className="border-t border-gray-200 pt-4">
                            <h5 className="text-sm font-medium text-gray-900 mb-2">
                              {request.car_rides ? 'Driver' : 'Trip Organizer'}
                            </h5>
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-medium">
                                  {request.user_profiles.full_name.charAt(0)}
                                </span>
                              </div>
                              <span className="text-sm text-gray-900">{request.user_profiles.full_name}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'review' && (
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Submit Review</h2>
                <ReviewForm />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}