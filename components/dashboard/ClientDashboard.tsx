'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from './DashboardLayout'
import MetricCard from './MetricCard'
import CallsChart from './CallsChart'
import SentimentChart from './SentimentChart'
import RecentCallsTable from './RecentCallsTable'
import { DashboardAnalytics } from '@/lib/types/database'
import { createClient } from '@/lib/supabase/client'
import { Phone, Clock, TrendingUp, AlertCircle } from 'lucide-react'

interface ClientDashboardProps {
  user: any
}

export default function ClientDashboard({ user }: ClientDashboardProps) {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        setError('Not authenticated')
        return
      }

      const response = await supabase.functions.invoke('get-client-analytics', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (response.error) {
        throw new Error(response.error.message)
      }

      setAnalytics(response.data)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout user={user} title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout user={user} title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <p className="text-red-600">{error}</p>
            <button 
              onClick={fetchAnalytics}
              className="mt-2 text-blue-600 hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!analytics) {
    return (
      <DashboardLayout user={user} title="Dashboard">
        <div className="text-center py-8">
          <p className="text-muted-foreground">No analytics data available</p>
        </div>
      </DashboardLayout>
    )
  }

  const answerRate = analytics.total_calls > 0 
    ? ((analytics.answered_calls / analytics.total_calls) * 100).toFixed(1)
    : '0'

  return (
    <DashboardLayout user={user} title="Dashboard">
      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Calls"
            value={analytics.total_calls.toLocaleString()}
            change={`${analytics.calls_this_month} this month`}
            changeType="neutral"
            icon={Phone}
            description="All time call volume"
          />
          <MetricCard
            title="Total Minutes"
            value={analytics.total_minutes.toLocaleString()}
            change={`${Math.round(analytics.total_minutes / analytics.total_calls || 0)} avg per call`}
            changeType="neutral"
            icon={Clock}
            description="Total talk time"
          />
          <MetricCard
            title="Answer Rate"
            value={`${answerRate}%`}
            change={`${analytics.answered_calls} answered`}
            changeType={parseFloat(answerRate) > 80 ? 'positive' : parseFloat(answerRate) > 60 ? 'neutral' : 'negative'}
            icon={TrendingUp}
            description="Calls successfully connected"
          />
          <MetricCard
            title="Missed Calls"
            value={analytics.missed_calls.toString()}
            change={`${((analytics.missed_calls / analytics.total_calls) * 100).toFixed(1)}% miss rate`}
            changeType={analytics.missed_calls > analytics.answered_calls ? 'negative' : 'positive'}
            icon={AlertCircle}
            description="Unanswered calls"
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 md:grid-cols-2">
          <CallsChart 
            data={analytics.daily_calls}
            title="Daily Call Volume"
            description="Number of calls per day over the last week"
          />
          <SentimentChart 
            data={analytics.sentiment_breakdown}
            title="Call Sentiment Analysis"
            description="Distribution of call sentiments"
          />
        </div>

        {/* Recent Calls Table */}
        <RecentCallsTable 
          calls={analytics.recent_calls}
          title="Recent Calls"
          description="Latest call activity and outcomes"
        />
      </div>
    </DashboardLayout>
  )
}