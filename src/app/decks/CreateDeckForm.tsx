'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createDeck } from './actions'

export function CreateDeckForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    setIsPending(true)
    try {
      await createDeck(formData)
      formRef.current?.reset()
    } catch (error) {
      console.error(error)
      alert("Failed to create deck")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      <Input name="title" placeholder="Deck Title" required disabled={isPending} />
      <Input name="description" placeholder="Description (Optional)" disabled={isPending} />
      <select 
        name="type" 
        disabled={isPending}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="vocabulary">Vocabulary</option>
        <option value="grammar">Grammar</option>
      </select>
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create'}
      </Button>
    </form>
  )
}
