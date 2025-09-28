# 🚀 InspireMe Setup Instructions

## Quick Setup Guide

Follow these steps to set up InspireMe with Supabase integration:

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com/dashboard)
2. Click "New project"
3. Choose your organization
4. Fill in project details:
   - **Name**: InspireMe (or your preferred name)
   - **Database Password**: Create a strong password
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait 1-2 minutes for setup to complete

## Step 2: Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `supabase/schema.sql` from this project
4. Paste into the SQL editor
5. Click **Run** to execute the schema
6. Verify tables were created in **Table editor**

## Step 3: Get API Credentials

1. Go to **Settings → API** in your Supabase dashboard
2. Copy the following values:
   - **URL**: `https://your-project-ref.supabase.co`
   - **anon/public key**: `eyJhbG...` (long string)

## Step 4: Configure Your App

1. Open `config/supabase-client.js` in your project
2. Replace the placeholder values:

```javascript
const SUPABASE_URL = 'https://your-project-ref.supabase.co'; // Paste your URL here
const SUPABASE_ANON_KEY = 'eyJhbG...'; // Paste your anon key here
```

## Step 5: Test Your Setup

1. Open `index.html` in your browser (or serve it locally)
2. Check browser console (F12) for "Supabase client initialized successfully"
3. Try adding a quote in the admin panel to test functionality

## Step 6: Enable Authentication (Optional)

1. In Supabase dashboard, go to **Authentication → Settings**
2. Configure your site URL: `http://localhost:3000` (for development)
3. Add production URL when you deploy
4. Enable desired auth providers (Email, Google, GitHub, etc.)

## Local Development

### Option 1: Simple File Server
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .

# Using PHP
php -S localhost:8000
```

### Option 2: With npm (Optional)
```bash
npm install
npm run dev
```

## Deployment

### Netlify
1. Connect your GitHub repository
2. Build settings: 
   - Build command: (leave empty)
   - Publish directory: `/` (root)
3. Add environment variables if needed
4. Deploy!

### Vercel
1. Connect repository
2. Framework preset: Other
3. Deploy settings: default
4. Deploy!

## Troubleshooting

### "Supabase client not initialized"
- ✅ Check that you've included the CDN script in `index.html`
- ✅ Verify your credentials in `config/supabase-client.js`
- ✅ Ensure your project is fully set up in Supabase dashboard

### "Quotes not loading"
- ✅ Check that you've run the schema.sql file
- ✅ Verify tables exist in Supabase Table editor
- ✅ Check browser console for detailed error messages

### "Authentication not working"
- ✅ Enable Email auth in Supabase Authentication settings
- ✅ Add your domain to allowed redirect URLs
- ✅ Check that RLS policies are properly configured

### "Can't add quotes"
- ✅ Make sure you're authenticated (signed in)
- ✅ Check RLS policies allow authenticated users to insert
- ✅ Verify your user has proper permissions

## Advanced Configuration

### Custom Domain
1. Update Supabase Auth settings with your domain
2. Configure CORS if needed
3. Update redirect URLs

### Environment Variables (Production)
For better security, use environment variables:

```javascript
const SUPABASE_URL = process.env.SUPABASE_URL || 'fallback-url';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'fallback-key';
```

### Database Customization
- Modify `supabase/schema.sql` before running
- Add custom functions or triggers
- Configure additional RLS policies

## Support

If you encounter issues:

1. Check the [Troubleshooting section](#troubleshooting) above
2. Review browser console for error messages
3. Check Supabase project logs in dashboard
4. Open an issue on GitHub with details

## Next Steps

Once setup is complete:
- Import your existing quotes (if any)
- Customize the styling in `styles.css`
- Add your own quote categories
- Consider enabling additional auth providers
- Set up backups and monitoring

Happy quoting! ✨