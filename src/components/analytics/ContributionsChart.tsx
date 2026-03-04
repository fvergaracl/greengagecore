"use client"

// Gráficas de contribuciones por día usando Recharts.
// Requiere: npm install recharts

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts"

interface DayData {
  date: string
  submitted: number
  validated: number
  rejected: number
  flagged: number
  total: number
}

interface TaskData {
  taskId: string
  title: string
  total: number
  validated: number
}

interface Props {
  timeSeries: DayData[]
  byTask: TaskData[]
  days: number
}

// Formatear fecha corta (ej: "Mar 3")
function shortDate(iso: string) {
  const d = new Date(iso + "T00:00:00Z")
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
}

export function ContributionsChart({ timeSeries, byTask, days }: Props) {
  // Mostrar ticks reducidos si hay muchos días
  const tickInterval = days > 30 ? 6 : days > 14 ? 2 : 0

  const chartData = timeSeries.map((d) => ({
    ...d,
    date: shortDate(d.date),
  }))

  const taskData = byTask.map((t) => ({
    ...t,
    title: t.title.length > 28 ? t.title.slice(0, 25) + "…" : t.title,
  }))

  return (
    <div className="space-y-8">
      {/* Contributions over time */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Contributions over time (last {days} days)
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 0, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              interval={tickInterval}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
            <Bar dataKey="validated" name="Validated" stackId="a" fill="#16a34a" radius={[0, 0, 0, 0]} />
            <Bar dataKey="submitted" name="Pending" stackId="a" fill="#f59e0b" />
            <Bar dataKey="rejected" name="Rejected" stackId="a" fill="#ef4444" />
            <Bar dataKey="flagged" name="Flagged" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cumulative line */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Cumulative total
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart
            data={chartData.reduce<(DayData & { date: string; cumulative: number })[]>(
              (acc, d) => {
                const prev = acc.at(-1)?.cumulative ?? 0
                acc.push({ ...d, cumulative: prev + d.total })
                return acc
              },
              []
            )}
            margin={{ top: 0, right: 8, left: -16, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              interval={tickInterval}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="cumulative"
              name="Total submissions"
              stroke="#16a34a"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* By task */}
      {taskData.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Contributions by task (top {taskData.length})
          </h3>
          <ResponsiveContainer width="100%" height={Math.max(160, taskData.length * 36)}>
            <BarChart
              data={taskData}
              layout="vertical"
              margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} />
              <YAxis
                type="category"
                dataKey="title"
                width={160}
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="validated" name="Validated" fill="#16a34a" stackId="b" />
              <Bar dataKey="total" name="Total" fill="#d1fae5" stackId="c" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
