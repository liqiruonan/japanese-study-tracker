'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { clonePublicDeck } from '../decks/actions'
import { useRouter } from 'next/navigation'

export function CloneButton({ deckId }: { deckId: string }) {
  const [isCloning, setIsCloning] = useState(false)
  const router = useRouter()

  const handleClone = async () => {
    try {
      setIsCloning(true)
      const newDeckId = await clonePublicDeck(deckId)
      router.push(`/decks/${newDeckId}`)
    } catch (error: any) {
      console.error(error)
      alert('Failed to clone deck: ' + error.message)
      setIsCloning(false)
    }
  }

  return (
    <Button 
      onClick={handleClone} 
      disabled={isCloning}
      variant="secondary"
    >
      {isCloning ? 'Importing...' : 'Import to My Decks'}
    </Button>
  )
}
