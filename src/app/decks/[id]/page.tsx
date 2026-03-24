import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CSVUpload } from './CSVUpload'
import { addCard } from './actions'
import Link from 'next/link'

export default async function DeckDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: deck } = await supabase.from('decks').select('*').eq('id', id).single()
  if (!deck) return <div>Deck not found</div>

  // Optimize for large decks: get total count, but only fetch first 50 for preview
  const { count: totalCards } = await supabase
    .from('cards')
    .select('*', { count: 'exact', head: true })
    .eq('deck_id', id)

  const { data: cards } = await supabase
    .from('cards')
    .select('*')
    .eq('deck_id', id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="container mx-auto p-4 space-y-8">
      <div className="flex items-center gap-4 mb-4">
        <Link href="/decks" className="text-sm text-muted-foreground hover:underline">&larr; Back to Decks</Link>
      </div>

      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">{deck.title}</h1>
          <p className="text-muted-foreground">{deck.description}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/decks/${id}/edit`}>
            <Button variant="outline">Edit Deck</Button>
          </Link>
          <Link href={`/study/${id}`}>
            <Button size="lg" className="font-bold">Study Now</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add Single Card</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={async (formData) => {
                'use server'
                await addCard(id, formData)
              }} className="space-y-3">
                <Input name="front" placeholder="Front (Kanji/Word)" required />
                <Input name="reading" placeholder="Reading (Kana)" />
                <Input name="meaning" placeholder="Meaning" required />
                <Input name="part_of_speech" placeholder="Part of Speech (e.g. Noun)" />
                <Input name="example_sentence" placeholder="Example Sentence" />
                <Input name="example_translation" placeholder="Example Translation" />
                <Button type="submit" className="w-full">Add Card</Button>
              </form>
            </CardContent>
          </Card>

          <CSVUpload deckId={id} />
        </div>

        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Cards List</h2>
            <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
              Total: {totalCards || 0}
            </span>
          </div>
          
          {totalCards && totalCards > 50 && (
             <p className="text-xs text-muted-foreground">Showing the 50 most recently added cards.</p>
          )}

          <div className="grid gap-3">
            {cards?.map(card => (
              <Card key={card.id}>
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold">{card.front}</span>
                      {card.reading && <span className="text-sm text-muted-foreground">【{card.reading}】</span>}
                    </div>
                    <div className="text-sm">{card.meaning}</div>
                    {card.example_sentence && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <p>{card.example_sentence}</p>
                        <p>{card.example_translation}</p>
                      </div>
                    )}
                  </div>
                  <div className="text-xs px-2 py-1 bg-muted rounded">
                    {card.part_of_speech || 'N/A'}
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!cards || cards.length === 0) && (
              <p className="text-muted-foreground text-sm">No cards in this deck yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
