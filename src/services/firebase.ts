import { getAnalytics } from 'firebase/analytics';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  connectAuthEmulator,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBiiuCnDXbnV8__VYt4wZRxxDFpQi73vM0",
  authDomain: "tossit-4cc02.firebaseapp.com",
  projectId: "tossit-4cc02",
  storageBucket: "tossit-4cc02.firebasestorage.app",
  messagingSenderId: "1057086876120",
  appId: "1:1057086876120:web:7a6fc459a82b4231d42aad",
  measurementId: "G-J2E1TW4GW8"
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Check if we're running in development mode (localhost)
const isLocalhost = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1';

// Function to test if emulator is available
const isEmulatorAvailable = async (url: string): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
    
    try {
      await fetch(url, { 
        method: 'HEAD', 
        mode: 'no-cors',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return true; // If no error, emulator is likely available
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
        console.warn(`Emulator at ${url} check timed out`);
      } else {
        console.warn(`Emulator at ${url} connection failed:`, fetchError);
      }
      return false;
    }
  } catch (error) {
    console.warn(`Error checking emulator at ${url}:`, error);
    return false;
  }
};

// Connect to emulators in development, but disable the feature if emulators aren't running
if (isLocalhost) {
  console.log('Development environment detected. Checking for emulators...');
  
  // For auth, we won't use the emulator unless explicitly requested
  const useEmulators = localStorage.getItem('useFirebaseEmulators') === 'true';
  
  if (useEmulators) {
    (async () => {
      console.log('Firebase Emulators option enabled. Attempting connection...');
      
      let emulatorsConnected = false;
      
      // Check if auth emulator is available
      const authEmulatorAvailable = await isEmulatorAvailable('http://localhost:9099');
      if (authEmulatorAvailable) {
        try {
          connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
          console.log('✅ Connected to Auth emulator');
          emulatorsConnected = true;
        } catch (authError) {
          console.warn('❌ Failed to connect to Auth emulator:', authError);
        }
      } else {
        console.warn('❌ Auth emulator not available');
      }
      
      // Check if firestore emulator is available
      const firestoreEmulatorAvailable = await isEmulatorAvailable('http://localhost:8080');
      if (firestoreEmulatorAvailable) {
        try {
          connectFirestoreEmulator(db, 'localhost', 8080);
          console.log('✅ Connected to Firestore emulator');
          emulatorsConnected = true;
        } catch (firestoreError) {
          console.warn('❌ Failed to connect to Firestore emulator:', firestoreError);
        }
      } else {
        console.warn('❌ Firestore emulator not available');
      }
      
      // Check if storage emulator is available
      const storageEmulatorAvailable = await isEmulatorAvailable('http://localhost:9199');
      if (storageEmulatorAvailable) {
        try {
          connectStorageEmulator(storage, 'localhost', 9199);
          console.log('✅ Connected to Storage emulator');
          emulatorsConnected = true;
        } catch (storageError) {
          console.warn('❌ Failed to connect to Storage emulator:', storageError);
        }
      } else {
        console.warn('❌ Storage emulator not available');
      }
      
      if (!emulatorsConnected) {
        console.error('⚠️ No emulators were connected! Using production Firebase services instead.');
        console.log('ℹ️ To use emulators, ensure you have:');
        console.log('  1. Installed Java (required for Firebase emulators)');
        console.log('  2. Run: npm run emulators (in a separate terminal)');
        console.log('  3. Or run: npm run dev:emulate (to start both emulators and dev server)');
      } else {
        console.log('✅ Firebase emulators connected successfully!');
      }
    })();
  } else {
    console.log('Using actual Firebase services (emulators disabled)');
    console.log('> To enable emulators: Toggle emulator option on login page');
  }
} else {
  console.log('Using Firebase Production Services');
}

// Create a wrapped version of signInWithEmailAndPassword that includes error handling
export const enhancedSignIn = async (email: string, password: string) => {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error: unknown) {
    console.error('Sign-in error:', error);
    
    // Type-safe error handling
    const firebaseError = error as { code?: string };
    
    // Special handling for development mode
    if (isLocalhost && firebaseError?.code === 'auth/network-request-failed') {
      console.log('⚠️ Network error during sign-in. If using emulators, make sure they are running.');
      console.log('ℹ️ You can use the demo login in development to bypass this error.');
    }
    
    throw error;
  }
};

export { auth, db, storage, googleProvider, analytics, app as firebaseApp }; 