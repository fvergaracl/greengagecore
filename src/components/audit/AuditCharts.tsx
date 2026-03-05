"use client"

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

export interface AuditStats {
  total: number
  uniqueActors: number
  byAction: Record<string, number>
  byEntityType: Record<string, number>
  timeline: Record<string, number | string>[]
}

const ACTION_HEX: Record<string, string> = {
  create:  "#16a34a",
  update:  "#2563eb",
  delete:  "#dc2626",
  publish: "#9333ea",
  archive: "#d97706",
  export:  "#0891b2",
  login:   "#6b7280",
  logout:  "#9ca3af",
}

const ACTIONS = ["create", "update", "delete", "publish", "archive", "export", "login", "logout"]

function shortDate(iso: string) {
  const d = new Date(iso + "T00:00:00Z")
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
}

const TOOLTIP_STYLE = {
  backgroundColor: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  fontSize: 12,
}

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: string
}

function StatCard({ label, value, sub, accent = "#16a34a" }: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p
        className="mt-1 text-3xl font-bold tabular-nums"
        style={{ color: accent }}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sub && (
        <p className="mt-0.5 text-xs text-gray-400">{sub}</p>
      )}
    </div>
  )
}

export function AuditCharts({ stats }: { stats: AuditStats }) {
  const { total, uniqueActors, byAction, byEntityType, timeline } = stats

  // Top action & top entity
  const topAction = Object.entries(byAction).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—"
  const topEntity = Object.entries(byEntityType).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—"

  // Timeline: format dates
  const timelineData = timeline.map((d) => ({
    ...d,
    date: shortDate(d.date as string),
  }))

  // Actions horizontal bar data
  const actionBarData = ACTIONS
    .filter((a) => byAction[a] !== undefined)
    .map((a) => ({ action: a, count: byAction[a] ?? 0 }))
    .sort((a, b) => b.count - a.count)

  // Entity horizontal bar data
  const entityBarData = Object.entries(byEntityType)
    .map(([entity, count]) => ({ entity, count }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total events" value={total} accent="#16a34a" />
        <StatCard label="Unique actors" value={uniqueActors} accent="#2563eb" />
        <StatCard
          label="Top action"
          value={topAction}
          sub={byAction[topAction] ? `${byAction[topAction].toLocaleString()} events` : undefined}
          accent={ACTION_HEX[topAction] ?? "#6b7280"}
        />
        <StatCard
          label="Top entity"
          value={topEntity}
          sub={byEntityType[topEntity] ? `${byEntityType[topEntity].toLocaleString()} events` : undefined}
          accent="#9333ea"
        />
      </div>

      {/* Activity timeline */}
      {timelineData.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Activity timeline
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={timelineData}
              margin={{ top: 0, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              {ACTIONS.filter((a) => timeline.some((d) => d[a])).map((a, i) => (
                <Bar
                  key={a}
                  dataKey={a}
                  name={a}
                  stackId="a"
                  fill={ACTION_HEX[a]}
                  radius={i === ACTIONS.length - 1 ? [4, 4, 0, 0] : undefined}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Actions + Entities side by side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* By action */}
        {actionBarData.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Events by action
            </h3>
            <ResponsiveContainer width="100%" height={Math.max(140, actionBarData.length * 36)}>
              <BarChart
                data={actionBarData}
                layout="vertical"
                margin={{ top: 0, right: 32, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="action"
                  width={60}
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" name="Events" radius={[0, 4, 4, 0]}>
                  {actionBarData.map((entry) => (
                    <Cell key={entry.action} fill={ACTION_HEX[entry.action] ?? "#6b7280"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* By entity type */}
        {entityBarData.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Events by entity
            </h3>
            <ResponsiveContainer width="100%" height={Math.max(140, entityBarData.length * 36)}>
              <BarChart
                data={entityBarData}
                layout="vertical"
                margin={{ top: 0, right: 32, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="entity"
                  width={96}
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" name="Events" fill="#16a34a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
