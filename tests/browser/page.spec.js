import { test, expect } from '@playwright/test';
import { PRIZES } from '../../docs/spin.js';

// The button's accessible label changes while it is spinning.
const spinButton = (page) => page.locator('#spin-button');
const termsLink = (page) => page.getByText('Terms and conditions apply.', { exact: true });

async function expectWinningPointer(page) {
  const segment = await page.evaluate(() => {
    const svg = document.querySelector('.wheel-frame');
    const pointerPoint = new DOMPoint(300, 60).matrixTransform(svg.getScreenCTM());
    return [...document.querySelectorAll('#wheel .wheel-segment')].findIndex((path) => {
      const localPoint = pointerPoint.matrixTransform(path.getScreenCTM().inverse());
      return path.isPointInFill(localPoint);
    });
  });
  // This checks the rendered SVG geometry, independently of the spin module.
  expect(segment).toBe(3);
}

test('landing page loads at the Pages prefix, with all wheel prizes and no errors', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /CONGRATULATIONS!/ })).toBeVisible();
  await expect(page.locator('[lang="fa"][dir="rtl"]')).toHaveText('تبریک!');
  await expect(spinButton(page)).toBeEnabled();
  await expect(spinButton(page)).toHaveAccessibleName('SPIN THE WHEEL');
  await expect(page.locator('#result')).toBeEmpty();
  await expect(page.locator('#wheel > #golden')).toBeVisible();
  await expect(page.locator('#wheel > #golden-head')).toBeVisible();
  await expect(page.locator('#white-face')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Golden dog spins. White dog supervises.');
  const labels = (await page.locator('svg text').allTextContents()).join(' ').replace(/\s/g, '');
  for (const prize of PRIZES) expect(labels).toContain(prize.replace(/\s/g, ''));
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    contentWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.contentWidth).toBeLessThanOrEqual(dimensions.width + 1);
  const button = await spinButton(page).boundingBox();
  expect(button.height).toBeGreaterThanOrEqual(44);
  expect(button.y + button.height).toBeLessThanOrEqual(page.viewportSize().height);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('landing.png'), fullPage: true });
});

test('a full animated spin disables the button and reveals the eReader only after stopping', async ({ page }, testInfo) => {
  await page.goto('./');
  const button = spinButton(page);
  for (let spin = 0; spin < 2; spin += 1) {
    await button.click();
    await expect(button).toBeDisabled();
    await button.dispatchEvent('click');
    await page.waitForTimeout(300);
    await expect(button).toBeDisabled();
    await expect(page.getByText('WINNER!', { exact: true })).not.toBeVisible();
    expect(await page.locator('#wheel').evaluate((wheel) => wheel.getAnimations().length)).toBe(1);
    await expect(button).toBeEnabled({ timeout: 12000 });
    await expect(page.getByText('WINNER!', { exact: true })).toBeVisible();
    await expect(page.getByText(/You won/)).toContainText('eReader of your choice!');
    await expectWinningPointer(page);
  }
  await page.screenshot({ path: testInfo.outputPath('winner.png'), fullPage: true });
  await expect(page.locator('.confetti')).toHaveCount(0, { timeout: 4000 });
});

test('reduced motion supports repeat wins without a long spin or confetti', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  for (let spin = 0; spin < 4; spin += 1) {
    await spinButton(page).click();
    await expect(spinButton(page)).toBeEnabled({ timeout: 3000 });
    await expect(page.getByText('WINNER!', { exact: true })).toBeVisible();
    await expect(page.getByText(/You won/)).toContainText('eReader of your choice!');
    await expectWinningPointer(page);
    await expect(page.locator('.confetti')).toHaveCount(0);
    expect(await page.locator('#wheel').evaluate((wheel) => wheel.getAnimations().length)).toBe(0);
  }
});

test('switching to reduced motion during a spin completes it safely', async ({ page }) => {
  await page.goto('./');
  await spinButton(page).click();
  await expect(spinButton(page)).toBeDisabled();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(spinButton(page)).toBeEnabled({ timeout: 3000 });
  await expectWinningPointer(page);
  await expect(page.getByText('WINNER!', { exact: true })).toBeVisible();
  await expect(page.locator('.confetti')).toHaveCount(0);
});

test('a suspended tab resumes a spin with the correct result and usable button', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Tab suspension emulation requires Chromium DevTools Protocol.');
  await page.goto('./');
  await spinButton(page).click();
  await expect(spinButton(page)).toBeDisabled();
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('Page.setWebLifecycleState', { state: 'frozen' });
    // Remain suspended beyond the longest normal spin duration.
    await page.waitForTimeout(7500);
  } finally {
    await session.send('Page.setWebLifecycleState', { state: 'active' });
    await session.detach();
  }
  await expect(spinButton(page)).toBeEnabled({ timeout: 10000 });
  await expect(page.getByText('WINNER!', { exact: true })).toBeVisible();
  await expectWinningPointer(page);
});

test('terms open as an accessible dialog and restore focus on Escape', async ({ page }) => {
  await page.goto('./');
  const trigger = termsLink(page);
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(/10\s*PM.*November 27, 2026/i);
  await expect(dialog.locator('li')).toHaveText([
    'The prize must be claimed before 10PM November 27, 2026.',
    'The prize cannot be exchanged for cash.',
    'The prize cannot be exchanged for bites.',
    "No saucise-pard-kon'ing.",
    'We go.',
  ]);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.press('Enter');
  await expect(dialog).toBeVisible();
});

test('a narrow phone has no horizontal overflow and usable controls', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('./');
  await expect(spinButton(page)).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await termsLink(page).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.getByRole('dialog').evaluate((dialog) => dialog.scrollTop)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test('without JavaScript the page explains why the wheel cannot run', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/tavallod/');
  await expect(spinButton(page)).toBeDisabled();
  await expect(page.locator('.noscript')).toBeVisible();
  await expect(page.locator('.noscript')).toContainText(/JavaScript/i);
  await termsLink(page).click();
  await expect(page.locator('#terms')).toBeVisible();
  await context.close();
});
