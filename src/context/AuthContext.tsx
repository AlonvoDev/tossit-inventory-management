import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, signOut } from 'firebase/auth';
import { observeAuthState } from '../api/authAPI';
import { UserProfile } from '../types/UserProfile';
import { Timestamp } from 'firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebase';

// Types
interface AuthContextType {
  // Firebase Auth user
  currentUser: User | null;
  
  // Full UserProfile from Firestore
  userProfile: UserProfile | null;
  
  // Loading and connection states
  isLoading: boolean;
  isOffline: boolean;
  profileNotFound: boolean; // Flag for when Firestore profile doesn't exist
  
  // Direct access to user properties
  role: 'admin' | 'manager' | 'staff' | null;
  department: 'bar' | 'kitchen' | null;
  fullName: string | null;
  email: string | null;
  uid: string | null;
  
  // Derived authentication and authorization states
  isAuthenticated: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isStaff: boolean;
  isBarStaff: boolean;
  isKitchenStaff: boolean;
  
  // Legacy properties (kept for backward compatibility)
  isOnShift: boolean;
  shiftStartedAt: Timestamp | null;
  businessId: string | null;
  
  // Helper functions
  hasRole: (role: 'admin' | 'staff') => boolean;
  isInDepartment: (department: 'bar' | 'kitchen') => boolean;
  logout: () => Promise<void>;
}

// Custom useAuth hook return type
export interface UseAuthReturn {
  // 1. The current Firebase user object (auth.currentUser)
  user: User | null;
  
  // 2. The extended UserProfile object loaded from Firestore
  profile: UserProfile | null;
  
  // 3. Boolean isAdmin flag (true if profile.role === "admin")
  isAdmin: boolean;
  
  // 4. Boolean isManager flag (true if profile.role === "manager")
  isManager: boolean;
  
  // 5. Boolean isBar flag (true if profile.department === "bar")
  isBar: boolean;
  
  // 6. Boolean isKitchen flag (true if profile.department === "kitchen")
  isKitchen: boolean;
  
  // 7. Loading state (true if context is still initializing)
  loading: boolean;
  
  // 8. Logout function that signs the user out using Firebase signOut()
  logout: () => Promise<void>;
  
  // Additional useful properties for backward compatibility
  isOffline: boolean;
  profileNotFound: boolean;
  role: 'admin' | 'manager' | 'staff' | null;
  department: 'bar' | 'kitchen' | null;
  currentUser: User | null; // Backward compatibility alias for 'user'
  userProfile: UserProfile | null; // Backward compatibility alias for 'profile'
  isLoading: boolean; // Backward compatibility alias for 'loading'
  fullName: string | null;
  email: string | null;
  uid: string | null;
  isAuthenticated: boolean;
  isStaff: boolean;
  isBarStaff: boolean;
  isKitchenStaff: boolean;
  isOnShift: boolean;
  shiftStartedAt: Timestamp | null;
  businessId: string | null;
  hasRole: (role: 'admin' | 'manager' | 'staff') => boolean;
  isInDepartment: (department: 'bar' | 'kitchen') => boolean;
}

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  // Firebase Auth user
  currentUser: null,
  
  // Full UserProfile from Firestore
  userProfile: null,
  
  // Loading and connection states
  isLoading: true,
  isOffline: false,
  profileNotFound: false,
  
  // Direct access to user properties
  role: null,
  department: null,
  fullName: null,
  email: null,
  uid: null,
  
  // Derived authentication and authorization states
  isAuthenticated: false,
  isAdmin: false,
  isManager: false,
  isStaff: false,
  isBarStaff: false,
  isKitchenStaff: false,
  
  // Legacy properties
  isOnShift: false,
  shiftStartedAt: null,
  businessId: null,
  
  // Helper functions
  hasRole: () => false,
  isInDepartment: () => false,
  logout: async () => {
    await signOut(auth);
    console.log('User signed out');
  },
});

