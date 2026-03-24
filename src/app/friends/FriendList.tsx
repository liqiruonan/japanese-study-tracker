'use client'

import { Button } from '@/components/ui/button'
import { acceptFriendRequest, removeFriend } from './actions'

interface FriendListProps {
  currentUserId: string
  friends: any[]
  pendingRequests: any[]
  sentRequests: any[]
}

export function FriendList({ currentUserId, friends, pendingRequests, sentRequests }: FriendListProps) {
  return (
    <div className="space-y-6">
      {pendingRequests.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Pending Requests</h3>
          <ul className="space-y-2">
            {pendingRequests.map(req => (
              <li key={req.id} className="flex justify-between items-center p-2 border rounded">
                <span>{req.user.username}</span>
                <div className="space-x-2">
                  <Button size="sm" onClick={() => acceptFriendRequest(req.id)}>Accept</Button>
                  <Button size="sm" variant="destructive" onClick={() => removeFriend(req.id)}>Reject</Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="font-semibold mb-2">My Friends</h3>
        {friends.length === 0 ? (
          <p className="text-sm text-muted-foreground">No friends yet.</p>
        ) : (
          <ul className="space-y-2">
            {friends.map(f => {
              const isUser = f.user_id === currentUserId
              const friendData = isUser ? f.friend : f.user
              return (
                <li key={f.id} className="flex justify-between items-center p-2 border rounded">
                  <span>{friendData.username}</span>
                  <Button size="sm" variant="outline" onClick={() => removeFriend(f.id)}>Remove</Button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      
      {sentRequests.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2 mt-4 text-sm text-muted-foreground">Sent Requests</h3>
          <ul className="space-y-2">
            {sentRequests.map(req => (
              <li key={req.id} className="flex justify-between items-center p-2 border rounded opacity-60">
                <span>{req.friend.username}</span>
                <span className="text-xs">Pending</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
