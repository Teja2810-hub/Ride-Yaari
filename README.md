# RideYaari - Connect Travelers Worldwide

RideYaari is a comprehensive platform that connects travelers for two main services:

## 🚗 Car Rides
Share car rides to split costs and reduce environmental impact through carpooling.

## ✈️ Airport Trips  
Share flight itineraries for package delivery, pickup services, travel assistance, and companionship.

## 🔧 Error Reporting & Monitoring System

This project includes a comprehensive error reporting and notification system:

### Features
- **Automatic Error Capture**: All client-side errors are automatically captured and reported
- **User-Friendly Display**: Users see friendly error messages while technical details are logged
- **Real-time Notifications**: Get instant notifications via Discord, Slack, or Email
- **Comprehensive Logging**: Full error context, stack traces, and user information
- **Resolution Tracking**: Mark errors as resolved and track progress

### Setup Instructions

#### 1. Database Migration
The error reporting tables are already created via migration files. No additional setup needed.

#### 2. Configure Notification Webhooks

Add these environment variables to your Supabase project (Settings → Edge Functions → Environment Variables):

**Discord Notifications (Optional):**
```
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your_webhook_url
```

**Slack Notifications (Optional):**
```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your_webhook_url
```

**Email Notifications (Optional):**
```
# Using Resend (Recommended)
EMAIL_API_KEY=your_resend_api_key
DEVELOPER_EMAIL=your_email@domain.com

# Alternative: SendGrid
SENDGRID_API_KEY=your_sendgrid_api_key
DEVELOPER_EMAIL=your_email@domain.com

# Alternative: Mailgun
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_mailgun_domain
DEVELOPER_EMAIL=your_email@domain.com
```

#### 3. Deploy Edge Functions
```bash
# Deploy the error webhook trigger function
supabase functions deploy error-webhook-trigger
```

#### 4. Set Up Database Webhook (Optional)
1. Go to your Supabase Dashboard → Database → Webhooks
2. Create a new webhook:
   - **Table**: error_reports
   - **Events**: INSERT
   - **Webhook URL**: Your error-webhook-trigger function URL
3. Enable the webhook

#### 5. Test Your Setup
1. Go to your app's Profile → System Health tab
2. Use the Error Testing Panel to test different severity levels
3. Check your configured notification channels for test messages

### How It Works

1. **Error Capture**: All JavaScript errors, unhandled promise rejections, and resource loading failures are automatically captured
2. **Error Processing**: Errors are categorized by severity (low, medium, high, critical) and stored in the database
3. **User Experience**: Users see friendly error messages like "Something went wrong. Our team has been notified."
4. **Developer Notifications**: You receive detailed error reports via your configured channels (Discord, Slack, Email)
5. **Resolution Tracking**: Mark errors as resolved in the System Health dashboard

### Notification Triggers

- **Low Severity**: Logged only, no notifications
- **Medium Severity**: Notifications sent to configured channels
- **High Severity**: Immediate notifications sent
- **Critical Severity**: Urgent notifications + browser alerts

### Monitoring Dashboard

Access the System Health dashboard from Profile → System Health to:
- View real-time system health status
- Browse and filter error reports
- Set up and test notification webhooks
- Test error reporting with different severity levels
- Export error data for analysis

## 🚀 Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up your Supabase project and add environment variables
4. Configure error notification webhooks (optional but recommended)
5. Run the development server: `npm run dev`

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Real-time**: Supabase Realtime subscriptions
- **Error Monitoring**: Custom error reporting system with webhook notifications
- **Maps**: Google Places API for location autocomplete

## 📧 Support

- **Email**: support@rideyaari.com
- **WhatsApp**: +917093203981

## ☕ Support the Developer

RideYaari is free to use and maintained by a solo developer. If you find it useful, consider supporting the project:

[![Buy me a coffee](https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=☕&slug=rideyaari&button_colour=FFDD00&font_colour=000000&font_family=Comic&outline_colour=000000&coffee_colour=ffffff)](https://www.buymeacoffee.com/rideyaari)

## 📄 License

MIT License - see LICENSE file for details.