import { supabase } from './supabase'
import { retryWithBackoff } from './errorUtils'
import { getDefaultAvatarUrl } from './avatarHelpers'

export interface ProfileUpdateData {
  full_name?: string
  age?: number
  gender?: string
  profile_image_url?: string
}

export interface PasswordChangeData {
  currentPassword: string
  newPassword: string
}

export interface EmailChangeData {
  newEmail: string
  currentPassword: string
}

/**
 * Update user profile information
 */
export const updateUserProfile = async (
  userId: string,
  profileData: ProfileUpdateData
): Promise<{ success: boolean; error?: string }> => {
  return retryWithBackoff(async () => {
    console.log('Updating user profile:', { userId, profileData })
    
    // First check if profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .single()
    
    if (fetchError && fetchError.code === 'PGRST116') {
      // Profile doesn't exist, create it first
      console.log('Profile does not exist, creating it first')
      
      // Generate default avatar if none provided
      const defaultAvatar = profileData.profile_image_url || 
        getDefaultAvatarUrl(profileData.gender || 'default', profileData.full_name || 'User')
      
      const { error: createError } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          full_name: profileData.full_name || 'New User',
          age: profileData.age,
          gender: profileData.gender,
          profile_image_url: defaultAvatar,
          notification_preferences: {
            email_notifications: true,
            browser_notifications: true,
            ride_requests: true,
            ride_confirmations: true,
            messages: true,
            system_updates: true,
            marketing_emails: false,
            sound_enabled: true
          }
        })
      
      if (createError) {
        console.error('Error creating profile:', createError)
        throw new Error(createError.message)
      }
      
      console.log('Profile created successfully')
      return { success: true }
    } else if (fetchError) {
      console.error('Error checking existing profile:', fetchError)
      throw new Error(fetchError.message)
    }
    
    // Profile exists, update it
    console.log('Profile exists, updating...')
    
    // If updating gender and using default avatar, update avatar too
    const updateData = { ...profileData }
    if (profileData.gender && profileData.profile_image_url?.includes('ui-avatars.com')) {
      updateData.profile_image_url = getDefaultAvatarUrl(profileData.gender, profileData.full_name || 'User')
    }
    
    const { error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', userId)

    if (error) {
      console.error('Error updating profile:', error)
      throw new Error(error.message)
    }

    console.log('Profile updated successfully')
    return { success: true }
  })
}

/**
 * Change user password with current password verification
 */
export const changeUserPassword = async (
  userEmail: string,
  passwordData: PasswordChangeData
): Promise<{ success: boolean; error?: string }> => {
  return retryWithBackoff(async () => {
    // First verify current password
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: passwordData.currentPassword
    })

    if (verifyError) {
      throw new Error('Current password is incorrect')
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: passwordData.newPassword
    })

    if (updateError) {
      throw new Error(updateError.message)
    }

    return { success: true }
  })
}

/**
 * Initiate email change process with verification
 */
export const initiateEmailChange = async (
  userId: string,
  emailData: EmailChangeData
): Promise<{ success: boolean; error?: string; verificationSent?: boolean }> => {
  return retryWithBackoff(async () => {
    // Get current user email
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user?.email) {
      throw new Error('Failed to get current user information')
    }

    // Verify current password
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: emailData.currentPassword
    })

    if (verifyError) {
      throw new Error('Current password is incorrect')
    }

    // Generate verification token
    const verificationToken = Math.random().toString(36).substring(2, 15) + 
                             Math.random().toString(36).substring(2, 15)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Store email change request
    const { error: insertError } = await supabase
      .from('email_change_verification')
      .insert({
        user_id: userId,
        old_email: user.email,
        new_email: emailData.newEmail,
        verification_token: verificationToken,
        expires_at: expiresAt.toISOString()
      })

    if (insertError) {
      throw new Error(insertError.message)
    }

    // Send verification email using Supabase auth
    const { error: emailError } = await supabase.auth.updateUser({
      email: emailData.newEmail
    })

    if (emailError) {
      throw new Error(emailError.message)
    }

    return { success: true, verificationSent: true }
  })
}

/**
 * Upload profile image to Supabase Storage
 */
