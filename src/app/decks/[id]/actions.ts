'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addCard(deckId: string, formData: FormData) {
  const supabase = await createClient()
  const front = formData.get('front') as string
  const reading = formData.get('reading') as string
  const meaning = formData.get('meaning') as string
  const part_of_speech = formData.get('part_of_speech') as string
  const example_sentence = formData.get('example_sentence') as string
  const example_translation = formData.get('example_translation') as string

  const { error } = await supabase
    .from('cards')
    .insert({
      deck_id: deckId,
      front, reading, meaning, part_of_speech, example_sentence, example_translation
    })

  if (error) throw error
  revalidatePath(`/decks/${deckId}`)
}

export async function addCardsBulk(deckId: string, cards: any[]) {
  const supabase = await createClient()
  
  const formattedCards = cards.map(c => ({
    deck_id: deckId,
    front: c.front || c.Front || c.word,
    reading: c.reading || c.Reading || c.kana,
    meaning: c.meaning || c.Meaning,
    part_of_speech: c.part_of_speech || c.PartOfSpeech,
    example_sentence: c.example_sentence || c.ExampleSentence,
    example_translation: c.example_translation || c.ExampleTranslation
  })).filter(c => c.front && c.meaning) // Basic validation

  if (formattedCards.length === 0) throw new Error('No valid cards found in the CSV')

  const { error } = await supabase.from('cards').insert(formattedCards)
  if (error) {
    console.error("Supabase insert error:", error)
    throw new Error(`Database error: ${error.message || 'Failed to insert cards'}`)
  }
  
  revalidatePath(`/decks/${deckId}`)
  return { success: true }
}

export async function updateCard(deckId: string, cardId: string, formData: FormData) {
  const supabase = await createClient()
  const front = formData.get('front') as string
  const reading = formData.get('reading') as string
  const meaning = formData.get('meaning') as string
  const part_of_speech = formData.get('part_of_speech') as string
  const example_sentence = formData.get('example_sentence') as string
  const example_translation = formData.get('example_translation') as string

  const { error } = await supabase
    .from('cards')
    .update({
      front, reading, meaning, part_of_speech, example_sentence, example_translation
    })
    .eq('id', cardId)
    .eq('deck_id', deckId) // Extra safety to ensure card belongs to deck

  if (error) throw error
  revalidatePath(`/decks/${deckId}`)
}

export async function deleteCard(deckId: string, cardId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('cards')
    .delete()
    .eq('id', cardId)
    .eq('deck_id', deckId) // Extra safety

  if (error) throw error
  revalidatePath(`/decks/${deckId}`)
}
