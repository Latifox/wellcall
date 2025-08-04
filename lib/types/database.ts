export interface Client {
  id: string;
  company_name: string;
  email: string;
  workspace_id: string;
  workspace_api_key: string; // encrypted
  plan: 'starter' | 'pro' | 'enterprise';
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  auth_user_id: string;
  client_id?: string;
  role: 'admin' | 'client';
  created_at: string;
  updated_at: string;
}

export interface UsageCache {
  id: string;
  client_id: string;
  month: string;
  calls_count: number;
  minutes_used: number;
  revenue: number;
  created_at: string;
  updated_at: string;
}

export interface RetellCallData {
  call_id: string;
  from_number: string;
  to_number: string;
  duration: number;
  status: 'completed' | 'failed' | 'busy' | 'no-answer';
  transcript?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  created_at: string;
  agent_id?: string;
  recording_url?: string;
}

export interface DashboardAnalytics {
  total_calls: number;
  total_minutes: number;
  calls_this_month: number;
  answered_calls: number;
  missed_calls: number;
  daily_calls: Array<{date: string, count: number}>;
  recent_calls: RetellCallData[];
  sentiment_breakdown: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

export interface AdminAnalytics extends DashboardAnalytics {
  total_clients: number;
  active_clients: number;
  monthly_revenue: number;
  client_breakdown: Array<{
    client_id: string;
    company_name: string;
    calls_count: number;
    minutes_used: number;
    plan: string;
  }>;
}