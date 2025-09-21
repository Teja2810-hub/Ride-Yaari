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
    const { data, error } = await supabase
      .from('user_blocks')
      .select('id')
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId)
      .limit(1)

    return !error && data && data.length > 0
  } catch (error) {
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
    // First, actually delete the chat messages between these users
    const { error: deleteMessagesError } = await supabase
      .from('chat_messages')
      .delete()
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)

    if (deleteMessagesError) {
      throw new Error(`Failed to delete messages: ${deleteMessagesError.message}`)
    }

    // Then mark the chat as deleted for this user (for UI purposes)
    const { error } = await supabase
      .from('chat_deletions')
      .upsert({
        user_id: userId,
        other_user_id: otherUserId,
        deleted_at: new Date().toISOString()
      })

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
 * Check if chat is deleted for a user
 */
export const isChatDeleted = async (
  userId: string,
  otherUserId: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('chat_deletions')
      .select('id')
      .eq('user_id', userId)
      .eq('other_user_id', otherUserId)
      .single()

    return !error && !!data
  } catch (error) {
    return false
  }
}