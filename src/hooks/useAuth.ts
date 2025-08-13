import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../services/firebase';
import { getUserProfile } from '../api/firestoreAPI';
import { UserProfile } from '../types/UserProfile';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const userId = user?.uid || null;
  const businessId = userProfile?.businessId || null;
  
  useEffect(() => {
    // Check for demo user in localStorage (for development)
    const demoUser = localStorage.getItem('demoUser');
    if (demoUser && window.location.hostname === 'localhost') {
      const parsedDemoUser = JSON.parse(demoUser);
      setUser(parsedDemoUser);
      setUserProfile(parsedDemoUser);
      setIsAdmin(parsedDemoUser.role === 'admin');
      setLoading(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          // Get user profile from Firestore
          const profile = await getUserProfile(currentUser.uid);
          setUserProfile(profile as UserProfile);
          setIsAdmin(profile?.role === 'admin');
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUserProfile(null);
          setIsAdmin(false);
        }
      } else {
        setUserProfile(null);
        setIsAdmin(false);
      }
      
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);
  
  return {
    user,
    userProfile,
    loading,
    isAdmin,
    userId,
    businessId,
    isAuthenticated: !!user
  };
} 