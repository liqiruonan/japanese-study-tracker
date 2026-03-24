import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format, subDays } from 'date-fns'
import { HeatmapClient } from './HeatmapClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  // Get study sessions for statistics
  const { data: sessions } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('user_id', user.id)

  const totalTime = sessions?.reduce((acc, session) => acc + (session.duration_minutes || 0), 0) || 0
  const totalCards = sessions?.reduce((acc, session) => acc + (session.cards_reviewed || 0), 0) || 0

  // Calculate daily data for heatmap
  const activityMap = new Map()
  sessions?.forEach(session => {
    const dateStr = format(new Date(session.start_time), 'yyyy-MM-dd')
    const current = activityMap.get(dateStr) || 0
    activityMap.set(dateStr, current + session.cards_reviewed)
  })

  const heatmapValues = Array.from(activityMap.entries()).map(([date, count]) => ({
    date, count
  }))

  const endDate = new Date()
  const startDate = subDays(endDate, 180)

  return (
    <div className="container mx-auto p-4 space-y-8">
      <h1 className="text-3xl font-bold">Welcome, {profile?.username || 'Student'}!</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Total Study Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{Math.floor(totalTime / 60)}h {totalTime % 60}m</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cards Reviewed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{totalCards}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Study Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{sessions?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Study Activity (Last 6 Months)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-[600px]">
            <HeatmapClient startDate={startDate} endDate={endDate} values={heatmapValues} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
