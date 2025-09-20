import React from 'react'
import { Shield, Check, X } from 'lucide-react'
import { getPasswordStrength } from '../utils/profileHelpers'

interface PasswordStrengthIndicatorProps {
  password: string
  className?: string
}

export default function PasswordStrengthIndicator({ password, className = '' }: PasswordStrengthIndicatorProps) {
  const strength = getPasswordStrength(password)

  if (!password) return null

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'red':
        return {
          bg: 'bg-red-500',
          text: 'text-red-600',
          border: 'border-red-200',
          bgLight: 'bg-red-50'
        }
      case 'yellow':
        return {
          bg: 'bg-yellow-500',
          text: 'text-yellow-600',
          border: 'border-yellow-200',
          bgLight: 'bg-yellow-50'
        }
      case 'blue':
        return {
          bg: 'bg-blue-500',
          text: 'text-blue-600',
          border: 'border-blue-200',
          bgLight: 'bg-blue-50'
        }
      case 'green':
        return {
          bg: 'bg-green-500',
          text: 'text-green-600',
          border: 'border-green-200',
          bgLight: 'bg-green-50'
        }
      default:
        return {
          bg: 'bg-gray-500',
          text: 'text-gray-600',
          border: 'border-gray-200',
          bgLight: 'bg-gray-50'
        }
    }
  }

  const colors = getColorClasses(strength.color)

  return (
    <div className={`${className}`}>
      {/* Strength Bar */}
      <div className="flex items-center space-x-2 mb-2">
        <Shield size={16} className={colors.text} />
        <span className="text-sm font-medium text-gray-700">Password Strength:</span>
        <span className={`text-sm font-semibold ${colors.text}`}>{strength.label}</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${colors.bg}`}
          style={{ width: `${(strength.score / 5) * 100}%` }}
        ></div>
      </div>

      {/* Suggestions */}
      {strength.suggestions.length > 0 && (
        <div className={`${colors.bgLight} ${colors.border} border rounded-lg p-3`}>
          <h4 className={`text-sm font-medium ${colors.text} mb-2`}>
            To improve your password:
          </h4>
          <ul className="space-y-1">
            {strength.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-center space-x-2 text-sm">
                <X size={12} className={colors.text} />
                <span className="text-gray-700">{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Success Message */}
      {strength.score >= 4 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <Check size={16} className="text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Great! Your password is strong and secure.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}