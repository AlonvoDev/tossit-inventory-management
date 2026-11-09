import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { test, expect, type Page } from '@playwright/test';
const serverRequire = createRequire(new URL('../../functions/package.json', import.meta.url));
const { initializeApp, deleteApp } = serverRequire('firebase-admin/app');
const { getAuth } = serverRequire('firebase-admin/auth');
const { getFirestore, Timestamp } = serverRequire('firebase-admin/firestore');
const projectId = 'demo-tossit-auth';
for (const name of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST']) {
  if (!/^(127\.0\.0\.1|localhost):\d+$/.test(process.env[name] ?? '')) throw new Error(`Local emulator required: ${name}`);
}
const app = initializeApp({ projectId }, `browser-${randomUUID()}`);
const db = getFirestore(app);
const accounts: { uid: string; email: string; password: string; businessId: string; productId: string; productName: string }[] = [];
async function seed(role = 'staff', department = 'bar') {
  const id = randomUUID(); const fixture = { uid: `e2e-${id}`, email: `e2e-${id}@example.test`, password: `Local-${randomUUID()}`, businessId: `e2e-${id}`, productId: `e2e-product-${id}`, productName: `חלב בדיקה ${id.slice(0, 5)}` };
  await getAuth(app).createUser({ uid: fixture.uid, email: fixture.email, password: fixture.password });
  await db.doc(`users/${fixture.uid}`).set({ uid: fixture.uid, email: fixture.email, fullName: 'משתמש בדיקה', role, department, businessId: fixture.businessId, isActive: true, isOnShift: true, shiftStartedAt: Timestamp.now() });
  await db.doc(`products/${fixture.productId}`).set({ productId: 'P-E2E', name: fixture.productName, businessId: fixture.businessId, area: department, type: 'kg', shelfLifeDays: 1 });
  accounts.push(fixture); return fixture;
}
async function login(page: Page, user: Awaited<ReturnType<typeof seed>>) {
  await page.goto('/login'); await page.locator('#email').fill(user.email); await page.locator('#password').fill(user.password);
  await page.getByRole('button', { name: 'התחבר', exact: true }).click(); await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('button', { name: 'פתיחת פריט', exact: true })).toBeEnabled();
}
async function openForm(page: Page, productName: string) {
  await page.getByRole('button', { name: 'פתיחת פריט', exact: true }).click();
  await page.getByRole('combobox', { name: 'מוצר', exact: true }).click();
  await page.getByRole('option', { name: productName, exact: false }).click();
}
test.afterAll(async () => {
  for (const account of accounts) {
    for (const doc of (await db.collection('items').where('businessId', '==', account.businessId).get()).docs) await doc.ref.delete();
    await db.doc(`products/${account.productId}`).delete(); await db.doc(`users/${account.uid}`).delete(); await getAuth(app).deleteUser(account.uid);
  }
  await deleteApp(app);
});
test.beforeEach(async ({ context }) => {
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (['127.0.0.1', 'localhost'].includes(url.hostname) || ['data:', 'blob:'].includes(url.protocol)) await route.continue();
    else await route.abort(); // This harness must never contact production Firebase or other external services.
  });
  await context.addInitScript(() => {
    if ('Notification' in window) Notification.requestPermission = async () => { sessionStorage.setItem('e2e-permission-requests', String(Number(sessionStorage.getItem('e2e-permission-requests') ?? 0) + 1)); return 'denied'; };
  });
});
test('single worker, no prompt on load and offline deep-link shell', async ({ page, context }) => {
  await page.goto('/login'); await page.evaluate(() => navigator.serviceWorker.ready);
  const registrations = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).map(registration => ({ scope: registration.scope, script: registration.active?.scriptURL })));
  expect(registrations).toEqual([{ scope: 'http://127.0.0.1:4173/', script: 'http://127.0.0.1:4173/service-worker.js' }]);
  expect(await page.evaluate(() => sessionStorage.getItem('e2e-permission-requests'))).toBeNull();
  await page.reload(); await context.setOffline(true); await page.goto('/admin/users');
  await expect(page.locator('#email')).toBeVisible(); // Signed-out guard still runs after the offline shell loads.
  expect(await page.evaluate(() => sessionStorage.getItem('e2e-permission-requests'))).toBeNull();
});
test('offline opening survives reload, replays once and preserves original catalog values', async ({ page, context }) => {
  const user = await seed(); await login(page, user); await openForm(page, user.productName);
  await page.getByRole('button', { name: 'סגירה', exact: true }).click(); // Warm the account-scoped catalog cache online.
  await page.evaluate(() => navigator.serviceWorker.ready); await page.reload();
  await expect(page.getByRole('button', { name: 'פתיחת פריט', exact: true })).toBeEnabled();
  await context.setOffline(true); await openForm(page, user.productName); await page.getByRole('textbox', { name: 'כמות', exact: true }).fill('0.5');
  await page.getByRole('button', { name: 'פתח פריט', exact: true }).click();
  await expect(page.getByText(/נשמר במכשיר/).first()).toBeVisible();
  await page.getByRole('button', { name: 'סגירה', exact: true }).click();
  await expect(page.getByText('1 ממתינות לשליחה', { exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByText('1 ממתינות לשליחה', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: user.productName, exact: true })).toBeVisible();
  expect((await db.collection('items').where('businessId', '==', user.businessId).get()).size).toBe(0);
  await context.setOffline(false);
  await expect(page.getByText('1 ממתינות לשליחה', { exact: true })).toHaveCount(0);
  await expect.poll(async () => (await db.collection('items').where('businessId', '==', user.businessId).get()).size).toBe(1);
  const item = (await db.collection('items').where('businessId', '==', user.businessId).get()).docs[0].data();
  expect(item).toMatchObject({ productId: user.productId, amount: 0.5, type: 'kg', userId: user.uid });
  expect(item.expiryTime.toMillis() - item.openingTime.toMillis()).toBe(86400000);
  await context.setOffline(true); await page.reload();
  await expect(page.getByRole('heading', { name: user.productName, exact: true })).toBeVisible();
  expect((await db.collection('items').where('businessId', '==', user.businessId).get()).size).toBe(1);
});
test('a staff session cannot enter admin users, including a direct deep link', async ({ page }) => {
  const user = await seed(); await login(page, user); await page.goto('/admin/users');
  await expect(page.getByText(/אין לך הרשאה|אין הרשאה/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /הוסף משתמש/ })).toHaveCount(0);
});
test('logout keeps an offline intent private until the original account returns', async ({ page, context }) => {
  const first = await seed(); const second = await seed();
  await login(page, first); await openForm(page, first.productName); await page.getByRole('button', { name: 'סגירה', exact: true }).click();
  await context.setOffline(true); await openForm(page, first.productName); await page.getByRole('textbox', { name: 'כמות', exact: true }).fill('0.5');
  await page.getByRole('button', { name: 'פתח פריט', exact: true }).click();
  await expect(page.getByText(/נשמר במכשיר/).first()).toBeVisible(); await page.getByRole('button', { name: 'סגירה', exact: true }).click();
  await expect(page.getByText('1 ממתינות לשליחה', { exact: true })).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'menu', exact: true }).click(); await page.getByText('התנתק', { exact: true }).click();
  await expect(page).toHaveURL(/\/login$/); await context.setOffline(false);
  await login(page, second);
  await expect(page.getByText('1 ממתינות לשליחה', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: first.productName, exact: true })).toHaveCount(0);
  expect((await db.collection('items').where('businessId', '==', first.businessId).get()).size).toBe(0);
  await page.getByRole('button', { name: 'menu', exact: true }).click(); await page.getByText('התנתק', { exact: true }).click(); await expect(page).toHaveURL(/\/login$/);
  await login(page, first);
  await expect.poll(async () => (await db.collection('items').where('businessId', '==', first.businessId).get()).size).toBe(1);
  expect((await db.collection('items').where('businessId', '==', second.businessId).get()).size).toBe(0);
});
