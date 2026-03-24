'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function searchUsers(query: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !query) return []

  const { data } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .ilike('username', `%${query}%`)
    .neq('id', user.id)
    .limit(10)
  
  return data || []
}

export async function sendFriendRequest(friendId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('friendships')
    .insert({ user_id: user.id, friend_id: friendId, status: 'pending' })

  if (error) throw error
  revalidatePath('/friends')
}

export async function acceptFriendRequest(friendshipId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId)

  if (error) throw error
  revalidatePath('/friends')
}

export async function removeFriend(friendshipId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId)

  if (error) throw error
  revalidatePath('/friends')
}
