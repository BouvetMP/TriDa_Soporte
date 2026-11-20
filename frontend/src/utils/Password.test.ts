import { describe, expect, it } from "vitest";
import {
  getPasswordChecks,
  getPasswordValidationMessage,
  isStrongPassword,
} from "./Password";

describe("password validation", () => {
  it("accepts only passwords that satisfy every backend rule", () => {
    expect(isStrongPassword("Abcdefgh12")).toBe(true);
    expect(isStrongPassword("Abcdefghi1")).toBe(true);
    expect(isStrongPassword("abcdefgh12")).toBe(false);
    expect(isStrongPassword(`A1${"a".repeat(70)}`)).toBe(true);
    expect(isStrongPassword(`A1${"a".repeat(71)}`)).toBe(false);
  });

  it("reports the limit independently from character content", () => {
    const checks = getPasswordChecks("Abcdefghi1");
    expect(checks.minLength).toBe(true);
    expect(checks.maxLength).toBe(true);
    expect(checks.hasUpper).toBe(true);
    expect(checks.hasLower).toBe(true);
    expect(checks.hasNumber).toBe(true);
    expect(getPasswordValidationMessage("Abcdefghi1")).toBe("");
  });

  it("returns a clear message for passwords above the backend limit", () => {
    expect(getPasswordValidationMessage(`A1${"a".repeat(71)}`)).toBe(
      "La contraseña no puede superar los 72 caracteres.",
    );
  });
});
