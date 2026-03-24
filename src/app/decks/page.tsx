import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createDeck } from './actions'

export default async function DecksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: decks } = await supabase
    .from('decks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="container mx-auto p-4 space-y-8">
      <h1 className="text-3xl font-bold">My Decks</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Deck</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createDeck} className="space-y-4">
                <Input name="title" placeholder="Deck Title" required />
                <Input name="description" placeholder="Description (Optional)" />
                <select name="type" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="vocabulary">Vocabulary</option>
                  <option value="grammar">Grammar</option>
                </select>
                <Button type="submit">Create</Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {decks?.map(deck => (
            <Card key={deck.id}>
              <CardHeader>
                <CardTitle>
                  <Link href={`/decks/${deck.id}`} className="hover:underline">
                    {deck.title}
                  </Link>
                </CardTitle>
                <p className="text-sm text-muted-foreground">{deck.type} - {deck.description}</p>
              </CardHeader>
            </Card>
          ))}
          {(!decks || decks.length === 0) && (
            <p className="text-muted-foreground">No decks found. Create one to get started!</p>
          )}
        </div>
      </div>
    </div>
  )
}
