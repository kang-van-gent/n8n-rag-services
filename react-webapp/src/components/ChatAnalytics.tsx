import React from "react";
import { useTranslation } from "react-i18next";
import { MessageCircle, TrendingUp, ShoppingCart, Package } from "lucide-react";

interface ChatAnalyticsProps {
  newChatsToday: number;
  totalChats: number;
  totalMessages: number; // Combined sent + received messages
  newOrdersToday?: number;
  totalOrders?: number;
  loading?: boolean;
}

const ChatAnalytics: React.FC<ChatAnalyticsProps> = ({
  newChatsToday,
  totalChats,
  totalMessages,
  newOrdersToday = 0,
  totalOrders = 0,
  loading = false,
}) => {
  const { t } = useTranslation();

  const metrics = [
    {
      title: t("dashboard.newChatsToday"),
      value: newChatsToday,
      icon: MessageCircle,
      color: "bg-blue-500",
      textColor: "text-blue-600",
      bgColor: "bg-blue-50",
      description: t("dashboard.newChats") + " " + t("common.today", "today"),
    },
    {
      title: t("dashboard.totalChats"),
      value: totalChats,
      icon: TrendingUp,
      color: "bg-green-500",
      textColor: "text-green-600",
      bgColor: "bg-green-50",
      description:
        t("dashboard.totalChats") + " " + t("common.toDate", "to date"),
    },
    {
      title: t("dashboard.totalMessages"),
      value: totalMessages,
      icon: MessageCircle,
      color: "bg-purple-500",
      textColor: "text-purple-600",
      bgColor: "bg-purple-50",
      description:
        t("dashboard.messages") +
        " " +
        t("common.sentAndReceived", "sent and received"),
    },
    {
      title: t("dashboard.newOrdersToday"),
      value: newOrdersToday,
      icon: ShoppingCart,
      color: "bg-orange-500",
      textColor: "text-orange-600",
      bgColor: "bg-orange-50",
      description: t("dashboard.orders") + " " + t("common.today", "today"),
    },
    {
      title: t("dashboard.totalOrders"),
      value: totalOrders,
      icon: Package,
      color: "bg-indigo-500",
      textColor: "text-indigo-600",
      bgColor: "bg-indigo-50",
      description:
        t("dashboard.totalOrders") + " " + t("common.toDate", "to date"),
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
                <div className="w-12 h-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
              </div>
              <div className="w-24 h-8 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
              <div className="w-32 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
      {metrics.map((metric, index) => {
        const IconComponent = metric.icon;

        return (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className={`p-2 rounded-lg ${metric.bgColor} dark:bg-gray-700`}
              >
                <IconComponent
                  className={`w-6 h-6 ${metric.textColor} dark:text-gray-300`}
                />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {metric.value.toLocaleString()}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                {metric.title}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {metric.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ChatAnalytics;
