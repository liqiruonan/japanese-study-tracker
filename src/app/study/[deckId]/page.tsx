import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { StudySession } from './StudySession'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function StudyPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ deckId: string }>,
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { deckId } = await params;
  const sp = await searchParams;
  const mode = sp?.mode as string | undefined;

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: deck } = await supabase.from('decks').select('*').eq('id', deckId).single()
  if (!deck) return <div>Failed to load deck.</div>

  // OPTIMIZATION FOR LARGE DECKS
  // 1. Get all user_cards for this deck to know what needs review
  const { data: userCards } = await supabase
    .from('user_cards')
    .select('card_id, next_review, updated_at, repetitions, ease_factor')
    .eq('deck_id', deckId)
    .eq('user_id', user.id)

  const now = new Date()
  let reviewCardIds: string[] = []

  if (mode === 'yesterday') {
    const yesterdayStart = new Date();
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0,0,0,0);
    const yesterdayEnd = new Date(yesterdayStart);
    yesterdayEnd.setHours(23,59,59,999);

    reviewCardIds = (userCards || [])
      .filter(uc => {
        const d = new Date(uc.updated_at);
        const isYesterday = d >= yesterdayStart && d <= yesterdayEnd;
        const isMistake = uc.repetitions === 0 || uc.ease_factor < 2.5;
        return isYesterday && isMistake;
      })
      .map(uc => uc.card_id);
  } else if (mode === '2days') {
    const twoDaysStart = new Date();
    twoDaysStart.setDate(twoDaysStart.getDate() - 2);
    twoDaysStart.setHours(0,0,0,0);
    const twoDaysEnd = new Date(twoDaysStart);
    twoDaysEnd.setHours(23,59,59,999);

    reviewCardIds = (userCards || [])
      .filter(uc => {
        const d = new Date(uc.updated_at);
        const is2Days = d >= twoDaysStart && d <= twoDaysEnd;
        const isMistake = uc.repetitions === 0 || uc.ease_factor < 2.5;
        return is2Days && isMistake;
      })
      .map(uc => uc.card_id);
  } else {
    // Standard mode
    reviewCardIds = (userCards || [])
      .filter(uc => new Date(uc.next_review) <= now)
      .map(uc => uc.card_id)
  }

  const learnedCardIds = new Set((userCards || []).map(uc => uc.card_id))

  // 2. We only want to study ~50 cards per session to avoid overwhelming the browser
  const MAX_CARDS_PER_SESSION = 50
  
  let finalCardIdsToFetch: string[] = []

  // Prioritize reviews
  if (reviewCardIds.length > 0) {
    // Shuffle and pick up to MAX_CARDS_PER_SESSION
    finalCardIdsToFetch = reviewCardIds.sort(() => Math.random() - 0.5).slice(0, MAX_CARDS_PER_SESSION)
  }

  // 3. If we need more cards (not enough reviews), fetch some new unlearned cards
  // Only do this in standard mode, not when specifically reviewing past mistakes
  let newCardsData: any[] = []
  if (!mode && finalCardIdsToFetch.length < MAX_CARDS_PER_SESSION) {
    const neededNew = MAX_CARDS_PER_SESSION - finalCardIdsToFetch.length
    
    // To get random new cards efficiently from potentially 4000 cards:
    // We fetch a batch, filter out learned ones, take what we need
    const { data: randomCards } = await supabase
      .from('cards')
      .select('id, front, reading, meaning, part_of_speech, example_sentence, example_translation')
      .eq('deck_id', deckId)
      .limit(neededNew * 3) // fetch extra just in case many are already learned

    if (randomCards) {
      newCardsData = randomCards
        .filter(c => !learnedCardIds.has(c.id))
        .slice(0, neededNew)
    }
  }

  // 4. Fetch the full card data for the review cards we selected
  let reviewCardsData: any[] = []
  if (finalCardIdsToFetch.length > 0) {
    const { data } = await supabase
      .from('cards')
      .select('id, front, reading, meaning, part_of_speech, example_sentence, example_translation')
      .in('id', finalCardIdsToFetch)
    if (data) reviewCardsData = data
  }

  // Combine and shuffle
  const sessionCards = [...reviewCardsData, ...newCardsData].sort(() => Math.random() - 0.5)

  // Also fetch distractors (other random meanings from the same deck) for multiple choice mode
  let distractors: string[] = []
  if (sessionCards.length > 0) {
    const { data: randomMeanings } = await supabase
      .from('cards')
      .select('meaning')
      .eq('deck_id', deckId)
      .limit(100)
    
    if (randomMeanings) {
      distractors = Array.from(new Set(randomMeanings.map(m => m.meaning)))
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl space-y-8 min-h-screen flex flex-col">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Studying: {deck.title}</h1>
        <Link href={`/decks/${deckId}`} className="text-sm text-muted-foreground hover:underline">
          Exit Study
        </Link>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {sessionCards.length > 0 ? (
          <StudySession cards={sessionCards} deckId={deckId} distractors={distractors} />
        ) : (
          <div className="text-center space-y-4">
            <h2 className="text-xl">You're all caught up! 🎉</h2>
            <p className="text-muted-foreground">
              {mode === 'yesterday' ? "You have no mistakes from yesterday to review!" 
               : mode === '2days' ? "You have no mistakes from two days ago to review!" 
               : "No more cards due for review in this deck today."}
            </p>
            <Link href="/decks">
              <Button className="mt-4">
                Back to Decks
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
