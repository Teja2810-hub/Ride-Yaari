import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookPayload {
  type: 'INSERT'
  table: string
  record: any
  schema: string
  old_record: null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload: WebhookPayload = await req.json()
    
    // Only process INSERT events on error_reports table
    if (payload.type !== 'INSERT' || payload.table !== 'error_reports') {
      return new Response(
        JSON.stringify({ message: 'Event ignored' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const errorReport = payload.record

    // Only notify for medium, high, or critical severity errors
    if (!['medium', 'high', 'critical'].includes(errorReport.severity)) {
      return new Response(
        JSON.stringify({ message: 'Low severity error, no notification sent' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user information if available
    let userInfo = 'Guest User'
    if (errorReport.user_id) {
      const { data: userProfile } = await supabaseClient
        .from('user_profiles')
        .select('full_name')
        .eq('id', errorReport.user_id)
        .single()
      
      if (userProfile) {
        userInfo = userProfile.full_name
      }
    }

    // Format notification message
    const severityEmoji = {
      'critical': '🚨',
      'high': '⚠️',
      'medium': '⚡'
    }[errorReport.severity] || '📢'

    const notificationTitle = `${severityEmoji} RideYaari Error: ${errorReport.severity.toUpperCase()}`
    
    const notificationMessage = `
**Error Details:**
• **Severity:** ${errorReport.severity.toUpperCase()}
• **User:** ${userInfo}
• **Context:** ${errorReport.context}
• **Time:** ${new Date(errorReport.timestamp).toLocaleString()}
• **URL:** ${errorReport.url}

**Error Message:**
\`\`\`
${errorReport.error_message}
\`\`\`

${errorReport.error_stack ? `**Stack Trace:**\n\`\`\`\n${errorReport.error_stack.substring(0, 1000)}${errorReport.error_stack.length > 1000 ? '...' : ''}\n\`\`\`` : ''}

**Error ID:** \`${errorReport.id}\`
**Session:** \`${errorReport.session_id || 'unknown'}\`

View full details in Supabase Dashboard → Error Reports table.
    `.trim()

    const notifications = []

    // Send to Discord webhook
    const discordWebhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL')
    if (discordWebhookUrl) {
      try {
        const discordResponse = await fetch(discordWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `${notificationTitle}\n\n${notificationMessage}`,
            username: 'RideYaari Error Bot',
            avatar_url: 'https://ui-avatars.com/api/?name=RE&background=ef4444&color=FFFFFF&size=64'
          })
        })
        
        if (discordResponse.ok) {
          notifications.push('discord')
        }
      } catch (error) {
        console.error('Failed to send Discord notification:', error)
      }
    }

    // Send to Slack webhook
    const slackWebhookUrl = Deno.env.get('SLACK_WEBHOOK_URL')
    if (slackWebhookUrl) {
      try {
        const slackResponse = await fetch(slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: notificationTitle,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: notificationMessage
                }
              },
              {
                type: 'actions',
                elements: [
                  {
                    type: 'button',
                    text: {
                      type: 'plain_text',
                      text: 'View in Supabase'
                    },
                    url: `${Deno.env.get('SUPABASE_URL')}/project/default/editor`,
                    style: 'primary'
                  }
                ]
              }
            ]
          })
        })
        
        if (slackResponse.ok) {
          notifications.push('slack')
        }
      } catch (error) {
        console.error('Failed to send Slack notification:', error)
      }
    }

    // Send email notification via Resend
    const emailApiKey = Deno.env.get('EMAIL_API_KEY') || Deno.env.get('RESEND_API_KEY')
    const developerEmail = Deno.env.get('DEVELOPER_EMAIL')
    
    if (emailApiKey && developerEmail) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${emailApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'errors@rideyaari.com',
            to: [developerEmail],
            subject: `${severityEmoji} RideYaari Error: ${errorReport.severity} - ${errorReport.context}`,
            html: `
              <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 24px; text-align: center;">
                  <h1 style="margin: 0; font-size: 24px;">${severityEmoji} RideYaari Error Report</h1>
                  <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 18px;">Severity: ${errorReport.severity.toUpperCase()}</p>
                </div>
                
                <div style="background: white; padding: 24px;">
                  <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Error ID:</td><td style="padding: 8px 0; font-family: monospace; color: #6b7280;">${errorReport.id}</td></tr>
                      <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">User:</td><td style="padding: 8px 0; color: #6b7280;">${userInfo}</td></tr>
                      <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Context:</td><td style="padding: 8px 0; color: #6b7280;">${errorReport.context}</td></tr>
                      <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">URL:</td><td style="padding: 8px 0; color: #6b7280; word-break: break-all;">${errorReport.url}</td></tr>
                      <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Time:</td><td style="padding: 8px 0; color: #6b7280;">${new Date(errorReport.timestamp).toLocaleString()}</td></tr>
                      <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Session:</td><td style="padding: 8px 0; font-family: monospace; color: #6b7280;">${errorReport.session_id || 'unknown'}</td></tr>
                    </table>
                  </div>
                  
                  <div style="margin: 20px 0;">
                    <h3 style="color: #374151; margin: 0 0 12px 0; font-size: 16px;">Error Message:</h3>
                    <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 8px; font-family: monospace; font-size: 14px; color: #991b1b; word-break: break-word;">
                      ${errorReport.error_message}
                    </div>
                  </div>
                  
                  ${errorReport.error_stack ? `
                    <div style="margin: 20px 0;">
                      <h3 style="color: #374151; margin: 0 0 12px 0; font-size: 16px;">Stack Trace:</h3>
                      <div style="background: #f3f4f6; border: 1px solid #d1d5db; padding: 16px; border-radius: 8px; font-family: monospace; font-size: 12px; max-height: 300px; overflow-y: auto; color: #374151;">
                        ${errorReport.error_stack.replace(/\n/g, '<br>').replace(/\s/g, '&nbsp;')}
                      </div>
                    </div>
                  ` : ''}
                  
                  ${errorReport.user_agent ? `
                    <div style="margin: 20px 0;">
                      <h3 style="color: #374151; margin: 0 0 12px 0; font-size: 16px;">Browser Info:</h3>
                      <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; font-size: 12px; color: #64748b; word-break: break-word;">
                        ${errorReport.user_agent}
                      </div>
                    </div>
                  ` : ''}
                  
                  <div style="margin: 24px 0; padding: 16px; background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px;">
                    <p style="margin: 0; color: #92400e; font-weight: 600;">
                      🔧 Action Required: Please investigate this error and update the resolution status in your Supabase dashboard.
                    </p>
                  </div>
                  
                  <div style="text-align: center; margin: 24px 0;">
                    <a href="${Deno.env.get('SUPABASE_URL')}/project/default/editor" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                      Open Supabase Dashboard
                    </a>
                  </div>
                </div>
                
                <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
                  <p style="margin: 0;">RideYaari Error Reporting System</p>
                  <p style="margin: 4px 0 0 0;">Generated automatically • ${new Date().toISOString()}</p>
                </div>
              </div>
            `,
            text: `
${notificationTitle}

Error Details:
- Severity: ${errorReport.severity.toUpperCase()}
- User: ${userInfo}
- Context: ${errorReport.context}
- Time: ${new Date(errorReport.timestamp).toLocaleString()}
- URL: ${errorReport.url}
- Error ID: ${errorReport.id}

Error Message:
${errorReport.error_message}

${errorReport.error_stack ? `Stack Trace:\n${errorReport.error_stack}` : ''}

View full details in Supabase Dashboard.
            `
          })
        })
        
        if (emailResponse.ok) {
          notifications.push('email')
        }
      } catch (error) {
        console.error('Failed to send email notification:', error)
      }
    }

    // Send via SendGrid as alternative
    const sendGridApiKey = Deno.env.get('SENDGRID_API_KEY')
    if (sendGridApiKey && developerEmail && !notifications.includes('email')) {
      try {
        const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sendGridApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            personalizations: [{
              to: [{ email: developerEmail }],
              subject: `${severityEmoji} RideYaari Error: ${errorReport.severity} - ${errorReport.context}`
            }],
            from: { email: 'errors@rideyaari.com', name: 'RideYaari Error System' },
            content: [{
              type: 'text/plain',
              value: `
${notificationTitle}

Error Details:
- Severity: ${errorReport.severity.toUpperCase()}
- User: ${userInfo}
- Context: ${errorReport.context}
- Time: ${new Date(errorReport.timestamp).toLocaleString()}
- URL: ${errorReport.url}
- Error ID: ${errorReport.id}

Error Message:
${errorReport.error_message}

${errorReport.error_stack ? `Stack Trace:\n${errorReport.error_stack.substring(0, 2000)}` : ''}

View full details in Supabase Dashboard.
              `
            }]
          })
        })
        
        if (sendGridResponse.ok) {
          notifications.push('sendgrid')
        }
      } catch (error) {
        console.error('Failed to send SendGrid notification:', error)
      }
    }

    // Log the notification attempt
    console.log(`Error notification processed for ${errorReport.id}:`, {
      severity: errorReport.severity,
      user: userInfo,
      context: errorReport.context,
      notificationsSent: notifications
    })

    return new Response(
      JSON.stringify({ 
        message: 'Error notification processed successfully',
        errorId: errorReport.id,
        severity: errorReport.severity,
        notificationsSent: notifications,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in webhook trigger function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})