import { createClient } from '@/lib/supabase/server'
import { User } from '@/lib/types/database'

export async function getCurrentUser() {
  const supabase = createClient()
  
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return null
  }

  // Get user data with role and client info
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select(`
      *,
      clients (
        id,
        company_name,
        plan
      )
    `)
    .eq('auth_user_id', user.id)
    .single()

  if (userError || !userData) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    ...userData,
  }
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
}