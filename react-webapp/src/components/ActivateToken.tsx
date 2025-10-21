import React, { useEffect, useMemo, useState } from "react";
import { Key, Package, Clock, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToken } from "../contexts/TokenContext";
import { useCart } from "../contexts/CartContext";
import { cn } from "../utils/cn";
import { composeToken as composeN8nToken } from "../utils/tokenGenerator";
import { PricingService, type Plan } from "../services/pricingService";

// Map plan key to icon/colors
function getPlanVisuals(planKey?: string) {
  const key = (planKey || "").toLowerCase();
  if (key === "enterprise") {
    return {
      icon: Sparkles,
      color: "from-purple-500 to-purple-600",
      iconColor: "text-purple-600 dark:text-purple-400",
      borderColor: "border-purple-300 dark:border-purple-600",
    } as const;
  }
  if (key === "standard") {
    return {
      icon: Package,
      color: "from-emerald-500 to-emerald-600",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      borderColor: "border-emerald-300 dark:border-emerald-600",
    } as const;
  }
  return {
    icon: Package,
    color: "from-blue-500 to-blue-600",
    iconColor: "text-blue-600 dark:text-blue-400",
    borderColor: "border-blue-300 dark:border-blue-600",
  } as const;
}

function humanizeFeature(f: any): string {
  if (!f) return "";
  // Accept either string or object { feature_key, unit, value }
  if (typeof f === "string") return f;
  const key = f.feature_key || f.key || "";
  const unit = f.unit || "";
  const value = f.value;
  const title = String(key).replace(/_/g, " ");
  if (unit === "files" && typeof value === "number")
    return `${title}: ${value}`;
  return title;
}

export function ActivateToken() {
  const { t } = useTranslation();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [customToken, setCustomToken] = useState("");
  const [isCustomToken, setIsCustomToken] = useState(false);
  const { createToken, activateExistingToken, loading } = useToken();
  const { addPlanToCart } = useCart();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setPlansLoading(true);
        const data = await PricingService.getPlans();
        const active = (data || []).filter((p) => p.is_active);
        if (!mounted) return;
        setPlans(active);
        setSelectedPlan(active[0] || null);
      } catch (e) {
        console.error("Failed to load plans:", e);
        setPlans([]);
        setSelectedPlan(null);
      } finally {
        if (mounted) setPlansLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const formattedPrice = (p?: Plan) => {
    if (!p) return "";
    const amount = p.price ? parseFloat(p.price) : 0;
    return PricingService.formatCurrency(amount, p.currency || "THB");
  };

  const durationLabel = (p?: Plan) => {
    const cycle = (p?.billing_cycle || "monthly").toLowerCase();
    if (cycle === "yearly") return t("tokens.duration365Days");
    return t("tokens.duration30Days");
  };

  const handleActivatePackage = async () => {
    try {
      if (!selectedPlan) return;

      // Add selected plan to cart and navigate to cart for checkout
      addPlanToCart(selectedPlan);
      window.location.href = "/cart";
    } catch (error) {
      console.error("Failed to activate package:", error);
    }
  };

  const handleActivateCustomToken = async () => {
    if (!customToken.trim()) {
      return;
    }

    try {
      setErrorMsg(null);
      await activateExistingToken(customToken.trim());
      setCustomToken(""); // Clear the input on success
    } catch (error) {
      console.error("Failed to activate custom token:", error);
      // Show a friendly message when rules block activation
      const message =
        error instanceof Error ? error.message : t("tokens.activationFailed");
      setErrorMsg(message);
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
          {/* Plan Selection (from database) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {plansLoading && (
              <div className="md:col-span-3 text-center text-gray-500 dark:text-gray-400">
                {t("dashboard.loadingDashboard")}
              </div>
            )}
            {!plansLoading && plans.length === 0 && (
              <div className="md:col-span-3 text-center text-gray-500 dark:text-gray-400">
                {t("tokens.noPlansAvailable")}
              </div>
            )}
            {!plansLoading &&
              plans.map((plan) => {
                const vis = getPlanVisuals(plan.key);
                const Icon = vis.icon;
                const isSelected = selectedPlan?.id === plan.id;
                const featureList = Array.isArray(plan.features)
                  ? plan.features
                  : [];
                const isSinglePlan = plans.length === 1; // center single card
                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={cn(
                      "glassmorphism rounded-2xl p-6 border cursor-pointer transition-all duration-300 relative overflow-hidden hover:shadow-lg transform hover:scale-[1.02]",
                      isSelected
                        ? `${vis.borderColor} shadow-lg scale-105`
                        : "border-gray-200/20 dark:border-gray-500/20 hover:border-gray-300 dark:hover:border-gray-400",
                      // If only one plan, place it in the middle column on md+ screens
                      isSinglePlan && "md:col-start-2"
                    )}
                  >
                    {plan.key?.toLowerCase() === "standard" && (
                      <div className="absolute top-0 right-0 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-3 py-1 text-xs font-semibold rounded-bl-lg shadow-md">
                        {t("tokens.popular")}
                      </div>
                    )}

                    <div className="text-center">
                      <div
                        className={cn(
                          "inline-flex p-3 rounded-full mb-4 bg-gradient-to-br",
                          vis.color
                        )}
                      >
                        <Icon className="w-8 h-8 text-white" />
                      </div>

                      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        {plan.name}
                      </h3>

                      <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                        {formattedPrice(plan)}
                      </div>

                      <div
                        className={cn(
                          "text-sm text-gray-500 dark:text-gray-400 mb-4 flex items-center justify-center gap-1",
                          vis.iconColor
                        )}
                      >
                        <Clock className="w-4 h-4" />
                        {durationLabel(plan)}
                      </div>

                      <div className="space-y-2 text-left">
                        {featureList
                          .slice(0, 6)
                          .map((feature: any, index: number) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"
                            >
                              <div
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  vis.iconColor.replace("text-", "bg-")
                                )}
                              ></div>
                              {humanizeFeature(feature)}
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Activate Button */}
          <div className="text-center">
            <button
              onClick={handleActivatePackage}
              disabled={loading || !selectedPlan}
              className={cn(
                "btn-aura px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-300",
                (loading || !selectedPlan) && "opacity-50 cursor-not-allowed"
              )}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                  {t("tokens.activatingPackage", {
                    package: selectedPlan?.name || "",
                  })}
                </div>
              ) : (
                t("tokens.activatePackage", {
                  package: selectedPlan?.name || "",
                  price: formattedPrice(selectedPlan || undefined),
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
              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
                  {errorMsg}
                </div>
              )}
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
