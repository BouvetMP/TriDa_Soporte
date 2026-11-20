export interface PasswordChecks {
  minLength: boolean;
  maxLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
}

export function getPasswordChecks(password: string): PasswordChecks {
  return {
    minLength: password.length >= 10,
    maxLength: password.length <= 72,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
  };
}

export function isStrongPassword(password: string): boolean {
  return Object.values(getPasswordChecks(password)).every(Boolean);
}

export function getPasswordValidationMessage(password: string): string {
  const checks = getPasswordChecks(password);
  if (!checks.minLength) {
    return "La contraseña debe tener al menos 10 caracteres.";
  }
  if (!checks.maxLength) {
    return "La contraseña no puede superar los 72 caracteres.";
  }
  if (!checks.hasUpper || !checks.hasLower || !checks.hasNumber) {
    return "La contraseña debe contener al menos una mayúscula, una minúscula y un número.";
  }
  return "";
}
