/**
 * Webhook setup utilities for error reporting notifications
 */

export interface WebhookConfig {
  discord?: {
    webhookUrl: string
    username?: string
    avatarUrl?: string
  }
  slack?: {
    webhookUrl: string
    channel?: string
    username?: string
  }
  email?: {
    provider: 'resend' | 'sendgrid' | 'mailgun'
    apiKey: string
    fromEmail: string
    toEmail: string
  }
}

/**
 * Test webhook configuration
 */
export const testWebhookConfig = async (config: WebhookConfig): Promise<{
  discord: boolean
  slack: boolean
  email: boolean
  errors: string[]
}> => {
  const results = { discord: false, slack: false, email: false, errors: [] as string[] }

  // Test Discord webhook
  if (config.discord?.webhookUrl) {
    try {
      const response = await fetch(config.discord.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '🧪 **RideYaari Error System Test**\n\nThis is a test notification from your error reporting system. If you see this, Discord notifications are working correctly!',
          username: config.discord.username || 'RideYaari Error Bot',
          avatar_url: config.discord.avatarUrl || 'https://ui-avatars.com/api/?name=RE&background=ef4444&color=FFFFFF&size=64'
        })
      })
      
      if (response.ok) {
        results.discord = true
      } else {
        results.errors.push(`Discord webhook failed: ${response.status} ${response.statusText}`)
      }
    } catch (error: any) {
      results.errors.push(`Discord webhook error: ${error.message}`)
    }
  }

  // Test Slack webhook
  if (config.slack?.webhookUrl) {
    try {
      const response = await fetch(config.slack.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '🧪 RideYaari Error System Test',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '*🧪 RideYaari Error System Test*\n\nThis is a test notification from your error reporting system. If you see this, Slack notifications are working correctly!'
              }
            }
          ],
          username: config.slack.username || 'RideYaari Error Bot',
          channel: config.slack.channel
        })
      })
      
      if (response.ok) {
        results.slack = true
      } else {
        results.errors.push(`Slack webhook failed: ${response.status} ${response.statusText}`)
      }
    } catch (error: any) {
      results.errors.push(`Slack webhook error: ${error.message}`)
    }
  }

  // Test email notification
  if (config.email?.apiKey && config.email?.toEmail) {
    try {
      let emailResponse: Response

      switch (config.email.provider) {
        case 'resend':
          emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.email.apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: config.email.fromEmail || 'errors@rideyaari.com',
              to: [config.email.toEmail],
              subject: '🧪 RideYaari Error System Test',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0;">🧪 RideYaari Error System Test</h1>
                  </div>
                  <div style="background: white; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                    <p>This is a test notification from your RideYaari error reporting system.</p>
                    <p>If you receive this email, your email notifications are configured correctly!</p>
                    <p><strong>Provider:</strong> Resend API</p>
                    <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                  </div>
                </div>
              `
            })
          })
          break

        case 'sendgrid':
          emailResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.email.apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              personalizations: [{
                to: [{ email: config.email.toEmail }],
                subject: '🧪 RideYaari Error System Test'
              }],
              from: { 
                email: config.email.fromEmail || 'errors@rideyaari.com', 
                name: 'RideYaari Error System' 
              },
              content: [{
                type: 'text/html',
                value: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1>🧪 RideYaari Error System Test</h1>
                    <p>This is a test notification from your RideYaari error reporting system.</p>
                    <p>If you receive this email, your email notifications are configured correctly!</p>
                    <p><strong>Provider:</strong> SendGrid API</p>
                    <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                  </div>
                `
              }]
            })
          })
          break

        case 'mailgun':
          const mailgunDomain = Deno.env.get('MAILGUN_DOMAIN')
          if (!mailgunDomain) {
            throw new Error('MAILGUN_DOMAIN environment variable is required')
          }
          
          const formData = new FormData()
          formData.append('from', config.email.fromEmail || 'errors@rideyaari.com')
          formData.append('to', config.email.toEmail)
          formData.append('subject', '🧪 RideYaari Error System Test')
          formData.append('html', `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1>🧪 RideYaari Error System Test</h1>
              <p>This is a test notification from your RideYaari error reporting system.</p>
              <p>If you receive this email, your email notifications are configured correctly!</p>
              <p><strong>Provider:</strong> Mailgun API</p>
              <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
          `)

          emailResponse = await fetch(`https://api.mailgun.net/v3/${mailgunDomain}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`api:${config.email.apiKey}`)}`
            },
            body: formData
          })
          break

        default:
          throw new Error(`Unsupported email provider: ${config.email.provider}`)
      }

      if (emailResponse.ok) {
        results.email = true
      } else {
        const errorText = await emailResponse.text()
        results.errors.push(`Email notification failed: ${emailResponse.status} ${errorText}`)
      }
    } catch (error: any) {
      results.errors.push(`Email notification error: ${error.message}`)
    }
  }

  return results
}

