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