// Hook for using the auth context
export const useAuth = (): UseAuthReturn => {
  const context = useContext(AuthContext);
  
  // Handle case where context is not available (should not happen in normal usage)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  const {
    currentUser,
    userProfile,
    isLoading,
    role,
    department,
    isAdmin,
    isManager,
    isOffline,
    profileNotFound,
    fullName,
    email,
    uid,
    isAuthenticated,
    isStaff,
    isBarStaff,
    isKitchenStaff,
    isOnShift,
    shiftStartedAt,
    businessId,
    hasRole,
    isInDepartment,
    logout
  } = context;
  
  // Return the structured data as requested
  return {
    // 1. The current Firebase user (renamed from currentUser to user)
    user: currentUser,
    
    // 2. The UserProfile object loaded from Firestore
    profile: userProfile,
    
    // 3. Boolean isAdmin flag (true if role === "admin")
    isAdmin,
    
    // 4. Boolean isManager flag (true if role === "manager") 
    isManager,
    
    // 5. Boolean isBar flag (true if department === "bar")
    isBar: department === 'bar',
    
    // 6. Boolean isKitchen flag (true if department === "kitchen")  
    isKitchen: department === 'kitchen',
    
    // 7. Loading state (true if context is still initializing)
    loading: isLoading,
    
    // 8. Logout function that signs the user out using Firebase signOut()
    logout: logout,
    
    // Additional useful properties for backward compatibility
    isOffline: isOffline,
    profileNotFound: profileNotFound,
    role: role,
    department: department,
    currentUser: currentUser, // Alias for user
    userProfile: userProfile, // Alias for profile
    isLoading: isLoading, // Alias for loading
    fullName: fullName,
    email: email,
    uid: uid,
    isAuthenticated: isAuthenticated,
    isStaff: isStaff,
    isBarStaff: isBarStaff,
    isKitchenStaff: isKitchenStaff,
    isOnShift: isOnShift,
    shiftStartedAt: shiftStartedAt,
    businessId: businessId,
    hasRole,
    isInDepartment: isInDepartment
  };
};

// Helper function to fetch user profile from Firestore
const fetchUserProfileFromFirestore = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);
    
    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      
      // Parse the Firestore document into a UserProfile object
      const userProfile: UserProfile = {
        uid: userData.uid || uid,
        fullName: userData.fullName || userData.displayName || userData.email?.split('@')[0] || 'User',
        email: userData.email || auth.currentUser?.email || '',
        role: userData.role === 'admin' ? 'admin' : (userData.role === 'manager' ? 'manager' : 'staff'),
        department: userData.department || userData.area || 'bar',
        businessId: userData.businessId || 'business1', // Default business ID if not set
        phoneNumber: userData.phoneNumber || '',
        createdAt: userData.createdAt || undefined,
        isOnShift: userData.isOnShift || false
      };
      
      return userProfile;
    } else {
      // Document does not exist - this should trigger a redirect
      console.warn('No user document found for UID:', uid);
      throw new Error('USER_PROFILE_NOT_FOUND');
    }
  } catch (error) {
    console.error('Error fetching user profile from Firestore:', error);
    throw error;
  }
};

