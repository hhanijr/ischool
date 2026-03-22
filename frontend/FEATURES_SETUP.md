# CourseAI Frontend - New Features Setup Guide

## 🎨 Theme System (Dark/Light Mode)

### Installation
The following packages have been added to `package.json`:
- `next-themes` - Theme management
- `framer-motion` - Animations

Run this command to install:
```bash
cd frontend
npm install
```

### What Changed
- **`tailwind.config.js`** - Added `darkMode: 'class'` and light mode color tokens
- **`app/layout.tsx`** - Wrapped app with `ThemeProvider` and `suppressHydrationWarning`
- **`components/ThemeToggle.tsx`** - New theme toggle button component
- **Navigation updated** - All pages now include ThemeToggle in the top nav

### Dark Mode Colors
- **Dark (Default):** `#0B0F19` background, `#151A25` cards
- **Light:** `#F9FAFB` background, `#FFFFFF` cards

---

## 📄 About Page

**Path:** `app/about/page.tsx`

### Features
- ✅ Hero section with "Revolutionizing Learning with AI"
- ✅ Glassmorphism mission card
- ✅ Team grid (3 members with emoji avatars)
- ✅ Tech stack section with hover effects
- ✅ Framer motion fade-in animations
- ✅ Full dark/light mode support

### Navigation
- Link: `/about`
- Added to top nav on all pages

---

## 📧 Contact Page

**Path:** `app/contact/page.tsx`

### Features
- ✅ Two-column layout (Contact Info | Form)
- ✅ Support card design with glassmorphism
- ✅ Contact form with validation
- ✅ Dark backgrounds (`bg-gray-900`) with cyan focus glow
- ✅ Gradient submit button (Violet → Cyan)
- ✅ Form data logs to console
- ✅ Success message animation
- ✅ Full dark/light mode support

### Form Inputs
- Name (required)
- Email (required)
- Subject (required)
- Message (required)

**Note:** Form currently logs to console. To connect to an API, modify the `handleSubmit` function in `app/contact/page.tsx`.

---

## 🎨 Updated Components

### ThemeToggle Button
- Shows moon icon (🌙) in dark mode
- Shows sun icon (☀️) in light mode
- Located in top navigation on all pages
- Hydration-safe with `mounted` state check

### Navigation
All pages now include:
- CourseAI logo (links home)
- Home/Active Learning link
- About link
- Courses link
- Contact link
- Theme toggle button

---

## 🚀 Running the App

```bash
cd frontend
npm install        # Install new dependencies
npm run dev         # Start development server
```

Visit: `http://localhost:3000`

### Pages
- `/` - Workspace (main learning dashboard)
- `/courses` - Course library
- `/about` - About us page
- `/contact` - Contact form page

---

## 🎯 Dark/Light Mode Usage

The theme is controlled by:
1. **Click theme toggle button** in top nav
2. Theme persists in localStorage
3. Automatically detects system preference on first visit

All components use Tailwind's `dark:` classes:
```tsx
<div className="bg-white dark:bg-bg-page text-black dark:text-white">
```

---

## 📝 Customization

### To change theme colors:
Edit `tailwind.config.js`:
```javascript
colors: {
    'bg-page': '#0B0F19',        // Dark background
    'bg-card': '#151A25',        // Dark card
    'light-bg': '#F9FAFB',       // Light background
    'light-card': '#FFFFFF',     // Light card
}
```

### To change theme toggle label:
Edit `components/ThemeToggle.tsx` to show/hide text or customize styling.

---

## ✅ Checklist for Production

- [ ] Install dependencies: `npm install`
- [ ] Test dark mode toggle
- [ ] Test light mode toggle
- [ ] Verify About page loads
- [ ] Verify Contact form works
- [ ] Test form submission (check browser console)
- [ ] Test responsive design on mobile
- [ ] Test all navigation links

---

## 🐛 Troubleshooting

**Theme not persisting?**
- Clear browser cache and localStorage
- Check if `next-themes` is installed: `npm list next-themes`

**Form not submitting?**
- Check browser console (F12) for form data logs
- Verify all required fields are filled

**Hydration warning?**
- Already handled with `suppressHydrationWarning` in layout.tsx
- ThemeToggle has `mounted` state check

---

## 📚 Resources

- [next-themes documentation](https://github.com/pacocoursey/next-themes)
- [Framer Motion documentation](https://www.framer.com/motion/)
- [Tailwind Dark Mode Guide](https://tailwindcss.com/docs/dark-mode)
