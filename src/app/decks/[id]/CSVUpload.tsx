'use client'

import { useState } from 'react'
import Papa from 'papaparse'
import { addCardsBulk } from './actions'

export function CSVUpload({ deckId }: { deckId: string }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setMessage('Parsing CSV...')

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          setMessage('Uploading to database...')
          await addCardsBulk(deckId, results.data)
          setMessage(`Successfully imported ${results.data.length} cards!`)
        } catch (error: any) {
          setMessage(`Error: ${error.message}`)
        } finally {
          setLoading(false)
        }
      },
      error: (error) => {
        setMessage(`Parse error: ${error.message}`)
        setLoading(false)
      }
    })
  }

  return (
    <div className="space-y-2 border p-4 rounded-md bg-muted/50">
      <h3 className="font-semibold text-sm">Bulk Import (CSV)</h3>
      <p className="text-xs text-muted-foreground mb-2">
        CSV should have headers like: front, reading, meaning, part_of_speech, example_sentence, example_translation
      </p>
      <input 
        type="file" 
        accept=".csv" 
        onChange={handleFileUpload}
        disabled={loading}
        className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
      />
      {message && <p className="text-sm mt-2 font-medium">{message}</p>}
    </div>
  )
}
