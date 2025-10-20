import React, { useState, useEffect } from "react";
import { X, CreditCard, CheckCircle } from "lucide-react";
import { cn } from "../utils/cn";

interface BankSelectionModalProps {
  isOpen: boolean;
  onSelectBank: (bankCode: string) => void;
  onClose: () => void;
  theme?: "light" | "dark" | "auto";
}

interface BankOption {
  code: string;
  name: string;
  shortName: string;
  color: string;
  darkColor: string;
  logo: React.ReactNode;
}

// Bank Logo Components with enhanced branding and visual appeal
const BankLogos = {
  BBL: () => (
    <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center shadow-lg ring-2 ring-blue-200 dark:ring-blue-800">
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent"></div>
      <div className="relative text-white font-bold text-xs tracking-wider drop-shadow-sm">
        BBL
      </div>
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full opacity-60"></div>
    </div>
  ),

  KBANK: () => (
    <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 via-green-600 to-green-800 flex items-center justify-center shadow-lg ring-2 ring-green-200 dark:ring-green-800">
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent"></div>
      <div className="relative w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
        <div className="text-white font-black text-lg drop-shadow-sm">K</div>
      </div>
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full opacity-60"></div>
    </div>
  ),

  KTB: () => (
    <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 via-blue-600 to-blue-700 flex items-center justify-center shadow-lg ring-2 ring-sky-200 dark:ring-sky-800">
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent"></div>
      <div className="relative">
        <div className="text-white font-bold text-xs tracking-wider drop-shadow-sm">
          KTB
        </div>
        <div className="w-6 h-0.5 bg-white/60 rounded-full mx-auto mt-0.5"></div>
      </div>
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-sky-400 rounded-full opacity-60"></div>
    </div>
  ),

  SCB: () => (
    <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 flex items-center justify-center shadow-lg ring-2 ring-purple-200 dark:ring-purple-800">
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent"></div>
      <div className="relative">
        <div className="text-white font-bold text-xs tracking-wider drop-shadow-sm">
          SCB
        </div>
        <div className="flex gap-0.5 justify-center mt-0.5">
          <div className="w-1 h-1 bg-white/60 rounded-full"></div>
          <div className="w-1 h-1 bg-white/60 rounded-full"></div>
          <div className="w-1 h-1 bg-white/60 rounded-full"></div>
        </div>
      </div>
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-400 rounded-full opacity-60"></div>
    </div>
  ),

  TMB: () => (
    <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 flex items-center justify-center shadow-lg ring-2 ring-orange-200 dark:ring-orange-800">
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent"></div>
      <div className="relative">
        <div className="text-white font-bold text-xs tracking-wider drop-shadow-sm">
          TMB
        </div>
        <div className="w-4 h-0.5 bg-gradient-to-r from-yellow-300 to-orange-300 rounded-full mx-auto mt-0.5"></div>
      </div>
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full opacity-60"></div>
    </div>
  ),

  BAY: () => (
    <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 via-yellow-600 to-orange-600 flex items-center justify-center shadow-lg ring-2 ring-amber-200 dark:ring-amber-800">
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent"></div>
      <div className="relative">
        <div className="text-white font-bold text-xs tracking-wider drop-shadow-sm">
          BAY
        </div>
        <div className="flex justify-center mt-0.5">
          <div className="w-2 h-2 bg-white/60 rounded-full"></div>
        </div>
      </div>
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full opacity-60"></div>
    </div>
  ),
};

