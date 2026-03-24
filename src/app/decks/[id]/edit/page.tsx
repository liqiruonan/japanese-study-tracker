import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { updateDeck, deleteDeck } from '../../actions'

export default async function EditDeckPage({
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
  
  if (!deck || deck.user_id !== user.id) {
    redirect('/decks')
  }

  return (
    <div className="container mx-auto p-4 space-y-8 max-w-2xl">
      <div className="flex items-center gap-4 mb-4">
        <Link href={`/decks/${id}`} className="text-sm text-muted-foreground hover:underline">&larr; Back to Deck</Link>
      </div>

      <h1 className="text-3xl font-bold">Edit Deck Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Rename & Details</CardTitle>
          <CardDescription>Update the basic information of your deck.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={async (formData) => {
            'use server'
            await updateDeck(id, formData)
          }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Deck Title</Label>
              <Input id="title" name="title" defaultValue={deck.title} required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" defaultValue={deck.description || ''} />
            </div>

            <Button type="submit">Save Changes</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Once you delete a deck, there is no going back. All cards and study history for this deck will be permanently deleted.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={async () => {
            'use server'
            await deleteDeck(id)
          }}>
            <Button type="submit" variant="destructive">
              Delete this deck
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
