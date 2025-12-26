# CSS Cache Fix for GitHub Pages

## The Problem
When you deploy to GitHub Pages, browsers and GitHub's CDN cache the CSS file. This means your new mobile styles might not show up even after pushing updates.

## The Solution
We've updated the cache-busting version from `?v=3` to `?v=4` in all HTML files. This forces browsers and GitHub Pages to reload the CSS.

## Files Updated
- ✅ `main.html` - Updated to `styles.css?v=4`
- ✅ `test.html` - Updated to `styles.css?v=4`
- ✅ `index.html` - Updated to `styles.css?v=4`
- ✅ `map.html` - Updated to `styles.css?v=4`
- ✅ `options.html` - Updated to `styles.css?v=4`
- ✅ `about.html` - Updated to `styles.css?v=4`
- ✅ `contact.html` - Updated to `styles.css?v=4`
- ✅ `filters.html` - Updated to `styles.css?v=4`

## Deployment Steps

### 1. Commit and Push Changes
```bash
git add .
git commit -m "Fix CSS cache - update mobile styles for GitHub Pages"
git push
```

### 2. Wait for GitHub Pages to Rebuild
- GitHub Pages usually takes 1-2 minutes to rebuild
- You can check the deployment status in: **Settings → Pages → Build and deployment**

### 3. Clear Browser Cache (Important!)
Even with cache busting, users might have the old CSS cached. Here's how to clear it:

#### Chrome/Edge:
1. Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
2. Select "Cached images and files"
3. Click "Clear data"
4. Or do a hard refresh: `Ctrl + F5` (Windows) or `Cmd + Shift + R` (Mac)

#### Firefox:
1. Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
2. Select "Cache"
3. Click "Clear Now"
4. Or hard refresh: `Ctrl + F5`

#### Safari:
1. Press `Cmd + Option + E` to clear cache
2. Or hard refresh: `Cmd + Option + R`

### 4. Test on GitHub Pages
Visit your GitHub Pages URL and test the mobile view:
- Open Chrome DevTools (`F12`)
- Toggle device toolbar (`Ctrl + Shift + M`)
- Select a mobile device (e.g., iPhone 12)
- Test the event panel and image overlay

## Future Updates

When you make CSS changes in the future:
1. **Increment the version number** in all HTML files:
   - Change `?v=4` to `?v=5` (or higher)
   - Update all HTML files that reference `styles.css`

2. **Or use a timestamp** for automatic cache busting:
   ```html
   <link rel="stylesheet" href="styles.css?v=<?php echo time(); ?>">
   ```
   (Note: This requires PHP, which GitHub Pages doesn't support)

3. **Or use a build script** to automatically update the version number before deployment

## Verification

After deployment, verify the fix:
1. Open your GitHub Pages site
2. Open browser DevTools (`F12`)
3. Go to **Network** tab
4. Reload the page
5. Check that `styles.css?v=4` is loaded (not `styles.css?v=3`)
6. Check the file size and last modified date to ensure it's the latest version

## If Issues Persist

If mobile styles still don't show after clearing cache:

1. **Check GitHub Pages deployment:**
   - Go to repository → **Actions** tab
   - Verify the latest deployment succeeded

2. **Verify CSS file is updated:**
   - Check that `styles.css` in your repository has the mobile styles
   - Look for `@media (max-width: 768px)` section

3. **Check browser console:**
   - Open DevTools → Console
   - Look for CSS loading errors

4. **Try incognito/private mode:**
   - This bypasses cache completely
   - If it works in incognito, it's definitely a cache issue

5. **Increment version again:**
   - Change `?v=4` to `?v=5` in all HTML files
   - Commit and push again

## Quick Reference

**Current CSS version:** `v=4`

**To update in future:**
1. Find all `styles.css?v=4` in HTML files
2. Replace with `styles.css?v=5` (or next number)
3. Commit and push

