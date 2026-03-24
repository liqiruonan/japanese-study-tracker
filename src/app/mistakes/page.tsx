import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function MistakesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch cards where ease_factor is very low (< 2.0) or it's currently marked as Hard (interval <= 1 and reps > 0)
  const { data: userCards } = await supabase
    .from('user_cards')
    .select(`
      id,
      ease_factor,
      interval,
      repetitions,
      next_review,
      deck_id,
      card:cards (
        id,
        front,
        reading,
        meaning,
        part_of_speech
      )
    `)
    .eq('user_id', user.id)
    .or('ease_factor.lt.2.1,interval.lte.1')
    .gt('repetitions', 0) // exclude brand new cards
    .order('next_review', { ascending: true })

  // Deduplicate and flatten the data
  const mistakes = userCards?.map(uc => ({
    user_card_id: uc.id,
    deck_id: uc.deck_id,
    ease: uc.ease_factor,
    ...(uc.card as any)
  })) || []

  return (
    <div className="container mx-auto p-4 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Mistakes Book (错题本)</h1>
          <p className="text-muted-foreground mt-2">
            These are cards you frequently answer incorrectly or find hard.
          </p>
        </div>
      </div>

      {mistakes.length === 0 ? (
        <Card className="bg-muted/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <h2 className="text-xl font-medium mb-2">You have no mistakes yet!</h2>
            <p className="text-muted-foreground">Keep studying your decks.</p>
            <Link href="/decks">
              <Button className="mt-4">Go to Decks</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mistakes.map((card, idx) => (
            <Card key={`${card.id}-${idx}`} className="border-red-200/50 dark:border-red-900/50">
              <CardContent className="p-4 flex flex-col h-full">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{card.front}</span>
                  </div>
                  <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-1 rounded">
                    Ease: {card.ease.toFixed(2)}
                  </span>
                </div>
                {card.reading && <div className="text-sm text-muted-foreground mb-2">【{card.reading}】</div>}
                <div className="text-base font-medium mt-auto pt-2 border-t">{card.meaning}</div>
                
                <Link href={`/study/${card.deck_id}`} className="mt-4 w-full">
                  <Button variant="outline" size="sm" className="w-full">
                    Study this Deck
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
