import React from "react";
import { useTranslation } from "react-i18next";
import { Layout } from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import { useToken } from "../contexts/TokenContext";
import { ActivateToken } from "../components/ActivateToken";
import {
  BarChart3,
  Users,
  Activity,
  DollarSign,
  TrendingUp,
  Sparkles,
  Zap,
  Key,
  Package,
  Clock,
} from "lucide-react";

const getStats = (t: any) => [
  {
    name: t("dashboard.totalUsers"),
    value: "12,543",
    change: "+12%",
    changeType: "increase" as const,
    icon: Users,
  },
  {
    name: t("dashboard.activeSessions"),
    value: "2,847",
    change: "+8%",
    changeType: "increase" as const,
    icon: Activity,
  },
  {
    name: t("dashboard.revenue"),
    value: "$45,293",
    change: "+23%",
    changeType: "increase" as const,
    icon: DollarSign,
  },
  {
    name: t("dashboard.growthRate"),
    value: "18.2%",
    change: "+4%",
    changeType: "increase" as const,
    icon: TrendingUp,
  },
];

const getRecentActivities = (t: any) => [
  {
    id: 1,
    user: "John Doe",
    action: t("dashboard.activities.createdProject"),
    time: t("dashboard.activities.minutesAgo", { count: 2 }),
  },
  {
    id: 2,
    user: "Jane Smith",
    action: t("dashboard.activities.updatedProfile"),
    time: t("dashboard.activities.minutesAgo", { count: 5 }),
  },
  {
    id: 3,
    user: "Mike Johnson",
    action: t("dashboard.activities.completedOnboarding"),
    time: t("dashboard.activities.minutesAgo", { count: 12 }),
  },
  {
    id: 4,
    user: "Sarah Wilson",
    action: t("dashboard.activities.uploadedDocument"),
    time: t("dashboard.activities.minutesAgo", { count: 18 }),
  },
  {
    id: 5,
    user: "Tom Brown",
    action: t("dashboard.activities.joinedTeam"),
    time: t("dashboard.activities.minutesAgo", { count: 25 }),
  },
];

export function Dashboard() {
  const { user } = useAuth();
  const { token, hasToken, loading } = useToken();
  const { t } = useTranslation();

  const userName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.first_name ||
    user?.email?.split("@")[0] ||
    t("common.user");

  const stats = getStats(t);
  const recentActivities = getRecentActivities(t);

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
          <div className="glassmorphism rounded-2xl shadow-bw p-8 border border-gray-200/20 dark:border-gray-500/20 card-aura relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-400/10 to-transparent rounded-full blur-xl"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 animate-pulse-slow shadow-lg">
                  <Key className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 dark:from-blue-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  {t("dashboard.welcome", { name: userName })}
                </h1>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-lg">
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
        <div className="glassmorphism rounded-2xl shadow-bw p-8 border border-gray-200/20 dark:border-gray-500/20 card-aura relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-400/10 to-transparent rounded-full blur-xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 animate-pulse-slow shadow-lg">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">
                    {t("dashboard.welcomeBack", { name: userName })}
                  </h1>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-lg">
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((item, index) => (
            <div
              key={item.name}
              className="glassmorphism overflow-hidden rounded-2xl card-aura border border-gray-200/20 dark:border-gray-500/20 relative group"
              style={{
                animationDelay: `${index * 100}ms`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-gray-500/5 to-gray-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="p-6 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`p-2 rounded-xl ${
                          index === 0
                            ? "bg-gradient-to-br from-blue-500/20 to-blue-600/20 text-blue-700 dark:text-blue-300"
                            : index === 1
                            ? "bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 text-emerald-700 dark:text-emerald-300"
                            : index === 2
                            ? "bg-gradient-to-br from-purple-500/20 to-purple-600/20 text-purple-700 dark:text-purple-300"
                            : "bg-gradient-to-br from-orange-500/20 to-orange-600/20 text-orange-700 dark:text-orange-300"
                        }`}
                      >
                        <item.icon className="h-6 w-6" />
                      </div>
                      <dt className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        {item.name}
                      </dt>
                    </div>
                    <dd className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {item.value}
                    </dd>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
                <div className="text-sm">
                  <span
                    className={`font-medium ${
                      item.changeType === "increase"
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {item.change}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {" "}
                    {t("dashboard.fromLastMonth")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart Placeholder */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t("dashboard.analyticsOverview")}
              </h3>
              <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="h-64 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="mx-auto h-12 w-12 text-blue-500 dark:text-blue-400 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  {t("dashboard.chartVisualization")}
                </p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t("dashboard.recentActivity")}
            </h3>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {activity.user.charAt(0)}
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {activity.user}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {activity.action}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors">
                {t("dashboard.viewAllActivity")}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {t("dashboard.quickActions")}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="p-4 border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-300 group">
              <div className="text-center">
                <Users className="mx-auto h-8 w-8 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors mb-2" />
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {t("dashboard.addUser")}
                </p>
              </div>
            </button>
            <button className="p-4 border-2 border-dashed border-emerald-300 dark:border-emerald-600 rounded-lg hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all duration-300 group">
              <div className="text-center">
                <BarChart3 className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors mb-2" />
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {t("dashboard.viewReports")}
                </p>
              </div>
            </button>
            <button className="p-4 border-2 border-dashed border-purple-300 dark:border-purple-600 rounded-lg hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-300 group">
              <div className="text-center">
                <Activity className="mx-auto h-8 w-8 text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors mb-2" />
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {t("dashboard.monitorActivity")}
                </p>
              </div>
            </button>
            <button className="p-4 border-2 border-dashed border-orange-300 dark:border-orange-600 rounded-lg hover:border-orange-400 dark:hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all duration-300 group">
              <div className="text-center">
                <DollarSign className="mx-auto h-8 w-8 text-orange-600 dark:text-orange-400 group-hover:text-orange-700 dark:group-hover:text-orange-300 transition-colors mb-2" />
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {t("dashboard.billing")}
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
