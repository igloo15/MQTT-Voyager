# MQTT Voyager GitHub Pages Website

This directory contains the GitHub Pages website for MQTT Voyager.

## 🚀 Quick Setup

### 1. Enable GitHub Pages

1. Go to your repository settings on GitHub
2. Navigate to **Pages** in the left sidebar
3. Under **Source**, select:
   - **Branch**: `main` (or `master`)
   - **Folder**: `/docs`
4. Click **Save**

Your site will be published at: `https://yourusername.github.io/MQTT-Voyager/`

### 2. Update Links

Replace `yourusername` in the following files with your GitHub username:

**In `index.html`:**
- All GitHub links (search for `github.com/yourusername/MQTT-Voyager`)
- All download links in the Download section

Example:
```html
<!-- Before -->
<a href="https://github.com/yourusername/MQTT-Voyager">

<!-- After -->
<a href="https://github.com/your-actual-username/MQTT-Voyager">
```

### 3. Add Screenshots (Optional but Recommended)

1. Create an `images` folder in the `docs` directory:
   ```
   docs/
   ├── images/
   │   ├── dashboard.png
   │   ├── message-list.png
   │   ├── charts.png
   │   └── topic-tree.png
   ├── index.html
   └── styles.css
   ```

2. Take screenshots of your application:
   - **Dashboard View**: Show the analytics dashboard
   - **Message List**: Display the message browser with filters
   - **Charts**: Show the data visualization features
   - **Topic Tree**: Display the hierarchical topic view

3. Update the screenshot placeholders in `index.html`:

```html
<!-- Replace placeholder divs with actual images -->
<div class="screenshot-card">
    <img src="images/dashboard.png" alt="Dashboard View" style="width: 100%; border-radius: 8px;">
    <h4>Real-Time Dashboard</h4>
    <p>Monitor your MQTT traffic with live statistics and analytics</p>
</div>
```

### 4. Customize Content

Edit `index.html` to customize:

- **Hero Section**: Update the main headline and description
- **Features**: Add, remove, or modify feature cards
- **Download Links**: Update with your actual release URLs
- **Footer**: Add your social links or contact information

### 5. Update Download Links

When you create releases on GitHub, update the download links:

```html
<!-- Windows -->
<a href="https://github.com/yourusername/MQTT-Voyager/releases/latest/download/MQTT-Voyager-Setup-x64.exe">

<!-- macOS -->
<a href="https://github.com/yourusername/MQTT-Voyager/releases/latest/download/MQTT-Voyager-x64.dmg">

<!-- Linux -->
<a href="https://github.com/yourusername/MQTT-Voyager/releases/latest/download/MQTT-Voyager-x64.AppImage">
```

## 📝 Customization Tips

### Adding a Custom Domain

1. Create a file named `CNAME` in the `docs` folder:
   ```
   mqtt-voyager.example.com
   ```

2. Update your DNS settings to point to GitHub Pages:
   - Add a CNAME record pointing to `yourusername.github.io`

### Adding Google Analytics

Add this before the closing `</body>` tag in `index.html`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### Changing Colors

Edit the CSS variables in `styles.css`:

```css
:root {
    --primary-color: #1890ff;      /* Main brand color */
    --primary-dark: #0050b3;       /* Darker shade */
    --secondary-color: #52c41a;    /* Accent color */
    --gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

### Adding a Blog Section

Create a new `blog` folder in `docs`:

```
docs/
├── blog/
│   ├── index.html
│   └── posts/
│       └── first-post.html
├── images/
├── index.html
└── styles.css
```

## 🎨 Design Features

The website includes:
- ✅ Responsive design (mobile-friendly)
- ✅ Smooth scroll navigation
- ✅ Hover animations
- ✅ Gradient accents
- ✅ Dark theme sections
- ✅ SEO-friendly meta tags
- ✅ No external dependencies (pure HTML/CSS/JS)

## 📊 Performance

The website is optimized for:
- Fast loading (no heavy frameworks)
- Good SEO (semantic HTML)
- Accessibility (proper heading structure)
- Mobile responsiveness

## 🔧 Testing Locally

To test the website locally before pushing:

1. Use a simple HTTP server:
   ```bash
   # Python 3
   cd docs
   python -m http.server 8000

   # Or use Node.js
   npx serve
   ```

2. Open `http://localhost:8000` in your browser

## 📦 Deployment Checklist

Before publishing:
- [ ] Replace all `yourusername` placeholders
- [ ] Update download links with actual release URLs
- [ ] Add real screenshots (or keep placeholders temporarily)
- [ ] Test all navigation links
- [ ] Test on mobile devices
- [ ] Enable GitHub Pages in repository settings
- [ ] Update README.md with website URL

## 🌟 Tips for Great Screenshots

1. **Use a consistent theme**: Either all light mode or all dark mode
2. **Show real data**: Use realistic MQTT messages in screenshots
3. **Highlight features**: Show the key features you want to promote
4. **Optimize images**: Compress screenshots to ~500KB each
5. **Use 16:9 ratio**: Screenshots look better at 1920x1080 or 1280x720

## 🆘 Troubleshooting

**Site not updating?**
- Clear browser cache (Ctrl+Shift+R / Cmd+Shift+R)
- Wait 5-10 minutes for GitHub Pages to rebuild
- Check GitHub Actions for build errors

**404 errors?**
- Verify GitHub Pages is enabled in settings
- Check that `/docs` folder is selected as source
- Ensure `index.html` is in the `docs` folder

**Styling broken?**
- Check that `styles.css` is in the same folder as `index.html`
- Verify the `<link>` tag in `index.html` is correct
- Check browser console for errors

## 📚 Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Markdown Guide](https://www.markdownguide.org/)
- [Web Accessibility](https://www.w3.org/WAI/fundamentals/accessibility-intro/)

---

**Need help?** Open an issue on the [GitHub repository](https://github.com/yourusername/MQTT-Voyager/issues)!
