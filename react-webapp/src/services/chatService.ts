import { supabase } from '../lib/supabase';

export interface ChatAnalytics {
  newChatsToday: number;
  totalChats: number;
  totalMessages: number; // Combined sent + received messages
}

export interface ChatHistory {
  id: number;
  session_id: string;
  user_id: string;
  message: any; // jsonb
  message_type: 'user' | 'assistant' | 'system';
  message_count: number;
  created_at: string;
}

export class ChatService {
  /**
   * Get comprehensive chat analytics for a user
   */
  static async getChatAnalytics(userId: string): Promise<ChatAnalytics> {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

      // Get new chats today (unique sessions created today)
      const { data: newChatsData, error: newChatsError } = await supabase
        .from('n8n_chat_histories')
        .select('session_id')
        .eq('user_id', userId)
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lt('created_at', `${today}T23:59:59.999Z`);

      if (newChatsError) {
        console.error('Error fetching new chats:', newChatsError);
      }

      // Count unique sessions for new chats today
      const newChatsToday = newChatsData 
        ? new Set(newChatsData.map(chat => chat.session_id)).size 
        : 0;

      // Get total chats (all unique sessions)
      const { data: allChatsData, error: allChatsError } = await supabase
        .from('n8n_chat_histories')
        .select('session_id')
        .eq('user_id', userId);

      if (allChatsError) {
        console.error('Error fetching all chats:', allChatsError);
      }

      const totalChats = allChatsData 
        ? new Set(allChatsData.map(chat => chat.session_id)).size 
        : 0;

      // Get all messages (both sent and received)
      const { data: allMessagesData, error: allMessagesError } = await supabase
        .from('n8n_chat_histories')
        .select('message_count')
        .eq('user_id', userId);

      if (allMessagesError) {
        console.error('Error fetching all messages:', allMessagesError);
      }

      const totalMessages = allMessagesData
        ? allMessagesData.reduce((sum, msg) => sum + (msg.message_count || 1), 0)
        : 0;

      return {
        newChatsToday,
        totalChats,
        totalMessages,
      };
    } catch (error) {
      console.error('Error getting chat analytics:', error);
      return {
        newChatsToday: 0,
        totalChats: 0,
        totalMessages: 0,
      };
    }
  }

  /**
   * Get recent chat sessions for a user
   */
  static async getRecentChats(userId: string, limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('n8n_chat_histories')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recent chats:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting recent chats:', error);
      return [];
    }
  }

  /**
   * Get chat history for a specific session
   */
  static async getChatSession(userId: string, sessionId: string): Promise<ChatHistory[]> {
    try {
      const { data, error } = await supabase
        .from('n8n_chat_histories')
        .select('*')
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching chat session:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting chat session:', error);
      return [];
    }
  }

  /**
   * Get daily chat statistics for the last N days
   */
  static async getDailyChatStats(userId: string, days: number = 7): Promise<any[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get daily message counts
      const { data, error } = await supabase
        .from('n8n_chat_histories')
        .select('created_at, message_type, message_count')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching daily chat stats:', error);
        return [];
      }

      // Group by date and message type
      const dailyStats: Record<string, { date: string; chats: number; sent: number; received: number }> = {};

      data?.forEach((record) => {
        const date = new Date(record.created_at).toISOString().split('T')[0];
        
        if (!dailyStats[date]) {
          dailyStats[date] = { date, chats: 0, sent: 0, received: 0 };
        }

        const count = record.message_count || 1;
        
        if (record.message_type === 'user') {
          dailyStats[date].sent += count;
        } else if (record.message_type === 'assistant' || record.message_type === 'system') {
          dailyStats[date].received += count;
        }
      });

      // Get unique sessions per day for chat count
      const { data: sessionData, error: sessionError } = await supabase
        .from('n8n_chat_histories')
        .select('created_at, session_id')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (!sessionError && sessionData) {
        const dailySessions: Record<string, Set<string>> = {};
        
        sessionData.forEach((record) => {
          const date = new Date(record.created_at).toISOString().split('T')[0];
          
          if (!dailySessions[date]) {
            dailySessions[date] = new Set();
          }
          
          dailySessions[date].add(record.session_id);
        });

        // Update chat counts with unique sessions
        Object.keys(dailySessions).forEach((date) => {
          if (dailyStats[date]) {
            dailyStats[date].chats = dailySessions[date].size;
          }
        });
      }

      // Fill in missing dates with zero values
      const result = [];
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        result.push(dailyStats[dateStr] || { 
          date: dateStr, 
          chats: 0, 
          sent: 0, 
          received: 0 
        });
      }

      return result;

    } catch (error) {
      console.error('Error getting daily chat stats:', error);
      return [];
    }
  }

  /**
   * Get weekly chat statistics for the last N weeks
   */
  static async getWeeklyChatStats(userId: string, weeks: number = 4): Promise<any[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (weeks * 7));

      const { data, error } = await supabase
        .from('n8n_chat_histories')
        .select('created_at, message_type, message_count, session_id')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching weekly chat stats:', error);
        return [];
      }

      // Group by week
      const weeklyStats: Record<string, { date: string; chats: Set<string>; sent: number; received: number }> = {};

      data?.forEach((record) => {
        const date = new Date(record.created_at);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!weeklyStats[weekKey]) {
          weeklyStats[weekKey] = { date: weekKey, chats: new Set(), sent: 0, received: 0 };
        }

        const count = record.message_count || 1;
        weeklyStats[weekKey].chats.add(record.session_id);
        
        if (record.message_type === 'user') {
          weeklyStats[weekKey].sent += count;
        } else if (record.message_type === 'assistant' || record.message_type === 'system') {
          weeklyStats[weekKey].received += count;
        }
      });

      // Convert to array and format
      return Object.values(weeklyStats).map(week => ({
        date: week.date,
        chats: week.chats.size,
        sent: week.sent,
        received: week.received
      }));

    } catch (error) {
      console.error('Error getting weekly chat stats:', error);
      return [];
    }
  }

  /**
   * Get monthly chat statistics for the last N months
   */
  static async getMonthlyChatStats(userId: string, months: number = 6): Promise<any[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const { data, error } = await supabase
        .from('n8n_chat_histories')
        .select('created_at, message_type, message_count, session_id')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching monthly chat stats:', error);
        return [];
      }

      // Group by month
      const monthlyStats: Record<string, { date: string; chats: Set<string>; sent: number; received: number }> = {};

      data?.forEach((record) => {
        const date = new Date(record.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
        
        if (!monthlyStats[monthKey]) {
          monthlyStats[monthKey] = { date: monthKey, chats: new Set(), sent: 0, received: 0 };
        }

        const count = record.message_count || 1;
        monthlyStats[monthKey].chats.add(record.session_id);
        
        if (record.message_type === 'user') {
          monthlyStats[monthKey].sent += count;
        } else if (record.message_type === 'assistant' || record.message_type === 'system') {
          monthlyStats[monthKey].received += count;
        }
      });

      // Convert to array and format
      return Object.values(monthlyStats).map(month => ({
        date: month.date,
        chats: month.chats.size,
        sent: month.sent,
        received: month.received
      }));

    } catch (error) {
      console.error('Error getting monthly chat stats:', error);
      return [];
    }
  }
}