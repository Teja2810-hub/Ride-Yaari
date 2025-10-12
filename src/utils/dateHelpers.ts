/**
 * Date formatting utilities that handle timezone issues correctly
 */

/**
 * Format a date string (YYYY-MM-DD) for display without timezone shifts
 * This ensures the date displayed matches the date stored, regardless of timezone
 */
export const formatDateSafe = (dateString: string): string => {
  if (!dateString) return ''

  try {
    // Parse the date components to avoid timezone interpretation issues
    const [year, month, day] = dateString.split('-').map(Number)

    // Create date object in local timezone
    const date = new Date(year, month - 1, day) // month is 0-indexed

    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch (error) {
    console.error('Error formatting date:', error)
    return dateString
  }
}

/**
 * Format a date string without timezone conversion for system messages
 */
export const formatDateWithoutTimezone = (dateString: string): string => {
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  }).format(date)
}

/**
 * Format a date string for short display (e.g., "Oct 3, 2025")
 */
export const formatDateShort = (dateString: string): string => {
  if (!dateString) return ''
  
  try {
    // Handle both date strings and ISO datetime strings
    const date = new Date(dateString)
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return dateString
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch (error) {
    console.error('Error formatting date short:', error)
    return dateString
  }
}

/**
 * Format a date string with weekday abbreviation (e.g., "Thu, Oct 3, 2025")
 */
export const formatDateWithWeekday = (dateString: string): string => {
  if (!dateString) return ''
  
  try {
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch (error) {
    console.error('Error formatting date with weekday:', error)
    return dateString
  }
}

/**
 * Format a datetime string for display
 */
export const formatDateTimeSafe = (dateTimeString: string): string => {
  if (!dateTimeString) return ''
  
  try {
    const date = new Date(dateTimeString)
    
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  } catch (error) {
    console.error('Error formatting datetime:', error)
    return dateTimeString
  }
}

/**
 * Check if a date string is valid
 */
export const isValidDateString = (dateString: string): boolean => {
  if (!dateString) return false
  
  try {
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    
    return date.getFullYear() === year && 
           date.getMonth() === month - 1 && 
           date.getDate() === day
  } catch (error) {
    return false
  }
}