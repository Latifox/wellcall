import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Helper functions for data transformation
function mapRetellStatus(retellStatus: string): 'completed' | 'failed' | 'busy' | 'no-answer' {
  switch (retellStatus) {
    case 'ended':
    case 'completed':
      return 'completed'
    case 'failed':
    case 'error':
      return 'failed'
    case 'busy':
      return 'busy'
    case 'no-answer':
    case 'timeout':
      return 'no-answer'
    default:
      return 'failed'
  }
}

function mapRetellSentiment(retellSentiment: string): 'positive' | 'negative' | 'neutral' | null {
  if (!retellSentiment) return null
  
  const sentiment = retellSentiment.toLowerCase()
  if (sentiment.includes('positive')) return 'positive'
  if (sentiment.includes('negative')) return 'negative'
  return 'neutral'
}

function generateDailyCallsData(calls: any[]): Array<{date: string, count: number}> {
  const dailyData: { [key: string]: number } = {}
  const today = new Date()
  
  // Initialize last 7 days with 0 counts
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    dailyData[dateStr] = 0
  }
  
  // Count calls for each day
  calls.forEach((call: any) => {
    if (call.start_timestamp) {
      const callDate = new Date(call.start_timestamp)
      const dateStr = callDate.toISOString().split('T')[0]
      if (dailyData.hasOwnProperty(dateStr)) {
        dailyData[dateStr]++
      }
    }
  })
  
  return Object.entries(dailyData).map(([date, count]) => ({ date, count }))
}

function calculateSentimentBreakdown(calls: any[]): { positive: number, negative: number, neutral: number } {
  const breakdown = { positive: 0, negative: 0, neutral: 0 }
  
  calls.forEach((call: any) => {
    const sentiment = mapRetellSentiment(call.call_analysis?.user_sentiment)
    if (sentiment === 'positive') breakdown.positive++
    else if (sentiment === 'negative') breakdown.negative++
    else if (sentiment === 'neutral') breakdown.neutral++
  })
  
  return breakdown
}

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
    const decryptedApiKey = clientData.workspace_api_key // For now, assuming it's stored as plain text

    if (!decryptedApiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured for this workspace' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    try {
      // Fetch calls from Retell API
      const retellResponse = await fetch(`https://api.retellai.com/v2/list-calls`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${decryptedApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filter_criteria: {
            // Get calls from the last 30 days
            start_timestamp: Date.now() - (30 * 24 * 60 * 60 * 1000),
            end_timestamp: Date.now()
          },
          limit: 100,
          pagination_key: null
        })
      })

      if (!retellResponse.ok) {
        throw new Error(`Retell API error: ${retellResponse.status} ${retellResponse.statusText}`)
      }

      const retellData = await retellResponse.json()
      const calls = retellData.calls || []

      // Transform Retell API data to our expected format
      const transformedCalls = calls.map((call: any) => ({
        call_id: call.call_id,
        from_number: call.from_number || 'Unknown',
        to_number: call.to_number || 'Unknown',
        duration: Math.floor((call.duration_ms || 0) / 1000),
        status: mapRetellStatus(call.call_status),
        sentiment: mapRetellSentiment(call.call_analysis?.user_sentiment),
        created_at: new Date(call.start_timestamp || Date.now()).toISOString()
      }))

      // Calculate analytics from real data
      const totalCalls = calls.length
      const totalMinutes = calls.reduce((sum: number, call: any) => 
        sum + Math.floor((call.duration_ms || 0) / 60000), 0)
      
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      const callsThisMonth = calls.filter((call: any) => {
        const callDate = new Date(call.start_timestamp)
        return callDate.getMonth() === currentMonth && callDate.getFullYear() === currentYear
      }).length

      const answeredCalls = calls.filter((call: any) => 
        call.call_status === 'ended' || call.call_status === 'completed').length
      const missedCalls = totalCalls - answeredCalls

      // Generate daily calls data for the last 7 days
      const dailyCalls = generateDailyCallsData(calls)

      // Calculate sentiment breakdown
      const sentimentBreakdown = calculateSentimentBreakdown(calls)

      const analytics = {
        total_calls: totalCalls,
        total_minutes: totalMinutes,
        calls_this_month: callsThisMonth,
        answered_calls: answeredCalls,
        missed_calls: missedCalls,
        daily_calls: dailyCalls,
        recent_calls: transformedCalls.slice(0, 10), // Get most recent 10 calls
        sentiment_breakdown: sentimentBreakdown
      }

      return new Response(
        JSON.stringify(analytics),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (error) {
      console.error('Error fetching Retell data:', error)
      
      // Fallback to basic analytics if API fails
      const fallbackAnalytics = {
        total_calls: 0,
        total_minutes: 0,
        calls_this_month: 0,
        answered_calls: 0,
        missed_calls: 0,
        daily_calls: [],
        recent_calls: [],
        sentiment_breakdown: {
          positive: 0,
          negative: 0,
          neutral: 0
        }
      }

      return new Response(
        JSON.stringify(fallbackAnalytics),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})