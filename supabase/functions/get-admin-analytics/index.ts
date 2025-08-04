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

async function fetchClientCalls(apiKey: string): Promise<any[]> {
  try {
    const retellResponse = await fetch(`https://api.retellai.com/v2/list-calls`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
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
      console.error(`Retell API error for client: ${retellResponse.status} ${retellResponse.statusText}`)
      return []
    }

    const retellData = await retellResponse.json()
    return retellData.calls || []
  } catch (error) {
    console.error('Error fetching client calls:', error)
    return []
  }
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

    // Get all clients with their API keys
    const { data: clients, error: clientsError } = await supabaseClient
      .from('clients')
      .select('id, company_name, plan, workspace_id, workspace_api_key')

    if (clientsError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch clients' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get usage cache data for revenue calculation
    const { data: usageData, error: usageError } = await supabaseClient
      .from('usage_cache')
      .select('*')

    if (usageError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch usage data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    try {
      // Fetch calls from all clients' Retell workspaces
      const allCallsPromises = clients
        .filter(client => client.workspace_api_key) // Only clients with API keys
        .map(client => fetchClientCalls(client.workspace_api_key))

      const allCallsResults = await Promise.all(allCallsPromises)
      const allCalls = allCallsResults.flat()

      // Transform calls to our format
      const transformedCalls = allCalls.map((call: any) => ({
        call_id: call.call_id,
        from_number: call.from_number || 'Unknown',
        to_number: call.to_number || 'Unknown',
        duration: Math.floor((call.duration_ms || 0) / 1000),
        status: mapRetellStatus(call.call_status),
        sentiment: mapRetellSentiment(call.call_analysis?.user_sentiment),
        created_at: new Date(call.start_timestamp || Date.now()).toISOString()
      }))

      // Calculate aggregated analytics from real data
      const totalCalls = allCalls.length
      const totalMinutes = allCalls.reduce((sum: number, call: any) => 
        sum + Math.floor((call.duration_ms || 0) / 60000), 0)

      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      const callsThisMonth = allCalls.filter((call: any) => {
        const callDate = new Date(call.start_timestamp)
        return callDate.getMonth() === currentMonth && callDate.getFullYear() === currentYear
      }).length

      const answeredCalls = allCalls.filter((call: any) => 
        call.call_status === 'ended' || call.call_status === 'completed').length
      const missedCalls = totalCalls - answeredCalls

      // Calculate monthly revenue from usage cache
      const monthlyRevenue = usageData
        .filter(usage => usage.month === `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`)
        .reduce((sum, usage) => sum + parseFloat(usage.revenue || '0'), 0)

      // Create client breakdown with real call data
      const clientBreakdown = clients.map(client => {
        const clientCalls = allCallsResults[clients.findIndex(c => c.id === client.id)] || []
        const clientCallsCount = clientCalls.length
        const clientMinutes = clientCalls.reduce((sum: number, call: any) => 
          sum + Math.floor((call.duration_ms || 0) / 60000), 0)
        
        return {
          client_id: client.id,
          company_name: client.company_name,
          calls_count: clientCallsCount,
          minutes_used: clientMinutes,
          plan: client.plan
        }
      })

      // Generate daily calls data and sentiment breakdown
      const dailyCalls = generateDailyCallsData(allCalls)
      const sentimentBreakdown = calculateSentimentBreakdown(allCalls)

      const adminAnalytics = {
        total_calls: totalCalls,
        total_minutes: totalMinutes,
        calls_this_month: callsThisMonth,
        answered_calls: answeredCalls,
        missed_calls: missedCalls,
        total_clients: clients.length,
        active_clients: clients.filter(client => client.workspace_api_key).length,
        monthly_revenue: monthlyRevenue,
        daily_calls: dailyCalls,
        recent_calls: transformedCalls
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10), // Get most recent 10 calls
        sentiment_breakdown: sentimentBreakdown,
        client_breakdown: clientBreakdown
      }

      return new Response(
        JSON.stringify(adminAnalytics),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (error) {
      console.error('Error fetching admin analytics:', error)
      
      // Fallback to basic analytics with usage cache data if API fails
      const totalCalls = usageData.reduce((sum, usage) => sum + usage.calls_count, 0)
      const totalMinutes = usageData.reduce((sum, usage) => sum + usage.minutes_used, 0)
      const monthlyRevenue = usageData
        .filter(usage => usage.month === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`)
        .reduce((sum, usage) => sum + parseFloat(usage.revenue || '0'), 0)

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

      const fallbackAnalytics = {
        total_calls: totalCalls,
        total_minutes: totalMinutes,
        calls_this_month: Math.floor(totalCalls * 0.3), // Estimate 30% of calls this month
        answered_calls: Math.floor(totalCalls * 0.8), // Estimate 80% answered
        missed_calls: Math.floor(totalCalls * 0.2), // Estimate 20% missed
        total_clients: clients.length,
        active_clients: clients.filter(client => client.workspace_api_key).length,
        monthly_revenue: monthlyRevenue,
        daily_calls: [],
        recent_calls: [],
        sentiment_breakdown: {
          positive: 0,
          negative: 0,
          neutral: 0
        },
        client_breakdown: clientBreakdown
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