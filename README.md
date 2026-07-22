# example-percy-storybook-react-native

Example repo demonstrating `@percy/storybook-react-native`'s **library mode** running against **BrowserStack App Automate** — one Percy snapshot per Storybook story, captured on a real BrowserStack Android device. It mirrors the [`percy/example-percy-appium-js`](https://github.com/percy/example-percy-appium-js) shape — same tutorial flow, applied to React Native + Storybook component snapshots.

➡ **Step-by-step tutorial:** [`webdriverio/README.md`](./webdriverio/README.md). See the [Percy SDK Feature Matrix](https://docs.percy.io/docs/sdk-feature-matrix) for cross-SDK coverage.

## What this proves

A customer with an RN app that uses `@storybook/react-native` can:

- Build a Storybook-enabled `.apk` (separate from production)
- Upload it to App Automate via `provisionApp` (or this repo's `scripts/upload-apk.js`)
- Run a small WebdriverIO mocha test that navigates each story
- Get one Percy snapshot per story — on a real BrowserStack Android device

The integration uses only existing, published Percy/BrowserStack tooling: [`@percy/storybook-react-native`](https://www.npmjs.com/package/@percy/storybook-react-native), [`@percy/appium-app`](https://www.npmjs.com/package/@percy/appium-app), [`@percy/cli`](https://www.npmjs.com/package/@percy/cli), and [`webdriverio`](https://www.npmjs.com/package/webdriverio).

## Prerequisites

| | Version | Why |
|---|---|---|
| Node (run this example) | **≥ 20.19** | The SDK's `engines` floor. Pinned in [`.nvmrc`](./.nvmrc). |
| Node (build the `.apk`) | **≥ 22** | Only needed in **your RN project** when building the Storybook `.apk`: `@storybook/react-native`'s metro plugin `require()`s the ESM-only `storybook` package, which needs Node 22's `require(esm)` interop. |
| JDK | 17 | Android Gradle Plugin requirement |
| Android SDK | platforms;android-34, build-tools;34.0.0 | RN 0.81 default |
| BrowserStack account | Any plan with App Automate quota | The cloud-device runtime |
| Percy account | **App-type project** (token prefix `app_`) | Snapshot ingestion |

## Repo layout

```
.percy.yml                    global Percy config (App Automate)
webdriverio/
  README.md                   the step-by-step tutorial — start here
  android/
    android.conf.js           wdio config (BS caps, mocha framework)
    specs/
      storybook.spec.js       the test — discovers stories, snapshots each
  package.json                npm run android
resources/                    drop your built Storybook .apk here
scripts/
  upload-apk.js               convenience wrapper around provisionApp
.github/workflows/
  percy-app-automate.yml      Linux CI workflow (Android only in MVP)
  Semgrep.yml                 static-analysis scan (matches sibling examples)
```

## Tutorial

The flow mirrors `example-percy-appium-js`'s README closely.

### Step 1 — Clone and install

```bash
cd webdriverio
npm install
cd ..
```

### Step 2 — BrowserStack credentials

```bash
export BROWSERSTACK_USERNAME="<your username>"
export BROWSERSTACK_ACCESS_KEY="<your access key>"
```

### Step 3 — Build a Storybook `.apk`

Build a Storybook-enabled **release** `.apk` — distinct from your production app's `.apk`. See the [`@percy/storybook-react-native` SDK's STORYBOOK_HOST_APP.md](https://github.com/percy/percy-react-native-app/blob/main/packages/storybook-react-native/STORYBOOK_HOST_APP.md) for the recommended Expo / bare RN build setup.

```bash
cd your-rn-project
npx expo prebuild --platform android --no-install
cd android && ./gradlew assembleRelease && cd ..
cp android/app/build/outputs/apk/release/app-release.apk \
   /path/to/example-percy-storybook-react-native/resources/PercyStorybookExample.apk
```

> ⚠️ **Use `assembleRelease`, not `assembleDebug`.** Debug builds expect Metro on `localhost:8081` to serve JS. On a BrowserStack cloud device, no Metro = redbox `loadJSBundleFromAssets` failure. Release builds embed the JS bundle.

> ⚠️ **`@react-native-async-storage/async-storage` 3.x gotcha** — its native Android dep is shipped as a local Maven repo that RN autolinking doesn't always wire into `allprojects.repositories`. If gradle fails with `Could not find org.asyncstorage.shared_storage:storage-android:1.0.0`, add this line to `android/build.gradle`'s `allprojects.repositories` block:
> ```gradle
> maven { url "${rootDir}/../node_modules/@react-native-async-storage/async-storage/android/local_repo" }
> ```

### Step 4 — Upload to App Automate

```bash
PERCY_APP_PATH=./resources/PercyStorybookExample.apk \
  node scripts/upload-apk.js
```

The script prints a `bs://...` URL. Export it:

```bash
export PERCY_APP_URL="bs://..."
```

The SDK's `provisionApp` uses BrowserStack's `custom_id` + `recent_apps` GET pattern, so re-running with the same `.apk` skips the upload (~350ms cache hit) and reuses the prior `bs://` reference.

### Step 5 — Percy project + token

In Percy, create a new **app**-type project. Copy the project token, then:

```bash
export PERCY_TOKEN="<your app project token>"   # prefix should be app_
```

### Step 6 — Point at your RN project

The SDK auto-discovers stories from your RN app's `.rnstorybook/main.{ts,js}` + `.stories.*` files. Set the project root:

```bash
export PERCY_RN_PROJECT_DIR=/path/to/your/rn/app
```

### Step 7 — Run

```bash
cd webdriverio
npx percy app:exec -- npm run android
```

You'll see logs like:

```
[percy] Snapshot taken: Example/Button/Primary/Android-...
[percy] Snapshot taken: Example/Button/Secondary/Android-...
...
[percy] Finalized build #13: https://percy.io/<org>/app/<project>/builds/<n>
```

Open the Percy URL — one snapshot per story, captured on a real BrowserStack device.

> The spec runs under the WDIO testrunner, which owns the session lifecycle — it always calls `deleteSession` after the spec, pass or fail. (The SDK's `runSession(driver, fn)` helper serves the same purpose for standalone `remote()` scripts; don't combine it with the testrunner, which would double-delete the session.) See [`webdriverio/README.md`](./webdriverio/README.md) for the per-step walkthrough.

### Step 8 — Make a visual change & re-run

Edit a component, rebuild the `.apk`, re-upload, re-run. Percy will flag the diff on the next build.

## Navigation strategy

This example uses **deep-link** navigation (`navigationStrategy: 'deeplink'`) — the recommended path on Storybook RN v10.x. Your app needs to register a URL scheme. For Expo, one line in `app.json`:

```json
{ "expo": { "scheme": "myapp" } }
```

For bare RN, add an `<intent-filter>` to `AndroidManifest.xml`:

```xml
<intent-filter android:autoVerify="false">
  <action android:name="android.intent.action.VIEW"/>
  <category android:name="android.intent.category.DEFAULT"/>
  <category android:name="android.intent.category.BROWSABLE"/>
  <data android:scheme="myapp"/>
</intent-filter>
```

Then in `webdriverio/android/specs/storybook.spec.js`, the existing `percyStorybookSnapshot` call already passes `navigationStrategy: 'deeplink'` along with the scheme/package opts.

UI-tap navigation (`navigationStrategy: 'ui-tap'`) is the SDK's default and works with Storybook RN **v9.x**. On v10.x the navigator drawer renders its story tree through a virtualized list that Appium can't reach, so use deep-link there (as this example does).

## Customer adaptation

A real customer would:

1. Drop their own RN+Storybook `.apk` into `resources/` (no need to use this example's APK)
2. Update `PERCY_RN_PROJECT_DIR` to point at their RN project root (so `discoverStories` reads their `.rnstorybook/main.ts`)
3. Register a URL scheme in their app config (or use `app.json` `scheme:` for Expo)
4. Set `PERCY_APP_SCHEME` + `PERCY_APP_PACKAGE` env vars to match
5. Run `npm run android`

## References

- [`percy/percy-react-native-app`](https://github.com/percy/percy-react-native-app) — the SDK
- [Percy SDK Feature Matrix](https://docs.percy.io/docs/sdk-feature-matrix) — cross-SDK feature coverage
- [`percy/example-percy-appium-js`](https://github.com/percy/example-percy-appium-js) — the upstream pattern this repo mirrors
- [`@storybook/react-native`](https://github.com/storybookjs/react-native) — Storybook for React Native
- [BrowserStack App Automate](https://www.browserstack.com/app-automate)
- [Percy CLI](https://docs.percy.io/docs/cli-overview)
