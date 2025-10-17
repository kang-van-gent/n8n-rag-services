export interface ValidationRule {
  test: (value: string) => boolean;
  message: string;
}

export interface FieldValidation {
  isValid: boolean;
  errors: string[];
}

export interface FormValidation {
  [key: string]: FieldValidation;
}

// Email validation
export const emailRules: ValidationRule[] = [
  {
    test: (email) => email.length > 0,
    message: 'Email is required',
  },
  {
    test: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    message: 'Please enter a valid email address',
  },
];

// Password validation
export const passwordRules: ValidationRule[] = [
  {
    test: (password) => password.length > 0,
    message: 'Password is required',
  },
  {
    test: (password) => password.length >= 8,
    message: 'Password must be at least 8 characters long',
  },
];

// Strong password validation (for sign-up)
export const strongPasswordRules: ValidationRule[] = [
  ...passwordRules,
  {
    test: (password) => /[A-Z]/.test(password),
    message: 'Password must contain at least one uppercase letter',
  },
  {
    test: (password) => /[a-z]/.test(password),
    message: 'Password must contain at least one lowercase letter',
  },
  {
    test: (password) => /\d/.test(password),
    message: 'Password must contain at least one number',
  },
];

// Name validation
export const nameRules: ValidationRule[] = [
  {
    test: (name) => name.length > 0,
    message: 'This field is required',
  },
  {
    test: (name) => name.length >= 2,
    message: 'Name must be at least 2 characters long',
  },
  {
    test: (name) => /^[a-zA-Z\s]+$/.test(name),
    message: 'Name can only contain letters and spaces',
  },
];

// Confirm password validation
export const confirmPasswordRules = (originalPassword: string): ValidationRule[] => [
  {
    test: (confirmPassword) => confirmPassword.length > 0,
    message: 'Please confirm your password',
  },
  {
    test: (confirmPassword) => confirmPassword === originalPassword,
    message: 'Passwords do not match',
  },
];

// Generic validation function
export function validateField(value: string, rules: ValidationRule[]): FieldValidation {
  const errors: string[] = [];
  
  for (const rule of rules) {
    if (!rule.test(value)) {
      errors.push(rule.message);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Validate entire form
export function validateForm(
  formData: Record<string, string>,
  fieldRules: Record<string, ValidationRule[]>
): FormValidation {
  const validation: FormValidation = {};
  
  for (const [fieldName, value] of Object.entries(formData)) {
    if (fieldRules[fieldName]) {
      validation[fieldName] = validateField(value, fieldRules[fieldName]);
    }
  }
  
  return validation;
}

// Check if form is valid
export function isFormValid(validation: FormValidation): boolean {
  return Object.values(validation).every(field => field.isValid);
}

// Get first error for a field
export function getFieldError(validation: FormValidation, fieldName: string): string | null {
  const field = validation[fieldName];
  return field && field.errors.length > 0 ? field.errors[0] : null;
}