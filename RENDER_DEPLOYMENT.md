# Render Deployment Guide

**Status:** Ready for Deployment  
**Date:** 2025-01-27

---

## Prerequisites

1. **GitHub Repository:** This project needs to be pushed to GitHub first
2. **Render Account:** Already connected (API key provided)
3. **Environment Variables:** OpenAI API key required

---

## Deployment Steps

### 1. Push to GitHub

First, initialize git and push to GitHub:

```bash
# Initialize git repository
git init
git add .
git commit -m "Initial commit: NDC Calculator Phase 5 complete"

# Create GitHub repository and push
# (Do this via GitHub web interface or GitHub CLI)
git remote add origin https://github.com/YOUR_USERNAME/ndc-calculator.git
git branch -M main
git push -u origin main
```

### 2. Create Render Web Service

**Option A: Via Render Dashboard**
1. Go to https://dashboard.render.com
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name:** `ndc-calculator`
   - **Runtime:** Node.js
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node build`
   - **Region:** Oregon (or closest to users)
   - **Plan:** Starter

**Option B: Via Render MCP API** (requires valid GitHub repo URL)
```javascript
// Once GitHub repo is available, use:
mcp_render_create_web_service({
  name: "ndc-calculator",
  runtime: "node",
  buildCommand: "npm install && npm run build",
  startCommand: "node build",
  repo: "https://github.com/YOUR_USERNAME/ndc-calculator",
  region: "oregon",
  plan: "starter",
  autoDeploy: true,
  envVars: [
    { key: "NODE_ENV", value: "production" },
    { key: "OPENAI_API_KEY", value: "YOUR_OPENAI_API_KEY" }
  ]
})
```

### 3. Configure Environment Variables

In Render dashboard, add environment variables:
- `NODE_ENV=production`
- `OPENAI_API_KEY` - Your OpenAI API key (required)

### 4. Configure Health Check

- **Path:** `/api/health`
- **Expected Status:** 200
- **Interval:** Default (30 seconds)

### 5. Deploy

- Render will automatically deploy when you push to the main branch
- Monitor deployment logs
- Wait for deployment to complete

### 6. Verify Deployment

1. **Health Check:**
   ```bash
   curl https://ndc-calculator.onrender.com/api/health
   ```
   Should return:
   ```json
   {
     "status": "healthy",
     "timestamp": "2025-01-27T...",
     "version": "1.0.0",
     "uptime": 123
   }
   ```

2. **Calculate Endpoint:**
   ```bash
   curl -X POST https://ndc-calculator.onrender.com/api/calculate \
     -H "Content-Type: application/json" \
     -d '{
       "drugInput": "Lisinopril",
       "sig": "Take 1 tablet twice daily",
       "daysSupply": 30
     }'
   ```

3. **UI:**
   - Open https://ndc-calculator.onrender.com in browser
   - Test form submission
   - Verify results display

---

## Build Configuration

**Build Command:** `npm install && npm run build`

**Start Command:** `node build`

**Note:** With `@sveltejs/adapter-node`, the build output is in the `build/` directory, and the entry point is `build/index.js`. The server listens on the `PORT` environment variable (defaults to 3000 if not set).

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | Set to `production` |
| `OPENAI_API_KEY` | Yes | OpenAI API key for SIG parsing fallback |
| `PORT` | No | Server port (Render sets this automatically) |

---

## Post-Deployment Checklist

- [ ] Health check endpoint returns 200
- [ ] Calculate endpoint works with sample request
- [ ] UI loads and displays correctly
- [ ] Form submission works
- [ ] Error handling works (test with invalid drug name)
- [ ] No errors in deployment logs
- [ ] Performance is acceptable (<2s response time)

---

## Troubleshooting

### Build Fails
- Check build logs in Render dashboard
- Verify all dependencies are in `package.json`
- Check Node.js version (should be ≥18.x)

### Service Won't Start
- Check start command: `node build`
- Verify `build/` directory exists after build
- Check environment variables are set

### Health Check Fails
- Verify `/api/health` endpoint exists
- Check server is listening on correct port
- Review application logs

### API Errors
- Verify `OPENAI_API_KEY` is set correctly
- Check external API availability (RxNorm, FDA)
- Review error logs

---

## Monitoring

After deployment, monitor:
- Application logs
- Health check status
- Response times
- Error rates
- Cache hit rates

---

## Next Steps

1. Push code to GitHub
2. Create Render web service
3. Configure environment variables
4. Deploy and verify
5. Monitor performance

---

**Last Updated:** 2025-01-27  
**Status:** Ready for deployment (pending GitHub repo)

