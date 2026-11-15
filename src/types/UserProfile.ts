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
  /** Missing on legacy active profiles; false immediately revokes app access. */
  isActive?: boolean;
  shiftStartedAt?: Timestamp;
}
