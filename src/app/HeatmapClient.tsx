'use client'

import CalendarHeatmap from 'react-calendar-heatmap'
import 'react-calendar-heatmap/dist/styles.css'

export function HeatmapClient({ startDate, endDate, values }: any) {
  return (
    <>
      <style>{`
        .react-calendar-heatmap .color-empty { fill: #ebedf0; }
        .react-calendar-heatmap .color-scale-1 { fill: #9be9a8; }
        .react-calendar-heatmap .color-scale-2 { fill: #40c463; }
        .react-calendar-heatmap .color-scale-3 { fill: #30a14e; }
        .react-calendar-heatmap .color-scale-4 { fill: #216e39; }
        .dark .react-calendar-heatmap .color-empty { fill: #161b22; }
        .dark .react-calendar-heatmap .color-scale-1 { fill: #0e4429; }
        .dark .react-calendar-heatmap .color-scale-2 { fill: #006d32; }
        .dark .react-calendar-heatmap .color-scale-3 { fill: #26a641; }
        .dark .react-calendar-heatmap .color-scale-4 { fill: #39d353; }
      `}</style>
      <CalendarHeatmap
        startDate={startDate}
        endDate={endDate}
        values={values}
        classForValue={(value) => {
          if (!value || value.count === 0) return 'color-empty'
          if (value.count < 10) return 'color-scale-1'
          if (value.count < 30) return 'color-scale-2'
          if (value.count < 60) return 'color-scale-3'
          return 'color-scale-4'
        }}
        titleForValue={(value) => {
          if (!value || !value.date) return 'No study data'
          return `${value.count} cards on ${value.date}`
        }}
      />
    </>
  )
}
