import { create } from "zustand";

export type UserRole = "jobseeker" | "employer" | "mentor";

const ROLE_KEY = "thwesat_role";
const VALID_ROLES: UserRole[] = ["jobseeker", "employer", "mentor"];

function getStoredRole(): UserRole {
  const stored = localStorage.getItem(ROLE_KEY);
  if (stored && (VALID_ROLES as string[]).includes(stored)) {
    return stored as UserRole;
  }
  // Invalid or missing — clear and default
  if (stored !== null) {
    localStorage.removeItem(ROLE_KEY);
  }
  return "jobseeker";
}

/** Removes the persisted role from localStorage (call on sign-out). */
export function clearRole(): void {
  localStorage.removeItem(ROLE_KEY);
}

interface RoleState {
  role: UserRole;
  setRole: (role: UserRole) => void;
}

export const useRole = create<RoleState>((set) => ({
  role: getStoredRole(),
  setRole: (role) => {
    localStorage.setItem(ROLE_KEY, role);
    set({ role });
  },
}));
