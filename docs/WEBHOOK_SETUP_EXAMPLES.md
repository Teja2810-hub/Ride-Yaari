# Webhook Setup Examples

This document provides detailed examples for setting up error notification webhooks with different services.

## 🔗 Discord Webhook Setup

### Step-by-Step Guide

1. **Open Discord Server Settings**
   - Right-click on your server name
   - Select "Server Settings"

2. **Navigate to Integrations**
   - Click "Integrations" in the left sidebar
   - Click "Webhooks"

3. **Create New Webhook**
   - Click "New Webhook"
   - Choose a channel (e.g., #errors, #alerts, #dev-notifications)
   - Customize the webhook name (e.g., "RideYaari Error Bot")
   - Copy the webhook URL

4. **Add to Supabase**
   - Go to Supabase Dashboard → Settings → Edge Functions → Environment Variables
   - Add: `DISCORD_WEBHOOK_URL` = `your_webhook_url`

### Example Discord Message
```
🚨 RideYaari Error: HIGH

Error Details:
• Severity: HIGH
• User: John Doe
• Context: Chat Component
• Time: 2025-01-15 10:30:45
• URL: https://rideyaari.com/chat

Error Message:
Failed to send message: Network timeout

Error ID: abc123def456
Session: session-1642234567890-xyz789

View full details in Supabase Dashboard → Error Reports table.
```

## 💼 Slack Webhook Setup

### Step-by-Step Guide

1. **Create Slack App**
   - Go to [Slack API Apps](https://api.slack.com/apps)
   - Click "Create New App"
   - Choose "From scratch"
   - Enter app name (e.g., "RideYaari Error Reporter")
   - Select your workspace

2. **Enable Incoming Webhooks**
   - In your app settings, click "Incoming Webhooks"
   - Toggle "Activate Incoming Webhooks" to On
   - Click "Add New Webhook to Workspace"
   - Choose a channel for notifications
   - Copy the webhook URL

3. **Add to Supabase**
   - Go to Supabase Dashboard → Settings → Edge Functions → Environment Variables
   - Add: `SLACK_WEBHOOK_URL` = `your_webhook_url`

### Example Slack Message
```json
{
  "text": "🚨 RideYaari Error: HIGH",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*🚨 RideYaari Error: HIGH*\n\n*Error Details:*\n• Severity: HIGH\n• User: John Doe\n• Context: Chat Component\n• Time: 2025-01-15 10:30:45\n\n*Error Message:*\n```\nFailed to send message: Network timeout\n```\n\n*Error ID:* `abc123def456`"
      }
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "View in Supabase"
          },
          "url": "https://your-project.supabase.co/project/default/editor",
          "style": "primary"
        }
      ]
    }
  ]
}
```

## 📧 Email Notification Setup

### Resend Setup (Recommended)

1. **Create Resend Account**
   - Sign up at [Resend](https://resend.com)
   - Verify your email address

2. **Create API Key**
   - Go to API Keys in your dashboard
   - Click "Create API Key"
   - Give it a name (e.g., "RideYaari Error Notifications")
   - Copy the API key

3. **Add to Supabase**
   ```
   EMAIL_API_KEY=re_your_api_key_here
   DEVELOPER_EMAIL=your_email@domain.com
   ```

### SendGrid Setup

1. **Create SendGrid Account**
   - Sign up at [SendGrid](https://sendgrid.com)
   - Complete account verification

2. **Create API Key**
   - Go to Settings → API Keys
   - Click "Create API Key"
   - Choose "Restricted Access"
   - Grant "Mail Send" permissions
   - Copy the API key

3. **Add to Supabase**
   ```
   SENDGRID_API_KEY=SG.your_api_key_here
   DEVELOPER_EMAIL=your_email@domain.com
   ```

### Mailgun Setup

1. **Create Mailgun Account**
   - Sign up at [Mailgun](https://mailgun.com)
   - Add and verify your domain

2. **Get API Credentials**
   - Go to your dashboard
   - Copy your API key
   - Note your domain name

3. **Add to Supabase**
   ```
   MAILGUN_API_KEY=your_api_key_here
   MAILGUN_DOMAIN=your_domain.com
   DEVELOPER_EMAIL=your_email@domain.com
   ```

### Example Email Content

**Subject**: `🚨 RideYaari Error: HIGH - Chat Component`

**HTML Body**:
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 24px; text-align: center;">
    <h1>🚨 RideYaari Error Report</h1>
    <p>Severity: HIGH</p>
  </div>
  
  <div style="background: white; padding: 24px; border: 1px solid #e5e7eb;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td><strong>Error ID:</strong></td><td>abc123def456</td></tr>
      <tr><td><strong>User:</strong></td><td>John Doe</td></tr>
      <tr><td><strong>Context:</strong></td><td>Chat Component</td></tr>
      <tr><td><strong>Time:</strong></td><td>2025-01-15 10:30:45</td></tr>
      <tr><td><strong>URL:</strong></td><td>https://rideyaari.com/chat</td></tr>
    </table>
    
    <div style="margin: 20px 0;">
      <h3>Error Message:</h3>
      <div style="background: #fef2f2; padding: 16px; border-radius: 8px; font-family: monospace;">
        Failed to send message: Network timeout
      </div>
    </div>
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="https://your-project.supabase.co" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
        Open Supabase Dashboard
      </a>
    </div>
  </div>
</div>
```

## 🗄️ Supabase Webhook Setup

### Method 1: Database Webhooks (Recommended)

1. **Deploy Edge Function**
   ```bash
   supabase functions deploy error-webhook-trigger
   ```

2. **Get Function URL**
   - Go to Supabase Dashboard → Edge Functions
   - Find `error-webhook-trigger` function
   - Copy the function URL

3. **Create Database Webhook**
   - Go to Database → Webhooks
   - Click "Create a new webhook"
   - Configure:
     - **Name**: Error Notification Webhook
     - **Table**: error_reports
     - **Events**: INSERT
     - **Type**: HTTP Request
     - **HTTP Method**: POST
     - **URL**: Your function URL
   - Enable the webhook

### Method 2: Database Triggers (Alternative)

```sql
-- Create a trigger function
CREATE OR REPLACE FUNCTION notify_error_webhook()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify for medium, high, or critical errors
  IF NEW.severity IN ('medium', 'high', 'critical') THEN
    PERFORM net.http_post(
      url := 'https://your-project-ref.supabase.co/functions/v1/error-webhook-trigger',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer your_anon_key"}'::jsonb,
      body := json_build_object(
        'type', 'INSERT',
        'table', 'error_reports',
        'record', row_to_json(NEW),
        'schema', 'public'
      )::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER error_reports_webhook_trigger
  AFTER INSERT ON error_reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_error_webhook();
```

## 🧪 Testing Your Setup

### 1. Use the Built-in Testing Panel

1. Open RideYaari app
2. Go to **Profile** → **System Health**
3. Click **Error Testing** tab
4. Test each severity level:
   - **Low**: Should log but not notify
   - **Medium**: Should send notifications
   - **High**: Should send immediate notifications
   - **Critical**: Should send urgent notifications + browser alerts

### 2. Manual Testing

```javascript
// Test in browser console
// Low severity (no notification)
throw new Error('Test low severity error')

// Medium severity (notification sent)
fetch('/api/test-error', { method: 'POST', body: JSON.stringify({ severity: 'medium' }) })

// High severity (immediate notification)
fetch('/api/test-error', { method: 'POST', body: JSON.stringify({ severity: 'high' }) })

// Critical severity (urgent notification)
fetch('/api/test-error', { method: 'POST', body: JSON.stringify({ severity: 'critical' }) })
```

### 3. Verify Notifications

Check your configured channels:
- **Discord**: Look for messages in your chosen channel
- **Slack**: Check your selected channel for notifications
- **Email**: Check your inbox (and spam folder)

## 📱 Notification Samples

### Discord Sample
```
🚨 RideYaari Error: HIGH

**Error Details:**
• **Severity:** HIGH
• **User:** John Doe
• **Context:** Chat Component
• **Time:** 2025-01-15 10:30:45
• **URL:** https://rideyaari.com/chat

**Error Message:**
```
Failed to send message: Network timeout
```

**Error ID:** `abc123def456`
**Session:** `session-1642234567890-xyz789`

View full details in Supabase Dashboard → Error Reports table.
```

### Slack Sample
Rich formatted message with:
- Color-coded severity indicators
- Expandable error details
- Action buttons for quick access
- Thread support for follow-up discussions

### Email Sample
Professional HTML email with:
- Branded header with RideYaari logo
- Tabular error details
- Syntax-highlighted code blocks
- Call-to-action buttons
- Footer with contact information

## 🔧 Advanced Configuration

### Custom Severity Rules

Edit `src/utils/errorUtils.ts`:

```typescript
export function parseError(error: any): ErrorDetails {
  // Custom severity logic
  if (error.message.includes('payment')) {
    return { severity: 'critical', ... }
  }
  
  if (error.message.includes('auth')) {
    return { severity: 'high', ... }
  }
  
  // Default logic...
}
```

### Rate Limiting

Add rate limiting to prevent notification spam:

```typescript
// In error-webhook-trigger function
const rateLimitKey = `error-rate-${errorReport.context}`
const recentErrors = await redis.get(rateLimitKey) || 0

if (recentErrors > 10) {
  // Skip notification for this context
  return
}

await redis.setex(rateLimitKey, 300, recentErrors + 1) // 5 minute window
```

### Error Grouping

Group similar errors to reduce noise:

```typescript
// Group by error message hash
const errorHash = crypto.createHash('md5')
  .update(errorReport.error_message + errorReport.context)
  .digest('hex')

// Only notify for first occurrence in time window
const groupKey = `error-group-${errorHash}`
const isFirstOccurrence = !(await redis.get(groupKey))

if (isFirstOccurrence) {
  // Send notification
  await redis.setex(groupKey, 3600, '1') // 1 hour grouping window
}
```

## 📊 Monitoring Best Practices

1. **Set Up Alerts**: Configure alerts for error rate spikes
2. **Regular Reviews**: Weekly error report reviews
3. **Trend Analysis**: Monitor error trends over time
4. **User Impact**: Correlate errors with user complaints
5. **Performance**: Monitor error reporting system performance

## 🆘 Emergency Procedures

### High Error Volume
1. Check system health dashboard
2. Identify error patterns
3. Implement temporary fixes
4. Scale notification rate limiting
5. Communicate with users if needed

### Notification System Down
1. Check Supabase Edge Function status
2. Verify webhook configurations
3. Test alternative notification channels
4. Monitor error_reports table directly
5. Set up temporary monitoring

### Critical System Errors
1. Immediate investigation required
2. Check all notification channels
3. Review recent deployments
4. Implement emergency fixes
5. Post-incident analysis

---

Need help? Contact: support@rideyaari.com