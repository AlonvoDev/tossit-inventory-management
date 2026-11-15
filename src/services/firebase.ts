import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyBiiuCnDXbnV8__VYt4wZRxxDFpQi73vM0",
  authDomain: "tossit-4cc02.firebaseapp.com",
  projectId: "tossit-4cc02",
  storageBucket: "tossit-4cc02.firebasestorage.app",
  messagingSenderId: "1057086876120",
  appId: "1:1057086876120:web:7a6fc459a82b4231d42aad",
  measurementId: "G-J2E1TW4GW8"
};

const localhost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
const emulate = localhost && (import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true'
  || (import.meta.env.DEV && localStorage.getItem('useFirebaseEmulators') === 'true'));
// An explicitly selected emulator environment never falls back to production.
const app = initializeApp(emulate ? {
  ...firebaseConfig, projectId: 'demo-tossit-auth',
  authDomain: 'demo-tossit-auth.firebaseapp.com', storageBucket: 'demo-tossit-auth.appspot.com',
} : firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, 'us-central1');
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();
if (emulate) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
}
let analytics: Analytics | null = null;
if (!emulate && typeof window !== 'undefined') {
  void isSupported().then(supported => { if (supported) analytics = getAnalytics(app); }).catch(() => undefined);
}
export const enhancedSignIn = (email: string, password: string) => signInWithEmailAndPassword(auth, email, password);
export { auth, db, functions, storage, googleProvider, analytics, app as firebaseApp };
