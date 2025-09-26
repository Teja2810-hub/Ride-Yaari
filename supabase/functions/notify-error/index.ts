import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ErrorNotificationPayload {
  errorId: string
  errorMessage: string
  context: string
  severity: string
  userId?: string
  url: string
  userAgent: string
  timestamp: string
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

    // Get the error report from the database trigger
    const payload = await req.json()
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
    const notificationMessage = `
🚨 RideYaari Error Report

**Severity:** ${errorReport.severity.toUpperCase()}
**Error ID:** ${errorReport.id}
**User:** ${userInfo}
**Context:** ${errorReport.context}
**URL:** ${errorReport.url}
**Time:** ${new Date(errorReport.timestamp).toLocaleString()}

**Error Message:**
${errorReport.error_message}

**User Agent:**
${errorReport.user_agent}

${errorReport.error_stack ? `**Stack Trace:**\n\`\`\`\n${errorReport.error_stack.substring(0, 1000)}${errorReport.error_stack.length > 1000 ? '...' : ''}\n\`\`\`` : ''}

View full details in Supabase Dashboard.
    `.trim()

    // Here you would integrate with your notification service
    // Examples:
    
    // 1. Send to Discord webhook
    const discordWebhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL')
    if (discordWebhookUrl) {
      await fetch(discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: notificationMessage,
          username: 'RideYaari Error Bot',
          avatar_url: 'https://ui-avatars.com/api/?name=RE&background=ef4444&color=FFFFFF&size=64'
        })
      })
    }

    // 2. Send to Slack webhook
    const slackWebhookUrl = Deno.env.get('SLACK_WEBHOOK_URL')
    if (slackWebhookUrl) {
      await fetch(slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 RideYaari Error (${errorReport.severity})`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: notificationMessage
              }
            }
          ]
        })
      })
    }

    // 3. Send email notification
    const emailApiKey = Deno.env.get('EMAIL_API_KEY')
    const developerEmail = Deno.env.get('DEVELOPER_EMAIL')
    
    if (emailApiKey && developerEmail) {
      // Example using Resend API
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${emailApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'errors@rideyaari.com',
          to: [developerEmail],
          subject: `🚨 RideYaari Error: ${errorReport.severity} - ${errorReport.context}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">🚨 RideYaari Error Report</h1>
                <p style="margin: 8px 0 0 0; opacity: 0.9;">Severity: ${errorReport.severity.toUpperCase()}</p>
              </div>
              
              <div style="background: white; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 8px 0; font-weight: bold;">Error ID:</td><td style="padding: 8px 0;">${errorReport.id}</td></tr>
                  <tr><td style="padding: 8px 0; font-weight: bold;">User:</td><td style="padding: 8px 0;">${userInfo}</td></tr>
                  <tr><td style="padding: 8px 0; font-weight: bold;">Context:</td><td style="padding: 8px 0;">${errorReport.context}</td></tr>
                  <tr><td style="padding: 8px 0; font-weight: bold;">URL:</td><td style="padding: 8px 0;">${errorReport.url}</td></tr>
                  <tr><td style="padding: 8px 0; font-weight: bold;">Time:</td><td style="padding: 8px 0;">${new Date(errorReport.timestamp).toLocaleString()}</td></tr>
                </table>
                
                <div style="margin: 20px 0;">
                  <h3 style="color: #374151; margin: 0 0 8px 0;">Error Message:</h3>
                  <div style="background: #f3f4f6; padding: 12px; border-radius: 4px; font-family: monospace; font-size: 14px;">
                    ${errorReport.error_message}
                  </div>
                </div>
                
                ${errorReport.error_stack ? `
                  <div style="margin: 20px 0;">
                    <h3 style="color: #374151; margin: 0 0 8px 0;">Stack Trace:</h3>
                    <div style="background: #f3f4f6; padding: 12px; border-radius: 4px; font-family: monospace; font-size: 12px; max-height: 200px; overflow-y: auto;">
                      ${errorReport.error_stack.replace(/\n/g, '<br>')}
                    </div>
                  </div>
                ` : ''}
                
                <div style="margin: 20px 0; padding: 16px; background: #fef3c7; border-radius: 4px;">
                  <p style="margin: 0; color: #92400e;">
                    <strong>Action Required:</strong> Please investigate this error and update the resolution status in your Supabase dashboard.
                  </p>
                </div>
              </div>
            </div>
          `
        })
      })
    }

    return new Response(
      JSON.stringify({ 
        message: 'Error notification sent successfully',
        errorId: errorReport.id,
        severity: errorReport.severity,
        notificationsSent: {
          discord: !!discordWebhookUrl,
          slack: !!slackWebhookUrl,
          email: !!(emailApiKey && developerEmail)
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in notify-error function:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})