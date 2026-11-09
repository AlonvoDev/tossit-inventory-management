import { onAuthStateChanged, signOut as firebaseSignOut, sendPasswordResetEmail, signInWithPopup, type User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions, googleProvider, enhancedSignIn } from '../services/firebase';
import { parseUserProfile } from '../domain/userProfile';
import type { UserProfile } from '../types/UserProfile';
import { disablePushNotifications } from '../utils/notificationUtils';

export interface CreateUserData {
  fullName: string;
  email: string;
  phoneNumber?: string;
  role: 'admin' | 'manager' | 'staff';
  department: 'bar' | 'kitchen';
  password: string;
  requestId?: string;
}
export interface UpdateUserData {
  fullName?: string;
  phoneNumber?: string;
  role?: 'admin' | 'manager' | 'staff';
  department?: 'bar' | 'kitchen';
}
function denied(message: string): Error {
  return Object.assign(new Error(message), { code: 'permission-denied' });
}
function currentUid(): string {
  if (!auth.currentUser) throw Object.assign(new Error('Sign in first'), { code: 'unauthenticated' });
  return auth.currentUser.uid;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(db, 'users', uid));
  return snapshot.exists() ? parseUserProfile(uid, snapshot.data()) : null;
}
export async function getAllUsers(businessId: string): Promise<UserProfile[]> {
  const snapshot = await getDocs(query(collection(db, 'users'), where('businessId', '==', businessId)));
  return snapshot.docs.map(document => ({ ...document.data(), uid: document.id } as UserProfile));
}

// Keep a retry ID in memory, never an employee password. Claude may pass an explicit
// UUID per form intent via requestId; retries of an ambiguous call reuse that ID.
const provisioningRequests = new Map<string, string>();
export async function createUserByAdmin(data: CreateUserData, businessId: string): Promise<string> {
  const uid = currentUid();
  const profile = await getUserProfile(uid);
  if (currentUid() !== uid) throw denied('Identity changed; submit the form again');
  if (!profile || profile.role !== 'admin' || profile.businessId !== businessId) throw denied('Business admin access is required');
  const key = JSON.stringify([uid, businessId, data.email.trim().toLowerCase()]);
  const requestId = data.requestId ?? provisioningRequests.get(key) ?? crypto.randomUUID();
  provisioningRequests.set(key, requestId);
  const create = httpsCallable<CreateUserData & { expectedActorUid: string; expectedBusinessId: string }, { uid: string }>(functions, 'createEmployee');
  const response = await create({ ...data, requestId, expectedActorUid: uid, expectedBusinessId: businessId });
  provisioningRequests.delete(key);
  return response.data.uid;
}

/** Business enrollment is administered by trusted server operations only. */
export async function signUp(...input: [string, string, string, string, boolean?]): Promise<User> {
  void input; // Retain legacy call signature while the public screen is migrated.
  throw denied('ההרשמה מתבצעת דרך מנהל העסק בלבד');
}
export const signIn = (email: string, password: string) => enhancedSignIn(email, password);
export async function signInWithGoogle(): Promise<User> {
  return (await signInWithPopup(auth, googleProvider)).user;
}
export const signOut = (): Promise<void> => { void disablePushNotifications().catch(() => undefined); return firebaseSignOut(auth); };
export const resetPassword = (email: string): Promise<void> => sendPasswordResetEmail(auth, email);
export const observeAuthState = (callback: (user: User | null) => void): (() => void) => onAuthStateChanged(auth, callback);

export async function startShift(uid: string): Promise<void> {
  if (uid !== currentUid()) throw denied('Cannot change another employee shift');
  await updateDoc(doc(db, 'users', uid), { isOnShift: true, shiftStartedAt: serverTimestamp() });
}
export async function endShift(uid: string): Promise<void> {
  if (uid !== currentUid()) throw denied('Cannot change another employee shift');
  await updateDoc(doc(db, 'users', uid), { isOnShift: false, shiftStartedAt: null });
}
/** Removed development bypass; kept as a rejecting compatibility export. */
export async function updateUserRoleToAdmin(uid: string): Promise<void> {
  void uid;
  throw denied('Role changes require an authorized business administrator');
}
export async function updateUserByAdmin(uid: string, updates: UpdateUserData): Promise<void> {
  currentUid();
  await httpsCallable(functions, 'updateEmployee')({ uid, updates });
}
export async function deactivateUserByAdmin(uid: string): Promise<void> {
  currentUid();
  await httpsCallable(functions, 'deactivateEmployee')({ uid });
}
/** Compatibility alias: deactivate access and retain audit identity; do not delete. */
export const deleteUserByAdmin = deactivateUserByAdmin;
