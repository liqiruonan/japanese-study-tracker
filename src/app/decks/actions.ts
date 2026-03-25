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
  const is_public = formData.get('is_public') === 'on'

  const { error } = await supabase
    .from('decks')
    .update({ title, description, is_public })
    .eq('id', id)
    .eq('user_id', user.id) // Security check

  if (error) throw error
  revalidatePath('/decks')
  revalidatePath(`/decks/${id}`)
}

export async function clonePublicDeck(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get the public deck
  const { data: deck, error: deckError } = await supabase
    .from('decks')
    .select('*')
    .eq('id', id)
    .eq('is_public', true)
    .single()

  if (deckError || !deck) throw new Error('Public deck not found')

  // Create a new deck for the current user
  const { data: newDeck, error: newDeckError } = await supabase
    .from('decks')
    .insert({
      user_id: user.id,
      title: `${deck.title} (Clone)`,
      description: deck.description,
      type: deck.type,
      is_public: false
    })
    .select()
    .single()

  if (newDeckError || !newDeck) throw new Error('Failed to create cloned deck')

  // Get all cards from the public deck
  // Important: Because of Supabase limits, we should ideally page this or just grab a chunk, 
  // but let's grab up to 5000 cards at once.
  const { data: cards, error: cardsError } = await supabase
    .from('cards')
    .select('front, reading, meaning, part_of_speech, example_sentence, example_translation')
    .eq('deck_id', id)
    .limit(5000)

  if (cardsError) throw new Error('Failed to fetch cards')

  if (cards && cards.length > 0) {
    // Insert cards into the new deck
    const newCards = cards.map(card => ({
      ...card,
      deck_id: newDeck.id
    }))

    const { error: insertCardsError } = await supabase
      .from('cards')
      .insert(newCards)

    if (insertCardsError) throw new Error('Failed to clone cards')
  }

  revalidatePath('/decks')
  revalidatePath('/public-decks')
  return newDeck.id
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
