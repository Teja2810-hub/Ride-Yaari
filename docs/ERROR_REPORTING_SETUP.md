# Error Reporting & Notification Setup Guide

This guide will help you set up the comprehensive error reporting and notification system for RideYaari.

## 🎯 Overview

The error reporting system automatically captures all client-side errors and sends notifications to developers while showing user-friendly messages to users.

## 📋 What's Already Implemented

✅ **Database Schema**: Error reports table with comprehensive metadata storage  
✅ **Client-Side Capture**: Automatic error capture for all JavaScript errors  
✅ **User-Friendly Display**: Generic error messages for users  
✅ **Backend Logging**: All errors stored in Supabase with full context  
✅ **Edge Functions**: Webhook trigger function for notifications  
✅ **Admin Dashboard**: Error viewing and resolution tracking  

## 🔧 Setup Steps

### 1. Configure Notification Channels

Choose one or more notification methods:

#### Discord Notifications
1. Go to your Discord server settings
2. Navigate to **Integrations** → **Webhooks**
3. Click **"New Webhook"**
4. Choose a channel for error notifications
5. Copy the webhook URL
6. Add to Supabase environment variables:
   ```
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your_webhook_url
   ```

#### Slack Notifications
1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Create a new app or select existing app
3. Navigate to **Incoming Webhooks**
4. Activate incoming webhooks
5. Add new webhook to workspace
6. Choose a channel for error notifications
7. Copy the webhook URL
8. Add to Supabase environment variables:
   ```
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your_webhook_url
   ```

#### Email Notifications

**Option 1: Resend (Recommended)**
1. Sign up at [Resend](https://resend.com)
2. Create an API key
3. Add to Supabase environment variables:
   ```
   EMAIL_API_KEY=your_resend_api_key
   DEVELOPER_EMAIL=your_email@domain.com
   ```

**Option 2: SendGrid**
1. Sign up at [SendGrid](https://sendgrid.com)
2. Create an API key with Mail Send permissions
3. Add to Supabase environment variables:
   ```
   SENDGRID_API_KEY=your_sendgrid_api_key
   DEVELOPER_EMAIL=your_email@domain.com
   ```

**Option 3: Mailgun**
1. Sign up at [Mailgun](https://mailgun.com)
2. Add and verify your domain
3. Get your API key from the dashboard
4. Add to Supabase environment variables:
   ```
   MAILGUN_API_KEY=your_mailgun_api_key
   MAILGUN_DOMAIN=your_mailgun_domain
   DEVELOPER_EMAIL=your_email@domain.com
   ```

### 2. Deploy Edge Functions

Deploy the error webhook trigger function:

```bash
supabase functions deploy error-webhook-trigger
```

### 3. Set Up Database Webhook (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **Database** → **Webhooks**
3. Click **"Create a new webhook"**
4. Configure:
   - **Table**: `error_reports`
   - **Events**: `INSERT`
   - **Webhook URL**: Your `error-webhook-trigger` function URL
5. Enable the webhook

### 4. Test Your Setup

1. Open your RideYaari app
2. Go to **Profile** → **System Health** tab
3. Navigate to **Error Testing** sub-tab
4. Test different error severity levels
5. Check your configured notification channels

## 📊 Error Severity Levels

| Severity | Description | Notifications | Examples |
|----------|-------------|---------------|----------|
| **Low** | Minor UI issues | None | Button styling glitches |
| **Medium** | Recoverable errors | ✅ Sent | API timeouts, validation errors |
| **High** | Significant issues | ✅ Sent | Authentication failures, data corruption |
| **Critical** | System failures | ✅ Urgent | App crashes, security breaches |

## 🔍 Monitoring Dashboard

Access the monitoring dashboard at **Profile** → **System Health**:

### System Health Tab
- Real-time health status of all services
- Response time monitoring
- System statistics and metrics

### Error Reports Tab
- Browse and filter all error reports
- View detailed error information
- Mark errors as resolved
- Export error data

### Webhook Setup Tab
- Step-by-step setup instructions
- Test webhook configurations
- Validate notification channels

### Error Testing Tab
- Test error reporting with different severities
- Verify notification delivery
- Simulate various error scenarios

## 📧 Notification Examples

### Discord Notification
```
🚨 RideYaari Error: HIGH

Error Details:
• Severity: HIGH
• User: John Doe
• Context: Chat Component
• Time: 2025-01-15 10:30:45
• URL: /chat

Error Message:
Failed to send message: Network timeout

Error ID: abc123...
```

### Email Notification
Rich HTML email with:
- Formatted error details
- Stack trace (if available)
- User and session information
- Direct link to Supabase dashboard
- Professional styling

### Slack Notification
Structured message with:
- Error summary
- Actionable buttons
- Formatted details
- Integration with Slack workflows

## 🛠️ Customization

### Adding New Notification Channels

1. Edit `supabase/functions/error-webhook-trigger/index.ts`
2. Add your notification service API call
3. Update environment variable documentation
4. Test the integration

### Modifying Error Severity Rules

Edit `src/utils/errorUtils.ts` to customize:
- Error categorization logic
- Severity assignment rules
- User message templates
- Retry behavior

### Custom Error Context

Add custom context to errors:
```typescript
import { reportErrorToBackend } from '../utils/errorUtils'

try {
  // Your code here
} catch (error) {
  await reportErrorToBackend(
    error,
    'Custom Component Name',
    'Additional context information',
    user?.id
  )
}
```

## 🔒 Security Considerations

- Error reports may contain sensitive user data
- Webhook URLs should be kept secure
- Email notifications should use secure SMTP
- Consider data retention policies for error logs
- Regularly review and clean up resolved errors

## 🚨 Troubleshooting

### Notifications Not Working
1. Check environment variables are set correctly
2. Verify webhook URLs are valid
3. Test webhook configuration in the dashboard
4. Check Supabase Edge Function logs
5. Ensure database webhook is enabled

### Errors Not Being Captured
1. Check browser console for JavaScript errors
2. Verify error reporting is enabled
3. Check network connectivity to Supabase
4. Review RLS policies on error_reports table

### High Error Volume
1. Review error patterns in the dashboard
2. Implement error deduplication
3. Adjust severity levels
4. Add error rate limiting

## 📈 Best Practices

1. **Monitor Regularly**: Check the error dashboard weekly
2. **Prioritize by Severity**: Focus on critical and high-severity errors first
3. **Track Resolution**: Mark errors as resolved when fixed
4. **Analyze Patterns**: Look for recurring issues
5. **User Communication**: Keep users informed during outages
6. **Performance Impact**: Monitor error reporting overhead

## 🤝 Contributing

When contributing to the error reporting system:
1. Test all severity levels
2. Verify notification delivery
3. Update documentation
4. Consider user privacy
5. Maintain backward compatibility

---

For additional support, contact: support@rideyaari.com