/**
 * Generate webhook setup instructions
 */
export const getWebhookSetupInstructions = (): {
  discord: string[]
  slack: string[]
  email: string[]
  supabase: string[]
} => {
  return {
    discord: [
      '1. Go to your Discord server settings',
      '2. Navigate to Integrations → Webhooks',
      '3. Click "New Webhook"',
      '4. Choose a channel for error notifications',
      '5. Copy the webhook URL',
      '6. Add DISCORD_WEBHOOK_URL to your Supabase environment variables'
    ],
    slack: [
      '1. Go to https://api.slack.com/apps',
      '2. Create a new app or select existing app',
      '3. Navigate to Incoming Webhooks',
      '4. Activate incoming webhooks',
      '5. Add new webhook to workspace',
      '6. Choose a channel for error notifications',
      '7. Copy the webhook URL',
      '8. Add SLACK_WEBHOOK_URL to your Supabase environment variables'
    ],
    email: [
      'Option 1 - Resend (Recommended):',
      '1. Sign up at https://resend.com',
      '2. Create an API key',
      '3. Add EMAIL_API_KEY and DEVELOPER_EMAIL to Supabase environment variables',
      '',
      'Option 2 - SendGrid:',
      '1. Sign up at https://sendgrid.com',
      '2. Create an API key with Mail Send permissions',
      '3. Add SENDGRID_API_KEY and DEVELOPER_EMAIL to Supabase environment variables',
      '',
      'Option 3 - Mailgun:',
      '1. Sign up at https://mailgun.com',
      '2. Add and verify your domain',
      '3. Get your API key from the dashboard',
      '4. Add MAILGUN_API_KEY, MAILGUN_DOMAIN, and DEVELOPER_EMAIL to Supabase environment variables'
    ],
    supabase: [
      '1. Go to your Supabase project dashboard',
      '2. Navigate to Database → Webhooks',
      '3. Click "Create a new webhook"',
      '4. Set Table: error_reports',
      '5. Set Events: INSERT',
      '6. Set Webhook URL to your error-webhook-trigger function URL',
      '7. Enable the webhook',
      '',
      'Alternative: Use Database Functions',
      '1. Go to Database → Functions',
      '2. Create a trigger function that calls the webhook',
      '3. Set it to trigger on INSERT to error_reports table'
    ]
  }
}

/**
 * Validate webhook configuration
 */
export const validateWebhookConfig = (config: Partial<WebhookConfig>): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} => {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate Discord config
  if (config.discord?.webhookUrl) {
    if (!config.discord.webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      errors.push('Discord webhook URL must start with https://discord.com/api/webhooks/')
    }
  }

  // Validate Slack config
  if (config.slack?.webhookUrl) {
    if (!config.slack.webhookUrl.startsWith('https://hooks.slack.com/services/')) {
      errors.push('Slack webhook URL must start with https://hooks.slack.com/services/')
    }
  }

  // Validate email config
  if (config.email?.apiKey && config.email?.toEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(config.email.toEmail)) {
      errors.push('Developer email must be a valid email address')
    }

    if (config.email.provider === 'mailgun' && !config.email.fromEmail?.includes('@')) {
      errors.push('Mailgun requires a valid from email address with your verified domain')
    }
  }

  // Check if at least one notification method is configured
  const hasDiscord = !!config.discord?.webhookUrl
  const hasSlack = !!config.slack?.webhookUrl
  const hasEmail = !!(config.email?.apiKey && config.email?.toEmail)

  if (!hasDiscord && !hasSlack && !hasEmail) {
    warnings.push('No notification methods configured. You will not receive error alerts.')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}