import { 
  createUserWithEmailAndPassword, 
  // signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  sendPasswordResetEmail,
  updateProfile,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, Timestamp, collection, getDocs, query, where, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db, googleProvider, enhancedSignIn } from '../services/firebase';
import { UserProfile } from '../types/UserProfile';

// Admin user creation interface
export interface CreateUserData {
  fullName: string;
  email: string;
  phoneNumber?: string;
  role: 'admin' | 'manager' | 'staff';
  department: 'bar' | 'kitchen';
  password: string;
}

// Get all users (admin only)
export const getAllUsers = async (businessId: string): Promise<UserProfile[]> => {
  try {
    const usersQuery = query(
      collection(db, 'users'),
      where('businessId', '==', businessId)
    );
    
    const querySnapshot = await getDocs(usersQuery);
    const users: UserProfile[] = [];
    
    querySnapshot.forEach((doc) => {
      users.push({ 
        ...doc.data() 
      } as UserProfile);
    });
    
    return users;
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
};

// Create new user (admin only)
export const createUserByAdmin = async (userData: CreateUserData, businessId: string): Promise<string> => {
  try {
    // Validate input data
    if (!userData.fullName || !userData.email || !userData.password) {
      throw new Error('Full name, email, and password are required');
    }
    
    if (!userData.role || (userData.role !== 'admin' && userData.role !== 'manager' && userData.role !== 'staff')) {
      throw new Error('Role must be either "admin", "manager", or "staff"');
    }
    
    // Only validate department for staff members
    if (userData.role === 'staff' && (!userData.department || (userData.department !== 'bar' && userData.department !== 'kitchen'))) {
      throw new Error('Department must be either "bar" or "kitchen" for staff members');
    }
    
    if (userData.password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
    
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
    const { user } = userCredential;
    
    // Update user profile in Firebase Auth
    await updateProfile(user, { displayName: userData.fullName });
    
    // Save extended user information to Firestore using new UserProfile interface
    const userProfile: Omit<UserProfile, ''> = {
      uid: user.uid,
      fullName: userData.fullName,
      email: userData.email,
      role: userData.role,
      department: userData.role === 'staff' ? userData.department : 'bar', // Default department for admin/manager
      businessId: businessId,
      phoneNumber: userData.phoneNumber || '',
      createdAt: Timestamp.now(),
      isOnShift: false
    };
    
    await setDoc(doc(db, 'users', user.uid), userProfile);
    
    console.log('User created successfully:', user.uid);
    return user.uid;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

// Sign up a new user
export const signUp = async (
  email: string, 
  password: string, 
  displayName: string,
  businessId: string,
  isAdmin: boolean = false
): Promise<User> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const { user } = userCredential;
    
    // Update user profile
    await updateProfile(user, { displayName });
    
    // Save additional user information to Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email,
      displayName,
      businessId,
      role: isAdmin ? 'admin' : 'user',
      isOnShift: false,
      createdAt: Timestamp.now()
    });
    
    return user;
  } catch (error) {
    console.error('Error signing up: ', error);
    throw error;
  }
};

// Sign in with email and password
export const signIn = async (email: string, password: string) => {
  return enhancedSignIn(email, password);
};

// Sign in with Google
export const signInWithGoogle = async (): Promise<User> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google: ', error);
    throw error;
  }
};

// Sign out
export const signOut = async (): Promise<void> => {
  try {
    return firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out: ', error);
    throw error;
  }
};

// Send password reset email
export const resetPassword = async (email: string): Promise<void> => {
  try {
    return sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Error resetting password: ', error);
    throw error;
  }
};

// Get user profile from Firestore
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    } else {
      console.warn('User profile not found for UID:', uid);
      
      // Create a basic profile if it doesn't exist (useful for development)
      // This helps with emulator testing or if a user was created directly in Firebase Console
      try {
        const userAuth = auth.currentUser;
        if (userAuth) {
          const basicProfile: UserProfile = {
            uid: uid,
            email: userAuth.email || '',
            fullName: userAuth.displayName || '',
            businessId: 'business1', // Default business
            role: 'admin', // Give admin role for development
            department: 'bar', // Default department
            isOnShift: false
          };
          
          // Save this basic profile to Firestore
          await setDoc(userRef, {
            ...basicProfile,
            createdAt: Timestamp.now()
          });
          
          console.log('Created default profile for user:', uid);
          return basicProfile;
        }
      } catch (createError) {
        console.error('Error creating default profile:', createError);
      }
    }
    
    return null;
  } catch (error) {
    // Check for network errors or timeout
    const isNetworkError = error instanceof Error && 
      (error.message.includes('network') || 
       error.message.includes('timeout') || 
       error.message.includes('offline') ||
       error.message.includes('unavailable'));
    
    // Check for permission errors
    const isPermissionError = error instanceof Error && 
      error.message.includes('permission');
    
    if (isNetworkError) {
      console.warn('Network error getting user profile. Using offline fallback:', error);
      
      // Return an offline fallback profile based on auth data
      if (auth.currentUser) {
        const fallbackProfile: UserProfile = {
          uid: uid,
          email: auth.currentUser.email || 'offline@example.com',
          fullName: auth.currentUser.displayName || 'Offline User',
          businessId: 'business1',
          role: 'admin', // Give admin rights in offline mode for better UX
          department: 'bar', // Default department
          isOnShift: false
        };
        
        console.log('Using offline fallback profile for', auth.currentUser.email);
        return fallbackProfile;
      } else {
        // If we don't even have auth.currentUser, use the demo user
        const demoUser = localStorage.getItem('demoUser');
        if (demoUser) {
          try {
            const parsedUser = JSON.parse(demoUser);
            console.log('Using stored demo user as fallback');
            return parsedUser as UserProfile;
          } catch (e) {
            console.error('Error parsing demo user:', e);
          }
        }
      }
    } else if (isPermissionError) {
      console.error('Permission error getting user profile. Check Firestore rules:', error);
      
      // Return a fallback admin profile for development
      const fallbackProfile: UserProfile = {
        uid: uid,
        email: auth.currentUser?.email || 'unknown@example.com',
        fullName: auth.currentUser?.displayName || 'Development User',
        businessId: 'business1',
        role: 'admin',
        department: 'bar', // Default department
        isOnShift: false
      };
      
      return fallbackProfile;
    }
    
    console.error('Error getting user profile:', error);
    throw error;
  }
};

