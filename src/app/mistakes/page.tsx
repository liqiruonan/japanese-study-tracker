import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function MistakesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const params = await searchParams;
  const currentTab = params?.tab === 'vague' ? 'vague' : 'hard'

  // Fetch cards based on tab
  // "不会" (hard): repetitions = 0 (reset due to failure) or very low ease
  // "模糊" (vague): repetitions > 0 but ease factor is below normal (2.5)
  
  let query = supabase
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

  if (currentTab === 'hard') {
    query = query.eq('repetitions', 0)
  } else {
    query = query.gt('repetitions', 0).lt('ease_factor', 2.5)
  }

  const { data: userCards } = await query.order('next_review', { ascending: true })

  // Deduplicate and flatten the data
  const mistakes = userCards?.map(uc => ({
    user_card_id: uc.id,
    deck_id: uc.deck_id,
    ease: uc.ease_factor,
    reps: uc.repetitions,
    ...(uc.card as any)
  })) || []

  return (
    <div className="container mx-auto p-4 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Mistakes Book (错题本)</h1>
          <p className="text-muted-foreground mt-2">
            Review the words you found difficult.
          </p>
        </div>
      </div>

      <div className="flex space-x-2 border-b">
        <Link href="/mistakes?tab=hard" className={`px-4 py-2 font-medium ${currentTab === 'hard' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}>
          不会 (Don't Know)
        </Link>
        <Link href="/mistakes?tab=vague" className={`px-4 py-2 font-medium ${currentTab === 'vague' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}>
          模糊 (Vague)
        </Link>
      </div>

      {mistakes.length === 0 ? (
        <Card className="bg-muted/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <h2 className="text-xl font-medium mb-2">You have no mistakes in this category!</h2>
            <p className="text-muted-foreground">Keep studying your decks.</p>
            <Link href="/decks">
              <Button className="mt-4">Go to Decks</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mistakes.map((card, idx) => (
            <Card key={`${card.id}-${idx}`} className={`border-l-4 ${currentTab === 'hard' ? 'border-red-500' : 'border-yellow-500'}`}>
              <CardContent className="p-4 flex flex-col h-full">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{card.front}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${currentTab === 'hard' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    Ease: {card.ease.toFixed(2)} | Reps: {card.reps}
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
