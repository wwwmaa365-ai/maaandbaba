# Recharge Expres — Fintech Super Application

Complete full-stack Fintech Super App featuring a Double-Entry Wallet Ledger, Prepaid/Postpaid/DTH/BBPS Utility Bill Payments, Indian Express Train Audio-Visual Success Confirmation, Monthly Spending Analytics (`recharts`), Super Admin Dashboard, Role-Based Staff Panel, and Firebase Firestore + Express Backend.

---

## Pre-Flight Verification Checklist

- **Web & Full-Stack Build (`npm run build`)**: Verified (Zero TypeScript or Vite bundle errors)
- **TypeScript & Lint Check (`npm run lint`)**: Verified (`tsc --noEmit` passes with 0 errors)
- **Firestore Security Rules (`firestore.rules`)**: Verified & Deployed (`ai-studio-5b547c8c-d099-41cf-88c7-46f954987183`)
- **Automated GitHub Actions APK Builder**: Included at `.github/workflows/build-android-apk.yml`
- **Expo EAS Native Configuration**: Included at `app.json`, `eas.json`, and `mobile/ExpoSuperApp.tsx`

---

## How to Build the Android APK from GitHub (2 Ways)

### Method 1: Automatic GitHub Actions APK Build (Recommended — Zero Local Setup)

When you publish/push this repository to GitHub, the included workflow at `.github/workflows/build-android-apk.yml` automatically builds an installable Android `.apk` file:

1. Push or export this project to your GitHub repository (`main` or `master` branch).
2. Open your repository on GitHub and click the **Actions** tab at the top.
3. Click on the **Build Recharge Expres Android APK** workflow run (you can also click **Run workflow** manually anytime).
4. Once the job finishes (~3 minutes), scroll down to the **Artifacts** section and download **`Recharge-Expres-Android-APK.zip`** containing `app-debug.apk`.
5. Install the `.apk` directly on any Android phone.

---

### Method 2: Build Standalone APK with Expo EAS CLI

If you want to build the native React Native Expo target using `app.json` and `eas.json`:

```bash
# 1. Install Expo EAS CLI globally
npm install -g eas-cli

# 2. Authenticate with your Expo account
eas login

# 3. Trigger the Android APK build using the 'preview' profile in eas.json
eas build --platform android --profile preview
```

---

## Local Development & Production Server

```bash
# Install dependencies
npm install

# Run full-stack Express + Vite server on port 3000
npm run dev

# Build production frontend bundle
npm run build
```
