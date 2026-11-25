/*
 * V0 evidence: screenshots, overflow checks (320/390/430/1280) and key prototype interactions.
 * Run from the repository root:  node docs/ui-review/v0/capture.cjs
 * Uses the pre-installed Playwright/Chromium; adds no project dependency. Synthetic data only.
 */
const path = require('path');
const { chromium } = require('playwright');

const DIR = __dirname;
const URL = 'file://' + path.join(DIR, 'index.html');
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };

const SHOTS = [
  // [file, width, height, query, fullPage]
  ['390-inventory-busy', 390, 844, 'bare=1', false],
  ['390-inventory-busy-full', 390, 844, 'bare=1', true],
  ['390-inventory-admin-all-departments', 390, 844, 'bare=1&role=admin&dept=all', false],
  ['390-inventory-offline', 390, 844, 'bare=1&offline=1', false],
  ['390-inventory-empty', 390, 844, 'bare=1&data=empty', false],
  ['390-inventory-error', 390, 844, 'bare=1&data=error', false],
  ['390-inventory-no-matches', 390, 844, 'bare=1&q=xyz', false],
  ['390-inventory-off-shift', 390, 844, 'bare=1&shift=off', false],
  ['390-discarded', 390, 844, 'bare=1&role=admin&dept=all&mode=discarded', false],
  ['390-open-form-empty', 390, 844, 'bare=1&sheet=open', false],
  ['390-open-form-filled-with-evidence', 390, 844, 'bare=1&sheet=open&pick=p4&amount=1.25&ev=1', false],
  ['390-open-form-busy', 390, 844, 'bare=1&sheet=open&pick=p1&phase=busy', false],
  ['390-scan-source', 390, 844, 'bare=1&sheet=scan&pick=p1', false],
  ['390-scan-capture-staff-label', 390, 844, 'bare=1&sheet=scan&pick=p1&fixture=staffIncomplete&step=capture&source=staff-label', false],
  ['390-scan-review-packaging', 390, 844, 'bare=1&sheet=scan&pick=p1&fixture=packaging&step=review&source=packaging', false],
  ['390-scan-review-staff-missing-year-time', 390, 844, 'bare=1&sheet=scan&pick=p1&fixture=staffIncomplete&step=review&source=staff-label&attempted=1', false],
  ['390-scan-review-ambiguous', 390, 844, 'bare=1&sheet=scan&pick=p1&fixture=ambiguous&step=review&source=staff-label', false],
  ['390-scan-review-manufactured-and-unknown', 390, 844, 'bare=1&sheet=scan&pick=p1&fixture=manufactured&step=review&source=packaging', false],
  ['390-scan-unreadable', 390, 844, 'bare=1&sheet=scan&pick=p1&fixture=unreadable&step=review&source=packaging', false],
  ['390-scan-camera-denied', 390, 844, 'bare=1&sheet=scan&pick=p1&camera=denied&step=capture&source=packaging', false],
  ['390-manual-date', 390, 844, 'bare=1&sheet=manual&pick=p1', false],
  ['390-close-choose', 390, 844, 'bare=1&sheet=close&item=i1', false],
  ['390-close-discard', 390, 844, 'bare=1&sheet=close&item=i2&action=discarded&reason=expired', false],
  ['1280-inventory-admin-all-departments', 1280, 800, 'bare=1&role=admin&dept=all', false],
  ['1280-inventory-staff', 1280, 800, 'bare=1', false],
  ['1280-open-form', 1280, 800, 'bare=1&role=admin&dept=bar&sheet=open&pick=p4&amount=1.25&ev=1', false],
  ['1280-close-discard', 1280, 800, 'bare=1&role=admin&dept=bar&sheet=close&item=i2&action=discarded&reason=expired', false],
  ['1280-scan-review-ambiguous', 1280, 800, 'bare=1&sheet=scan&pick=p1&fixture=ambiguous&step=review&source=staff-label', false],
  ['320-inventory-busy', 320, 640, 'bare=1', false],
  ['320-open-form', 320, 640, 'bare=1&sheet=open&pick=p4&ev=1', false],
  ['320-scan-review-staff', 320, 640, 'bare=1&sheet=scan&pick=p1&fixture=staffIncomplete&step=review&source=staff-label', false],
];

