import { chromium } from "@playwright/test";

const [baseUrl, confirmedSlug, unconfirmedSlug] = process.argv.slice(2);

if (!baseUrl || !confirmedSlug || !unconfirmedSlug) {
  console.error(
    "Usage: node scripts/smoke-public-investor-profile.mjs <base-url> <confirmed-slug> <unconfirmed-slug>"
  );
  process.exit(1);
}

const normalizeText = (value) => (value || "").replace(/\s+/g, " ").trim();

async function gotoPage(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForLoadState("load", { timeout: 10000 }).catch(() => {});
}

async function waitForProfileState(page, expectedEyebrow) {
  await Promise.any([
    page.getByText(expectedEyebrow).waitFor({ timeout: 15000 }),
    page.getByText("Profile Not Found").waitFor({ timeout: 15000 }),
  ]);
}

async function openPreviewModal(page) {
  await page.getByRole("button", { name: /preview card/i }).click({ timeout: 10000 });
  await page.getByText("Browser Preview", { exact: true }).waitFor({ timeout: 10000 });
}

async function smokeProfile(browser, slug, expectations) {
  const page = await browser.newPage({ viewport: { width: 430, height: 1400 } });

  try {
    const url = new URL(`/investor/${slug}`, baseUrl).toString();
    await gotoPage(page, url);
    await waitForProfileState(page, expectations.eyebrow);

    const bodyText = normalizeText(await page.locator("body").textContent());
    if (bodyText.includes("Profile Not Found")) {
      throw new Error(`Profile slug ${slug} rendered the not-found state`);
    }

    const profileName = normalizeText(
      await page.locator("p.text-sm.font-semibold.text-gray-900").first().textContent()
    );

    if (!profileName.includes(" ")) {
      throw new Error(`Fixture slug ${slug} does not expose a multi-word public name`);
    }

    const heroText = normalizeText(await page.locator("h1").first().textContent());
    if (!heroText.includes(profileName)) {
      throw new Error(`Hero heading for ${slug} did not include full name "${profileName}"`);
    }

    if (!bodyText.includes(expectations.eyebrow)) {
      throw new Error(`Profile slug ${slug} missing status copy "${expectations.eyebrow}"`);
    }

    if (expectations.requiresAiSection && !bodyText.includes("AI Analyzed")) {
      throw new Error(`Confirmed profile ${slug} did not render AI profile content`);
    }

    if (!expectations.requiresAiSection && bodyText.includes("AI Analyzed")) {
      throw new Error(`Unconfirmed profile ${slug} unexpectedly rendered AI profile content`);
    }

    await openPreviewModal(page);

    const modalText = normalizeText(await page.locator("body").textContent());
    if (!modalText.includes(profileName)) {
      throw new Error(`Preview modal for ${slug} did not render full holder name "${profileName}"`);
    }

    const profileLink = page.locator('[data-testid="wallet-preview-profile-link"]');
    await profileLink.waitFor({ timeout: 10000 });
    const href = await profileLink.getAttribute("href");

    if (href !== `https://hushhtech.com/investor/${slug}`) {
      throw new Error(`Preview modal for ${slug} linked to "${href}" instead of the public slug`);
    }

    return {
      slug,
      profileName,
      heroText,
      href,
      eyebrow: expectations.eyebrow,
    };
  } finally {
    await page.close().catch(() => {});
  }
}

const browser = await chromium.launch({ headless: true });

try {
  const results = {
    confirmed: await smokeProfile(browser, confirmedSlug, {
      eyebrow: "Verified Investor Profile",
      requiresAiSection: true,
    }),
    unconfirmed: await smokeProfile(browser, unconfirmedSlug, {
      eyebrow: "Public Investor Profile",
      requiresAiSection: false,
    }),
  };

  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
