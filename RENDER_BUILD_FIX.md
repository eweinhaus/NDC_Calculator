# Render Build Command Fix

**Issue:** Build is failing because `npm install` skips devDependencies when `NODE_ENV=production` is set.

**Solution:** Update the build command in Render dashboard to use `npm ci` instead of `npm install`.

## Steps to Fix

1. Go to Render dashboard: https://dashboard.render.com/web/srv-d494eia4d50c7394ejk0
2. Click on "Settings" tab
3. Find "Build Command" field
4. Change from: `npm install && npm run build`
5. Change to: `npm ci && npm run build`
6. Click "Save Changes"
7. This will trigger a new deployment

## Why `npm ci`?

- `npm ci` installs dependencies directly from `package-lock.json`
- It respects the lock file and installs all dependencies (including devDependencies)
- It's faster and more reliable for CI/CD environments
- It ensures consistent builds

## Alternative Solution

If you prefer to keep `npm install`, you can:
1. Remove `NODE_ENV=production` from environment variables during build
2. Or use: `NODE_ENV=development npm install && npm run build && NODE_ENV=production`
3. But `npm ci` is the recommended approach

---

**Status:** ⚠️ **Action Required** - Update build command in Render dashboard

