import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Firebase
const mockFirebase = {
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
  },
  firestore: {
    collection: vi.fn(),
    doc: vi.fn(),
    addDoc: vi.fn(),
    getDocs: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
  },
};

vi.mock('firebase/auth', () => mockFirebase.auth);
vi.mock('firebase/firestore', () => mockFirebase.firestore);
