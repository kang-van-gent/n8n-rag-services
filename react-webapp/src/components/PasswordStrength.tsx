import React from "react";
import { Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../utils/cn";

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

interface PasswordCriteria {
  labelKey: string;
  test: (password: string) => boolean;
}

const getCriteria = (): PasswordCriteria[] => [
  {
    labelKey: "validation.passwordMinLength",
    test: (password) => password.length >= 8,
  },
  {
    labelKey: "validation.passwordUppercase",
    test: (password) => /[A-Z]/.test(password),
  },
  {
    labelKey: "validation.passwordLowercase",
    test: (password) => /[a-z]/.test(password),
  },
  {
    labelKey: "validation.passwordNumber",
    test: (password) => /\d/.test(password),
  },
  {
    labelKey: "validation.passwordSpecial",
    test: (password) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  },
];

export function getPasswordStrength(password: string): {
  score: number;
  level: "weak" | "medium" | "strong";
  passedCriteria: number;
} {
  const criteria = getCriteria();
  const passedCriteria = criteria.filter((criterion) =>
    criterion.test(password)
  ).length;

  let level: "weak" | "medium" | "strong" = "weak";
  if (passedCriteria >= 4) {
    level = "strong";
  } else if (passedCriteria >= 2) {
    level = "medium";
  }

  return {
    score: (passedCriteria / criteria.length) * 100,
    level,
    passedCriteria,
  };
}

export function PasswordStrength({
  password,
  className,
}: PasswordStrengthProps) {
  const { t } = useTranslation();
  const { score, level, passedCriteria } = getPasswordStrength(password);
  const criteria = getCriteria();

  if (!password) return null;

  const getStrengthColor = () => {
    switch (level) {
      case "weak":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "strong":
        return "bg-green-500";
      default:
        return "bg-gray-300";
    }
  };

  const getTextColor = () => {
    switch (level) {
      case "weak":
        return "text-red-600 dark:text-red-400";
      case "medium":
        return "text-yellow-600 dark:text-yellow-400";
      case "strong":
        return "text-green-600 dark:text-green-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Strength Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {t("validation.passwordMustContain")}
          </span>
          <span
            className={cn("text-xs font-medium capitalize", getTextColor())}
          >
            {t(`passwordStrength.${level}`)} ({passedCriteria}/5)
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              getStrengthColor()
            )}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Criteria List */}
      <div className="space-y-1">
        {criteria.map((criterion, index) => {
          const passed = criterion.test(password);
          return (
            <div
              key={index}
              className={cn(
                "flex items-center space-x-2 text-xs transition-colors duration-200",
                passed
                  ? "text-green-600 dark:text-green-400"
                  : "text-gray-500 dark:text-gray-400"
              )}
            >
              {passed ? (
                <Check className="w-3 h-3" />
              ) : (
                <X className="w-3 h-3" />
              )}
              <span>{t(criterion.labelKey)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
