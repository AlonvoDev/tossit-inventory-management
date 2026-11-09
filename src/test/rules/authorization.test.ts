import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, setLogLevel, Timestamp, updateDoc, where } from 'firebase/firestore';

let env: RulesTestEnvironment;
const stamp = Timestamp.fromMillis(1700000000000);
const user = (role = 'staff', businessId = 'a', department = 'bar', isOnShift = true) => ({
  role, businessId, department, isOnShift, isActive: true,
  fullName: 'Test User', email: 'user@example.test', shiftStartedAt: stamp,
});
const item = (overrides = {}) => ({
  productId: 'milk', productName: 'Milk', amount: 0.5, type: 'kg',
  businessId: 'a', area: 'bar', userId: 'staff', openingTime: stamp,
  expiryTime: Timestamp.fromMillis(1700086400000),
  isThrown: false, discarded: false, finished: false,
  ...overrides,
});
const db = (uid: string) => env.authenticatedContext(uid).firestore();

beforeAll(async () => {
  setLogLevel('silent'); // Expected denied requests are assertions, not application errors.
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Rules tests require the Firestore emulator; production is never a fallback.');
  env = await initializeTestEnvironment({
    projectId: 'demo-tossit-auth',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
afterAll(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    const store = context.firestore();
    const fixtures: Record<string, object> = {
      'users/admin': user('admin'), 'users/manager': user('manager'),
      'users/staff': user(), 'users/kitchen': user('staff', 'a', 'kitchen'),
      'users/off-shift': user('staff', 'a', 'bar', false),
      'users/disabled': { ...user(), isActive: false },
      'users/foreign': user('admin', 'b'),
      'items/bar-item': item(), 'items/kitchen-item': item({ area: 'kitchen' }),
      'items/foreign-item': item({ businessId: 'b', userId: 'foreign' }),
      'items/legacy-item': item({ area: 'בר' }),
      'products/milk': { name: 'Milk', businessId: 'a', area: 'bar', type: 'kg', shelfLifeDays: 1 },
      'products/kitchen': { name: 'Sauce', businessId: 'a', area: 'kitchen', type: 'kg', shelfLifeDays: 3 },
      'fridges/bar-fridge': { name: 'Bar', businessId: 'a', department: 'bar' },
      'categories/dairy': { name: 'Dairy', businessId: 'a' },
    };
    await Promise.all(Object.entries(fixtures).map(([path, value]) => setDoc(doc(store, path), value)));
  });
});

describe('business authorization', () => {
  it('denies unauthenticated inventory reads and writes', async () => {
    const guest = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(guest, 'items/bar-item')));
    await assertFails(setDoc(doc(guest, 'items/new'), item()));
  });
  it('denies inventory access without an active profile', async () => {
    await assertFails(getDoc(doc(db('missing'), 'items/bar-item')));
    await assertFails(getDoc(doc(db('disabled'), 'items/bar-item')));
  });
  it('allows staff to see their own profile and inventory department', async () => {
    await assertSucceeds(getDoc(doc(db('staff'), 'users/staff')));
    await assertSucceeds(getDoc(doc(db('staff'), 'items/bar-item')));
    await assertSucceeds(getDoc(doc(db('staff'), 'items/legacy-item')));
  });
  it('denies cross-business reads even for an admin', async () => {
    await assertFails(getDoc(doc(db('admin'), 'items/foreign-item')));
    await assertFails(getDoc(doc(db('foreign'), 'users/staff')));
  });
  it('denies staff and managers access to another department', async () => {
    await assertFails(getDoc(doc(db('staff'), 'items/kitchen-item')));
    await assertFails(getDoc(doc(db('manager'), 'items/kitchen-item')));
    await assertSucceeds(getDoc(doc(db('admin'), 'items/kitchen-item')));
  });
  it('requires queries to constrain business and staff department', async () => {
    await assertSucceeds(getDocs(query(collection(db('staff'), 'items'), where('businessId', '==', 'a'), where('area', 'in', ['bar', 'בר']))));
    await assertFails(getDocs(query(collection(db('staff'), 'items'), where('businessId', '==', 'a'))));
    await assertSucceeds(getDocs(query(collection(db('admin'), 'items'), where('businessId', '==', 'a'))));
  });
  it('allows only business admins to list staff profiles', async () => {
    await assertSucceeds(getDocs(query(collection(db('admin'), 'users'), where('businessId', '==', 'a'))));
    await assertFails(getDoc(doc(db('manager'), 'users/staff')));
    await assertFails(getDoc(doc(db('staff'), 'users/kitchen')));
  });
  it('denies self-promotion, tenant changes and public profile creation', async () => {
    await assertFails(updateDoc(doc(db('staff'), 'users/staff'), { role: 'admin' }));
    await assertFails(updateDoc(doc(db('staff'), 'users/staff'), { businessId: 'b' }));
    await assertFails(setDoc(doc(db('new-account'), 'users/new-account'), user('admin')));
    await assertFails(deleteDoc(doc(db('staff'), 'users/staff')));
  });
  it('keeps privileged profile changes server-only even for admins', async () => {
    await assertFails(updateDoc(doc(db('admin'), 'users/staff'), { role: 'admin' }));
    await assertFails(deleteDoc(doc(db('admin'), 'users/staff')));
  });
  it('permits only the current employee to change their own shift with server time', async () => {
    await assertSucceeds(updateDoc(doc(db('staff'), 'users/staff'), { isOnShift: true, shiftStartedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(db('staff'), 'users/staff'), { isOnShift: false, shiftStartedAt: null }));
    await assertFails(updateDoc(doc(db('staff'), 'users/kitchen'), { isOnShift: false, shiftStartedAt: null }));
    await assertFails(updateDoc(doc(db('disabled'), 'users/disabled'), { isOnShift: true, shiftStartedAt: serverTimestamp() }));
  });
  it('prevents sneaking a role edit into a shift update', async () => {
    await assertFails(updateDoc(doc(db('staff'), 'users/staff'), { isOnShift: true, shiftStartedAt: serverTimestamp(), role: 'admin' }));
  });
  it('allows a scoped manager to maintain products but never move them across departments', async () => {
    await assertSucceeds(updateDoc(doc(db('manager'), 'products/milk'), { name: 'New milk' }));
    await assertFails(updateDoc(doc(db('manager'), 'products/kitchen'), { name: 'New sauce' }));
    await assertFails(updateDoc(doc(db('manager'), 'products/milk'), { area: 'kitchen' }));
    await assertFails(updateDoc(doc(db('admin'), 'products/milk'), { businessId: 'b' }));
    await assertFails(updateDoc(doc(db('staff'), 'products/milk'), { shelfLifeDays: 99 }));
  });
  it('protects fridge department ownership and business-wide categories', async () => {
    await assertSucceeds(updateDoc(doc(db('manager'), 'fridges/bar-fridge'), { name: 'Bar 1' }));
    await assertFails(updateDoc(doc(db('kitchen'), 'fridges/bar-fridge'), { name: 'Other' }));
    await assertFails(updateDoc(doc(db('manager'), 'fridges/bar-fridge'), { department: 'kitchen' }));
    await assertSucceeds(updateDoc(doc(db('admin'), 'categories/dairy'), { name: 'Milk products' }));
    await assertFails(updateDoc(doc(db('staff'), 'categories/dairy'), { name: 'Changed' }));
  });
  it('requires active shift, own identity and business when opening inventory', async () => {
    await assertSucceeds(setDoc(doc(db('staff'), 'items/new'), item()));
    await assertFails(setDoc(doc(db('off-shift'), 'items/new-off'), item({ userId: 'off-shift' })));
    await assertFails(setDoc(doc(db('staff'), 'items/impersonate'), item({ userId: 'admin' })));
    await assertFails(setDoc(doc(db('staff'), 'items/wrong-business'), item({ businessId: 'b' })));
    await assertFails(setDoc(doc(db('staff'), 'items/wrong-area'), item({ area: 'kitchen' })));
  });
  it('denies unknown collections by default', async () => {
    await assertFails(setDoc(doc(db('admin'), 'unknown/record'), { businessId: 'a' }));
  });
  it('rejects invalid or forged product-derived inventory values', async () => {
    for (const change of [{ amount: -1 }, { type: 'units' }, { productName: 'Forged' }, { productId: 'absent' }, { expiryTime: Timestamp.fromMillis(1700604800000) }]) {
      await assertFails(setDoc(doc(db('staff'), 'items/invalid'), item(change)));
    }
  });
  it('prevents rewriting an existing item or deleting its audit trail', async () => {
    await assertFails(updateDoc(doc(db('admin'), 'items/bar-item'), { amount: 99 }));
    await assertFails(updateDoc(doc(db('staff'), 'items/bar-item'), { businessId: 'b' }));
    await assertFails(deleteDoc(doc(db('admin'), 'items/bar-item')));
  });
  it('accepts one authenticated finished action but refuses a later discard', async () => {
    await assertSucceeds(updateDoc(doc(db('staff'), 'items/bar-item'), { finished: true, finishedBy: 'staff', finishedByName: 'Test User', finishedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db('staff'), 'items/bar-item'), { discarded: true, isThrown: true, discardedBy: 'staff', discardedAt: serverTimestamp(), discardedQuantity: 0.5, discardReason: 'expired' }));
  });
  it('validates discard actor, amount and reason', async () => {
    const action = { discarded: true, isThrown: true, discardedBy: 'staff', discardedAt: serverTimestamp(), discardedQuantity: 0.5, discardReason: 'expired' };
    await assertFails(updateDoc(doc(db('staff'), 'items/bar-item'), { ...action, discardedBy: 'admin' }));
    await assertFails(updateDoc(doc(db('staff'), 'items/bar-item'), { ...action, discardedQuantity: 9 }));
    await assertFails(updateDoc(doc(db('staff'), 'items/bar-item'), { ...action, discardReason: 'unknown' }));
    await assertSucceeds(updateDoc(doc(db('staff'), 'items/bar-item'), action));
  });
});