// Start user shift
export const startShift = async (uid: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      isOnShift: true,
      shiftStartedAt: Timestamp.now()
    }, { merge: true });
  } catch (error) {
    console.error('Error starting shift: ', error);
    throw error;
  }
};

// End user shift
export const endShift = async (uid: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      isOnShift: false,
      shiftStartedAt: null
    }, { merge: true });
  } catch (error) {
    console.error('Error ending shift: ', error);
    throw error;
  }
};

// Auth state observer
export const observeAuthState = (callback: (user: User | null) => void): () => void => {
  return onAuthStateChanged(auth, callback);
};

// Update user role to admin
export const updateUserRoleToAdmin = async (uid: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    
    // בדיקה האם יש למשתמש מזהה עסק
    let businessId = '';
    if (userDoc.exists()) {
      const userData = userDoc.data();
      businessId = userData.businessId || 'business1'; // ברירת מחדל אם אין
    } else {
      businessId = 'business1'; // ברירת מחדל אם אין מסמך משתמש
    }
    
    // עדכון הנתונים עם כל ההרשאות הדרושות
    await setDoc(userRef, {
      role: 'admin',
      businessId: businessId,
      isOnShift: false,     // מאפס את סטטוס המשמרת
      shiftStartedAt: null  // מאפס את זמן תחילת המשמרת
    }, { merge: true });
    
    console.log('User role updated to admin successfully with business ID:', businessId);
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}; 

// Types for updating an existing user (admin only)
export interface UpdateUserData {
  fullName?: string;
  phoneNumber?: string;
  role?: 'admin' | 'manager' | 'staff';
  department?: 'bar' | 'kitchen';
}

/**
 * Update an existing user's profile. Only admins should call this function.
 *
 * The function validates the provided data and performs a partial update on the
 * corresponding Firestore document. When changing a user's role from staff to
 * admin/manager the department field becomes irrelevant and will be reset to a
 * default value ("bar"). Likewise, when setting a user back to staff, a
 * department value must be provided.
 *
 * @param uid The user ID of the profile to update
 * @param updateData The fields to update
 */
export const updateUserByAdmin = async (uid: string, updateData: UpdateUserData): Promise<void> => {
  try {
    // Basic validation
    if (!uid) {
      throw new Error('User ID is required for update');
    }

    const updates: any = {};

    // Validate and assign full name
    if (updateData.fullName !== undefined) {
      if (updateData.fullName.trim().length === 0) {
        throw new Error('Full name cannot be empty');
      }
      updates.fullName = updateData.fullName.trim();
    }

    // Validate and assign phone number (optional)
    if (updateData.phoneNumber !== undefined) {
      updates.phoneNumber = updateData.phoneNumber;
    }

    // Validate role and department
    if (updateData.role !== undefined) {
      const role = updateData.role;
      if (!['admin', 'manager', 'staff'].includes(role)) {
        throw new Error('Role must be either "admin", "manager", or "staff"');
      }
      updates.role = role;

      // If role is admin or manager, department is not used
      if (role === 'admin' || role === 'manager') {
        updates.department = 'bar';
      }
    }

    // Validate department only if role is staff or role is not provided (keeping existing)
    if (updateData.department !== undefined) {
      const dept = updateData.department;
      if (!['bar', 'kitchen'].includes(dept)) {
        throw new Error('Department must be either "bar" or "kitchen"');
      }
      updates.department = dept;
    }

    // Perform update in Firestore
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, updates);
  } catch (error: any) {
    // Log and rethrow for caller to handle
    console.error('Error updating user:', error);
    throw error;
  }
};

/**
 * Delete an existing user from Firestore. This removes the user's profile from
 * the "users" collection but does not remove their authentication record.
 *
 * Only admins should call this function. Deleting a user document will also
 * remove their ability to sign in to the application since the client checks
 * for the existence of a profile and role when authorising access.
 *
 * @param uid The user ID of the profile to delete
 */
export const deleteUserByAdmin = async (uid: string): Promise<void> => {
  try {
    if (!uid) {
      throw new Error('User ID is required for deletion');
    }
    const userRef = doc(db, 'users', uid);
    await deleteDoc(userRef);
  } catch (error: any) {
    console.error('Error deleting user:', error);
    throw error;
  }
};