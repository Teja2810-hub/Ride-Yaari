/**
 * Avatar generation utilities for new users
 */

export interface AvatarConfig {
  gender: string
  style: 'initials' | 'generated' | 'placeholder'
}

/**
 * Get default avatar URL based on user gender
 */
export const getDefaultAvatarUrl = (gender: string, fullName: string): string => {
  const initial = fullName.charAt(0).toUpperCase()
  
  // Use different background colors based on gender
  const colorSchemes = {
    male: {
      bg: '3B82F6', // Blue
      text: 'FFFFFF'
    },
    female: {
      bg: 'EC4899', // Pink
      text: 'FFFFFF'
    },
    other: {
      bg: '10B981', // Emerald
      text: 'FFFFFF'
    },
    prefer_not_to_say: {
      bg: '6B7280', // Gray
      text: 'FFFFFF'
    },
    default: {
      bg: '3B82F6', // Blue
      text: 'FFFFFF'
    }
  }

  const scheme = colorSchemes[gender as keyof typeof colorSchemes] || colorSchemes.default

  // Generate gender-appropriate avatar
  if (gender === 'male') {
    return `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(fullName)}`
  } else if (gender === 'female') {
    return `https://avatar.iran.liara.run/public/girl?username=${encodeURIComponent(fullName)}`
  } else {
    // For other/prefer_not_to_say/default, use initials with color scheme
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initial)}&background=${scheme.bg}&color=${scheme.text}&size=200&font-size=0.6&bold=true&format=png`
  }
}

/**
 * Get avatar style based on gender
 */
export const getAvatarStyle = (gender: string): string => {
  const styles = {
    male: 'rounded-full border-4 border-indigo-200',
    female: 'rounded-full border-4 border-pink-200',
    other: 'rounded-full border-4 border-emerald-200',
    prefer_not_to_say: 'rounded-full border-4 border-gray-200',
    default: 'rounded-full border-4 border-blue-200'
  }

  return styles[gender as keyof typeof styles] || styles.default
}

/**
 * Generate initials from full name
 */
export const generateInitials = (fullName: string): string => {
  if (!fullName) return 'U'
  
  const names = fullName.trim().split(' ')
  if (names.length === 1) {
    return names[0].charAt(0).toUpperCase()
  }
  
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase()
}

/**
 * Get gender-specific placeholder text
 */
export const getGenderPlaceholder = (gender: string): string => {
  const placeholders = {
    male: 'Welcome to RideYaari! 👨‍💼',
    female: 'Welcome to RideYaari! 👩‍💼',
    other: 'Welcome to RideYaari! 🧑‍💼',
    prefer_not_to_say: 'Welcome to RideYaari! 👤',
    default: 'Welcome to RideYaari! 🚀'
  }

  return placeholders[gender as keyof typeof placeholders] || placeholders.default
}