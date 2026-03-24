'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createDeck(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const type = formData.get('type') as string // 'vocabulary' | 'grammar'

  const { error } = await supabase
    .from('decks')
    .insert({ user_id: user.id, title, description, type })

  if (error) throw error
  revalidatePath('/decks')
}

export async function updateDeck(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const title = formData.get('title') as string
  const description = formData.get('description') as string

  const { error } = await supabase
    .from('decks')
    .update({ title, description })
    .eq('id', id)
    .eq('user_id', user.id) // Security check

  if (error) throw error
  revalidatePath('/decks')
  revalidatePath(`/decks/${id}`)
}

export async function deleteDeck(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('decks')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id) // Security check

  if (error) throw error
  revalidatePath('/decks')
}
