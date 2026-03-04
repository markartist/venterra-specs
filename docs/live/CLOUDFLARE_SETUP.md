# Cloudflare Pages Deployment Guide

## Project: Venterra Layout Governance System
**Domain:** specs.venterradev.com  
**GitHub Repo:** https://github.com/markartist/figma  
**Local Path:** ~/VenterraDev/Specs

---

## Quick Setup (5 minutes)

### 1. Connect Repository to Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → **Create Application** → **Pages** → **Connect to Git**
3. Select **GitHub** and authorize Cloudflare
4. Choose repository: **markartist/figma**
5. Click **Begin Setup**

### 2. Configure Build Settings

Use these exact settings:

```
Project Name: venterra-specs
Production Branch: main
Build Command: npm run build
Build Output Directory: dist
Root Directory: (leave blank)
```

### 3. Environment Variables

Add if needed (usually not required for static sites):
```
NODE_VERSION=18
```

### 4. Custom Domain Setup

1. After first deployment, go to **Custom Domains**
2. Click **Set up a custom domain**
3. Enter: `specs.venterradev.com`
4. Cloudflare will automatically configure DNS (since domain is already on Cloudflare)
5. SSL certificate provisions automatically (~1 minute)

---

## Build Configuration

The project uses **Vite** as the build tool. Configuration is in `vite.config.ts`.

### Build Commands
```bash
# Install dependencies
npm install

# Local development
npm run dev

# Production build (Cloudflare uses this)
npm run build
```

### Output
- Build output goes to `dist/` directory
- Cloudflare Pages serves static files from `dist/`

---

## Deployment Workflow

### Automatic Deployments
Every push to `main` branch triggers automatic deployment:

```bash
git add .
git commit -m "Update layout specifications"
git push origin main
```

Cloudflare automatically:
1. Detects the push
2. Runs `npm install`
3. Runs `npm run build`
4. Deploys to specs.venterradev.com
5. Sends deployment notification

### Preview Deployments
Every pull request creates a preview URL:
- Format: `[PR-NUMBER].venterra-specs.pages.dev`
- Test changes before merging to main

---

## Access Control (Optional)

### Cloudflare Access
To restrict access to internal team only:

1. Go to **Zero Trust** → **Access** → **Applications**
2. Create new application:
   - **Name:** Venterra Specs
   - **Domain:** specs.venterradev.com
   - **Path:** / (entire site)
3. Add policy:
   - **Rule name:** Team Access
   - **Include:** Emails ending in @yourcompany.com
   - Or: Specific email list

---

## DNS Configuration

If domain is already on Cloudflare (which it is), DNS is automatic:

```
Type: CNAME
Name: specs
Target: venterra-specs.pages.dev
Proxy: Enabled (orange cloud)
```

This is created automatically when you add the custom domain.

---

## Troubleshooting

### Build Fails
Check Cloudflare Pages build log:
- Common issue: Missing dependencies in package.json
- Solution: `npm install` locally first, commit package-lock.json

### Site Not Loading
1. Check DNS propagation: `dig specs.venterradev.com`
2. Check SSL certificate status in Cloudflare dashboard
3. Clear browser cache

### Updates Not Showing
1. Check deployment status in Cloudflare Pages
2. Clear Cloudflare cache: **Caching** → **Purge Everything**
3. Hard refresh browser: Cmd+Shift+R (Mac)

---

## Maintenance

### Updating the System
```bash
cd ~/VenterraDev/Specs
git pull origin main
# Make changes
git add .
git commit -m "Description of changes"
git push origin main
# Auto-deploys to specs.venterradev.com
```

### Viewing Deployment History
- Cloudflare Dashboard → Pages → venterra-specs → Deployments
- See all deployments, rollback if needed

### Rollback to Previous Version
1. Go to Deployments page
2. Find working deployment
3. Click **Rollback to this deployment**

---

## Performance

Cloudflare Pages provides:
- **Global CDN:** 275+ edge locations
- **Fast builds:** ~1-2 minutes
- **Unlimited bandwidth:** No traffic limits
- **DDoS protection:** Automatic
- **SSL/TLS:** Always encrypted

---

## Support

- **Cloudflare Docs:** https://developers.cloudflare.com/pages/
- **Build Issues:** Check build logs in Cloudflare dashboard
- **Domain Issues:** Check DNS settings in Cloudflare DNS panel

---

**Ready to deploy!** Follow steps 1-4 above to go live on specs.venterradev.com