describe('business settings authorization', () => {
  const settings = { timezone: 'Asia/Jerusalem', eveningRemindersEnabled: true, morningSummaryEnabled: true, autoEndShiftsAtMidnight: false };
  it('allows an active business member to discover missing defaults, never another business', async () => {
    await assertSucceeds(getDoc(doc(db('staff'), 'businessSettings/a')));
    await assertFails(getDoc(doc(db('staff'), 'businessSettings/b')));
    await assertFails(getDoc(doc(db('disabled'), 'businessSettings/a')));
  });
  it('allows only the business admin to save an exact validated settings document', async () => {
    await assertSucceeds(setDoc(doc(db('admin'), 'businessSettings/a'), settings));
    await assertFails(setDoc(doc(db('manager'), 'businessSettings/a'), settings));
    await assertFails(setDoc(doc(db('foreign'), 'businessSettings/a'), settings));
    await assertFails(setDoc(doc(db('admin'), 'businessSettings/a'), { ...settings, timezone: 'UTC' }));
    await assertFails(setDoc(doc(db('admin'), 'businessSettings/a'), { ...settings, morningSummaryEnabled: 'true' }));
    await assertFails(setDoc(doc(db('admin'), 'businessSettings/a'), { ...settings, role: 'admin' }));
    await assertFails(deleteDoc(doc(db('admin'), 'businessSettings/a')));
  });
});
