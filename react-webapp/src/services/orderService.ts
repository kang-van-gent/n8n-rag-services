import { supabase } from '../lib/supabase';

export interface OrderAnalytics {
  newOrdersToday: number;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
}

export interface OrderTrendData {
  date: string;
  orders: number;
  revenue: number;
}

export class OrderService {
  /**
   * Get comprehensive order analytics for a user
   */
  static async getOrderAnalytics(userId: string): Promise<OrderAnalytics> {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

      // Get new orders today
      const { data: newOrdersData, error: newOrdersError } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lt('created_at', `${today}T23:59:59.999Z`);

      if (newOrdersError) {
        console.error('Error fetching new orders:', newOrdersError);
      }

      const newOrdersToday = newOrdersData?.length || 0;

      // Get total orders
      const { data: allOrdersData, error: allOrdersError } = await supabase
        .from('orders')
        .select('id, total_amount')
        .eq('user_id', userId);

      if (allOrdersError) {
        console.error('Error fetching all orders:', allOrdersError);
      }

      const totalOrders = allOrdersData?.length || 0;
      const totalRevenue = allOrdersData?.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0) || 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      return {
        newOrdersToday,
        totalOrders,
        totalRevenue,
        averageOrderValue,
      };
    } catch (error) {
      console.error('Error getting order analytics:', error);
      return {
        newOrdersToday: 0,
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
      };
    }
  }

  /**
   * Get daily order statistics for the last N days
   */
  static async getDailyOrderStats(userId: string, days: number = 7): Promise<OrderTrendData[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      const { data, error } = await supabase
        .from('orders')
        .select('created_at, total_amount')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching daily order stats:', error);
        return [];
      }

      // Group by date
      const groupedData: { [key: string]: { orders: number; revenue: number } } = {};
      
      // Initialize all dates with 0 values
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(endDate.getDate() - (days - 1 - i));
        const dateKey = date.toISOString().split('T')[0];
        groupedData[dateKey] = { orders: 0, revenue: 0 };
      }

      // Populate with actual data
      data?.forEach((order: any) => {
        const dateKey = order.created_at.split('T')[0];
        if (groupedData[dateKey]) {
          groupedData[dateKey].orders += 1;
          groupedData[dateKey].revenue += order.total_amount || 0;
        }
      });

      return Object.entries(groupedData).map(([date, stats]) => ({
        date,
        orders: stats.orders,
        revenue: stats.revenue,
      }));
    } catch (error) {
      console.error('Error getting daily order stats:', error);
      return [];
    }
  }

  /**
   * Get weekly order statistics for the last N weeks
   */
  static async getWeeklyOrderStats(userId: string, weeks: number = 4): Promise<OrderTrendData[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - (weeks * 7));

      const { data, error } = await supabase
        .from('orders')
        .select('created_at, total_amount')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching weekly order stats:', error);
        return [];
      }

      // Group by week
      const groupedData: { [key: string]: { orders: number; revenue: number } } = {};
      
      // Initialize all weeks with 0 values
      for (let i = 0; i < weeks; i++) {
        const weekStart = new Date();
        weekStart.setDate(endDate.getDate() - ((weeks - 1 - i) * 7));
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
        const weekKey = weekStart.toISOString().split('T')[0];
        groupedData[weekKey] = { orders: 0, revenue: 0 };
      }

      // Populate with actual data
      data?.forEach((order: any) => {
        const orderDate = new Date(order.created_at);
        const weekStart = new Date(orderDate);
        weekStart.setDate(orderDate.getDate() - orderDate.getDay()); // Start of week
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (groupedData[weekKey]) {
          groupedData[weekKey].orders += 1;
          groupedData[weekKey].revenue += order.total_amount || 0;
        }
      });

      return Object.entries(groupedData).map(([date, stats]) => ({
        date,
        orders: stats.orders,
        revenue: stats.revenue,
      }));
    } catch (error) {
      console.error('Error getting weekly order stats:', error);
      return [];
    }
  }

  /**
   * Get monthly order statistics for the last N months
   */
  static async getMonthlyOrderStats(userId: string, months: number = 6): Promise<OrderTrendData[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(endDate.getMonth() - months);

      const { data, error } = await supabase
        .from('orders')
        .select('created_at, total_amount')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching monthly order stats:', error);
        return [];
      }

      // Group by month
      const groupedData: { [key: string]: { orders: number; revenue: number } } = {};
      
      // Initialize all months with 0 values
      for (let i = 0; i < months; i++) {
        const monthStart = new Date();
        monthStart.setMonth(endDate.getMonth() - (months - 1 - i));
        monthStart.setDate(1); // First day of month
        const monthKey = monthStart.toISOString().split('T')[0].substring(0, 7); // YYYY-MM
        groupedData[monthKey] = { orders: 0, revenue: 0 };
      }

      // Populate with actual data
      data?.forEach((order: any) => {
        const monthKey = order.created_at.substring(0, 7); // YYYY-MM
        if (groupedData[monthKey]) {
          groupedData[monthKey].orders += 1;
          groupedData[monthKey].revenue += order.total_amount || 0;
        }
      });

      return Object.entries(groupedData).map(([date, stats]) => ({
        date: date + '-01', // Add day to make it a valid date
        orders: stats.orders,
        revenue: stats.revenue,
      }));
    } catch (error) {
      console.error('Error getting monthly order stats:', error);
      return [];
    }
  }
}