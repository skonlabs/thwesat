import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useRole, clearRole } from "@/hooks/use-role";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe("useRole zustand store", () => {
  it("persists setRole into localStorage", () => {
    useRole.getState().setRole("employer");
    expect(localStorage.getItem("thwesat_role")).toBe("employer");
    expect(useRole.getState().role).toBe("employer");
  });

  it("clearRole removes the persisted role", () => {
    useRole.getState().setRole("mentor");
    clearRole();
    expect(localStorage.getItem("thwesat_role")).toBeNull();
  });

  it("accepts all 4 valid app roles", () => {
    for (const r of ["jobseeker", "employer", "agent", "mentor"] as const) {
      useRole.getState().setRole(r);
      expect(useRole.getState().role).toBe(r);
    }
  });
});
