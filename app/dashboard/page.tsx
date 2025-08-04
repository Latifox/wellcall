import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import ClientDashboard from '@/components/dashboard/ClientDashboard'
import AdminDashboard from '@/components/dashboard/AdminDashboard'

export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Route based on user role
  if (user.role === 'admin') {
    return <AdminDashboard user={user} />
  } else {
    return <ClientDashboard user={user} />
  }
}