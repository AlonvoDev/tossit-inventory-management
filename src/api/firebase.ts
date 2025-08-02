import { getAnalytics } from 'firebase/analytics';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

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
const analytics = getAnalytics(app);

export { auth, db, storage, googleProvider, analytics, app as firebaseApp }; 
