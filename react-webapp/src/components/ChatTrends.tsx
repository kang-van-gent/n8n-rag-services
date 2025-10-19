import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Calendar, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ChatService } from "../services/chatService";
import { OrderService } from "../services/orderService";
import { useAuth } from "../contexts/AuthContext";

type PeriodType = "days" | "weeks" | "months";

interface ChatTrendsProps {
  className?: string;
}

const ChatTrends: React.FC<ChatTrendsProps> = ({ className = "" }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [period, setPeriod] = useState<PeriodType>("days");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const periodOptions = [
    {
      value: "days" as PeriodType,
      label: t("dashboard.trends.last7Days"),
      count: 7,
    },
    {
      value: "weeks" as PeriodType,
      label: t("dashboard.trends.last4Weeks"),
      count: 4,
    },
    {
      value: "months" as PeriodType,
      label: t("dashboard.trends.last6Months"),
      count: 6,
    },
  ];

  useEffect(() => {
    if (user?.id) {
      loadTrendData();
    }
  }, [user?.id, period]);

  const loadTrendData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      let chatTrendData: any[] = [];
      let orderTrendData: any[] = [];

      const selectedOption = periodOptions.find((opt) => opt.value === period);
      const count = selectedOption?.count || 7;

      // Load chat trends
      switch (period) {
        case "days":
          chatTrendData = await ChatService.getDailyChatStats(user.id, count);
          orderTrendData = await OrderService.getDailyOrderStats(
            user.id,
            count
          );
          break;
        case "weeks":
          chatTrendData = await ChatService.getWeeklyChatStats(user.id, count);
          orderTrendData = await OrderService.getWeeklyOrderStats(
            user.id,
            count
          );
          break;
        case "months":
          chatTrendData = await ChatService.getMonthlyChatStats(user.id, count);
          orderTrendData = await OrderService.getMonthlyOrderStats(
            user.id,
            count
          );
          break;
      }

      // Merge chat and order data by date
      const mergedData = chatTrendData.map((chatItem) => {
        const orderItem = orderTrendData.find(
          (order) => order.date === chatItem.date
        );
        return {
          ...chatItem,
          orders: orderItem?.orders || 0,
          revenue: orderItem?.revenue || 0,
          formattedDate: formatDate(chatItem.date, period),
        };
      });

      setData(mergedData);
    } catch (error) {
      console.error("Error loading trend data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string, periodType: PeriodType): string => {
    const date = new Date(dateStr);

    switch (periodType) {
      case "days":
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      case "weeks":
        return `Week of ${date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}`;
      case "months":
        return date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });
      default:
        return dateStr;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}
      >
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div className="w-48 h-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <div className="w-32 h-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
          </div>
          <div className="w-full h-64 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-600/20">
            <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t("dashboard.trends.title")}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("dashboard.trends.subtitle")}
            </p>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodType)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="formattedDate"
                tick={{ fontSize: 12 }}
                className="text-gray-600 dark:text-gray-400"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="text-gray-600 dark:text-gray-400"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="chats"
                stroke="#3B82F6"
                strokeWidth={2}
                name={t("dashboard.trends.chats")}
                dot={{ fill: "#3B82F6", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: "#3B82F6", strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="sent"
                stroke="#10B981"
                strokeWidth={2}
                name={t("dashboard.trends.sent")}
                dot={{ fill: "#10B981", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: "#10B981", strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="received"
                stroke="#8B5CF6"
                strokeWidth={2}
                name={t("dashboard.trends.received")}
                dot={{ fill: "#8B5CF6", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: "#8B5CF6", strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="orders"
                stroke="#F59E0B"
                strokeWidth={2}
                name={t("dashboard.trends.orders")}
                dot={{ fill: "#F59E0B", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: "#F59E0B", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">
                {t("dashboard.trends.noData")}
              </p>
              <p className="text-sm">
                {t("dashboard.trends.noDataDescription")}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatTrends;