const OVERFLOW_STATES = [
  'bare=1', 'bare=1&role=admin&dept=all', 'bare=1&offline=1', 'bare=1&data=error', 'bare=1&mode=discarded&role=admin&dept=all',
  'bare=1&sheet=open&pick=p4&ev=1', 'bare=1&sheet=close&item=i5&action=discarded',
  ...['packaging', 'staffIncomplete', 'ambiguous', 'manufactured', 'unreadable'].map(f => `bare=1&sheet=scan&pick=p1&fixture=${f}&step=review&source=packaging`),
  'bare=1&sheet=scan&pick=p1&step=capture&source=staff-label', 'bare=1&sheet=manual&pick=p1',
];

async function overflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const bad = [];
    if (doc.scrollWidth > window.innerWidth) bad.push(`document ${doc.scrollWidth}>${window.innerWidth}`);
    document.querySelectorAll('.sheet-body, .sheet-foot, .row, .controls').forEach(el => {
      if (el.scrollWidth > el.clientWidth + 1) bad.push(`${el.className} ${el.scrollWidth}>${el.clientWidth}`);
    });
    return bad;
  });
}

async function smallTargets(page) {
  return page.evaluate(() => {
    const out = [];
    document.querySelectorAll('button, input:not([type=checkbox]), select').forEach(el => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') return;
      if (el.closest('.proto')) return;
      // .chip / .seg buttons extend their hit area with ::after (34/36px visual + 10/8px)
      const extra = el.classList.contains('chip') ? 10 : el.closest('.seg') ? 8 : 0;
      if (r.height + extra < 44 - 0.5) out.push(`${el.tagName}.${el.className || ''} "${(el.getAttribute('aria-label') || el.textContent).trim().slice(0, 24)}" ${Math.round(r.height)}px`);
    });
    return out;
  });
}

