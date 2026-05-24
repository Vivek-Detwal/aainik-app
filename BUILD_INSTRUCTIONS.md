# Aainik — Android APK Build Instructions

## Why This Exists
PWA notifications on Android do NOT fire when the app is removed from the recent apps list.
This Capacitor setup converts Aainik into a real native Android APK so that:
- Task reminders fire even when the app is completely killed
- Working window expiry alerts fire on time
- My-Ego auto checks fire as scheduled
- My-Josh motivational reminders fire as scheduled

---

## OPTION 1 — Build via GitHub Actions (Recommended, No Setup Needed)

1. Create a new GitHub repository (e.g. `aainik-app`)
2. Push all files from this zip to that repository:
   ```
   git init
   git add .
   git commit -m "Aainik Android app"
   git remote add origin https://github.com/YOUR_USERNAME/aainik-app.git
   git push -u origin main
   ```
3. Go to your repo on GitHub → **Actions** tab
4. You will see "Build Android APK" workflow running automatically
5. Wait 5–10 minutes for the build to complete
6. Click on the completed workflow run → scroll down to **Artifacts**
7. Download **aainik-debug-apk** (this is the .apk file inside a zip)
8. Transfer the APK to your Android phone
9. Install it:
   - Go to **Settings → Security → Install from unknown sources** → Enable
   - Open the APK file and tap Install
   - When asked for notification permission → tap **Allow**

---

## OPTION 2 — Build Locally (Requires Android Studio)

### Prerequisites
- Node.js 18+ (https://nodejs.org)
- Android Studio with Android SDK (https://developer.android.com/studio)
- Java JDK 17 (comes with Android Studio)

### Steps
```bash
# 1. Install dependencies
npm install

# 2. Add Android platform (first time only)
npx cap add android

# 3. Sync web files to Android project
npx cap sync android

# 4. Open in Android Studio
npx cap open android

# 5. In Android Studio:
#    Build → Build Bundle(s) / APK(s) → Build APK(s)
#    The APK will be at android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Project Structure

```
aainik_account4/      ← Source web files (HTML + JS + CSS)
www/                  ← Capacitor web root (copy of source)
capacitor.config.json ← Capacitor configuration
package.json          ← Node.js dependencies
.github/workflows/    ← GitHub Actions APK build pipeline
BUILD_INSTRUCTIONS.md ← This file
```

---

## How Background Notifications Work

The app uses `@capacitor/local-notifications` which schedules notifications at the **Android OS level**.
This means:
- Notifications are registered with the Android AlarmManager
- They fire at the exact scheduled time regardless of app state
- Even if app is killed/removed from recents: ✅ notifications still fire
- When user taps a notification → app opens to the Today screen

The app schedules notifications for the **next 7 days** every time:
- The app is opened
- Any task/settings data is saved

---

## Updating the App

To update after making code changes:
1. Edit files in `aainik_account4/` folder
2. Copy updated files to `www/` folder
3. Push to GitHub → Actions will auto-build the new APK
4. Install the new APK (it will replace the old one, keeping all data)

---

## Replacing App Icon

1. Replace `www/icons/icon-192.png` (192×192 pixels, PNG)
2. Replace `www/icons/icon-512.png` (512×512 pixels, PNG)
3. Run `npx cap sync android` to update Android resources
4. Rebuild APK

---

## Troubleshooting

**"Notification permission denied"**
→ Go to Android Settings → Apps → Aainik → Notifications → Enable All

**"App not installing"**
→ Enable "Install from unknown sources" in Android Settings → Security

**"Notifications not showing"**
→ Open app once after install so it can schedule notifications
→ Check Android Settings → Apps → Aainik → Battery → set to "Unrestricted"
→ This prevents Android from killing the scheduled alarms

**Build failing in GitHub Actions**
→ Check the Actions tab for error details
→ Most common issue: Gradle cache — try re-running the workflow

---

## App Permissions Required

The APK will request these permissions on install:
- `POST_NOTIFICATIONS` — for task reminders (required)
- `SCHEDULE_EXACT_ALARM` — for precise notification timing
- `RECEIVE_BOOT_COMPLETED` — to re-schedule alarms after phone restart
- `INTERNET` — for Gemini AI API calls (My-Ego and My-Josh)
- `VIBRATE` — for notification vibration

---

## Data Storage

All app data is stored in the phone's local storage (WebView localStorage).
Data is NOT synced to any cloud. Uninstalling the app will delete all data.
To backup: use the app's export feature (if available) before uninstalling.