const banks: BankOption[] = [
  {
    code: "bbl",
    name: "Bangkok Bank",
    shortName: "BBL",
    color: "from-blue-500 to-blue-700",
    darkColor: "from-blue-400 to-blue-600",
    logo: <BankLogos.BBL />,
  },
  {
    code: "kbank",
    name: "Kasikorn Bank",
    shortName: "KBANK",
    color: "from-green-500 to-green-700",
    darkColor: "from-green-400 to-green-600",
    logo: <BankLogos.KBANK />,
  },
  {
    code: "ktb",
    name: "Krung Thai Bank",
    shortName: "KTB",
    color: "from-blue-500 to-blue-700",
    darkColor: "from-blue-400 to-blue-600",
    logo: <BankLogos.KTB />,
  },
  {
    code: "scb",
    name: "Siam Commercial Bank",
    shortName: "SCB",
    color: "from-purple-500 to-purple-700",
    darkColor: "from-purple-400 to-purple-600",
    logo: <BankLogos.SCB />,
  },
  {
    code: "tmb",
    name: "TMB Thanachart Bank",
    shortName: "TMB",
    color: "from-yellow-500 to-orange-600",
    darkColor: "from-yellow-400 to-orange-500",
    logo: <BankLogos.TMB />,
  },
  {
    code: "bay",
    name: "Krungsri Bank",
    shortName: "BAY",
    color: "from-yellow-400 to-yellow-600",
    darkColor: "from-yellow-300 to-yellow-500",
    logo: <BankLogos.BAY />,
  },
];

export const BankSelectionModal: React.FC<BankSelectionModalProps> = ({
  isOpen,
  onSelectBank,
  onClose,
  theme = "auto",
}) => {
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">("light");

  // Theme detection
  useEffect(() => {
    if (theme === "auto") {
      const isDark =
        document.documentElement.classList.contains("dark") ||
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      setCurrentTheme(isDark ? "dark" : "light");

      // Watch for theme changes
      const observer = new MutationObserver(() => {
        const isDark = document.documentElement.classList.contains("dark");
        setCurrentTheme(isDark ? "dark" : "light");
      });

      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });

      return () => observer.disconnect();
    } else {
      setCurrentTheme(theme);
    }
  }, [theme]);

  const handleBankSelect = async (bankCode: string) => {
    setSelectedBank(bankCode);
    setIsProcessing(true);

    // Small delay for visual feedback
    await new Promise((resolve) => setTimeout(resolve, 300));

    onSelectBank(bankCode);
    setIsProcessing(false);
  };

  const handleClose = () => {
    if (!isProcessing) {
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, isProcessing, onClose]);

  if (!isOpen) return null;

  const isDark = currentTheme === "dark";

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        "bg-black/50 backdrop-blur-sm",
        "animate-in fade-in-0 duration-200"
      )}
      onClick={handleBackdropClick}
    >
      <div
        className={cn(
          "relative w-full max-w-md mx-auto",
          "bg-white dark:bg-gray-800",
          "rounded-2xl shadow-2xl",
          "border border-gray-200 dark:border-gray-700",
          "animate-in zoom-in-95 slide-in-from-bottom-2 duration-200",
          isDark ? "shadow-gray-900/50" : "shadow-gray-500/20"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Select Your Bank
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Choose your bank for secure internet banking payment
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className={cn(
              "p-2 rounded-lg transition-all duration-200",
              "hover:bg-gray-100 dark:hover:bg-gray-700",
              "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bank List */}
        <div className="px-6 pb-6">
          <div className="space-y-3">
            {banks.map((bank) => (
              <button
                key={bank.code}
                onClick={() => handleBankSelect(bank.code)}
                disabled={isProcessing}
                className={cn(
                  "w-full p-4 text-left rounded-xl border transition-all duration-200",
                  "hover:shadow-lg hover:-translate-y-0.5",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                  "disabled:cursor-not-allowed",
                  selectedBank === bank.code
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg"
                    : "border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                )}
              >
                <div className="flex items-center gap-4">
                  {/* Bank Logo */}
                  <div className="flex-shrink-0 relative">
                    {bank.logo}
                    {selectedBank === bank.code && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Bank Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {bank.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {bank.shortName} • Internet Banking
                    </div>
                  </div>

                  {/* Processing Indicator */}
                  {selectedBank === bank.code && isProcessing && (
                    <div className="flex-shrink-0">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <CreditCard className="w-4 h-4" />
              <span>Secured by Omise & SSL encryption</span>
            </div>
          </div>
        </div>

        {/* Processing Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Redirecting to{" "}
                {banks.find((b) => b.code === selectedBank)?.name}...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BankSelectionModal;
