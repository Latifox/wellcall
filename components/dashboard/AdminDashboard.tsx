'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from './DashboardLayout'
import MetricCard from './MetricCard'
import CallsChart from './CallsChart'
import SentimentChart from './SentimentChart'
import RecentCallsTable from './RecentCallsTable'
import ClientsTable from './ClientsTable'
import { AdminAnalytics } from '@/lib/types/database'
import { createClient } from '@/lib/supabase/client'
import { Phone, Clock, Users, DollarSign, AlertCircle } from 'lucide-react'

interface AdminDashboardProps {
  user: any
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null)
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

      const response = await supabase.functions.invoke('get-admin-analytics', {
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
      <DashboardLayout user={user} title="Admin Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading admin analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout user={user} title="Admin Dashboard">
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
      <DashboardLayout user={user} title="Admin Dashboard">
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
    <DashboardLayout user={user} title="Admin Dashboard">
      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <MetricCard
            title="Total Clients"
            value={analytics.total_clients.toString()}
            change={`${analytics.active_clients} active`}
            changeType="positive"
            icon={Users}
            description="Registered clients"
          />
          <MetricCard
            title="Total Calls"
            value={analytics.total_calls.toLocaleString()}
            change={`${analytics.calls_this_month} this month`}
            changeType="neutral"
            icon={Phone}
            description="All client calls"
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
            title="Monthly Revenue"
            value={`$${analytics.monthly_revenue.toLocaleString()}`}
            change="Current month"
            changeType="positive"
            icon={DollarSign}
            description="Revenue this month"
          />
          <MetricCard
            title="Answer Rate"
            value={`${answerRate}%`}
            change={`${analytics.answered_calls} answered`}
            changeType={parseFloat(answerRate) > 80 ? 'positive' : parseFloat(answerRate) > 60 ? 'neutral' : 'negative'}
            icon={Phone}
            description="Overall success rate"
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 md:grid-cols-2">
          <CallsChart 
            data={analytics.daily_calls}
            title="Daily Call Volume (All Clients)"
            description="Aggregated calls per day across all clients"
          />
          <SentimentChart 
            data={analytics.sentiment_breakdown}
            title="Overall Sentiment Analysis"
            description="Sentiment distribution across all clients"
          />
        </div>

        {/* Client Performance Table */}
        <ClientsTable 
          clients={analytics.client_breakdown}
          title="Client Performance"
          description="Usage and performance metrics by client"
        />

        {/* Recent Calls Table */}
        <RecentCallsTable 
          calls={analytics.recent_calls}
          title="Recent Calls (All Clients)"
          description="Latest call activity across the platform"
        />
      </div>
    </DashboardLayout>
  )
}