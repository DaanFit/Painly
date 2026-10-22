# My Knee v3.0 — English pain journal + load guidance

The app is fully in English. All existing v2 pain entries stay available because the original localStorage key `mijn-knie-journal-v1` is unchanged. Your own note text stays exactly as written; the UI does not translate personal content.

## Pain guidance (your requested scale)

- **0–3/10:** Consider increasing training load gradually, only if next-morning pain and stiffness remain stable.
- **4–6/10:** Maintain the same training load.
- **7–10/10:** Reduce the load.

The app compares both knee scores and uses the **higher score** for advice. This guidance is a planning reminder, not an automated exercise prescription or medical diagnosis. The app does not modify Strong.

## Features
- Pain journal with editable entries, left/right knee ratings, symptoms, morning stiffness and pain trend.
- Live training-load message based on knee ratings.
- Separate JournalSpeak writing area **never saved** by the app and excluded from backup.
- JSON backup/restore, CSV export, optional import of legacy knee checks from the former Gym Tracker if stored in the same browser.
- Static GitHub Pages hosting, no backend or cloud sync. Pain entries remain in the browser, and can be lost if site storage is cleared. Keep your backups private.

## Deploy to a new or existing GitHub Pages repository

1. Export a JSON backup from **Settings → Download backup (JSON)** before updating.
2. Extract the complete ZIP and upload `index.html`, `manifest.webmanifest`, `sw.js` and `icons/` to the root of your GitHub repository.
3. Click **Commit changes**. Ensure **Settings → Pages → Deploy from a branch → main → /(root)** is selected.
4. Wait for the Pages deployment and open the URL listed under Settings → Pages. Reopen the site if your browser displays a cached copy.
5. Test your entries, advice for 3/4/6/7, and backup export.

For an update from My Knee v2, you can instead replace only `index.html`, `manifest.webmanifest` and `sw.js`, leaving the existing icons in place.
