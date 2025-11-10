# Build Fix Required - Manual Action Needed

**Issue:** Build is failing because `npm ci` requires package.json and package-lock.json to be in perfect sync, but there's a dependency conflict.

**Error:** `Missing: yaml@2.8.1 from lock file`

## Solution

The build command in Render needs to be manually updated from `npm ci` to `npm install` which is more forgiving with dependency resolution.

## Steps to Fix

1. Go to Render dashboard: https://dashboard.render.com/web/srv-d494eia4d50c7394ejk0
2. Click on **"Settings"** tab
3. Scroll to **"Build & Deploy"** section
4. Find **"Build Command"** field
5. Change from: `npm ci && npm run build`
6. Change to: `npm install && npm run build`
7. Click **"Save Changes"**
8. This will trigger a new deployment automatically

## Why This Works

- `npm install` is more flexible and can resolve dependency conflicts
- `npm ci` is strict and requires perfect sync between package.json and package-lock.json
- The yaml dependency conflict (tailwindcss requires yaml@^2.4.2, but eslint-plugin-svelte has yaml@1.10.2) causes npm ci to fail
- `npm install` will resolve this automatically

## Alternative: Fix package-lock.json

If you prefer to keep `npm ci`, you would need to:
1. Resolve the yaml dependency conflict manually
2. Regenerate package-lock.json with `npm install`
3. Commit and push the updated package-lock.json

But using `npm install` in the build command is the simpler solution.

---

**Status:** ⚠️ **ACTION REQUIRED** - Update build command in Render dashboard