(async () => {
  // The project pins its own Playwright; fall back to the shared pre-installed Chromium.
  const executablePath = process.env.PW_CHROMIUM || (require('fs').existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  const ctx = async (width, height) => {
    const c = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, locale: 'he-IL', timezoneId: 'Asia/Jerusalem' });
    return c.newPage();
  };

  // Screenshots
  for (const [file, w, h, q, full] of SHOTS) {
    const page = await ctx(w, h);
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(`${URL}?${q}`);
    await page.waitForTimeout(q.includes('phase=busy') ? 400 : 150);
    await page.screenshot({ path: path.join(DIR, `${file}.png`), fullPage: full });
    if (errors.length) check(`no page errors: ${file}`, false, errors.join('; '));
    await page.context().close();
  }
  check('screenshots captured', true, `${SHOTS.length} files`);

  // Overflow at 320/390/430/1280
  for (const w of [320, 390, 430, 1280]) {
    const bad = [];
    for (const q of OVERFLOW_STATES) {
      const page = await ctx(w, w === 1280 ? 800 : 740);
      await page.goto(`${URL}?${q}`);
      await page.waitForTimeout(80);
      const o = await overflow(page);
      if (o.length) bad.push(`${q}: ${o.join(', ')}`);
      await page.context().close();
    }
    check(`no horizontal overflow at ${w}px (${OVERFLOW_STATES.length} states)`, bad.length === 0, bad.join(' | '));
  }

  // Touch targets at 390
  {
    const bad = [];
    for (const q of OVERFLOW_STATES) {
      const page = await ctx(390, 844);
      await page.goto(`${URL}?${q}`);
      await page.waitForTimeout(80);
      bad.push(...(await smallTargets(page)).map(x => `${q}: ${x}`));
      await page.context().close();
    }
    check('interactive targets ≥44px at 390px', bad.length === 0, bad.slice(0, 8).join(' | '));
  }

  // Interactions
  const page = await ctx(390, 844);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  const dialog = () => page.getByRole('dialog');
  await page.goto(`${URL}?bare=1&outcome=slow`);

  check('staff sees own department only (no department switch)', (await page.getByRole('group', { name: 'מחלקה' }).count()) === 0);
  check('busy inventory groups urgent items first', (await page.locator('h2.group').first().textContent()).includes('פג תוקף'));
  await page.getByRole('button', { name: /^עומד לפוג/ }).click();
  check('status filter keeps only expiring rows', (await page.locator('article.row.expired, article.row.ok').count()) === 0 && (await page.locator('article.row.expiring').count()) > 0);
  await page.getByRole('button', { name: /^הכל/ }).click();
  await page.getByRole('searchbox', { name: 'חיפוש פריט' }).fill('לימון');
  check('search filters while keeping focus', (await page.locator('article.row').count()) === 1 && (await page.evaluate(() => document.activeElement.id)) === 'q');
  await page.getByRole('searchbox', { name: 'חיפוש פריט' }).fill('');

  // Opening: invalid amount, then pending dismissal protection
  await page.getByRole('button', { name: 'פתיחת פריט' }).last().click();
  check('opening dialog is labelled with department', (await page.getByRole('dialog', { name: 'פתיחת פריט — בר' }).count()) === 1);
  await page.getByRole('button', { name: /נענע טרייה/ }).click();
  await page.locator('#amount').fill('0');
  await page.getByRole('button', { name: 'פתח פריט' }).click();
  check('invalid kg amount shown inline and focused', (await page.locator('#amount').getAttribute('aria-invalid')) === 'true' && (await page.evaluate(() => document.activeElement.id)) === 'amount');
  await page.locator('#amount').fill('0.5');
  await page.getByRole('button', { name: 'פתח פריט' }).click();
  await page.keyboard.press('Escape');
  await dialog().getByRole('button', { name: 'סגירה' }).click({ force: true });
  await page.mouse.click(5, 5);
  check('pending opening cannot be dismissed (Escape, close, backdrop)', (await dialog().count()) === 1 && (await page.getByRole('button', { name: 'שולח...' }).isDisabled()));

  // Scan: cancel keeps the draft unchanged; missing year/time are never filled
  await page.goto(`${URL}?bare=1&sheet=open&pick=p1&amount=3`);
  await page.getByRole('button', { name: 'סריקת תאריך' }).click();
  await page.getByRole('button', { name: /תווית צוות/ }).click();
  await page.keyboard.press('Escape');
  check('cancelling scan returns to unchanged draft', (await page.locator('#amount').inputValue()) === '3' && (await page.locator('.picked').textContent()).includes('לימון חתוך') && (await page.locator('.ev-row').count()) === 0);

  await page.goto(`${URL}?bare=1&sheet=scan&pick=p1&fixture=staffIncomplete&step=review&source=staff-label`);
  const year = page.getByRole('textbox', { name: 'שנה' });
  check('missing year stays empty (no inferred year)', (await year.inputValue()) === '');
  check('missing time stays empty (no inferred midnight)', (await page.getByRole('textbox', { name: 'שעה', exact: true }).inputValue()) === '' && (await page.getByRole('textbox', { name: 'דקות' }).inputValue()) === '');
  check('only written day/month are carried from "25/11"', (await page.getByRole('textbox', { name: 'יום' }).inputValue()) === '25' && (await page.getByRole('textbox', { name: 'חודש' }).inputValue()) === '11');
  await page.getByRole('button', { name: 'אישור התאריך' }).click({ force: true });
  check('confirm blocked while year is missing', (await page.getByRole('dialog', { name: 'בדיקת התאריכים שזוהו' }).count()) === 1 && (await page.locator('.err').textContent()).includes('חסרה שנה'));
  await year.fill('2026');
  await page.getByRole('button', { name: 'אישור התאריך' }).click({ force: true });
  check('V0-I1: opening time cannot be confirmed day-only (no "יום בלבד" for opened-at)', (await page.locator('.err').textContent()).includes('זמן פתיחה דורש שעה מפורשת') && (await page.getByRole('checkbox').count()) === 0);
  await page.getByRole('textbox', { name: 'שעה', exact: true }).fill('18');
  await page.getByRole('textbox', { name: 'דקות' }).fill('30');
  await page.getByRole('button', { name: 'אישור התאריך' }).click({ force: true });
  check('explicit opening time confirmed at minute precision', (await page.getByRole('dialog', { name: /פתיחת פריט/ }).count()) === 1 && (await page.locator('.ev-row').textContent()).includes('25.11.2026 18:30'));

  // Expiry evidence may stay day precision (pending C1 cutoff policy).
  await page.goto(`${URL}?bare=1&sheet=scan&pick=p1&fixture=packaging&step=review&source=packaging`);
  await page.getByRole('button', { name: 'אישור התאריך' }).click({ force: true });
  check('expiry evidence may remain day-only', (await page.locator('.ev-row').textContent()).includes('28.11.2026') && (await page.locator('.ev-row').textContent()).includes('יום בלבד'));

  await page.goto(`${URL}?bare=1&sheet=scan&pick=p1&fixture=ambiguous&step=review&source=staff-label`);
  check('ambiguous candidates: nothing preselected', (await page.locator('[role=radio][aria-checked=true]').count()) === 0 && (await page.getByRole('radio').count()) === 2);
  await page.getByRole('button', { name: 'אישור התאריך' }).click({ force: true });
  check('ambiguous: confirm requires an explicit choice', (await page.locator('.err').count()) === 1);
  await page.getByRole('radio').nth(1).click();
  await page.getByRole('button', { name: 'אישור התאריך' }).click({ force: true });
  check('ambiguous: chosen reading confirmed', (await page.locator('.ev-row').textContent()).includes('04.03.2027'));

  await page.goto(`${URL}?bare=1&sheet=scan&pick=p1&fixture=manufactured&step=review&source=packaging`);
  check('manufactured-at shown but not selectable', (await page.locator('.cand.blocked [role=radio]').count()) === 0 && (await page.locator('.cand.blocked').textContent()).includes('לא תאריך תפוגה'));

  await page.goto(`${URL}?bare=1&sheet=scan&pick=p1&fixture=unreadable&step=review&source=packaging`);
  check('unreadable offers retake and manual entry', (await page.getByRole('button', { name: 'צילום מחדש' }).count()) === 1 && (await page.getByRole('button', { name: 'הזנה ידנית' }).count()) === 1);

  // Closing
  await page.goto(`${URL}?bare=1&sheet=close&item=i2&action=discarded`);
  await page.getByRole('button', { name: 'סמן כנזרק' }).click();
  check('discard requires a reason', (await page.locator('.err').textContent()).includes('בחר סיבה'));
  await page.getByRole('radio', { name: 'נפגם' }).click();
  await page.locator('#dq').fill('9');
  await page.getByRole('button', { name: 'סמן כנזרק' }).click();
  check('discard amount bounded by item quantity', (await page.locator('.err').textContent()).includes('1.5'));

  await page.goto(`${URL}?bare=1&role=admin&dept=all`);
  check('admin combined view labels duplicate names by department', (await page.getByRole('article', { name: 'לימון חתוך, בר, עומד לפוג' }).count()) === 1 && (await page.getByRole('article', { name: 'לימון חתוך, מטבח, עומד לפוג' }).count()) === 1);

  check('no page errors during interactions', errors.length === 0, errors.join('; '));
  await browser.close();
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})();
