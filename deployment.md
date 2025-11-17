The + icon is next to "Go to file", labeled Deployment Guide: Railway
This guide walks you through deploying Prompt Maker to Railway with all required environment variables.

Prerequisites
GitHub repository: tokingteepee-ai/PrompMakerPro (✓ already pushed)
Railway account (sign up at https://railway.app)
Your environment variables ready (see below)
Required Environment Variables
ANTHROPIC_API_KEY=sk-ant-...     # Your Anthropic API key
SESSION_SECRET=...                # Random secret for sessions
WP_USERNAME=...                   # WordPress username
WP_APP_PASSWORD=...               # WordPress application password
NODE_ENV=production               # Production mode

Option 1: Railway CLI (Recommended - Most Reliable)
Step 1: Install Railway CLI
Mac/Linux:

curl -fsSL https://railway.app/install.sh | sh

Windows:

iwr https://railway.app/install.ps1 | iex

Step 2: Login to Railway
railway login

Step 3: Link to Your Deployed Project
If you already created a project in Railway's web UI:

railway link

Then select your PrompMakerPro project.

OR create a new project from scratch:

railway init

Step 4: Set Environment Variables
Run these commands one at a time, replacing the values:

railway variables set ANTHROPIC_API_KEY="your-actual-key-here"
railway variables set SESSION_SECRET="your-session-secret-here"
railway variables set WP_USERNAME="your-wordpress-username"
railway variables set WP_APP_PASSWORD="your-wordpress-app-password"
railway variables set NODE_ENV="production"

Step 5: Deploy
railway up

Railway will build and deploy your app. You'll see build logs in the terminal.

Step 6: Get Your URL
railway domain

This shows your public URL (something like https://promptmaker-production-xxxx.up.railway.app)

Option 2: Railway Web UI
Finding the Variables Tab
After deploying from GitHub in Railway's web UI:

Go to https://railway.app/dashboard
Click your PrompMakerPro project
Click the service card (shows your app name/status)
Look for tabs at the top: Settings, Variables, Deployments, Metrics
Click Variables tab
Click + New Variable button
Add each variable:
Name: ANTHROPIC_API_KEY, Value: your-key
Name: SESSION_SECRET, Value: your-secret
Name: WP_USERNAME, Value: your-username
Name: WP_APP_PASSWORD, Value: your-password
Name: NODE_ENV, Value: production
Railway will automatically redeploy after you save the variables.

Verification: Test WordPress Publishing
Once deployed, test the WordPress integration:

curl -X POST https://your-railway-url.up.railway.app/api/wordpress/publish \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Prompt from Railway",
    "content": "This is a test prompt to verify WordPress publishing works from Railway deployment.",
    "templateMode": "general_prompt"
  }'

Expected Success:

{
  "success": true,
  "url": "https://aifirstmovers.net/prompts/test-prompt-from-railway/",
  "postId": 12345
}

If you get errors:

401 Unauthorized → Check WP_USERNAME and WP_APP_PASSWORD are correct
403 Forbidden → SiteGround may still be blocking (different issue from Replit)
500 Server Error → Check Railway logs: railway logs
Troubleshooting
Check Railway Logs
railway logs

Verify Environment Variables Are Set
railway variables

SiteGround Still Blocking?
If WordPress returns 403/security errors, Railway may also be on SiteGround's blocklist. Options:

Contact SiteGround support - Ask them to whitelist Railway's IP ranges
Use Cloudflare proxy - Route WordPress through Cloudflare to bypass SiteGround WAF
Switch WordPress hosts - Move to a host that doesn't block cloud platforms
Environment Variable Reference
Variable	Purpose	Where to Get It
ANTHROPIC_API_KEY	Claude API access	https://console.anthropic.com/settings/keys
SESSION_SECRET	Secure sessions	Any random 32+ character string
WP_USERNAME	WordPress auth	Your WordPress admin username
WP_APP_PASSWORD	WordPress auth	WordPress → Users → Application Passwords
NODE_ENV	Runtime mode	Always set to production
Success Checklist
 Railway CLI installed (or using web UI)
 All 5 environment variables set
 Deployment succeeded (no build errors)
 App accessible at Railway URL
 WordPress publish test returns "success": true
Once all boxes are checked, your Prompt Maker is live!as "t +".
