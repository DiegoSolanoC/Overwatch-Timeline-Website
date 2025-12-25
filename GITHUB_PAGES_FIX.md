# Fix GitHub Pages Error

## The Problem
Your repository is initialized locally but hasn't been pushed to GitHub yet, or the branch name doesn't match.

## Solution Steps

### Step 1: Add and Commit All Files
```bash
git add .
git commit -m "Initial commit - Timeline Overwatch website"
```

### Step 2: Rename Branch to 'main' (GitHub Pages prefers 'main' over 'master')
```bash
git branch -M main
```

### Step 3: Add Your GitHub Repository as Remote
Replace `YOUR-USERNAME` and `YOUR-REPO-NAME` with your actual GitHub username and repository name:
```bash
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
```

### Step 4: Push to GitHub
```bash
git push -u origin main
```

### Step 5: Configure GitHub Pages
1. Go to your repository on GitHub
2. Click **Settings** tab
3. Click **Pages** in the left sidebar
4. Under **Source**, select:
   - **Branch**: `main` (or `master` if you kept that name)
   - **Folder**: `/ (root)`
5. Click **Save**
6. Wait 2-5 minutes for GitHub to build your site

### Step 6: Verify
Your site should be live at:
- `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`

## Common Issues

### "Branch name mismatch"
- If GitHub Pages is set to `main` but your branch is `master`, either:
  - Rename your branch: `git branch -M main` (then push again)
  - OR change GitHub Pages settings to use `master` branch

### "Repository not found"
- Make sure you've created the repository on GitHub first
- Check that the remote URL is correct: `git remote -v`

### "Files not showing"
- Make sure `index.html` is in the root directory
- Verify all files were committed: `git status`
- Make sure you pushed: `git push -u origin main`













