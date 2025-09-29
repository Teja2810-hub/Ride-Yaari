/**
 * Popup frequency management utility
 * Controls when popups should be shown to users
 */

export interface PopupState {
  disclaimerShown: boolean
  welcomeShown: boolean
  lastShownDate: string
  sessionId: string
}

class PopupManager {
  private static instance: PopupManager
  private sessionId: string
  private storageKey = 'rideyaari-popup-state'

  constructor() {
    this.sessionId = this.generateSessionId()
  }

  static getInstance(): PopupManager {
    if (!PopupManager.instance) {
      PopupManager.instance = new PopupManager()
    }
    return PopupManager.instance
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private getStorageKey(userId?: string): string {
    return userId ? `${this.storageKey}-${userId}` : `${this.storageKey}-guest`
  }

  private getChatInteractionKey(userId?: string, otherUserId?: string): string {
    if (!userId || !otherUserId) return ''
    // Create a consistent key regardless of user order
    const sortedIds = [userId, otherUserId].sort()
    return `rideyaari-chat-interaction-${sortedIds[0]}-${sortedIds[1]}`
  }

  private getPopupState(userId?: string): PopupState {
    try {
      const stored = localStorage.getItem(this.getStorageKey(userId))
      if (stored) {
        const state = JSON.parse(stored)
        return {
          disclaimerShown: state.disclaimerShown || false,
          welcomeShown: state.welcomeShown || false,
          lastShownDate: state.lastShownDate || '',
          sessionId: state.sessionId || ''
        }
      }
    } catch (error) {
      console.warn('Error reading popup state:', error)
    }

    return {
      disclaimerShown: false,
      welcomeShown: false,
      lastShownDate: '',
      sessionId: ''
    }
  }

  private savePopupState(state: PopupState, userId?: string): void {
    try {
      localStorage.setItem(this.getStorageKey(userId), JSON.stringify(state))
    } catch (error) {
      console.warn('Error saving popup state:', error)
    }
  }

  /**
   * Check if disclaimer popup should be shown
   */
  shouldShowDisclaimer(type: string, userId?: string, otherUserId?: string): boolean {
    // For chat disclaimers, check if users have interacted before
    if ((type === 'chat-trip' || type === 'chat-ride') && userId && otherUserId) {
      const interactionKey = this.getChatInteractionKey(userId, otherUserId)
      const hasInteracted = localStorage.getItem(interactionKey)
      if (hasInteracted) {
        return false // Don't show disclaimer if they've interacted before
      }
    }

    const state = this.getPopupState(userId)
    const today = new Date().toDateString()
    
    // Show once per day or once per session for new sessions
    if (state.sessionId !== this.sessionId) {
      return true
    }
    
    if (state.lastShownDate !== today) {
      return true
    }
    
    return !state.disclaimerShown
  }

  /**
   * Mark disclaimer as shown
   */
  markDisclaimerShown(type: string, userId?: string, otherUserId?: string): void {
    // For chat disclaimers, mark interaction between users
    if ((type === 'chat-trip' || type === 'chat-ride') && userId && otherUserId) {
      const interactionKey = this.getChatInteractionKey(userId, otherUserId)
      localStorage.setItem(interactionKey, 'true')
    }

    const state = this.getPopupState(userId)
    state.disclaimerShown = true
    state.lastShownDate = new Date().toDateString()
    state.sessionId = this.sessionId
    this.savePopupState(state, userId)
  }

  /**
   * Check if welcome popup should be shown
   */
  shouldShowWelcome(userId?: string): boolean {
    const state = this.getPopupState(userId)
    const today = new Date().toDateString()
    
    // Show welcome popup only once per user (not per session)
    if (userId) {
      return !state.welcomeShown
    }
    
    // For guests, show once per day
    return state.lastShownDate !== today
  }

  /**
   * Mark welcome popup as shown
   */
  markWelcomeShown(userId?: string): void {
    const state = this.getPopupState(userId)
    state.welcomeShown = true
    state.lastShownDate = new Date().toDateString()
    state.sessionId = this.sessionId
    this.savePopupState(state, userId)
  }

  /**
   * Reset popup state (for testing or user preference)
   */
  resetPopupState(userId?: string): void {
    localStorage.removeItem(this.getStorageKey(userId))
  }

  /**
   * Check if any popup should be shown for the current session
   */
  shouldShowAnyPopup(userId?: string): boolean {
    return this.shouldShowDisclaimer('general', userId) || this.shouldShowWelcome(userId)
  }
}

export const popupManager = PopupManager.getInstance()