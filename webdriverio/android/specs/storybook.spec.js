// Sample customer test — copy and adapt to your project.
//
// Iterates every story discovered by reading the customer project's
// .rnstorybook/main.{ts,js} + .stories.* files, navigates to each via
// Storybook RN's STORYBOOK_STORY_ID URL parameter + Appium mobile: deepLink,
// and captures a Percy snapshot per story.
//
// Required env (set BEFORE invoking):
//   PERCY_TOKEN              App-type Percy project token (prefix app_)
//   BROWSERSTACK_USERNAME, BROWSERSTACK_ACCESS_KEY
//   PERCY_APP_URL            bs://... returned by `node scripts/upload-apk.js`
//   PERCY_APP_SCHEME         URL scheme registered in your app (e.g. "myapp")
//   PERCY_APP_PACKAGE        Android package id (e.g. com.acme.storybook)
//   PERCY_RN_PROJECT_DIR     path to your RN project root
//
// Run with:
//   npx percy app:exec -- npm run android

import percyStorybookSnapshot, {
  discoverStories,
} from '@percy/storybook-react-native';

describe('Percy Storybook RN — App Automate smoke', () => {
  it('captures a Percy snapshot for every story', async () => {
    const stories = await discoverStories({
      cwd: process.env.PERCY_RN_PROJECT_DIR || process.cwd(),
    });

    if (stories.length === 0) {
      throw new Error(
        'No stories discovered. Set PERCY_RN_PROJECT_DIR to your RN app root, ' +
          'or place .rnstorybook/main.ts at the cwd.',
      );
    }

    // Sort by componentTitle for stable ordering across runs.
    stories.sort((a, b) =>
      a.componentTitle.localeCompare(b.componentTitle) || a.name.localeCompare(b.name),
    );

    const navOpts = {
      navigationStrategy: 'deeplink',
      appScheme: process.env.PERCY_APP_SCHEME,
      appPackage: process.env.PERCY_APP_PACKAGE,
    };

    // The WDIO testrunner owns the session lifecycle — it always calls
    // deleteSession after the spec, pass or fail, so no manual cleanup is
    // needed here. (The SDK's `runSession(driver, fn)` helper is for
    // standalone `remote()` scripts, where nothing else deletes the session;
    // under the testrunner it would double-delete and fail the run.)
    for (const story of stories) {
      // eslint-disable-next-line no-undef
      await percyStorybookSnapshot(driver, story, navOpts);
    }
  });
});
