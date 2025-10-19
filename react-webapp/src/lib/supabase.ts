import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database types for RAG Services
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          updated_at: string | null
          username: string | null
          full_name: string | null
          avatar_url: string | null
          website: string | null
          created_at: string
        }
        Insert: {
          id: string
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
        }
      }
      tokens: {
        Row: {
          id: string
          user_id: string | null
          token: string
          package: string
          status: string
          created_at: string | null
          expiredAt: string | null
          features: any // jsonb
          addons: any // jsonb
          type: string
          systemMessage: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          token: string
          package: string
          status?: string
          created_at?: string | null
          expiredAt?: string | null
          features?: any
          addons?: any
          type?: string
          systemMessage?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          token?: string
          package?: string
          status?: string
          expiredAt?: string | null
          features?: any
          addons?: any
          type?: string
          systemMessage?: string | null
        }
      }
      payment_orders: {
        Row: {
          id: string
          user_id: string
          items: any // jsonb type
          total_amount: number
          currency: string
          payment_method: string
          status: string
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          items: any
          total_amount: number
          currency?: string
          payment_method: string
          status?: string
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          items?: any
          total_amount?: number
          currency?: string
          payment_method?: string
          status?: string
          completed_at?: string | null
        }
      }
      user_documents: {
        Row: {
          id: string
          user_id: string
          filename: string
          file_path: string
          file_size: number
          content_type: string | null
          upload_status: string
          processed_status: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          filename: string
          file_path: string
          file_size: number
          content_type?: string | null
          upload_status?: string
          processed_status?: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          filename?: string
          file_path?: string
          file_size?: number
          content_type?: string | null
          upload_status?: string
          processed_status?: string
          updated_at?: string | null
        }
      }
    }
  }
}