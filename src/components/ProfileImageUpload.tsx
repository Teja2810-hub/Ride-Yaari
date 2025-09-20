import React, { useState, useRef } from 'react'
import { Camera, Upload, Trash2, User, X, Check, AlertTriangle } from 'lucide-react'
import { uploadProfileImage, deleteProfileImage } from '../utils/profileHelpers'

interface ProfileImageUploadProps {
  currentImageUrl?: string
  onImageChange: (imageUrl: string) => void
  userId: string
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function ProfileImageUpload({
  currentImageUrl,
  onImageChange,
  userId,
  disabled = false,
  size = 'md'
}: ProfileImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  }

  const iconSizes = {
    sm: 24,
    md: 32,
    lg: 40
  }

  const buttonSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')
    setSuccess('')

    try {
      // Delete old image if exists
      if (currentImageUrl) {
        await deleteProfileImage(currentImageUrl)
      }

      const result = await uploadProfileImage(userId, file)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to upload image')
      }

      onImageChange(result.imageUrl || '')
      setSuccess('Image uploaded successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Error uploading image:', error)
      setError(error.message || 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = async () => {
    if (!currentImageUrl) return

    try {
      await deleteProfileImage(currentImageUrl)
      onImageChange('')
      setSuccess('Image removed successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Error removing image:', error)
      setError('Failed to remove image')
    }
  }

  return (
    <div className="text-center">
      {/* Image Display */}
      <div className="relative inline-block">
        <div className={`${sizeClasses[size]} bg-gray-200 rounded-full overflow-hidden relative`}>
          {currentImageUrl ? (
            <img
              src={currentImageUrl}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-blue-100">
              <User size={iconSizes[size]} className="text-blue-600" />
            </div>
          )}
          
          {uploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            </div>
          )}
        </div>
        
        {/* Upload Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className={`absolute bottom-0 right-0 ${buttonSizes[size]} bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Camera size={size === 'sm' ? 12 : 16} />
        </button>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      {/* Action Buttons */}
      <div className="mt-3 space-x-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload size={14} />
          <span>{currentImageUrl ? 'Change Photo' : 'Upload Photo'}</span>
        </button>
        
        {currentImageUrl && (
          <button
            type="button"
            onClick={handleRemoveImage}
            disabled={disabled || uploading}
            className="flex items-center space-x-1 text-red-600 hover:text-red-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={14} />
            <span>Remove</span>
          </button>
        )}
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <X size={14} className="text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Check size={14} className="text-green-600" />
            <p className="text-sm text-green-800">{success}</p>
          </div>
        </div>
      )}

      {/* Upload Guidelines */}
      <p className="text-xs text-gray-500 mt-2">
        Upload a profile picture (max 5MB, JPG/PNG/GIF)
      </p>
    </div>
  )
}