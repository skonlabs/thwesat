import { create } from "zustand";

export type UserRole = "jobseeker" | "employer" | "mentor";

interface RoleState {
  role: UserRole;
  setRole: (role: UserRole) => void;
}

export const useRole = create<RoleState>((set) => ({
  role: (localStorage.getItem("thwesat_role") as UserRole) || "jobseeker",
  setRole: (role) => {
    localStorage.setItem("thwesat_role", role);
    set({ role });
  },
}));
