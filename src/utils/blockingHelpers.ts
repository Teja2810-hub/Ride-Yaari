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
    console.log('Checking if user is blocked:', { blockerId, blockedId })
    const { data, error } = await supabase
      .from('user_blocks')
      .select('id')
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId)
      .limit(1)

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
    console.log('Deleting chat conversation:', { userId, otherUserId })
    
    // Delete all chat messages between these two users completely
    const { error: deleteError } = await supabase
      .from('chat_messages')
      .delete()
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)

    console.log('Chat deletion result:', { deleteError })
    if (deleteError) {
      throw new Error(deleteError.message)
    }

    // Also clean up any chat deletion records (since we're doing hard delete now)
    await supabase
      .from('chat_deletions')
      .delete()
      .or(`and(user_id.eq.${userId},other_user_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},other_user_id.eq.${userId})`)

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
      .from('chat_deletions')
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
 * Check if chat is deleted for a user (legacy function - now always returns false since we delete messages completely)
 */
export const isChatDeleted = async (
  userId: string,
  otherUserId: string
): Promise<boolean> => {
  // Since we now delete messages completely, chats are never "deleted" in the hidden sense
  // They're either completely gone (no messages) or they exist
  return false
}