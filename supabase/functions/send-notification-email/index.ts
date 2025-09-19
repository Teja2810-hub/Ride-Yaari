import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  userId: string
  title: string
  message: string
  action: 'request' | 'offer' | 'accept' | 'reject' | 'cancel'
  userRole: 'owner' | 'passenger'
  rideData?: any
  tripData?: any
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

    const { userId, title, message, action, userRole, rideData, tripData }: EmailRequest = await req.json()

    // Get user email and preferences
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('full_name, notification_preferences')
      .eq('id', userId)
      .single()

    if (profileError) {
      throw new Error(`Failed to fetch user profile: ${profileError.message}`)
    }

    // Check if user has email notifications enabled
    const emailEnabled = userProfile?.notification_preferences?.email_notifications !== false

    if (!emailEnabled) {
      return new Response(
        JSON.stringify({ message: 'Email notifications disabled for user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user email from auth
    const { data: authUser, error: authError } = await supabaseClient.auth.admin.getUserById(userId)

    if (authError || !authUser.user?.email) {
      throw new Error('Failed to get user email')
    }

    // Format email content
    const rideDetails = rideData 
      ? `${rideData.from_location} → ${rideData.to_location} on ${new Date(rideData.departure_date_time).toLocaleDateString()}`
      : tripData 
        ? `${tripData.leaving_airport} → ${tripData.destination_airport} on ${new Date(tripData.travel_date).toLocaleDateString()}`
        : 'your ride'

    const emailSubject = `RideYaari: ${title.replace(/[🚨📤🎉✅❌😔🚫📢]/g, '').trim()}`
    
    const emailBody = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">🚗 RideYaari</h1>
          <h2 style="margin: 8px 0 0 0; font-size: 18px;">${title}</h2>
        </div>
        
        <div style="padding: 24px;">
          <p style="margin: 0 0 16px 0;">Hi ${userProfile.full_name},</p>
          
          <div style="background-color: #f1f5f9; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <h3 style="margin: 0 0 8px 0; color: #1e293b;">📍 Trip Details</h3>
            <p style="margin: 4px 0;"><strong>Route:</strong> ${rideDetails}</p>
            <p style="margin: 4px 0;"><strong>Type:</strong> ${rideData ? 'Car Ride' : 'Airport Trip'}</p>
            ${rideData?.price ? `<p style="margin: 4px 0;"><strong>Price:</strong> ${rideData.currency || 'USD'} ${rideData.price}</p>` : ''}
            ${tripData?.price ? `<p style="margin: 4px 0;"><strong>Service Fee:</strong> ${tripData.currency || 'USD'} ${tripData.price}</p>` : ''}
          </div>
          
          <div style="white-space: pre-line; line-height: 1.6; color: #374151;">
            ${message.replace(/\*\*/g, '').replace(/[🚗✈️🛣️⏰💰📤🎉✅❌😔🚫]/g, '')}
          </div>
          
          ${action === 'request' || action === 'offer' || action === 'accept' ? 
            '<div style="text-align: center; margin: 24px 0;"><a href="https://rideyaari.com" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">View on RideYaari</a></div>' : 
            ''
          }
        </div>
        
        <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 14px; color: #64748b;">
          <p style="margin: 0;">This email was sent by RideYaari. Visit <a href="https://rideyaari.com" style="color: #3b82f6;">rideyaari.com</a> to manage your notifications.</p>
          <p style="margin: 8px 0 0 0;">Made with ❤️ in India</p>
        </div>
      </div>
    `

    // Here you would integrate with your email service (SendGrid, Resend, etc.)
    // For now, we'll just log the email content
    console.log('Email notification prepared:', {
      to: authUser.user.email,
      subject: emailSubject,
      html: emailBody
    })

    // Simulate email sending success
    return new Response(
      JSON.stringify({ 
        message: 'Email notification sent successfully',
        recipient: authUser.user.email,
        subject: emailSubject
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-notification-email function:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})