export const uploadProfileImage = async (
  userId: string,
  file: File
): Promise<{ success: boolean; imageUrl?: string; error?: string }> => {
  return retryWithBackoff(async () => {
    // Validate file
    if (!file.type.startsWith('image/')) {
      throw new Error('Please select a valid image file')
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Image size must be less than 5MB')
    }

    // Create unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}-${Date.now()}.${fileExt}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      throw new Error(uploadError.message)
    }

    // Get public URL
    const { data } = supabase.storage
      .from('profile-images')
      .getPublicUrl(fileName)

    if (!data?.publicUrl) {
      throw new Error('Failed to get image URL')
    }

    return { success: true, imageUrl: data.publicUrl }
  })
}

/**
 * Delete old profile image from storage
 */
export const deleteProfileImage = async (imageUrl: string): Promise<void> => {
  try {
    // Extract file path from URL
    const url = new URL(imageUrl)
    const pathParts = url.pathname.split('/')
    const bucketIndex = pathParts.findIndex(part => part === 'profile-images')
    
    if (bucketIndex === -1 || bucketIndex >= pathParts.length - 1) {
      console.warn('Invalid profile image URL format:', imageUrl)
      return
    }
    
    // Get just the filename (last part of the URL)
    const fileName = pathParts[pathParts.length - 1]

    const { error } = await supabase.storage
      .from('profile-images')
      .remove([fileName])

    if (error) {
      console.warn('Failed to delete old profile image:', error)
      // Don't throw error as this is not critical
    }
  } catch (error) {
    console.warn('Error deleting profile image:', error)
  }
}

/**
 * Validate profile data before submission
 */
export const validateProfileData = (data: ProfileUpdateData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!data.full_name || data.full_name.trim().length < 2) {
    errors.push('Full name must be at least 2 characters long')
  }

  if (data.age !== undefined && (data.age < 13 || data.age > 120)) {
    errors.push('Age must be between 13 and 120')
  }

  if (data.gender && !['male', 'female', 'other', 'prefer_not_to_say'].includes(data.gender)) {
    errors.push('Invalid gender selection')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate password data
 */
export const validatePasswordData = (data: PasswordChangeData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!data.currentPassword) {
    errors.push('Current password is required')
  }

  if (!data.newPassword || data.newPassword.length < 6) {
    errors.push('New password must be at least 6 characters long')
  }

  if (data.newPassword === data.currentPassword) {
    errors.push('New password must be different from current password')
  }

  // Check password strength
  const hasUpperCase = /[A-Z]/.test(data.newPassword)
  const hasLowerCase = /[a-z]/.test(data.newPassword)
  const hasNumbers = /\d/.test(data.newPassword)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(data.newPassword)

  if (data.newPassword.length >= 6) {
    let strengthScore = 0
    if (hasUpperCase) strengthScore++
    if (hasLowerCase) strengthScore++
    if (hasNumbers) strengthScore++
    if (hasSpecialChar) strengthScore++

    if (strengthScore < 2) {
      errors.push('Password should contain a mix of uppercase, lowercase, numbers, and special characters')
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate email data
 */
export const validateEmailData = (data: EmailChangeData, currentEmail: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!data.newEmail || !data.newEmail.trim()) {
    errors.push('New email address is required')
  }

  if (!data.currentPassword || !data.currentPassword.trim()) {
    errors.push('Current password is required')
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (data.newEmail && !emailRegex.test(data.newEmail)) {
    errors.push('Please enter a valid email address')
  }

  if (data.newEmail && data.newEmail === currentEmail) {
    errors.push('New email must be different from current email')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Get password strength indicator
 */
export const getPasswordStrength = (password: string): {
  score: number
  label: string
  color: string
  suggestions: string[]
} => {
  if (!password) {
    return { score: 0, label: 'Enter password', color: 'gray', suggestions: [] }
  }

  let score = 0
  const suggestions: string[] = []

  // Length check
  if (password.length >= 8) score++
  else suggestions.push('Use at least 8 characters')

  // Character variety checks
  if (/[A-Z]/.test(password)) score++
  else suggestions.push('Add uppercase letters')

  if (/[a-z]/.test(password)) score++
  else suggestions.push('Add lowercase letters')

  if (/\d/.test(password)) score++
  else suggestions.push('Add numbers')

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++
  else suggestions.push('Add special characters')

  // Determine strength label and color
  let label: string
  let color: string

  if (score <= 1) {
    label = 'Weak'
    color = 'red'
  } else if (score <= 3) {
    label = 'Fair'
    color = 'yellow'
  } else if (score <= 4) {
    label = 'Good'
    color = 'blue'
  } else {
    label = 'Strong'
    color = 'green'
  }

  return { score, label, color, suggestions }
}