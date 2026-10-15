# CapitalFlow - Income, Expense & Savings Ledger

A personal finance tracker and cash flow manager built with React, Vite, Tailwind CSS, and Lucide Icons. Features multi-frequency budgeting (monthly & bi-weekly), cumulative savings ledgers, interactive charts, and Google Drive cloud storage synchronization.

---

## 🚀 Deploying to GitHub Pages

This project is pre-configured for automated deployment to GitHub Pages using GitHub Actions.

### Method 1: Automatic Deployment with GitHub Actions (Recommended)

1. **Push this repository to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for go-live"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

2. **Enable GitHub Pages via GitHub Actions**:
   - On GitHub, navigate to your repository.
   - Click on **Settings** (top navigation tab).
   - In the left sidebar, click on **Pages** (under the "Code and automation" section).
   - Under **Build and deployment** → **Source**, change the dropdown from *Deploy from a branch* to **GitHub Actions**.

3. **Automatic Build & Publish**:
   - The workflow defined in `.github/workflows/deploy.yml` will automatically trigger on any push to `main` or `master` (or manually via the **Actions** tab → **Deploy to GitHub Pages** → **Run workflow**).
   - Once completed, your app will be live at:
     ```
     https://<your-username>.github.io/<your-repo-name>/
     ```

---

### 🔑 Google Drive & OAuth Configuration for GitHub Pages

If you are using Google Drive sync or Firebase Auth on your live GitHub Pages site:
1. Open the [Google Cloud Console](https://console.cloud.google.com/apis/credentials) or Firebase Authentication Console.
2. Under **Credentials** → **OAuth 2.0 Client IDs** (Web application):
   - Add your GitHub Pages domain to **Authorized JavaScript origins**:
     ```
     https://<your-username>.github.io
     ```
   - Add your redirect URI to **Authorized redirect URIs**:
     ```
     https://<your-username>.github.io/<your-repo-name>/
     ```
3. In Firebase Console → **Authentication** → **Settings** → **Authorized domains**, add:
   ```
   <your-username>.github.io
   ```

---

## 🛠 Local Development

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```
