'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'

interface CallsChartProps {
  data: Array<{ date: string; count: number }>
  title?: string
  description?: string
}

export default function CallsChart({ 
  data, 
  title = "Daily Calls", 
  description = "Number of calls per day over the last week" 
}: CallsChartProps) {
  const chartConfig = {
    count: {
      label: "Calls",
      color: "hsl(var(--primary))",
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
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis />
            <ChartTooltip 
              content={
                <ChartTooltipContent 
                  labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                />
              } 
            />
            <Line 
              type="monotone" 
              dataKey="count" 
              stroke="var(--color-count)" 
              strokeWidth={2}
              dot={{ fill: "var(--color-count)" }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}