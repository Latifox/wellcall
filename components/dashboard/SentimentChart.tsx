'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

interface SentimentChartProps {
  data: {
    positive: number
    negative: number
    neutral: number
  }
  title?: string
  description?: string
}

export default function SentimentChart({ 
  data, 
  title = "Call Sentiment Analysis", 
  description = "Distribution of call sentiments" 
}: SentimentChartProps) {
  const chartData = [
    { name: 'Positive', value: data.positive, color: '#10b981' },
    { name: 'Neutral', value: data.neutral, color: '#6b7280' },
    { name: 'Negative', value: data.negative, color: '#ef4444' },
  ]

  const chartConfig = {
    positive: {
      label: "Positive",
      color: "#10b981",
    },
    neutral: {
      label: "Neutral", 
      color: "#6b7280",
    },
    negative: {
      label: "Negative",
      color: "#ef4444",
    },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        </ChartContainer>
        <div className="flex justify-center mt-4 space-x-4">
          {chartData.map((entry) => (
            <div key={entry.name} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-muted-foreground">
                {entry.name}: {entry.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}