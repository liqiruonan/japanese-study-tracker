'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

function calculateSM2(quality: number, repetitions: number, easeFactor: number, interval: number) {
  let newRepetitions = repetitions;
  let newInterval = interval;
  let newEaseFactor = easeFactor;

  if (quality >= 3) {
    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }
    newRepetitions += 1;
  } else {
    newRepetitions = 0;
    newInterval = 1;
  }

  newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEaseFactor < 1.3) newEaseFactor = 1.3;

  return { newRepetitions, newInterval, newEaseFactor };
}

export async function submitReview(cardId: string, deckId: string, quality: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: userCard } = await supabase
    .from('user_cards')
    .select('*')
    .eq('user_id', user.id)
    .eq('card_id', cardId)
    .single()

  const currentReps = userCard?.repetitions || 0;
  const currentEase = userCard?.ease_factor || 2.5;
  const currentInt = userCard?.interval || 0;

  const { newRepetitions, newInterval, newEaseFactor } = calculateSM2(quality, currentReps, currentEase, currentInt);

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);

  if (userCard) {
    await supabase
      .from('user_cards')
      .update({
        repetitions: newRepetitions,
        interval: newInterval,
        ease_factor: newEaseFactor,
        next_review: nextReview.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userCard.id)
  } else {
    await supabase
      .from('user_cards')
      .insert({
        user_id: user.id,
        card_id: cardId,
        deck_id: deckId,
        repetitions: newRepetitions,
        interval: newInterval,
        ease_factor: newEaseFactor,
        next_review: nextReview.toISOString()
      })
  }

  // Removed revalidatePath to allow for lightning fast optimistic UI updates on the client.
}

export async function saveStudySession(durationMinutes: number, cardsReviewed: number, sessionId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Prevent saving empty sessions with 0 minutes and 0 cards
  if (durationMinutes === 0 && cardsReviewed === 0) return null

  const endTime = new Date()
  const startTime = new Date(endTime.getTime() - durationMinutes * 60000)

  let finalSessionId = sessionId;

  if (sessionId) {
    await supabase
      .from('study_sessions')
      .update({
        end_time: endTime.toISOString(),
        duration_minutes: durationMinutes,
        cards_reviewed: cardsReviewed
      })
      .eq('id', sessionId)
  } else {
    const { data } = await supabase
      .from('study_sessions')
      .insert({
        user_id: user.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: durationMinutes,
        cards_reviewed: cardsReviewed
      })
      .select('id')
      .single()
    finalSessionId = data?.id;
  }

  revalidatePath('/')
  revalidatePath('/decks')
  
  return finalSessionId;
}

export async function autoSaveSession(durationMinutes: number, cardsReviewed: number, sessionId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  if (durationMinutes === 0 && cardsReviewed === 0) return null

  const endTime = new Date()
  const startTime = new Date(endTime.getTime() - durationMinutes * 60000)

  if (sessionId) {
    await supabase
      .from('study_sessions')
      .update({
        end_time: endTime.toISOString(),
        duration_minutes: durationMinutes,
        cards_reviewed: cardsReviewed
      })
      .eq('id', sessionId)
    return sessionId
  } else {
    const { data } = await supabase
      .from('study_sessions')
      .insert({
        user_id: user.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: durationMinutes,
        cards_reviewed: cardsReviewed
      })
      .select('id')
      .single()
    return data?.id
  }
}
