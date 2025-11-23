# 🚀 GitHub Pages Setup Guide

## Quick Overview
Your site will be live at: `https://your-username.github.io/Timeline-Overwatch`

## 📝 Step-by-Step Instructions

### Method 1: Upload via GitHub Website (EASIEST)

#### Step 1: Create a New Repository
1. Go to https://github.com and log in
2. Click the **"+"** icon in the top right corner
3. Click **"New repository"**

#### Step 2: Configure Repository
- **Repository name**: `Timeline-Overwatch` (or any name you want)
- **Description**: "My interactive website" (optional)
- **Public**: Make sure it's set to Public (required for free GitHub Pages)
- **DO NOT** check "Initialize with README" (we already have one)
- Click **"Create repository"**

#### Step 3: Upload Your Files
After creating the repository, you'll see a page with setup instructions. Look for:
**"...or push an existing repository from the command line"**

But we'll use the easier web upload method:
1. Look for the link that says **"uploading an existing file"** (it's in the middle of the page)
2. Click it
3. **Drag and drop** ALL these files from your folder:
   - index.html
   - about.html
   - contact.html
   - styles.css
   - script.js
   - README.md
   - .gitignore
4. In the "Commit changes" box at the bottom, type: `Initial commit - website files`
5. Click **"Commit changes"**

#### Step 4: Enable GitHub Pages
1. In your repository, click the **"Settings"** tab (top right area)
2. In the left sidebar, click **"Pages"** (under "Code and automation")
3. Under **"Source"**, select **"Deploy from a branch"**
4. Under **"Branch"**, select **"main"** (or "master" if that's what shows)
5. Keep the folder as **"/ (root)"**
6. Click **"Save"**

#### Step 5: Wait and Access Your Site
1. After clicking Save, you'll see a blue box that says "GitHub Pages source saved"
2. **Wait 2-5 minutes** for GitHub to build your site
3. Refresh the Settings → Pages page
4. You'll see a green box with: **"Your site is live at https://your-username.github.io/Timeline-Overwatch"**
5. Click the link to see your live website! 🎉

---

### Method 2: Using Git Command Line (If you're comfortable with terminal)

#### Step 1: Create Repository on GitHub
1. Go to https://github.com
2. Click "+" → "New repository"
3. Name it `Timeline-Overwatch`
4. Make it Public
5. Click "Create repository"

#### Step 2: Push Your Code
Open your terminal/command prompt and run these commands:

```bash
# Navigate to your project folder
cd "C:\Users\diego\OneDrive\Escritorio\Timeline Overwatch"

# Initialize git (if not already done)
git init

# Add all files
git add .

# Create your first commit
git commit -m "Initial commit - website files"

# Add your GitHub repository as remote (replace YOUR-USERNAME)
git remote add origin https://github.com/YOUR-USERNAME/Timeline-Overwatch.git

# Push to GitHub
git branch -M main
git push -u origin main
```

#### Step 3: Enable GitHub Pages
Follow Step 4 from Method 1 above.

---

## 🔄 How to Update Your Site Later

### Via Website:
1. Go to your repository on GitHub
2. Click on the file you want to edit
3. Click the **pencil icon** (✏️) to edit
4. Make your changes
5. Scroll down and click "Commit changes"
6. Wait 1-2 minutes, your site will automatically update!

### Via Git Command Line:
```bash
# Make your changes to files locally
# Then:
git add .
git commit -m "Describe your changes here"
git push
```

---

## 🌐 Custom Domain (Optional)

Want your own domain like `mysite.com` instead of `username.github.io`?

1. Buy a domain from: Namecheap, Google Domains, or Cloudflare (~$10-15/year)
2. In your repository: Settings → Pages → Custom domain
3. Enter your domain and click Save
4. In your domain registrar, add a CNAME record pointing to `your-username.github.io`

GitHub Pages is free even with a custom domain!

---

## ✅ Checklist

- [ ] Created GitHub repository
- [ ] Uploaded all files (index.html, styles.css, script.js, etc.)
- [ ] Enabled GitHub Pages in Settings
- [ ] Waited 2-5 minutes
- [ ] Visited your live site!
- [ ] Shared the link with friends 😎

---

## 🆘 Troubleshooting

### "I don't see the Pages option in Settings"
- Make sure your repository is **Public**, not Private
- Make sure you've uploaded at least one file

### "My site shows a 404 error"
- Make sure your main file is named exactly `index.html` (lowercase)
- Wait a full 5 minutes, sometimes it takes time
- Try accessing: `https://your-username.github.io/Timeline-Overwatch/index.html`

### "CSS/JavaScript isn't working"
- Make sure all files are in the same folder (root of repository)
- Check that file names match exactly (case-sensitive)
- Clear your browser cache (Ctrl+F5)

### "I want to change the URL"
- You can rename your repository in Settings → General → Repository name
- Your URL will automatically update to the new name

---

## 🎉 You're All Set!

Your website is now:
- ✅ Live on the internet
- ✅ Accessible from anywhere
- ✅ Works on all devices
- ✅ Free forever
- ✅ Easy to update

Share your link with the world! 🌍









