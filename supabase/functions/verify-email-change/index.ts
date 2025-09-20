import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailVerificationRequest {
  token: string
  userId: string
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

    const { token, userId }: EmailVerificationRequest = await req.json()

    // Find the email change verification record
    const { data: verification, error: fetchError } = await supabaseClient
      .from('email_change_verification')
      .select('*')
      .eq('verification_token', token)
      .eq('user_id', userId)
      .eq('verified', false)
      .single()

    if (fetchError || !verification) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired verification token' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if token has expired
    if (new Date() > new Date(verification.expires_at)) {
      return new Response(
        JSON.stringify({ error: 'Verification token has expired' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Update the user's email in auth
    const { error: updateAuthError } = await supabaseClient.auth.admin.updateUserById(
      userId,
      { email: verification.new_email }
    )

    if (updateAuthError) {
      throw new Error(`Failed to update email in auth: ${updateAuthError.message}`)
    }

    // Mark verification as completed
    const { error: updateVerificationError } = await supabaseClient
      .from('email_change_verification')
      .update({
        verified: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', verification.id)

    if (updateVerificationError) {
      throw new Error(`Failed to update verification status: ${updateVerificationError.message}`)
    }

    return new Response(
      JSON.stringify({ 
        message: 'Email updated successfully',
        new_email: verification.new_email
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in verify-email-change function:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})