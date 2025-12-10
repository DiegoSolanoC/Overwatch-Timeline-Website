# 🚀 GitHub Pages Deployment Checklist

## Pre-Deployment Checklist

### ✅ File Structure
- [x] All HTML files in root directory
- [x] All CSS files in root directory  
- [x] All JavaScript files in proper folders
- [x] All assets (images, audio, models) in proper folders
- [x] `index.html` exists and redirects to `map.html`

### ✅ Paths & References
- [x] All file paths are relative (no absolute paths)
- [x] No hardcoded `localhost` references (EventManager.js checks for localhost correctly)
- [x] CDN links for Three.js are correct
- [x] All image paths use relative paths

### ✅ Git Setup
- [ ] Initialize git repository (if not done): `git init`
- [ ] Add all files: `git add .`
- [ ] Create initial commit: `git commit -m "Initial commit - Timeline Overwatch"`
- [ ] Rename branch to main: `git branch -M main`

### ✅ GitHub Repository
- [ ] Create new repository on GitHub (name: `Timeline-Overwatch` or your choice)
- [ ] Make repository **Public** (required for free GitHub Pages)
- [ ] Add remote: `git remote add origin https://github.com/YOUR-USERNAME/Timeline-Overwatch.git`
- [ ] Push to GitHub: `git push -u origin main`

### ✅ GitHub Pages Configuration
- [ ] Go to repository Settings → Pages
- [ ] Source: Deploy from a branch
- [ ] Branch: `main` (or `master`)
- [ ] Folder: `/ (root)`
- [ ] Click Save
- [ ] Wait 2-5 minutes for deployment

### ✅ Verify Deployment
- [ ] Visit: `https://YOUR-USERNAME.github.io/Timeline-Overwatch/`
- [ ] Test all pages (map.html, filters.html, options.html)
- [ ] Test mobile view
- [ ] Test all interactive features
- [ ] Check browser console for errors

## Post-Deployment

### Update Site
To update your site after deployment:
```bash
git add .
git commit -m "Describe your changes"
git push
```
Wait 1-2 minutes for GitHub Pages to rebuild.

### Custom Domain (Optional)
1. Go to Settings → Pages → Custom domain
2. Enter your domain name
3. Add CNAME record at your domain registrar

## Troubleshooting

### Site shows 404
- Wait 5-10 minutes (GitHub Pages can be slow)
- Check that `index.html` exists in root
- Verify branch name matches GitHub Pages settings

### Assets not loading
- Check file paths are relative (not absolute)
- Clear browser cache (Ctrl+F5)
- Check browser console for 404 errors

### Mobile features not working
- Test in actual mobile device or Chrome DevTools
- Check that mobile CSS media queries are correct

## Notes

- All file paths are already relative ✓
- EventManager.js correctly detects localhost vs GitHub Pages ✓
- No build step required - static files work directly ✓
- All assets (images, audio, models) should be included in repository ✓





