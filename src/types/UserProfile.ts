import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  role: "admin" | "manager" | "staff";
  department: "bar" | "kitchen";
  businessId: string;
  phoneNumber?: string;
  createdAt?: Timestamp;
  isOnShift?: boolean;
  shiftStartedAt?: Timestamp;
} 