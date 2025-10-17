import React, { useState } from "react";
import { Key, Package, Clock, Sparkles, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToken } from "../contexts/TokenContext";
import { cn } from "../utils/cn";

const getTokenPackages = (t: any) => [
  {
    id: "basic",
    name: t("tokens.basicPackage"),
    type: "monthly",
    duration: t("tokens.duration30Days"),
    features: [
      t("tokens.features.basicFeatures"),
      t("tokens.features.emailSupport"),
      t("tokens.features.standardAPI"),
    ],
    price: "$9.99",
    icon: Package,
    color: "from-blue-500 to-blue-600",
    iconColor: "text-blue-600 dark:text-blue-400",
    borderColor: "border-blue-300 dark:border-blue-600",
  },
  {
    id: "pro",
    name: t("tokens.proPackage"),
    type: "monthly",
    duration: t("tokens.duration30Days"),
    features: [
      t("tokens.features.allBasicFeatures"),
      t("tokens.features.prioritySupport"),
      t("tokens.features.advancedAPI"),
      t("tokens.features.analyticsDashboard"),
    ],
    price: "$19.99",
    icon: Zap,
    color: "from-emerald-500 to-emerald-600",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    borderColor: "border-emerald-300 dark:border-emerald-600",
    popular: true,
  },
  {
    id: "enterprise",
    name: t("tokens.enterprisePackage"),
    type: "monthly",
    duration: t("tokens.duration30Days"),
    features: [
      t("tokens.features.allProFeatures"),
      t("tokens.features.support24x7"),
      t("tokens.features.customIntegrations"),
      t("tokens.features.dedicatedManager"),
    ],
    price: "$49.99",
    icon: Sparkles,
    color: "from-purple-500 to-purple-600",
    iconColor: "text-purple-600 dark:text-purple-400",
    borderColor: "border-purple-300 dark:border-purple-600",
  },
];

export function ActivateToken() {
  const { t } = useTranslation();
  const tokenPackages = getTokenPackages(t);
  const [selectedPackage, setSelectedPackage] = useState(tokenPackages[1]); // Default to Pro
  const [customToken, setCustomToken] = useState("");
  const [isCustomToken, setIsCustomToken] = useState(false);
  const { createToken, activateExistingToken, loading } = useToken();

  const handleActivatePackage = async () => {
    try {
      // Generate a mock token for the selected package
      const tokenValue = `${selectedPackage.id}_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Calculate expiration date based on package type
      const expiredAt = new Date();
      expiredAt.setDate(expiredAt.getDate() + 30); // 30 days from now

      await createToken({
        token: tokenValue,
        package: selectedPackage.name,
        type: selectedPackage.type,
        features: selectedPackage.features,
        addons: [],
        expiredAt: expiredAt.toISOString(),
      });
    } catch (error) {
      console.error("Failed to activate package:", error);
    }
  };

  const handleActivateCustomToken = async () => {
    if (!customToken.trim()) {
      return;
    }

    try {
      await activateExistingToken(customToken.trim());
      setCustomToken(""); // Clear the input on success
    } catch (error) {
      console.error("Failed to activate custom token:", error);
      // Error handling is done in the context (shows toast)
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="p-4 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 shadow-lg">
            <Key className="w-10 h-10 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent mb-4">
          {t("tokens.activateToken")}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          {t("tokens.choosePackage")}
        </p>
      </div>

      {/* Toggle between packages and custom token */}
      <div className="flex justify-center mb-8">
        <div className="glassmorphism p-1 rounded-xl border border-gray-200/20 dark:border-gray-500/20">
          <button
            onClick={() => setIsCustomToken(false)}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              !isCustomToken
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                : "text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
            )}
          >
            {t("tokens.choosePackageTab")}
          </button>
          <button
            onClick={() => setIsCustomToken(true)}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              isCustomToken
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                : "text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
            )}
          >
            {t("tokens.customTokenTab")}
          </button>
        </div>
      </div>

      {!isCustomToken ? (
        <>
          {/* Package Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {tokenPackages.map((pkg) => (
              <div
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg)}
                className={cn(
                  "glassmorphism rounded-2xl p-6 border cursor-pointer transition-all duration-300 relative overflow-hidden hover:shadow-lg transform hover:scale-[1.02]",
                  selectedPackage.id === pkg.id
                    ? `${pkg.borderColor} shadow-lg scale-105`
                    : "border-gray-200/20 dark:border-gray-500/20 hover:border-gray-300 dark:hover:border-gray-400"
                )}
              >
                {pkg.popular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-3 py-1 text-xs font-semibold rounded-bl-lg shadow-md">
                    {t("tokens.popular")}
                  </div>
                )}

                <div className="text-center">
                  <div
                    className={cn(
                      "inline-flex p-3 rounded-full mb-4 bg-gradient-to-br",
                      pkg.color
                    )}
                  >
                    <pkg.icon className="w-8 h-8 text-white" />
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {pkg.name}
                  </h3>

                  <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                    {pkg.price}
                  </div>

                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex items-center justify-center gap-1">
                    <Clock className={cn("w-4 h-4", pkg.iconColor)} />
                    {pkg.duration}
                  </div>

                  <div className="space-y-2 text-left">
                    {pkg.features.map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"
                      >
                        <div
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            pkg.iconColor.replace("text-", "bg-")
                          )}
                        ></div>
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Activate Button */}
          <div className="text-center">
            <button
              onClick={handleActivatePackage}
              disabled={loading}
              className={cn(
                "btn-aura px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-300",
                loading && "opacity-50 cursor-not-allowed"
              )}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                  {t("tokens.activatingPackage", {
                    package: selectedPackage.name,
                  })}
                </div>
              ) : (
                t("tokens.activatePackage", {
                  package: selectedPackage.name,
                  price: selectedPackage.price,
                })
              )}
            </button>
          </div>
        </>
      ) : (
        /* Custom Token Input */
        <div className="max-w-md mx-auto">
          <div className="glassmorphism rounded-2xl p-8 border border-gray-200/20 dark:border-gray-500/20">
            <div className="text-center mb-6">
              <div className="p-3 rounded-full bg-gradient-to-br from-orange-600 to-red-600 inline-flex mb-4 shadow-lg">
                <Key className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {t("tokens.enterYourToken")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t("tokens.pasteCustomToken")}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("tokens.token")}
                </label>
                <input
                  type="text"
                  value={customToken}
                  onChange={(e) => setCustomToken(e.target.value)}
                  placeholder={t("tokens.enterTokenHere")}
                  className={cn(
                    "w-full px-4 py-3 border rounded-xl",
                    "border-gray-300 dark:border-gray-600",
                    "glassmorphism",
                    "text-gray-900 dark:text-gray-100",
                    "placeholder-gray-400 dark:placeholder-gray-500",
                    "focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                  )}
                />
              </div>

              <button
                onClick={handleActivateCustomToken}
                disabled={loading || !customToken.trim()}
                className={cn(
                  "w-full btn-aura py-3 text-sm font-semibold rounded-xl transition-all duration-300",
                  (loading || !customToken.trim()) &&
                    "opacity-50 cursor-not-allowed"
                )}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    {t("tokens.activatingToken")}
                  </div>
                ) : (
                  t("tokens.activateTokenButton")
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
