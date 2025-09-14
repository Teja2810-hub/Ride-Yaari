import React, { useEffect, useState, useRef } from 'react'
import { MessageCircle } from 'lucide-react'

const WHATSAPP_NUMBER = '+917093203981'
const PREFILLED_MESSAGE = 'Hi, I need help'

export default function WhatsAppChatButton() {
  const [showTooltip, setShowTooltip] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER.replace(
    /[^\d]/g,
    ''
  )}?text=${encodeURIComponent(PREFILLED_MESSAGE)}`

  // Helper to check if device is desktop
  const isDesktop = () => {
    if (typeof window === 'undefined') return false
    return window.innerWidth >= 768 // Tailwind's md: breakpoint
  }

  useEffect(() => {
    if (!isDesktop()) return // Only run on desktop
    setShowTooltip(true)
    const hide = setTimeout(() => setShowTooltip(false), 1500)
    intervalRef.current = setInterval(() => {
      setShowTooltip(true)
      setTimeout(() => setShowTooltip(false), 1500)
    }, 120000) // 2 minutes
    return () => {
      clearTimeout(hide)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return (
    <>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="fixed z-50 bottom-3 right-3 sm:bottom-7 sm:right-7 flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-green-500 hover:bg-green-600 rounded-full shadow-lg transition-colors border-4 border-white"
        style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}
      >
        <svg
          viewBox="0 0 32 32"
          width="32"
          height="32"
          className="w-7 h-7 sm:w-8 sm:h-8"
          fill="white"
          aria-hidden="true"
        >
          <path d="M16 3C9.373 3 4 8.373 4 15c0 2.646.865 5.093 2.34 7.09L4 29l7.184-2.312A12.93 12.93 0 0016 27c6.627 0 12-5.373 12-12S22.627 3 16 3zm0 22c-1.98 0-3.85-.515-5.45-1.41l-.39-.22-4.28 1.38 1.41-4.15-.25-.4A9.97 9.97 0 016 15c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10zm5.29-7.71c-.29-.15-1.71-.84-1.98-.94-.27-.1-.47-.15-.67.15-.2.29-.77.94-.95 1.13-.17.2-.35.22-.65.07-.29-.15-1.22-.45-2.33-1.43-.86-.77-1.44-1.72-1.61-2.01-.17-.29-.02-.45.13-.6.13-.13.29-.34.43-.51.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.51-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51-.17-.01-.36-.01-.56-.01-.19 0-.5.07-.76.36-.26.29-1 1-.99 2.43.01 1.43 1.02 2.81 1.16 3.01.14.2 2.01 3.08 4.87 4.2.68.29 1.21.46 1.62.59.68.22 1.3.19 1.79.12.55-.08 1.71-.7 1.95-1.38.24-.68.24-1.26.17-1.38-.07-.12-.26-.19-.55-.34z"/>
        </svg>
      </a>
      {showTooltip && (
        <div
          className="fixed z-50 bottom-20 right-5 sm:bottom-24 sm:right-9 bg-white text-green-700 px-4 py-2 rounded-xl shadow-lg text-sm font-medium animate-fade-in"
          style={{
            pointerEvents: 'none',
            transition: 'opacity 0.4s',
            opacity: showTooltip ? 1 : 0,
          }}
        >
          Need help? Chat with us!
        </div>
      )}
    </>
  )
}