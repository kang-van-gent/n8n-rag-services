import React from "react";
import { Layout } from "../components/Layout";
import {
  BarChart3,
  Users,
  Activity,
  DollarSign,
  TrendingUp,
  Sparkles,
  Zap,
} from "lucide-react";

const stats = [
  {
    name: "Total Users",
    value: "12,543",
    change: "+12%",
    changeType: "increase" as const,
    icon: Users,
  },
  {
    name: "Active Sessions",
    value: "2,847",
    change: "+8%",
    changeType: "increase" as const,
    icon: Activity,
  },
  {
    name: "Revenue",
    value: "$45,293",
    change: "+23%",
    changeType: "increase" as const,
    icon: DollarSign,
  },
  {
    name: "Growth Rate",
    value: "18.2%",
    change: "+4%",
    changeType: "increase" as const,
    icon: TrendingUp,
  },
];

const recentActivities = [
  {
    id: 1,
    user: "John Doe",
    action: "Created new project",
    time: "2 minutes ago",
  },
  {
    id: 2,
    user: "Jane Smith",
    action: "Updated profile settings",
    time: "5 minutes ago",
  },
  {
    id: 3,
    user: "Mike Johnson",
    action: "Completed onboarding",
    time: "12 minutes ago",
  },
  {
    id: 4,
    user: "Sarah Wilson",
    action: "Uploaded new document",
    time: "18 minutes ago",
  },
  {
    id: 5,
    user: "Tom Brown",
    action: "Joined team collaboration",
    time: "25 minutes ago",
  },
];

export function Dashboard() {
  return (
    <Layout title="Dashboard">
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="glassmorphism rounded-2xl shadow-bw p-8 border border-gray-200/20 dark:border-gray-500/20 card-aura relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-400/10 to-transparent rounded-full blur-xl"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-gradient-to-br from-gray-800 to-black animate-pulse-slow">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-black dark:from-white dark:to-gray-200 bg-clip-text text-transparent">
                Welcome back!
              </h1>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-lg">
              Here's what's happening in your workspace today ⚡
            </p>
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
                            ? "bg-gradient-to-br from-gray-500/20 to-gray-600/20 text-gray-700 dark:text-gray-300"
                            : index === 1
                            ? "bg-gradient-to-br from-gray-600/20 to-gray-700/20 text-gray-800 dark:text-gray-200"
                            : index === 2
                            ? "bg-gradient-to-br from-gray-700/20 to-gray-800/20 text-gray-900 dark:text-gray-100"
                            : "bg-gradient-to-br from-gray-800/20 to-black/20 text-black dark:text-white"
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
                    from last month
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
                Analytics Overview
              </h3>
              <BarChart3 className="h-5 w-5 text-gray-400" />
            </div>
            <div className="h-64 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  Chart visualization would go here
                </p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Recent Activity
            </h3>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
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
              <button className="text-sm font-medium text-primary-600 hover:text-primary-500">
                View all activity →
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-300 dark:hover:border-primary-600 transition-colors">
              <div className="text-center">
                <Users className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Add User
                </p>
              </div>
            </button>
            <button className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-300 dark:hover:border-primary-600 transition-colors">
              <div className="text-center">
                <BarChart3 className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  View Reports
                </p>
              </div>
            </button>
            <button className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-300 dark:hover:border-primary-600 transition-colors">
              <div className="text-center">
                <Activity className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Monitor Activity
                </p>
              </div>
            </button>
            <button className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-300 dark:hover:border-primary-600 transition-colors">
              <div className="text-center">
                <DollarSign className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Billing
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
