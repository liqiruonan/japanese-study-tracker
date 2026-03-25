'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateCard, deleteCard } from './actions'
import { Pencil, Trash2 } from 'lucide-react'

export function CardListItem({ card, deckId }: { card: any, deckId: string }) {
  const [isEditing, setIsEditing] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const handleUpdate = async (formData: FormData) => {
    setIsPending(true)
    try {
      await updateCard(deckId, card.id, formData)
      setIsEditing(false)
    } catch (error) {
      console.error(error)
      alert("Failed to update card")
    } finally {
      setIsPending(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this card?")) return;
    setIsPending(true)
    try {
      await deleteCard(deckId, card.id)
    } catch (error) {
      console.error(error)
      alert("Failed to delete card")
      setIsPending(false)
    }
    // No need to reset isPending on success because the card will unmount after revalidatePath
  }

  if (isEditing) {
    return (
      <Card>
        <CardContent className="p-4">
          <form action={handleUpdate} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input name="front" defaultValue={card.front} placeholder="Front (Kanji/Word)" required disabled={isPending} />
              <Input name="reading" defaultValue={card.reading} placeholder="Reading (Kana)" disabled={isPending} />
            </div>
            <Input name="meaning" defaultValue={card.meaning} placeholder="Meaning" required disabled={isPending} />
            <Input name="part_of_speech" defaultValue={card.part_of_speech} placeholder="Part of Speech (e.g. Noun)" disabled={isPending} />
            <Input name="example_sentence" defaultValue={card.example_sentence} placeholder="Example Sentence" disabled={isPending} />
            <Input name="example_translation" defaultValue={card.example_translation} placeholder="Example Translation" disabled={isPending} />
            
            <div className="flex gap-2 justify-end mt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
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
        
        <div className="flex flex-col items-end gap-2">
          <div className="text-xs px-2 py-1 bg-muted rounded inline-block">
            {card.part_of_speech || 'N/A'}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setIsEditing(true)} disabled={isPending} title="Edit">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={handleDelete} disabled={isPending} title="Delete">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
