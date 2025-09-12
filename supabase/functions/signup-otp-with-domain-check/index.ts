import { createClient } from 'npm:@supabase/supabase-js@2.57.2'

interface RequestBody {
  email: string
  type: 'signup' | 'signin'
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Allowed domains configuration
const ALLOWED_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'yahoo.ca',
  'yahoo.in',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'protonmail.com',
  'proton.me'
]

const isValidEmailDomain = (email: string): boolean => {
  const emailLower = email.toLowerCase().trim()
  const domain = emailLower.split('@')[1]
  
  console.log('Checking email:', emailLower)
  console.log('Extracted domain:', domain)
  
  if (!domain) {
    console.log('No domain found')
    return false
  }
  
  // Check for allowed domains (case-insensitive)
  const isAllowedDomain = ALLOWED_DOMAINS.some(allowedDomain => 
    domain === allowedDomain.toLowerCase()
  )
  console.log('Is domain in ALLOWED_DOMAINS?', isAllowedDomain)
  
  if (isAllowedDomain) {
    return true
  }
  
  // Check for .edu domains
  const isEduDomain = domain.endsWith('.edu')
  console.log('Is .edu domain?', isEduDomain)
  
  if (isEduDomain) {
    return true
  }
  
  // Check for .ac.uk domains (UK academic institutions)
  const isAcUkDomain = domain.endsWith('.ac.uk')
  console.log('Is .ac.uk domain?', isAcUkDomain)
  
  if (isAcUkDomain) {
    return true
  }
  
  console.log('Domain not allowed:', domain)
  return false
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const { email, type }: RequestBody = await req.json()

    console.log('Processing request for email:', email, 'type:', type)

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.log('Invalid email format:', email)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid email format' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if email domain is allowed
    console.log('Validating email domain for:', email)
    if (!isValidEmailDomain(email)) {
      console.log('Email domain validation failed for:', email)
      return new Response(
        JSON.stringify({ 
          error: 'Email domain not allowed. Only Gmail, Yahoo, Outlook, educational institutions (.edu, .ac.uk), and approved domains are permitted.' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // For signup, check if user already exists
    if (type === 'signup') {
      console.log('Checking if user already exists for:', email)
      try {
        // Get user by email to check if they exist and their verification status
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
        
        if (listError) {
          console.error('Error listing users:', listError)
          // Continue with OTP generation if we can't check existing users
        } else if (users && users.users) {
          const existingUser = users.users.find(user => 
            user.email && user.email.toLowerCase() === email.toLowerCase()
          )
          
          if (existingUser) {
            console.log('Found existing user for:', email, 'Email confirmed at:', existingUser.email_confirmed_at)
            
            // Check if the user has confirmed their email
            if (existingUser.email_confirmed_at) {
              // User is fully verified, they should sign in instead
              console.log('User is already verified, should sign in instead')
              return new Response(
                JSON.stringify({ 
                  error: 'An account with this email already exists and is verified. Please sign in instead.' 
                }),
                { 
                  status: 409, 
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                }
              )
            } else {
              // User exists but is not verified, allow resending OTP
              console.log('User exists but is not verified, proceeding to resend OTP')
            }
          }
        }
      } catch (userCheckError) {
        console.error('Error checking existing users:', userCheckError)
        // Continue with OTP generation if user check fails
      }
    }

    // Generate and send OTP
    console.log('Generating OTP for:', email)
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${req.headers.get('origin') || 'http://localhost:5173'}/auth/callback`
      }
    })

    if (error) {
      console.error('Error generating OTP for', email, ':', error)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send OTP. Please try again.' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('OTP successfully sent to:', email, 'Type:', type)

    return new Response(
      JSON.stringify({ 
        message: type === 'signup' 
          ? 'Verification code sent successfully to your email. If you previously started signup, this will complete your registration.'
          : 'Sign-in code sent successfully to your email',
        email: email
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'An unexpected error occurred. Please try again.' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})