import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Layout } from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import { useToken } from "../contexts/TokenContext";
import { ActivateToken } from "../components/ActivateToken";
import ChatAnalytics from "../components/ChatAnalytics";
import ChatTrends from "../components/ChatTrends";
import {
  ChatService,
  ChatAnalytics as ChatAnalyticsType,
} from "../services/chatService";
import {
  OrderService,
  OrderAnalytics as OrderAnalyticsType,
} from "../services/orderService";
import { BarChart3, Sparkles, Key, Package, Clock } from "lucide-react";

export function Dashboard() {
  const { user } = useAuth();
  const { token, hasToken, loading } = useToken();
  const { t } = useTranslation();

  // Chat analytics state
  const [chatAnalytics, setChatAnalytics] = useState<ChatAnalyticsType>({
    newChatsToday: 0,
    totalChats: 0,
    totalMessages: 0,
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Order analytics state
  const [orderAnalytics, setOrderAnalytics] = useState<OrderAnalyticsType>({
    newOrdersToday: 0,
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
  });

  // Load chat analytics when user is available
  useEffect(() => {
    if (user?.id && hasToken) {
      loadChatAnalytics();
      loadOrderAnalytics();
    }
  }, [user?.id, hasToken]);

  const loadChatAnalytics = async () => {
    if (!user?.id) return;

    try {
      setAnalyticsLoading(true);
      const analytics = await ChatService.getChatAnalytics(user.id);
      setChatAnalytics(analytics);
    } catch (error) {
      console.error("Error loading chat analytics:", error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const loadOrderAnalytics = async () => {
    if (!user?.id) return;

    try {
      const analytics = await OrderService.getOrderAnalytics(user.id);
      setOrderAnalytics(analytics);
    } catch (error) {
      console.error("Error loading order analytics:", error);
    }
  };

  const userName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.first_name ||
    user?.email?.split("@")[0] ||
    t("common.user");

  // Show loading state while checking token
  if (loading) {
    return (
      <Layout title="Dashboard">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-200 border-t-blue-600 dark:border-blue-800 dark:border-t-blue-400 rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">
              {t("dashboard.loadingDashboard")}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // Show token activation if user doesn't have a token
  if (!hasToken) {
    return (
      <Layout title="Activate Token">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 border border-gray-200/40 dark:border-gray-500/30 shadow-gray-200/60 dark:shadow-none card-aura relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-400/10 to-transparent rounded-full blur-xl"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 animate-pulse-slow shadow-lg">
                  <Key className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 dark:from-blue-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  {t("dashboard.welcome", { name: userName })}
                </h1>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg">
                {t("dashboard.needToken")}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {t("dashboard.connectedToSupabase", { email: user?.email })}
              </p>
            </div>
          </div>

          {/* Token Activation Component */}
          <ActivateToken />
        </div>
      </Layout>
    );
  }

  // Show full dashboard if user has token
  return (
    <Layout title="Dashboard">
      <div className="space-y-8">
        {/* Welcome Section with Token Info */}
        <div className="bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 border border-gray-200/40 dark:border-gray-500/30 shadow-gray-200/60 dark:shadow-none card-aura relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-400/10 to-transparent rounded-full blur-xl"></div>
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 animate-pulse-slow shadow-lg">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">
                    {t("dashboard.welcomeBack", { name: userName })}
                  </h1>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg">
                  {t("dashboard.todayActivity")}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {t("dashboard.connectedToSupabase", { email: user?.email })}
                </p>
              </div>

              {/* Token Status */}
              <div className="glassmorphism p-4 rounded-xl border border-gray-200/20 dark:border-gray-500/20">
                <div className="text-center">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {t("dashboard.activeToken")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                    {token?.package}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="w-3 h-3" />
                    {token?.expiredAt
                      ? new Date(token.expiredAt).toLocaleDateString()
                      : t("dashboard.noExpiration")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat & Order Analytics Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-600/20">
              <BarChart3 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {t("dashboard.chatAnalytics")} & {t("dashboard.orders")}
            </h2>
          </div>
          <ChatAnalytics
            newChatsToday={chatAnalytics.newChatsToday}
            totalChats={chatAnalytics.totalChats}
            totalMessages={chatAnalytics.totalMessages}
            newOrdersToday={orderAnalytics.newOrdersToday}
            totalOrders={orderAnalytics.totalOrders}
            loading={analyticsLoading}
          />
        </div>

        {/* Chat Trends Line Chart */}
        <ChatTrends />
      </div>
    </Layout>
  );
}
