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

    // Get user's client_id and role
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('client_id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Only clients can access this endpoint (not admins)
    if (userData.role !== 'client' || !userData.client_id) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get client's workspace details
    const { data: clientData, error: clientError } = await supabaseClient
      .from('clients')
      .select('workspace_id, workspace_api_key, company_name')
      .eq('id', userData.client_id)
      .single()

    if (clientError || !clientData) {
      return new Response(
        JSON.stringify({ error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Decrypt the API key (in production, use proper encryption)
    // For demo purposes, we'll simulate Retell API data
    const mockAnalytics = {
      total_calls: 245,
      total_minutes: 3675,
      calls_this_month: 89,
      answered_calls: 201,
      missed_calls: 44,
      daily_calls: [
        { date: '2024-01-01', count: 12 },
        { date: '2024-01-02', count: 15 },
        { date: '2024-01-03', count: 8 },
        { date: '2024-01-04', count: 22 },
        { date: '2024-01-05', count: 18 },
        { date: '2024-01-06', count: 14 },
        { date: '2024-01-07', count: 0 },
      ],
      recent_calls: [
        {
          call_id: 'call_123',
          from_number: '+1234567890',
          to_number: '+0987654321',
          duration: 180,
          status: 'completed',
          sentiment: 'positive',
          created_at: '2024-01-05T10:30:00Z'
        },
        {
          call_id: 'call_124',
          from_number: '+1234567891',
          to_number: '+0987654321',
          duration: 95,
          status: 'completed',
          sentiment: 'neutral',
          created_at: '2024-01-05T09:15:00Z'
        },
        {
          call_id: 'call_125',
          from_number: '+1234567892',
          to_number: '+0987654321',
          duration: 0,
          status: 'failed',
          sentiment: null,
          created_at: '2024-01-05T08:45:00Z'
        }
      ],
      sentiment_breakdown: {
        positive: 120,
        negative: 25,
        neutral: 100
      }
    }

    // In production, you would make actual API calls to Retell here:
    // const retellResponse = await fetch(`https://api.retellai.com/v1/calls`, {
    //   headers: {
    //     'Authorization': `Bearer ${decryptedApiKey}`,
    //     'Content-Type': 'application/json'
    //   }
    // })

    return new Response(
      JSON.stringify(mockAnalytics),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})