// Auth provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [profileNotFound, setProfileNotFound] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [profileFetched, setProfileFetched] = useState(false);
  const maxRetries = 3;

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network connection restored');
      setIsOffline(false);
      // Trigger a retry when connection is restored
      if (currentUser && retryCount < maxRetries) {
        setRetryCount(count => count + 1);
      }
    };

    const handleOffline = () => {
      console.log('Network connection lost');
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initialize offline status
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentUser, retryCount]);

  useEffect(() => {
    // Check for demo user on page load (for development mode)
    const checkDemoUser = () => {
      const demoUserString = localStorage.getItem('demoUser');
      if (demoUserString && window.location.hostname === 'localhost') {
        try {
          const demoUser = JSON.parse(demoUserString);
          console.log('Using demo user from localStorage:', demoUser.email);
          setUserProfile(demoUser);
          setProfileNotFound(false);
          setIsLoading(false);
          setProfileFetched(true);
          return true;
        } catch (error) {
          console.error('Error parsing demo user:', error);
        }
      }
      return false;
    };

    // Subscribe to auth state changes
    const unsubscribe = observeAuthState(async (user) => {
      setCurrentUser(user);
      
      // If using demo user, don't try to fetch Firebase profile
      if (checkDemoUser()) {
        return;
      }
      
      // If user is logged in and we haven't fetched their profile yet
      if (user && !profileFetched) {
        try {
          // Fetch user profile from Firestore using user's UID as document ID
          const profile = await fetchUserProfileFromFirestore(user.uid);
          
          if (profile) {
            setUserProfile(profile);
            setProfileNotFound(false);
            console.log('User profile fetched successfully:', profile);
            
            // Only set loading to false if we have complete profile data
            if (profile.role && profile.department) {
              setIsLoading(false);
            }
          }
          setProfileFetched(true);
        } catch (error) {
          console.error('Error fetching user profile:', error);
          
          // Check if the error is specifically about profile not found
          if (error instanceof Error && error.message === 'USER_PROFILE_NOT_FOUND') {
            console.log('User profile not found in Firestore - user needs authorization');
            setProfileNotFound(true);
            setUserProfile(null);
            setIsLoading(false); // Stop loading when we know profile doesn't exist
          } else {
            // For other errors (network, permissions, etc.), try demo user fallback
            if (!checkDemoUser()) {
              // Only set to null if we don't have a demo user
              setUserProfile(null);
              setProfileNotFound(false); // Don't redirect for network errors
              setIsLoading(false); // Stop loading on error
            }
          }
          setProfileFetched(true);
        }
      } else if (!user) {
        // User logged out - reset all states
        setUserProfile(null);
        setProfileNotFound(false);
        setProfileFetched(false);
        setIsLoading(false); // No need to load when no user
      } else if (user && profileFetched) {
        // User is authenticated and we've already tried to fetch profile
        // Make sure loading is stopped
        setIsLoading(false);
      }
    });
    
    // Cleanup subscription on unmount
    return unsubscribe;
  }, [retryCount, profileFetched]);
  
  // Derive all user properties and states from the current auth and profile data
  const role = userProfile?.role || null;
  const department = userProfile?.department || null;
  const fullName = userProfile?.fullName || currentUser?.displayName || null;
  const email = userProfile?.email || currentUser?.email || null;
  const uid = userProfile?.uid || currentUser?.uid || null;
  const businessId = userProfile?.businessId || null; // Derive businessId
  
  // Enhanced loading state - keep loading until we have complete profile or know it doesn't exist
  const isProfileDataComplete = userProfile && role && department;
  const shouldStillBeLoading = currentUser && !profileFetched && !profileNotFound && !isProfileDataComplete;
  const finalIsLoading = isLoading || shouldStillBeLoading;
  
  // Authentication and authorization states
  const isAuthenticated = !!currentUser && !profileNotFound && !!isProfileDataComplete;
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const isStaff = role === 'staff';
  const isBarStaff = role === 'staff' && department === 'bar';
  const isKitchenStaff = role === 'staff' && department === 'kitchen';
  
  // Legacy properties (kept for backward compatibility)
  const isOnShift = false; // This data is no longer in the UserProfile type
  const shiftStartedAt = null; // This data is no longer in the UserProfile type
  
  // Helper functions
  const hasRole = (targetRole: 'admin' | 'manager' | 'staff'): boolean => {
    return role === targetRole;
  };
  
  const isInDepartment = (targetDepartment: 'bar' | 'kitchen'): boolean => {
    return department === targetDepartment;
  };

  const logout = async () => {
    await signOut(auth);
    console.log('User signed out');
  };
  
  const value: AuthContextType = {
    // Firebase Auth user
    currentUser,
    
    // Full UserProfile from Firestore
    userProfile,
    
    // Loading and connection states
    isLoading: finalIsLoading || false,
    isOffline,
    profileNotFound,
    
    // Direct access to user properties
    role,
    department,
    fullName,
    email,
    uid,
    
    // Derived authentication and authorization states
    isAuthenticated,
    isAdmin,
    isManager,
    isStaff,
    isBarStaff,
    isKitchenStaff,
    
    // Legacy properties
    isOnShift,
    shiftStartedAt,
    businessId,
    
    // Helper functions
    hasRole,
    isInDepartment,
    logout
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 