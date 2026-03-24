'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { searchUsers, sendFriendRequest } from './actions'

export function SearchUsers() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await searchUsers(query)
      setResults(data)
    } finally {
      setLoading(false)
    }
  }

  const handleAddFriend = async (id: string) => {
    try {
      await sendFriendRequest(id)
      alert('Friend request sent!')
    } catch (error) {
      alert('Could not send request.')
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input 
          value={query} 
          onChange={(e) => setQuery(e.target.value)} 
          placeholder="Search by username..." 
        />
        <Button type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </Button>
      </form>

      <ul className="space-y-2">
        {results.map((user) => (
          <li key={user.id} className="flex justify-between items-center p-2 border rounded">
            <span>{user.username}</span>
            <Button size="sm" onClick={() => handleAddFriend(user.id)}>Add Friend</Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
