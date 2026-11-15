import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { signOut, type User } from 'firebase/auth';
import { doc, onSnapshot, type Timestamp } from 'firebase/firestore';
import { observeAuthState } from '../api/authAPI';
import { auth, db } from '../services/firebase';
import { parseUserProfile } from '../domain/userProfile';
import type { UserProfile } from '../types/UserProfile';
import { disablePushNotifications, syncPushNotificationsSession } from '../utils/notificationUtils';
import { offlineStore, readRememberedProfile, rememberProfile } from '../offline/storage';

export interface UseAuthReturn {
  user: User | null;
  currentUser: User | null;
  profile: UserProfile | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isLoading: boolean;
  isOffline: boolean;
  profileNotFound: boolean;
  error: string | null;
  role: UserProfile['role'] | null;
  department: UserProfile['department'] | null;
  fullName: string | null;
  email: string | null;
  uid: string | null;
  userId: string | null;
  businessId: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isStaff: boolean;
  isBar: boolean;
  isKitchen: boolean;
  isBarStaff: boolean;
  isKitchenStaff: boolean;
  isOnShift: boolean;
  shiftStartedAt: Timestamp | null;
  hasRole: (role: UserProfile['role']) => boolean;
  isInDepartment: (department: UserProfile['department']) => boolean;
  logout: () => Promise<void>;
}
export type AuthContextType = UseAuthReturn;
interface Session {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  profileNotFound: boolean;
  error: string | null;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): UseAuthReturn {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within an AuthProvider');
  return value;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ user: null, profile: null, loading: true, profileNotFound: false, error: null });
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);
  useEffect(() => {
    const online = () => { setIsOffline(false); void syncPushNotificationsSession(auth.currentUser?.uid ?? null).catch(() => undefined); };
    const offline = () => setIsOffline(true);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, []);

  useEffect(() => {
    let generation = 0;
    let stopProfile: (() => void) | undefined;
    const stopAuth = observeAuthState(user => {
      const currentGeneration = ++generation;
      void syncPushNotificationsSession(user?.uid ?? null).catch(() => undefined);
      stopProfile?.();
      stopProfile = undefined;
      // Revoke the old profile atomically before subscribing to a new identity.
      setSession({ user, profile: null, loading: !!user, profileNotFound: false, error: null });
      if (!user) return;
      let profileRevision = 0;
      const restoreOffline = async () => {
        const restoringRevision = profileRevision;
        const profile = await readRememberedProfile(user.uid).catch(() => null);
        if (generation !== currentGeneration || restoringRevision !== profileRevision || navigator.onLine) return;
        setSession({ user, profile, loading: false, profileNotFound: !profile, error: profile ? null : 'profile-unavailable' });
      };
      if (!navigator.onLine) void restoreOffline();
      stopProfile = onSnapshot(doc(db, 'users', user.uid), snapshot => {
        if (generation !== currentGeneration) return;
        if (!snapshot.exists() && snapshot.metadata?.fromCache && !navigator.onLine) { void restoreOffline(); return; }
        profileRevision++;
        const profile = snapshot.exists() ? parseUserProfile(user.uid, snapshot.data()) : null;
        void syncPushNotificationsSession(profile ? user.uid : null, profile?.businessId).catch(() => undefined);
        if (!snapshot.metadata?.fromCache) {
          if (profile) void rememberProfile(profile).catch(() => undefined);
          else void offlineStore.removeProfile(user.uid).catch(() => undefined);
        }
        setSession({ user, profile, loading: false, profileNotFound: !profile, error: profile ? null : 'profile-unavailable' });
      }, () => {
        if (generation !== currentGeneration) return;
        if (!navigator.onLine) { void restoreOffline(); return; }
        profileRevision++;
        setSession({ user, profile: null, loading: false, profileNotFound: false, error: 'profile-unavailable' });
      });
    });
    return () => {
      ++generation;
      stopProfile?.();
      stopAuth();
    };
  }, []);

  const { user, profile, loading, profileNotFound, error } = session;
  const role = profile?.role ?? null;
  const department = profile?.department ?? null;
  const uid = user?.uid ?? null;
  const value: AuthContextType = {
    user, currentUser: user, profile, userProfile: profile,
    loading, isLoading: loading, isOffline, profileNotFound, error,
    role, department, uid, userId: uid,
    fullName: profile?.fullName ?? null,
    email: profile?.email ?? user?.email ?? null,
    businessId: profile?.businessId ?? null,
    isAuthenticated: !!user && !!profile && !loading,
    isAdmin: role === 'admin', isManager: role === 'manager', isStaff: role === 'staff',
    isBar: department === 'bar', isKitchen: department === 'kitchen',
    isBarStaff: role === 'staff' && department === 'bar',
    isKitchenStaff: role === 'staff' && department === 'kitchen',
    isOnShift: profile?.isOnShift === true,
    shiftStartedAt: profile?.shiftStartedAt ?? null,
    hasRole: target => role === target,
    isInDepartment: target => department === target,
    logout: () => { void disablePushNotifications().catch(() => undefined); return signOut(auth); },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
