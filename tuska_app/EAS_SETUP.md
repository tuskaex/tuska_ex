# EAS project

## Status: provisioned

The SpeedTrade app has its own EAS project. It is **not** the SwissCresta one.

| | Value |
|---|---|
| Project | `@shivam92388/speedtrade` |
| Project ID | `744a08f7-edea-4417-89b4-0f6198703532` |
| Dashboard | https://expo.dev/accounts/shivam92388/projects/speedtrade |

## Why it had to be a new project

The white-label rebrand deliberately removed three fields from `app.json`
before this project existed:

| Field | Old value | Why it was removed |
|---|---|---|
| `extra.eas.projectId` | `3b126a99-…-f5ed733bedbe` | Identified the **SwissCresta** EAS project |
| `updates.url` | `https://u.expo.dev/3b126a99-…` | The SwissCresta OTA channel |
| `owner` | `shivam92388` | Restored by `eas init` — the account is shared, the *project* is not |

Leaving them would have been the dangerous option. `app.json` declares a
different app (`tech.speedtrade.app`, name "SpeedTrade"), but those fields
still pointed at SwissCresta's project. The first `eas update` from this tree
would have published SpeedTrade's JavaScript onto **SwissCresta users'
phones** — an OTA update keys off the project and channel, not the bundle
identifier. The store build would have looked completely normal while doing it.

A second copy of the same id was hardcoded in
`src/services/notifications/pushNotifications.js` and was missed by the first
pass; it now reads the id from the app config instead, so it can only ever be
this project's.

## Builds

```bash
# Preview APK — internal distribution, installable by sideload
npx eas build --profile preview --platform android

# Production
npx eas build --profile production --platform android
```

Profiles live in `eas.json`. `preview` produces an **APK** (`buildType: apk`)
rather than an AAB, which is what makes it directly installable on a device
without going through the Play Store.

Authentication in a non-interactive shell is via `EXPO_TOKEN`:

```bash
EXPO_TOKEN=<token> npx eas build --profile preview --platform android
```

Never commit that token. Tokens are managed at
https://expo.dev/settings/access-tokens and should be revoked when they leak.

## Over-the-air updates are OFF

`app.json` ships `updates.enabled: false` and no `updates.url`. An
`expo-updates` build with no URL is inert; one pointed at the wrong URL is
actively harmful, which is why this is the default.

To turn OTA on for **this** project:

```bash
npx eas update:configure     # writes updates.url for project 744a08f7-…
```

then set `updates.enabled` to `true` in `app.json`. The `preview` and
`production` profiles already declare channels (`preview` / `production`);
those channel names are inert until updates are enabled.

## Versioning

`eas.json` sets `cli.appVersionSource: "remote"`, so EAS owns `versionCode`.
The first build initialised it to `1`. `app.json` carries `version` /
`runtimeVersion` `1.0.0` — this is a new app identity with its own store
listing and its own install base, so it deliberately did not inherit
SwissCresta's `1.1.0`.

## Bundle id

`tech.speedtrade.app` on both platforms. A SpeedTrade build therefore installs
*alongside* SwissCresta rather than over it and shares none of its stored data
— which is why renaming the `swisscresta.*` SecureStore keys to `speedtrade.*`
cost nothing.
