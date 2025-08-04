import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface Client {
  client_id: string
  company_name: string
  calls_count: number
  minutes_used: number
  plan: string
}

interface ClientsTableProps {
  clients: Client[]
  title?: string
  description?: string
}

export default function ClientsTable({ 
  clients, 
  title = "Clients", 
  description = "Client usage overview" 
}: ClientsTableProps) {
  const getPlanBadge = (plan: string) => {
    const variants = {
      starter: 'secondary',
      pro: 'default',
      enterprise: 'outline'
    } as const

    const colors = {
      starter: 'bg-gray-100 text-gray-800',
      pro: 'bg-blue-100 text-blue-800',
      enterprise: 'bg-purple-100 text-purple-800'
    } as const

    return (
      <Badge className={colors[plan as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {plan.charAt(0).toUpperCase() + plan.slice(1)}
      </Badge>
    )
  }

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`
    }
    return `${minutes}m`
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
              <TableHead>Company</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead className="text-right">Total Calls</TableHead>
              <TableHead className="text-right">Minutes Used</TableHead>
              <TableHead className="text-right">Avg Call Duration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.client_id}>
                <TableCell className="font-medium">
                  {client.company_name}
                </TableCell>
                <TableCell>
                  {getPlanBadge(client.plan)}
                </TableCell>
                <TableCell className="text-right">
                  {client.calls_count.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {formatMinutes(client.minutes_used)}
                </TableCell>
                <TableCell className="text-right">
                  {client.calls_count > 0 
                    ? `${Math.round(client.minutes_used / client.calls_count)}m`
                    : '-'
                  }
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {clients.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No clients found
          </div>
        )}
      </CardContent>
    </Card>
  )
}