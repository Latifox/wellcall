import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's role
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Only admins can access this endpoint
    if (userData.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Access denied - Admin only' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get all clients
    const { data: clients, error: clientsError } = await supabaseClient
      .from('clients')
      .select('id, company_name, plan, workspace_id')

    if (clientsError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch clients' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get usage cache data
    const { data: usageData, error: usageError } = await supabaseClient
      .from('usage_cache')
      .select('*')

    if (usageError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch usage data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate aggregated analytics
    const totalCalls = usageData.reduce((sum, usage) => sum + usage.calls_count, 0)
    const totalMinutes = usageData.reduce((sum, usage) => sum + usage.minutes_used, 0)
    const monthlyRevenue = usageData
      .filter(usage => usage.month === '2024-02')
      .reduce((sum, usage) => sum + parseFloat(usage.revenue), 0)

    // Create client breakdown
    const clientBreakdown = clients.map(client => {
      const clientUsage = usageData.filter(usage => usage.client_id === client.id)
      const clientCalls = clientUsage.reduce((sum, usage) => sum + usage.calls_count, 0)
      const clientMinutes = clientUsage.reduce((sum, usage) => sum + usage.minutes_used, 0)
      
      return {
        client_id: client.id,
        company_name: client.company_name,
        calls_count: clientCalls,
        minutes_used: clientMinutes,
        plan: client.plan
      }
    })

    const mockAdminAnalytics = {
      total_calls: totalCalls,
      total_minutes: totalMinutes,
      calls_this_month: 529, // Mock current month data
      answered_calls: 445,
      missed_calls: 84,
      total_clients: clients.length,
      active_clients: clients.length, // All clients are considered active for demo
      monthly_revenue: monthlyRevenue,
      daily_calls: [
        { date: '2024-01-01', count: 45 },
        { date: '2024-01-02', count: 52 },
        { date: '2024-01-03', count: 38 },
        { date: '2024-01-04', count: 67 },
        { date: '2024-01-05', count: 58 },
        { date: '2024-01-06', count: 43 },
        { date: '2024-01-07', count: 12 },
      ],
      recent_calls: [
        {
          call_id: 'call_admin_001',
          from_number: '+1111111111',
          to_number: '+2222222222',
          duration: 240,
          status: 'completed',
          sentiment: 'positive',
          created_at: '2024-01-05T11:30:00Z'
        },
        {
          call_id: 'call_admin_002',
          from_number: '+3333333333',
          to_number: '+4444444444',
          duration: 120,
          status: 'completed',
          sentiment: 'neutral',
          created_at: '2024-01-05T10:15:00Z'
        }
      ],
      sentiment_breakdown: {
        positive: 267,
        negative: 89,
        neutral: 189
      },
      client_breakdown: clientBreakdown
    }

    return new Response(
      JSON.stringify(mockAdminAnalytics),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})