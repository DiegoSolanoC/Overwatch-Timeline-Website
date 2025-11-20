# My Website

A simple, modern website built with HTML, CSS, and JavaScript.

## 🚀 How to Deploy for FREE

### Option 1: GitHub Pages (Recommended)

1. **Create a GitHub account** at https://github.com if you don't have one

2. **Create a new repository**
   - Click the "+" icon → "New repository"
   - Name it `your-username.github.io` (replace "your-username" with your GitHub username)
   - Make it public
   - Don't initialize with README (we already have one)

3. **Upload your files**
   - Click "uploading an existing file"
   - Drag and drop all your HTML, CSS, and JS files
   - Click "Commit changes"

4. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Source: Deploy from a branch
   - Branch: main (or master)
   - Click Save

5. **Access your site!**
   - Your site will be live at: `https://your-username.github.io`
   - It may take a few minutes to go live

### Option 2: Netlify (Easiest for beginners)

1. Go to https://www.netlify.com
2. Sign up for free (can use GitHub account)
3. Click "Add new site" → "Deploy manually"
4. Drag and drop your entire project folder
5. Your site is live! Netlify gives you a random URL like `random-name.netlify.app`
6. You can customize the URL in settings

### Option 3: Vercel

1. Go to https://vercel.com
2. Sign up for free
3. Click "Add New" → "Project"
4. Import your GitHub repository or drag and drop files
5. Click "Deploy"

### Option 4: Cloudflare Pages

1. Go to https://pages.cloudflare.com
2. Sign up for free
3. Create a project
4. Connect your GitHub or upload files directly
5. Deploy!

## 📁 File Structure

```
your-website/
│
├── index.html      # Home page
├── about.html      # About page
├── contact.html    # Contact page
├── styles.css      # All styling
├── script.js       # All JavaScript functionality
└── README.md       # This file
```

## ✏️ Customization

### Change Colors
Open `styles.css` and modify these variables at the top:
- `#667eea` - Primary purple color
- `#764ba2` - Secondary purple color

### Add More Pages
1. Copy one of the existing HTML files
2. Rename it (e.g., `projects.html`)
3. Update the content
4. Add a button to the navigation in all pages

### Modify Content
Just open the HTML files and change the text inside the tags!

## 🎨 Features

- ✅ Responsive design (works on mobile, tablet, desktop)
- ✅ Modern gradient background
- ✅ Interactive buttons and hover effects
- ✅ Modal popup for additional information
- ✅ Contact form (frontend only - you'll need a backend to actually send emails)
- ✅ Smooth animations

## 📧 Making the Contact Form Work

The contact form is currently frontend-only. To make it actually send emails, you can:

1. **Use Formspree** (free tier available)
   - Go to https://formspree.io
   - Create an account
   - Update your form's action attribute

2. **Use Netlify Forms** (if using Netlify)
   - Add `netlify` attribute to your form
   - Add `name="contact"` to your form tag

3. **Use EmailJS** (free tier available)
   - Go to https://www.emailjs.com
   - Follow their setup guide

## 🛠️ Testing Locally

Just open `index.html` in your web browser! No server needed for basic testing.

## 📝 License

Feel free to use this template for any project!

---

**Need help?** Check out:
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Netlify Documentation](https://docs.netlify.com)
- [W3Schools HTML Tutorial](https://www.w3schools.com/html/)





