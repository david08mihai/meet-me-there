import { isValidPhoneNumber } from 'libphonenumber-js';

export type ValidationResult = string | null;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

export const required = (
  value: string,
  message = 'This field is required',
): ValidationResult => (value.trim().length === 0 ? message : null);

export const minLength = (
  value: string,
  min: number,
  message?: string,
): ValidationResult =>
  value.trim().length < min
    ? (message ?? `Must be at least ${min} characters`)
    : null;

export const maxLength = (
  value: string,
  max: number,
  message?: string,
): ValidationResult =>
  value.trim().length > max
    ? (message ?? `Must be at most ${max} characters`)
    : null;

export const matches = (
  value: string,
  other: string,
  message = 'Values do not match',
): ValidationResult => (value !== other ? message : null);

export const validateEmail = (value: string): ValidationResult => {
  const trimmed = value.trim();
  if (!trimmed) return 'Email is required';
  if (trimmed.length < 5) return 'Please enter a valid email address';
  if (trimmed.length > 254) return 'Email is too long (max 254 characters)';
  if (!EMAIL_REGEX.test(trimmed)) return 'Please enter a valid email address';
  return null;
};

export const validatePassword = (value: string): ValidationResult => {
  if (!value) return 'Password is required';
  if (/\s/.test(value)) return 'Password must not contain spaces';
  if (value.length < 8) return 'Password must be at least 8 characters long';
  if (value.length > 64) return 'Password is too long (max 64 characters)';
  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasDigit = /\d/.test(value);
  const hasSpecial = /[^A-Za-z0-9]/.test(value);
  if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
    return 'Password must include uppercase, lowercase, number, and special character';
  }
  return null;
};

export const validateConfirmPassword = (
  value: string,
  password: string,
): ValidationResult => {
  if (!value) return 'Please confirm your password';
  if (value !== password) return 'Passwords do not match';
  return null;
};

export const validatePersonName = (
  value: string,
  emptyMessage = 'Name is required',
): ValidationResult => {
  const trimmed = value.trim();
  if (!trimmed) return emptyMessage;
  if (trimmed.length < 2) return 'Must be at least 2 characters';
  if (trimmed.length > 100) return 'Must be at most 100 characters';
  return null;
};

export const validateBusinessName = (value: string): ValidationResult => {
  const trimmed = value.trim();
  if (!trimmed) return 'Business name is required';
  if (trimmed.length < 2) return 'Must be at least 2 characters';
  if (trimmed.length > 150) return 'Must be at most 150 characters';
  return null;
};

export const validatePhone = (value: string): ValidationResult => {
  const trimmed = value.trim();
  if (!trimmed) return 'Phone number is required';
  try {
    if (!isValidPhoneNumber(trimmed)) return 'Please enter a valid phone number';
  } catch {
    return 'Please enter a valid phone number';
  }
  return null;
};

export const validateUrl = (
  value: string,
  message = 'Please enter a valid website URL',
): ValidationResult => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!URL_REGEX.test(trimmed)) return message;
  return null;
};

export const validateDateOfBirth = (value: Date | null): ValidationResult => {
  if (!value) return 'Date of birth is required';
  if (Number.isNaN(value.getTime())) return 'Please enter a valid date';
  if (value > new Date()) return 'Date of birth cannot be in the future';
  return null;
};

export const validateShortDescription = (value: string): ValidationResult => {
  const trimmed = value.trim();
  if (!trimmed) return 'Short description is required';
  if (trimmed.length > 500) return 'Must be at most 500 characters';
  return null;
};

export const validateAcceptedTerms = (value: boolean): ValidationResult =>
  value ? null : 'You must accept the Terms of Service and Privacy Policy';

export const validateRequiredChoice = <T>(
  value: T | null | undefined,
  message: string,
): ValidationResult =>
  value === null || value === undefined || value === ''
    ? message
    : null;
