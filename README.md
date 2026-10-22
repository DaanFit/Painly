# Painly v6 — installation and backup

Painly is a personal, English-language pain journal and JournalSpeak/meditation website. It is a static website that can be hosted through GitHub Pages. No server, tracking, analytics or accounts are included. It stores pain entries only in the browser on the device you're using.

## What's new

- New Painly branding, minimalist P iPhone home-screen icon and sharing preview.
- Soft Sage light and dark modes, switchable in Settings.
- Track joint pain with left/right locations and one 0–10 score for each selected location. Neck, back and Other also supported.
- Knee-focused training load guide: score below 4 = consider gradually increasing; 4–6 = maintain; above 6 = reduce. This is only a planning aid, not medical advice.
- One chart with optional comparison between two locations; 7 days, 30 days, 3 months, 1 year.
- JournalSpeak: temporary text, shredder animation, meditation timer. JournalSpeak writing is never saved in pain history/backups.

## Updating an existing GitHub Pages website

1. On your *current* website, go to Settings → Download backup (JSON). Keep this file private and safe, not in your public GitHub repository.
2. Extract the quick-update ZIP and upload the following files to the **root** of your existing GitHub repository:
   - `index.html`
   - `app.js`
   - `styles.css`
   - `manifest.webmanifest`
   - `sw.js`
   - `share-preview.png`
   - the whole `icons` folder (all four icon files)
3. Commit the changes.
4. In Settings → Pages, check `Deploy from a branch`, branch `main`, folder `/(root)`.
5. Open your published website, reload and/or close and reopen the Home Screen app if an old icon/page is cached.
6. Confirm your old saved pain entries are present before deleting anything or switching URLs.

**Important:** Local browser data is tied to the website **origin** (including the domain); moving between `https://username.github.io/old-repo/` and `https://username.github.io/new-repo/` often *shares the same localStorage origin* if both use the same username and domain. But switching to another username or custom domain does **not** automatically transfer data. Always export a backup and import it on the new site if needed. Never place a JSON/CSV pain backup in the public repository.

## Installing on an iPhone

1. Open the published site in **Safari**.
2. Tap **Share** → **Add to Home Screen**.
3. Confirm the name **Painly** and add it.
4. If the icon still looks old, remove the older Home Screen shortcut and add the website again. Do not clear Safari website data without exporting a backup.

## Previewing offline

`painly-v6-demo.html` is an all-in-one HTML demonstration for desktop browsers. GitHub Pages is the recommended way to run the PWA and test iPhone installation.

## Data and privacy

Pain data is stored under `mijn-knie-journal-v1` for compatibility with older versions. Older entries in the original left/right knee format are transformed *in memory* into the new joint format; the original stored data is not rewritten until a new entry is saved, or you import/delete entries. JournalSpeak drafts are not stored in browser storage or exported, but sites cannot guarantee the erasure of keyboard/operating-system caches. The meditation timer runs according to the clock, but background iOS browser restrictions can delay updates and sounds.
