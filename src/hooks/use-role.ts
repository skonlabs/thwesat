import { create } from "zustand";

export type UserRole = "jobseeker" | "employer";

interface RoleState {
  role: UserRole;
  isMentor: boolean;
  setRole: (role: UserRole) => void;
  toggleMentor: () => void;
  setMentor: (val: boolean) => void;
}

export const useRole = create<RoleState>((set) => ({
  role: (localStorage.getItem("thwesone_role") as UserRole) || "jobseeker",
  isMentor: localStorage.getItem("thwesone_mentor") === "true",
  setRole: (role) => {
    localStorage.setItem("thwesone_role", role);
    set({ role });
  },
  toggleMentor: () =>
    set((state) => {
      const next = !state.isMentor;
      localStorage.setItem("thwesone_mentor", String(next));
      return { isMentor: next };
    }),
  setMentor: (val) => {
    localStorage.setItem("thwesone_mentor", String(val));
    set({ isMentor: val });
  },
}));
