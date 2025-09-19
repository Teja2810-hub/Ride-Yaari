import React from 'react'
import { AlertTriangle, RefreshCw, X } from 'lucide-react'

interface ErrorMessageProps {
  title?: string
  message: string
  onRetry?: () => void
  onDismiss?: () => void
  type?: 'error' | 'warning' | 'info'
  className?: string
}

export default function ErrorMessage({
  title = 'Error',
  message,
  onRetry,
  onDismiss,
  type = 'error',
  className = ''
}: ErrorMessageProps) {
  const getTypeStyles = () => {
    switch (type) {
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          icon: 'text-yellow-600'
        }
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: 'text-blue-600'
        }
      default:
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: 'text-red-600'
        }
    }
  }

  const styles = getTypeStyles()

  return (
    <div className={`${styles.bg} ${styles.border} border rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <AlertTriangle size={20} className={`${styles.icon} mt-0.5 flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold ${styles.text} mb-1`}>{title}</h3>
          <p className={`text-sm ${styles.text} leading-relaxed`}>{message}</p>
        </div>
        <div className="flex items-center space-x-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className={`flex items-center space-x-1 ${styles.text} hover:opacity-80 transition-opacity text-sm font-medium`}
            >
              <RefreshCw size={14} />
              <span>Retry</span>
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className={`${styles.icon} hover:opacity-80 transition-opacity`}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}