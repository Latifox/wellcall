import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { RetellCallData } from '@/lib/types/database'
import { formatDistanceToNow } from 'date-fns'

interface RecentCallsTableProps {
  calls: RetellCallData[]
  title?: string
  description?: string
}

export default function RecentCallsTable({ 
  calls, 
  title = "Recent Calls", 
  description = "Latest call activity" 
}: RecentCallsTableProps) {
  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      failed: 'destructive',
      busy: 'secondary',
      'no-answer': 'outline'
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    )
  }

  const getSentimentBadge = (sentiment: string | null) => {
    if (!sentiment) return null

    const variants = {
      positive: 'default',
      negative: 'destructive',
      neutral: 'secondary'
    } as const

    const colors = {
      positive: 'bg-green-100 text-green-800',
      negative: 'bg-red-100 text-red-800',
      neutral: 'bg-gray-100 text-gray-800'
    } as const

    return (
      <Badge className={colors[sentiment as keyof typeof colors]}>
        {sentiment}
      </Badge>
    )
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sentiment</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {calls.map((call) => (
              <TableRow key={call.call_id}>
                <TableCell className="font-medium">
                  {call.from_number}
                </TableCell>
                <TableCell>{call.to_number}</TableCell>
                <TableCell>
                  {call.duration > 0 ? formatDuration(call.duration) : '-'}
                </TableCell>
                <TableCell>
                  {getStatusBadge(call.status)}
                </TableCell>
                <TableCell>
                  {getSentimentBadge(call.sentiment)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {calls.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No recent calls found
          </div>
        )}
      </CardContent>
    </Card>
  )
}