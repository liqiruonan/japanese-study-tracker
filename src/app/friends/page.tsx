import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SearchUsers } from './SearchUsers'
import { FriendList } from './FriendList'
import { formatDistanceToNow } from 'date-fns'

export default async function FriendsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get friends and pending requests
  const { data: friendships } = await supabase
    .from('friendships')
    .select(`
      id,
      status,
      user_id,
      friend_id,
      user:profiles!user_id(id, username),
      friend:profiles!friend_id(id, username)
    `)
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)

  const pendingRequests = friendships?.filter(f => f.status === 'pending' && f.friend_id === user.id) || []
  const sentRequests = friendships?.filter(f => f.status === 'pending' && f.user_id === user.id) || []
  const acceptedFriends = friendships?.filter(f => f.status === 'accepted') || []

  const friendIds = acceptedFriends.map(f => f.user_id === user.id ? f.friend_id : f.user_id)

  // Fetch recent friend activity
  let friendActivity: any[] = []
  if (friendIds.length > 0) {
    const { data } = await supabase
      .from('study_sessions')
      .select('*, profiles(username)')
      .in('user_id', friendIds)
      .order('start_time', { ascending: false })
      .limit(10)
    
    friendActivity = data || []
  }

  // Calculate leaderboard (total time in last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  let leaderboard: any[] = []
  if (friendIds.length > 0 || true) {
    const allIds = [...friendIds, user.id]
    const { data: recentSessions } = await supabase
      .from('study_sessions')
      .select('user_id, duration_minutes, profiles(username)')
      .in('user_id', allIds)
      .gte('start_time', sevenDaysAgo.toISOString())
      
    const statsMap = new Map()
    recentSessions?.forEach(s => {
      const current = statsMap.get(s.user_id) || { username: (s.profiles as any)?.username, total: 0 }
      current.total += (s.duration_minutes || 0)
      statsMap.set(s.user_id, current)
    })
    
    leaderboard = Array.from(statsMap.values()).sort((a, b) => b.total - a.total)
  }

  return (
    <div className="container mx-auto p-4 space-y-8">
      <h1 className="text-3xl font-bold">Friends & Community</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Friend Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {friendActivity.length === 0 ? (
                <p className="text-muted-foreground">No recent activity from friends.</p>
              ) : (
                <div className="space-y-4">
                  {friendActivity.map(activity => (
                    <div key={activity.id} className="flex justify-between items-center border-b pb-2">
                      <div>
                        <span className="font-semibold">{(activity.profiles as any)?.username}</span>
                        <span className="text-muted-foreground ml-2 text-sm">
                          studied for {activity.duration_minutes}m ({activity.cards_reviewed} cards)
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.start_time), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Find Friends</CardTitle>
              </CardHeader>
              <CardContent>
                <SearchUsers />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>My Friends</CardTitle>
              </CardHeader>
              <CardContent>
                <FriendList 
                  currentUserId={user.id} 
                  friends={acceptedFriends} 
                  pendingRequests={pendingRequests} 
                  sentRequests={sentRequests} 
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="md:col-span-1 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Leaderboard (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <p className="text-muted-foreground">No study data this week.</p>
              ) : (
                <div className="space-y-4">
                  {leaderboard.map((entry, idx) => (
                    <div key={entry.username} className="flex justify-between items-center p-2 rounded bg-muted/30">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-muted-foreground w-4">{idx + 1}</span>
                        <span className="font-medium">{entry.username}</span>
                      </div>
                      <span className="font-bold">{entry.total}m</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
