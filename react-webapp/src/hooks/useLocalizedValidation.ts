import { useTranslation } from 'react-i18next';

// Update validation messages to use translations
export const useLocalizedValidation = () => {
  const { t } = useTranslation();

  const localizedNameRules = [
    {
      test: (value: string) => value.trim().length > 0,
      message: t('validation.firstNameRequired')
    },
    {
      test: (value: string) => value.trim().length >= 2,
      message: t('validation.nameMinLength')
    },
    {
      test: (value: string) => value.trim().length <= 50,
      message: t('validation.nameMaxLength')
    },
    {
      test: (value: string) => /^[a-zA-ZÀ-ÿ\u0100-\u017F\u0E00-\u0E7F\s-]+$/.test(value.trim()),
      message: t('validation.nameInvalidCharacters')
    }
  ];

  const localizedEmailRules = [
    {
      test: (value: string) => value.trim().length > 0,
      message: t('validation.emailRequired')
    },
    {
      test: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()),
      message: t('validation.emailInvalid')
    }
  ];

  const localizedPasswordRules = [
    {
      test: (value: string) => value.length > 0,
      message: t('validation.passwordRequired')
    },
    {
      test: (value: string) => value.length >= 8,
      message: t('validation.passwordMinLength')
    }
  ];

  const localizedStrongPasswordRules = [
    {
      test: (value: string) => value.length > 0,
      message: t('validation.passwordRequired')
    },
    {
      test: (value: string) => value.length >= 8,
      message: t('validation.passwordMinLength')
    },
    {
      test: (value: string) => /[A-Z]/.test(value),
      message: t('validation.passwordUppercase')
    },
    {
      test: (value: string) => /[a-z]/.test(value),
      message: t('validation.passwordLowercase')
    },
    {
      test: (value: string) => /\d/.test(value),
      message: t('validation.passwordNumber')
    },
    {
      test: (value: string) => /[!@#$%^&*(),.?":{}|<>]/.test(value),
      message: t('validation.passwordSpecial')
    }
  ];

  const localizedConfirmPasswordRules = (password: string) => [
    {
      test: (value: string) => value.length > 0,
      message: t('validation.confirmPasswordRequired')
    },
    {
      test: (value: string) => value === password,
      message: t('validation.passwordsDoNotMatch')
    }
  ];

  return {
    nameRules: localizedNameRules,
    emailRules: localizedEmailRules,
    passwordRules: localizedPasswordRules,
    strongPasswordRules: localizedStrongPasswordRules,
    confirmPasswordRules: localizedConfirmPasswordRules
  };
};