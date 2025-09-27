import { supabase } from './supabase'
import { retryWithBackoff } from './errorUtils'

export interface BlockedUser {
  id: string
  blocked_id: string
  reason?: string
  created_at: string
  user_profiles: {
    id: string
    full_name: string
    profile_image_url?: string
  }
}

/**
 * Block a user
 */
export const blockUser = async (
  blockerId: string,
  blockedId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> => {
  return retryWithBackoff(async () => {
    if (blockerId === blockedId) {
      throw new Error('You cannot block yourself')
    }

    const { error } = await supabase
      .from('user_blocks')
      .insert({
        blocker_id: blockerId,
        blocked_id: blockedId,
        reason: reason || null
      })

    if (error) {
      if (error.code === '23505') {
        throw new Error('User is already blocked')
      }
      throw new Error(error.message)
    }

    return { success: true }
  })
}

/**
 * Unblock a user
 */
export const unblockUser = async (
  blockerId: string,
  blockedId: string
): Promise<{ success: boolean; error?: string }> => {
  return retryWithBackoff(async () => {
    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId)

    if (error) {
      throw new Error(error.message)
    }

    return { success: true }
  })
}

/**
 * Get list of blocked users
 */
export const getBlockedUsers = async (userId: string): Promise<BlockedUser[]> => {
  return retryWithBackoff(async () => {
    const { data, error } = await supabase
      .from('user_blocks')
      .select(`
        *,
        user_profiles!user_blocks_blocked_id_fkey (
          id,
          full_name,
          profile_image_url
        )
      `)
      .eq('blocker_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return data || []
  })
}

/**
 * Check if a user is blocked
 */
export const isUserBlocked = async (
  blockerId: string,
  blockedId: string
): Promise<boolean> => {
  try {
    // Validate input parameters
    if (!blockerId || !blockedId || !blockerId.trim() || !blockedId.trim()) {
      console.warn('Invalid user IDs provided to isUserBlocked:', { blockerId, blockedId })
      return false
    }

    console.log('Checking if user is blocked:', { blockerId, blockedId })
    
    // Add timeout to prevent infinite loading
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Blocking check timeout')), 5000)
    )
    
    const { data, error } = await Promise.race([
      supabase
        .from('user_blocks')
        .select('id')
        .eq('blocker_id', blockerId)
        .eq('blocked_id', blockedId)
        .limit(1),
      timeoutPromise
    ]) as { data: any; error: any }

    const isBlocked = !error && data && data.length > 0
    console.log('Blocking check result:', { isBlocked, error })
    return isBlocked
  } catch (error) {
    console.error('Error checking if user is blocked:', error)
    return false
  }
}

/**
 * Delete chat conversation for a user
 */
export const deleteChatConversation = async (
  userId: string,
  otherUserId: string
): Promise<{ success: boolean; error?: string }> => {
  return retryWithBackoff(async () => {
    // Validate input parameters
    if (!userId || !otherUserId || !userId.trim() || !otherUserId.trim()) {
      throw new Error('Invalid user IDs provided')
    }

    console.log('Deleting chat conversation for user:', { userId, otherUserId })
    
    // Add timeout to prevent infinite loading
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Chat deletion timeout')), 10000)
    )
    
    // Add a chat deletion record for this user (soft delete approach)
    const { error: insertRecordError } = await Promise.race([
      supabase
        .from('user_chat_deletions')
        .upsert({
          user_id: userId,
          other_user_id: otherUserId,
          deleted_at: new Date().toISOString()
        }),
      timeoutPromise
    ]) as { error: any }

    if (insertRecordError) {
      console.error('Error creating chat deletion record:', insertRecordError)
      throw new Error(insertRecordError.message)
    }

    console.log('Chat conversation marked as deleted for user:', userId)

    return { success: true }
  })
}

/**
 * Clear chat deletion record to allow new conversations
 */
export const clearChatDeletion = async (
  userId: string,
  otherUserId: string
): Promise<{ success: boolean; error?: string }> => {
  return retryWithBackoff(async () => {
    console.log('Clearing chat deletion for user:', { userId, otherUserId })
    
    // Add timeout to prevent infinite loading
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Clear deletion timeout')), 10000)
    )
    
    const { error } = await Promise.race([
      supabase
        .from('user_chat_deletions')
        .delete()
        .eq('user_id', userId)
        .eq('other_user_id', otherUserId),
      timeoutPromise
    ]) as { error: any }

    if (error) {
      throw new Error(error.message)
    }

    return { success: true }
  })
}

/**
 * Restore deleted chat conversation
 */
export const restoreChatConversation = async (
  userId: string,
  otherUserId: string
): Promise<{ success: boolean; error?: string }> => {
  return retryWithBackoff(async () => {
    const { error } = await supabase
      .from('user_chat_deletions')
      .delete()
      .eq('user_id', userId)
      .eq('other_user_id', otherUserId)

    if (error) {
      throw new Error(error.message)
    }

    return { success: true }
  })
}

/**
 * Check if chat is deleted for a user
 */
export const isChatDeleted = async (
  userId: string,
  otherUserId: string
): Promise<boolean> => {
  try {
    // Validate input parameters
    if (!userId || !otherUserId || !userId.trim() || !otherUserId.trim()) {
      console.warn('Invalid user IDs provided to isChatDeleted:', { userId, otherUserId })
      return false
    }

    console.log('Checking if chat is deleted for user:', { userId, otherUserId })
    
    // Add timeout to prevent infinite loading
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Chat deletion check timeout')), 5000)
    )
    
    const { data, error } = await Promise.race([
      supabase
        .from('user_chat_deletions')
        .select('id')
        .eq('user_id', userId)
        .eq('other_user_id', otherUserId)
        .limit(1),
      timeoutPromise
    ]) as { data: any; error: any }

    const isDeleted = !error && data && data.length > 0
    console.log('Chat deletion check result:', { isDeleted, error })
    return isDeleted
  } catch (error) {
    console.error('Error checking if chat is deleted:', error)
    return false
  }
}

/**
 * Get chat deletion timestamp for a user
 */
export const getChatDeletionTime = async (
  userId: string,
  otherUserId: string
): Promise<Date | null> => {
  try {
    const { data, error } = await supabase
      .from('user_chat_deletions')
      .select('deleted_at')
      .eq('user_id', userId)
      .eq('other_user_id', otherUserId)
      .single()

    if (error || !data) return null
    
    return new Date(data.deleted_at)
  } catch (error) {
    console.error('Error getting chat deletion time:', error)
    return null
  }
}