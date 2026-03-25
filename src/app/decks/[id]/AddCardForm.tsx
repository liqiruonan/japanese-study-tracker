'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addCard } from './actions'

export function AddCardForm({ deckId }: { deckId: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    setIsPending(true)
    try {
      await addCard(deckId, formData)
      formRef.current?.reset()
      // Focus the first input again to quickly add the next word
      const firstInput = formRef.current?.querySelector('input[name="front"]') as HTMLInputElement
      firstInput?.focus()
    } catch (error) {
      console.error(error)
      alert("Failed to add card")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-3">
      <Input name="front" placeholder="Front (Kanji/Word)" required disabled={isPending} />
      <Input name="reading" placeholder="Reading (Kana)" disabled={isPending} />
      <Input name="meaning" placeholder="Meaning" required disabled={isPending} />
      <Input name="part_of_speech" placeholder="Part of Speech (e.g. Noun)" disabled={isPending} />
      <Input name="example_sentence" placeholder="Example Sentence" disabled={isPending} />
      <Input name="example_translation" placeholder="Example Translation" disabled={isPending} />
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Adding... (添加中)' : 'Add Card (添加单词)'}
      </Button>
    </form>
  )
}
