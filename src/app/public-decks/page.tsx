import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { CloneButton } from './CloneButton'
import { BookOpen } from 'lucide-react'

export default async function PublicDecksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch all public decks, along with the author's username
  const { data: publicDecks } = await supabase
    .from('decks')
    .select(`
      *,
      profiles:user_id (username)
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Public Decks</h1>
      </div>
      
      <p className="text-muted-foreground">
        Browse and import decks shared by other users into your own collection.
      </p>

      {publicDecks?.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <p>No public decks found. You can be the first to share one!</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {publicDecks?.map((deck) => (
            <Card key={deck.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-primary" />
                      {deck.title}
                    </CardTitle>
                    <CardDescription>
                      Shared by {(deck.profiles as any)?.username || 'Unknown User'}
                    </CardDescription>
                  </div>
                  <span className="text-xs px-2 py-1 bg-muted rounded-full uppercase tracking-wider">
                    {deck.type}
                  </span>
                </div>
              </CardHeader>
              <div className="px-6 pb-4 flex-grow text-sm">
                {deck.description || 'No description provided.'}
              </div>
              <CardFooter className="pt-4 border-t">
                <CloneButton deckId={deck.id} />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
