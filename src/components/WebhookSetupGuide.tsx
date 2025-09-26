import React, { useState } from 'react'
import { Settings, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Copy, ExternalLink, Play, RefreshCw, X } from 'lucide-react'
import { testWebhookConfig, getWebhookSetupInstructions, validateWebhookConfig, WebhookConfig } from '../utils/webhookSetup'
import LoadingSpinner from './LoadingSpinner'
import ErrorMessage from './ErrorMessage'

interface WebhookSetupGuideProps {
  onClose?: () => void
}

export default function WebhookSetupGuide({ onClose }: WebhookSetupGuideProps) {
  const [activeTab, setActiveTab] = useState<'discord' | 'slack' | 'email' | 'supabase'>('discord')
  const [testConfig, setTestConfig] = useState<Partial<WebhookConfig>>({})
  const [testResults, setTestResults] = useState<{
    discord: boolean
    slack: boolean
    email: boolean
    errors: string[]
  } | null>(null)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState('')

  const instructions = getWebhookSetupInstructions()

  const handleTest = async () => {
    setTesting(true)
    setError('')
    setTestResults(null)

    try {
      const validation = validateWebhookConfig(testConfig)
      if (!validation.isValid) {
        setError(validation.errors.join(', '))
        return
      }

      const results = await testWebhookConfig(testConfig as WebhookConfig)
      setTestResults(results)
    } catch (error: any) {
      setError(error.message || 'Failed to test webhook configuration')
    } finally {
      setTesting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const envVariables = {
    discord: [
      'DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your_webhook_url'
    ],
    slack: [
      'SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your_webhook_url'
    ],
    email: [
      '# For Resend (Recommended)',
      'EMAIL_API_KEY=your_resend_api_key',
      'DEVELOPER_EMAIL=your_email@domain.com',
      '',
      '# Alternative: SendGrid',
      'SENDGRID_API_KEY=your_sendgrid_api_key',
      'DEVELOPER_EMAIL=your_email@domain.com',
      '',
      '# Alternative: Mailgun',
      'MAILGUN_API_KEY=your_mailgun_api_key',
      'MAILGUN_DOMAIN=your_mailgun_domain',
      'DEVELOPER_EMAIL=your_email@domain.com'
    ],
    supabase: [
      '# These are automatically available in Supabase Edge Functions:',
      'SUPABASE_URL=your_project_url',
      'SUPABASE_SERVICE_ROLE_KEY=your_service_role_key'
    ]
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Settings size={24} className="text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Error Notification Setup</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {error && (
        <ErrorMessage
          message={error}
          onDismiss={() => setError('')}
          className="mb-6"
        />
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'discord', label: 'Discord', icon: '💬' },
            { id: 'slack', label: 'Slack', icon: '💼' },
            { id: 'email', label: 'Email', icon: '📧' },
            { id: 'supabase', label: 'Supabase', icon: '🗄️' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-4">
            {activeTab === 'discord' && '💬 Discord Setup Instructions'}
            {activeTab === 'slack' && '💼 Slack Setup Instructions'}
            {activeTab === 'email' && '📧 Email Setup Instructions'}
            {activeTab === 'supabase' && '🗄️ Supabase Webhook Setup'}
          </h3>
          <ol className="text-sm text-blue-800 space-y-2">
            {instructions[activeTab].map((instruction, index) => (
              <li key={index} className={instruction === '' ? 'h-2' : ''}>
                {instruction && (
                  <div className="flex items-start space-x-2">
                    <span className="font-medium">{instruction.match(/^\d+\./) ? '' : '•'}</span>
                    <span>{instruction}</span>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>

        {/* Environment Variables */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Environment Variables</h3>
            <button
              onClick={() => copyToClipboard(envVariables[activeTab].join('\n'))}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              <Copy size={14} />
              <span>Copy All</span>
            </button>
          </div>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
            <pre>{envVariables[activeTab].join('\n')}</pre>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Add these to your Supabase project: Settings → Edge Functions → Environment Variables
          </p>
        </div>

        {/* Test Configuration */}
        {activeTab !== 'supabase' && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Test Configuration</h3>
            
            {activeTab === 'discord' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discord Webhook URL
                  </label>
                  <input
                    type="url"
                    value={testConfig.discord?.webhookUrl || ''}
                    onChange={(e) => setTestConfig(prev => ({
                      ...prev,
                      discord: { ...prev.discord, webhookUrl: e.target.value }
                    }))}
                    placeholder="https://discord.com/api/webhooks/..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
              </div>
            )}

            {activeTab === 'slack' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slack Webhook URL
                  </label>
                  <input
                    type="url"
                    value={testConfig.slack?.webhookUrl || ''}
                    onChange={(e) => setTestConfig(prev => ({
                      ...prev,
                      slack: { ...prev.slack, webhookUrl: e.target.value }
                    }))}
                    placeholder="https://hooks.slack.com/services/..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
              </div>
            )}

            {activeTab === 'email' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Provider
                  </label>
                  <select
                    value={testConfig.email?.provider || 'resend'}
                    onChange={(e) => setTestConfig(prev => ({
                      ...prev,
                      email: { ...prev.email, provider: e.target.value as any }
                    }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="resend">Resend (Recommended)</option>
                    <option value="sendgrid">SendGrid</option>
                    <option value="mailgun">Mailgun</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={testConfig.email?.apiKey || ''}
                    onChange={(e) => setTestConfig(prev => ({
                      ...prev,
                      email: { ...prev.email, apiKey: e.target.value }
                    }))}
                    placeholder="Your API key"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Developer Email
                  </label>
                  <input
                    type="email"
                    value={testConfig.email?.toEmail || ''}
                    onChange={(e) => setTestConfig(prev => ({
                      ...prev,
                      email: { ...prev.email, toEmail: e.target.value }
                    }))}
                    placeholder="your-email@domain.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center space-x-3 mt-6">
              <button
                onClick={handleTest}
                disabled={testing}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {testing ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    <span>Test Configuration</span>
                  </>
                )}
              </button>

              {testResults && (
                <div className="flex items-center space-x-2">
                  {testResults[activeTab as keyof typeof testResults] ? (
                    <div className="flex items-center space-x-1 text-green-600">
                      <CheckCircle size={16} />
                      <span className="text-sm font-medium">Working</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 text-red-600">
                      <AlertTriangle size={16} />
                      <span className="text-sm font-medium">Failed</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {testResults && testResults.errors.length > 0 && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-semibold text-red-900 mb-2">Test Errors:</h4>
                <ul className="text-sm text-red-800 space-y-1">
                  {testResults.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Supabase Webhook Setup */}
        {activeTab === 'supabase' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle size={20} className="text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-900 mb-2">Important Setup Steps</h4>
                <div className="text-sm text-yellow-800 space-y-3">
                  <div>
                    <p className="font-medium mb-1">1. Deploy the Edge Function:</p>
                    <div className="bg-yellow-100 rounded p-3 font-mono text-xs">
                      supabase functions deploy error-webhook-trigger
                    </div>
                  </div>
                  
                  <div>
                    <p className="font-medium mb-1">2. Get the Function URL:</p>
                    <p>Go to Edge Functions in your Supabase dashboard and copy the URL for error-webhook-trigger</p>
                  </div>
                  
                  <div>
                    <p className="font-medium mb-1">3. Create Database Webhook:</p>
                    <p>Use the function URL as the webhook endpoint for INSERT events on error_reports table</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Links</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeTab === 'discord' && (
              <>
                <a
                  href="https://discord.com/developers/docs/resources/webhook"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <ExternalLink size={16} />
                  <span>Discord Webhook Documentation</span>
                </a>
                <a
                  href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <ExternalLink size={16} />
                  <span>Discord Webhook Guide</span>
                </a>
              </>
            )}

            {activeTab === 'slack' && (
              <>
                <a
                  href="https://api.slack.com/messaging/webhooks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <ExternalLink size={16} />
                  <span>Slack Webhook Documentation</span>
                </a>
                <a
                  href="https://api.slack.com/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <ExternalLink size={16} />
                  <span>Create Slack App</span>
                </a>
              </>
            )}

            {activeTab === 'email' && (
              <>
                <a
                  href="https://resend.com/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <ExternalLink size={16} />
                  <span>Resend Documentation</span>
                </a>
                <a
                  href="https://docs.sendgrid.com/api-reference/mail-send/mail-send"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <ExternalLink size={16} />
                  <span>SendGrid API Docs</span>
                </a>
              </>
            )}

            {activeTab === 'supabase' && (
              <>
                <a
                  href="https://supabase.com/docs/guides/database/webhooks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <ExternalLink size={16} />
                  <span>Supabase Webhooks Guide</span>
                </a>
                <a
                  href="https://supabase.com/docs/guides/functions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <ExternalLink size={16} />
                  <span>Edge Functions Documentation</span>
                </a>
              </>
            )}
          </div>
        </div>

        {/* Test Results */}
        {testResults && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Test Results</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-lg border ${
                testResults.discord ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  {testResults.discord ? (
                    <CheckCircle size={16} className="text-green-600" />
                  ) : (
                    <X size={16} className="text-gray-400" />
                  )}
                  <span className="font-medium">Discord</span>
                </div>
                <p className="text-sm text-gray-600">
                  {testResults.discord ? 'Webhook working correctly' : 'Not configured or failed'}
                </p>
              </div>

              <div className={`p-4 rounded-lg border ${
                testResults.slack ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  {testResults.slack ? (
                    <CheckCircle size={16} className="text-green-600" />
                  ) : (
                    <X size={16} className="text-gray-400" />
                  )}
                  <span className="font-medium">Slack</span>
                </div>
                <p className="text-sm text-gray-600">
                  {testResults.slack ? 'Webhook working correctly' : 'Not configured or failed'}
                </p>
              </div>

              <div className={`p-4 rounded-lg border ${
                testResults.email ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  {testResults.email ? (
                    <CheckCircle size={16} className="text-green-600" />
                  ) : (
                    <X size={16} className="text-gray-400" />
                  )}
                  <span className="font-medium">Email</span>
                </div>
                <p className="text-sm text-gray-600">
                  {testResults.email ? 'Email notifications working' : 'Not configured or failed'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="font-semibold text-green-900 mb-4">✅ What You Get</h3>
          <ul className="text-sm text-green-800 space-y-2">
            <li>• <strong>Instant Notifications:</strong> Get notified immediately when errors occur</li>
            <li>• <strong>Detailed Context:</strong> Full error messages, stack traces, and user information</li>
            <li>• <strong>Severity Filtering:</strong> Only get notified for medium, high, and critical errors</li>
            <li>• <strong>User-Friendly Display:</strong> Users see friendly messages while you get technical details</li>
            <li>• <strong>Automatic Logging:</strong> All errors are stored in your database for analysis</li>
            <li>• <strong>Resolution Tracking:</strong> Mark errors as resolved and track your progress</li>
          </ul>
        </div>
      </div>
    </div>
  )
}