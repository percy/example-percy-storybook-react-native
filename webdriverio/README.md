## WebdriverIO + Storybook RN tutorial

This walks through running `@percy/storybook-react-native` in **library mode** against **BrowserStack App Automate**, snapshotting one Percy image per Storybook story. It mirrors the [`example-percy-appium-js` WebdriverIO tutorial](https://github.com/percy/example-percy-appium-js/blob/master/webdriverio/README.md), applied to React Native + Storybook component snapshots.

> This tutorial assumes you're already comfortable with JavaScript and [WebdriverIO](https://webdriver.io/). You don't need prior Appium experience to follow along. It also assumes you have [Node ≥ 20.19](https://nodejs.org/en/download/) and [git](https://git-scm.com/) installed. (Node ≥ 22 is only needed to **build** the Storybook `.apk` in your own RN project — see the root README — not to run this example.)

### Step 1 — Clone and install

```bash
git clone https://github.com/percy/example-percy-storybook-react-native.git
cd example-percy-storybook-react-native/webdriverio
npm install
```

### Step 2 — BrowserStack credentials

You'll need a BrowserStack `username` and `access key`. [Sign up](https://www.browserstack.com/users/sign_up) for a free trial or grab them from your [profile page](https://www.browserstack.com/accounts/profile). Then export them:

```bash
export BROWSERSTACK_USERNAME="<your username>"
export BROWSERSTACK_ACCESS_KEY="<your access key>"
```

### Step 3 — Build & upload a Storybook `.apk`

Unlike the appium-js example (which ships a prebuilt sample app), the app under test here is **your** RN project's Storybook build, because story discovery reads your project's `.rnstorybook/main.{ts,js}`. Build a Storybook-enabled **release** `.apk` — see [`STORYBOOK_HOST_APP.md`](https://github.com/percy/percy-react-native-app/blob/main/packages/storybook-react-native/STORYBOOK_HOST_APP.md) in the SDK for the recommended Expo / bare-RN setup — drop it in this repo's `../resources/` folder, then upload it:

```bash
PERCY_APP_PATH=../resources/PercyStorybookExample.apk node ../scripts/upload-apk.js
```

The script prints a `bs://...` reference. Export it:

```bash
export PERCY_APP_URL="bs://..."
```

> `provisionApp` (which `upload-apk.js` wraps) hashes the `.apk` into a BrowserStack `custom_id` and reuses a prior upload on a content-hash hit, so re-running with an unchanged `.apk` skips the upload entirely.

### Step 4 — Percy project + token

Sign in to Percy and create a new **`app`**-type project (the token prefix should be `app_`). Export it:

```bash
export PERCY_TOKEN="<your app project token>"
```

> Usually `PERCY_TOKEN` lives only in CI. We set it in the shell here to keep the tutorial simple.

### Step 5 — Point at your RN project

```bash
export PERCY_RN_PROJECT_DIR=/path/to/your/rn/app      # where .rnstorybook/main.ts lives
export PERCY_APP_SCHEME=myapp                          # URL scheme registered in your app
export PERCY_APP_PACKAGE=com.acme.storybook            # Android package id
```

See the root README's **Navigation strategy** section for how to register the URL scheme (one line in `app.json` for Expo).

### Step 6 — Run

```bash
npx percy app:exec -- npm run android
```

The spec ([`android/specs/storybook.spec.js`](./android/specs/storybook.spec.js)) discovers every story and captures one snapshot per story. Session cleanup is handled by the WDIO testrunner itself (it always calls `deleteSession` after the spec, pass or fail — the SDK's `runSession` helper is only for standalone `remote()` scripts). You'll see one `Snapshot taken: …` line per story and, at the end, a Percy build URL.

### Step 7 — Make a visual change & re-run

Edit a component in your RN project, rebuild the `.apk`, re-upload (Step 3), and run again. Percy compares the new build against the previous one and highlights any visual diffs.

### Finished! 😀

Open the Percy build URL to review the comparisons. From here, adapt the spec and `android.conf.js` capabilities to your own devices and components.
