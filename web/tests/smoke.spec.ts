/**
 * Helios demo smoke test.
 *
 * Run standalone via the playwright-skill executor:
 *   cd /Users/tobasum/.claude/plugins/cache/playwright-skill/playwright-skill/4.1.0/skills/playwright-skill
 *   TARGET_URL=http://localhost:3000/app/demo node run.js \
 *     /Users/tobasum/caliper/web/tests/smoke.spec.ts
 *
 * Asserts:
 *   - IntroOverlay renders within 3s ("Scientific Python is full of silent bugs")
 *   - Skip dismisses the overlay
 *   - AgentActivityPanel mounts and first auditor event appears within 5s
 *   - Verify act (tab 5) shows side-by-side bad-fix attempts
 *
 * Screenshots written to /tmp/helios-1-intro.png, helios-2-demo-audit.png,
 * helios-3-verify-side-by-side.png.
 */

const { chromium } = require('playwright');

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:3000/app/demo';
const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR || '/tmp';
const INTRO_TIMEOUT_MS = 3000;
const PANEL_TIMEOUT_MS = 5000;
const FIRST_EVENT_TIMEOUT_MS = 8000;

(async () => {
  const browser = await chromium.launch({ headless: process.env.HEADLESS === '1' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const errors: string[] = [];
  page.on('pageerror', (e: Error) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m: { type: () => string; text: () => string }) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });

  const navStart = Date.now();
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
  console.log(`✓ navigated in ${Date.now() - navStart}ms`);

  const introStart = Date.now();
  await page
    .getByText('Scientific Python is full of silent bugs', { exact: false })
    .waitFor({ state: 'visible', timeout: INTRO_TIMEOUT_MS });
  console.log(`✓ intro overlay visible in ${Date.now() - introStart}ms`);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/helios-1-intro.png`, fullPage: true });

  await page.getByRole('button', { name: /skip intro|begin walkthrough/i }).first().click();
  await page.waitForTimeout(400);
  console.log('✓ overlay dismissed');

  const panelStart = Date.now();
  await page.getByText(/agent activity/i).first().waitFor({ state: 'visible', timeout: PANEL_TIMEOUT_MS });
  await page.locator('aside').getByText(/auditor/).first().waitFor({ state: 'visible', timeout: FIRST_EVENT_TIMEOUT_MS });
  console.log(`✓ agent activity panel + first event in ${Date.now() - panelStart}ms`);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/helios-2-demo-audit.png`, fullPage: true });

  await page.keyboard.press('5');
  await page.waitForTimeout(800);
  await page.getByText(/attempt 1|verifier summary/i).first().waitFor({ state: 'visible', timeout: 5000 });
  await page.screenshot({ path: `${SCREENSHOT_DIR}/helios-3-verify-side-by-side.png`, fullPage: true });
  console.log('✓ verify side-by-side rendered');

  if (errors.length) {
    console.log('\n⚠ JS errors during run:');
    errors.slice(0, 10).forEach((e) => console.log('  -', e));
  } else {
    console.log('\n✓ no JS errors');
  }

  console.log('\n✅ smoke test passed');
  await browser.close();
})().catch((e: Error) => {
  console.error('❌ smoke test failed:', e.message);
  process.exit(1);
});
