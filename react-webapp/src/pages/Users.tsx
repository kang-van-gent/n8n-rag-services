import React, { useState, useEffect } from "react";
import {
  User,
  Crown,
  Calendar,
  CreditCard,
  Mail,
  Phone,
  MapPin,
  Package,
  Shield,
  Edit,
  Settings,
  Key,
  Activity,
  FileText,
  ShoppingCart,
  Clock,
  CheckCircle,
  AlertCircle,
  Save,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import { useToken } from "../contexts/TokenContext";
import { useCart } from "../contexts/CartContext";
import { TokenFeatureService } from "../services/TokenFeatureService";
import { cn } from "../utils/cn";

export function Users() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { token, loading: tokenLoading } = useToken();
  const { items, itemCount } = useCart();
  const [isEditing, setIsEditing] = useState(false);
  const [userProfile, setUserProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    if (user) {
      setUserProfile({
        firstName: user.user_metadata?.first_name || "",
        lastName: user.user_metadata?.last_name || "",
        email: user.email || "",
        phone: user.user_metadata?.phone || "",
      });
    }
  }, [user]);

  const handleSaveProfile = async () => {
    // Here you would typically call an API to update the user profile
    console.log("Saving profile:", userProfile);
    setIsEditing(false);
    // You can add actual API call here when backend is ready
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getIncludedFeatures = () => {
    if (!token) return [];
    return TokenFeatureService.getIncludedFeatures(token);
  };

  const recentActivity = [
    {
      id: 1,
      action: t("users.activity.loggedIn"),
      timestamp: new Date().toISOString(),
      icon: Activity,
    },
    {
      id: 2,
      action: t("users.activity.updatedProfile"),
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      icon: Edit,
    },
    {
      id: 3,
      action: t("users.activity.addedToCart"),
      timestamp: new Date(Date.now() - 172800000).toISOString(),
      icon: ShoppingCart,
    },
  ];

  if (!user) {
    return (
      <Layout title="Profile">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {t("users.notLoggedIn")}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {t("users.pleaseLogIn")}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={t("users.myProfile")}>
      <div className="space-y-8">
        {/* Profile Header */}
        <div className="bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-200/40 dark:border-gray-500/30 shadow-lg shadow-gray-200/60 dark:shadow-none">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg sm:text-2xl font-bold mx-auto sm:mx-0">
                {userProfile.firstName.charAt(0) ||
                  user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {userProfile.firstName && userProfile.lastName
                    ? `${userProfile.firstName} ${userProfile.lastName}`
                    : "User Profile"}
                </h1>
                <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                  {userProfile.email}
                </p>
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                  {token ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                      <Crown className="w-3 h-3" />
                      {token.package.charAt(0).toUpperCase() +
                        token.package.slice(1)}{" "}
                      Plan
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300">
                      <AlertCircle className="w-3 h-3" />
                      No Active Plan
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={cn(
                "flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 text-sm sm:text-base w-full sm:w-auto shadow-lg hover:shadow-xl transform hover:-translate-y-0.5",
                isEditing
                  ? "bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white border border-gray-400"
                  : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border border-blue-400"
              )}
            >
              {isEditing ? (
                <>
                  <X className="w-4 h-4" />
                  {t("users.cancel")}
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4" />
                  {t("users.editProfile")}
                </>
              )}
            </button>
          </div>

          {/* Profile Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("users.firstName")}
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={userProfile.firstName}
                  onChange={(e) =>
                    setUserProfile((prev) => ({
                      ...prev,
                      firstName: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                />
              ) : (
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-gray-100">
                  {userProfile.firstName || t("users.notSet")}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("users.lastName")}
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={userProfile.lastName}
                  onChange={(e) =>
                    setUserProfile((prev) => ({
                      ...prev,
                      lastName: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                />
              ) : (
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-gray-100">
                  {userProfile.lastName || t("users.notSet")}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("users.email")}
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-gray-100">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  {userProfile.email}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("users.phone")}
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={userProfile.phone}
                  onChange={(e) =>
                    setUserProfile((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                />
              ) : (
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-gray-100">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    {userProfile.phone || t("users.notSet")}
                  </div>
                </div>
              )}
            </div>

            {isEditing && (
              <div className="sm:col-span-2 flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                >
                  {t("users.cancel")}
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {t("users.saveChanges")}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Current Plan & Features */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Current Plan */}
          <div className="bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-200/40 dark:border-gray-500/30 shadow-lg shadow-gray-200/60 dark:shadow-none">
            <div className="flex items-center gap-3 mb-6">
              <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {t("users.currentPlan")}
              </h2>
            </div>

            {tokenLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                <span className="ml-2 text-gray-600 dark:text-gray-300">
                  {t("users.loading")}
                </span>
              </div>
            ) : token ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200/50 dark:border-emerald-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Crown className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-semibold text-emerald-900 dark:text-emerald-100">
                        {token.package.charAt(0).toUpperCase() +
                          token.package.slice(1)}{" "}
                        {t("users.plan")}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      {t("users.activePlan")}
                    </span>
                  </div>
                  <div className="text-sm text-emerald-800 dark:text-emerald-200">
                    {t("users.expires")}:{" "}
                    {token.expiredAt
                      ? formatDate(token.expiredAt)
                      : t("users.never")}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                    {t("users.includedFeatures")} (
                    {getIncludedFeatures().length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {getIncludedFeatures().map((feature, index) => (
                      <div
                        key={feature.featureKey}
                        className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800"
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {feature.displayName || feature.featureKey}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {t("users.quantity")}: {feature.quantity}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-amber-600 dark:text-amber-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {t("users.noActivePlan")}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {t("users.activateFeatures")}
                </p>
                <button className="btn-aura px-4 py-2 text-sm font-semibold rounded-lg">
                  {t("users.choosePlan")}
                </button>
              </div>
            )}
          </div>

          {/* Shopping Cart Summary */}
          <div className="bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-200/40 dark:border-gray-500/30 shadow-lg shadow-gray-200/60 dark:shadow-none">
            <div className="flex items-center gap-3 mb-6">
              <ShoppingCart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {t("users.shoppingCart")}
              </h2>
              {itemCount > 0 && (
                <span className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 text-xs font-medium px-2 py-1 rounded-full">
                  {itemCount}{" "}
                  {itemCount !== 1 ? t("cart.items") : t("cart.item")}
                </span>
              )}
            </div>

            {items.length > 0 ? (
              <div className="space-y-4">
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200/50 dark:border-purple-500/20"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {item.feature.name}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {t("users.quantity")}: {item.quantity} × ฿{item.price}
                          /{item.period}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                        ฿{item.price * item.quantity}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-purple-200 dark:border-purple-500/30">
                  <div className="flex items-center justify-between text-base font-semibold text-gray-900 dark:text-gray-100">
                    <span>{t("users.total")}:</span>
                    <span>
                      ฿
                      {items.reduce(
                        (total, item) => total + item.price * item.quantity,
                        0
                      )}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => navigate("/cart")}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-medium transition-colors text-sm sm:text-base"
                >
                  {t("users.viewCartCheckout")}
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <ShoppingCart className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {t("users.cartEmpty")}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {t("users.cartEmptyDescription")}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-200/40 dark:border-gray-500/30 shadow-lg shadow-gray-200/60 dark:shadow-none">
          <div className="flex items-center gap-3 mb-6">
            <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {t("users.recentActivity")}
            </h2>
          </div>

          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <activity.icon className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {activity.action}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(activity.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
