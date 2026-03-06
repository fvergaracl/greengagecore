"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

// ─── Types ────────────────────────────────────────────────────────────────────

type DashboardSummaryElement = { label: string; count: number }
type DashboardSummary = {
  new_users: DashboardSummaryElement[]
  games_opened: DashboardSummaryElement[]
  points_earned: DashboardSummaryElement[]
  actions_performed: DashboardSummaryElement[]
}
type Strategy = {
  id: string
  name?: string
  description?: string
  version: string
  variables: Record<string, number>
}
type GameEntry = {
  campaignId: string
  campaignName: string
  campaignStatus: string
  gameStrategy: string | null
  contributionCount: number
  externalGameId: string
  game: {
    gameId: string
    strategyId?: string
    created_at?: string
    params?: Array<{ key: string; value: string | number | boolean }>
  } | null
}
type LeaderboardEntry = { externalUserId: string; totalPoints: number }

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({
  title,
  items,
  color,
}: {
  title: string
  items: DashboardSummaryElement[]
  color: string
}) {
  const total = items.reduce((s, i) => s + Number(i.count), 0)
  return (
    <div className={`rounded-xl border bg-white p-5 dark:bg-gray-900 ${color}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {title}
      </p>
      <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
        {total.toLocaleString()}
      </p>
      <div className="mt-3 space-y-1">
        {items.slice(-4).map((el) => (
          <div key={el.label} className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{el.label}</span>
            <span className="font-medium">{Number(el.count).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Leaderboard modal ────────────────────────────────────────────────────────

function LeaderboardModal({
  gameId,
  gameName,
  onClose,
}: {
  gameId: string
  gameName: string
  onClose: () => void
}) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/game/games/${gameId}/leaderboard`)
      .then((r) => r.json())
      .then((d) => setEntries(d.leaderboard ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [gameId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Leaderboard — {gameName}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          {loading ? (
            <p className="py-8 text-center text-sm text-gray-400">Loading…</p>
          ) : !entries?.length ? (
            <p className="py-8 text-center text-sm text-gray-400">No points recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500">
                  <th className="pb-2 font-medium">#</th>
                  <th className="pb-2 font-medium">User ID</th>
                  <th className="pb-2 text-right font-medium">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {entries.map((e, i) => (
                  <tr key={e.externalUserId}>
                    <td className="py-2 text-gray-400">{i + 1}</td>
                    <td className="py-2 font-mono text-xs text-gray-700 dark:text-gray-300">
                      {e.externalUserId.slice(0, 20)}…
                    </td>
                    <td className="py-2 text-right font-semibold text-green-600 dark:text-green-400">
                      {e.totalPoints.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Strategy badge ───────────────────────────────────────────────────────────

function StrategyBadge({ strategyId, strategies }: { strategyId?: string; strategies: Strategy[] }) {
  if (!strategyId) return <span className="text-gray-400">—</span>
  const s = strategies.find((x) => x.id === strategyId)
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/20 dark:text-purple-300"
      title={s?.description}
    >
      🎯 {s?.name ?? strategyId.slice(0, 12)}
    </span>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = "overview" | "games" | "strategies"

export default function GamificationPage() {
  const [tab, setTab] = useState<Tab>("overview")
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [games, setGames] = useState<GameEntry[]>([])
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [loadingGames, setLoadingGames] = useState(true)
  const [leaderboard, setLeaderboard] = useState<{ gameId: string; name: string } | null>(null)

  useEffect(() => {
    fetch("/api/game/status")
      .then((r) => r.json())
      .then((d) => {
        setSummary(d.summary ?? null)
        setStrategies(d.strategies ?? [])
      })
      .catch(() => {})
      .finally(() => setLoadingStatus(false))

    fetch("/api/game/games")
      .then((r) => r.json())
      .then((d) => setGames(d.games ?? []))
      .catch(() => {})
      .finally(() => setLoadingGames(false))
  }, [])

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "📈" },
    { id: "games", label: "Games", icon: "🎮" },
    { id: "strategies", label: "Strategies", icon: "🎯" },
  ]

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
            Gamification
          </h1>
          <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
            GAME engine · live data
          </p>
        </div>
        <a
          href='http://localhost:8000/docs'
          target='_blank'
          rel='noopener noreferrer'
          className='inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
        >
          📖 GAME API Docs ↗
        </a>
      </div>

      {/* Tabs */}
      <div className='flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800'>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ── */}
      {tab === "overview" && (
        <div className='space-y-6'>
          {loadingStatus ? (
            <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className='h-36 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800'
                />
              ))}
            </div>
          ) : summary ? (
            <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
              <SummaryCard
                title='New Users'
                items={summary.new_users}
                color='border-blue-100 dark:border-blue-900/30'
              />
              <SummaryCard
                title='Games Opened'
                items={summary.games_opened}
                color='border-green-100 dark:border-green-900/30'
              />
              <SummaryCard
                title='Points Earned'
                items={summary.points_earned}
                color='border-yellow-100 dark:border-yellow-900/30'
              />
              <SummaryCard
                title='Actions Performed'
                items={summary.actions_performed}
                color='border-purple-100 dark:border-purple-900/30'
              />
            </div>
          ) : (
            <div className='rounded-xl border border-dashed border-gray-200 p-10 text-center dark:border-gray-700'>
              <p className='text-sm text-gray-500'>
                No summary data available from GAME engine.
              </p>
            </div>
          )}

          {/* Quick links */}
          <div className='rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900'>
            <h2 className='mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300'>
              Quick access
            </h2>
            <div className='flex flex-wrap gap-2'>
              <button
                onClick={() => setTab("games")}
                className='rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300'
              >
                🎮 {games.length} game{games.length !== 1 ? "s" : ""} active
              </button>
              <button
                onClick={() => setTab("strategies")}
                className='rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300'
              >
                🎯 {strategies.length} strateg
                {strategies.length !== 1 ? "ies" : "y"} available
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Games tab ── */}
      {tab === "games" && (
        <div className='rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900'>
          {loadingGames ? (
            <div className='space-y-3 p-5'>
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className='h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800'
                />
              ))}
            </div>
          ) : games.length === 0 ? (
            <div className='p-10 text-center'>
              <p className='text-sm text-gray-500'>
                No campaigns with gamification enabled.{" "}
                <Link
                  href='/dashboard/campaigns'
                  className='text-green-600 hover:underline'
                >
                  Create one →
                </Link>
              </p>
            </div>
          ) : (
            <table className='w-full text-sm'>
              <thead className='border-b border-gray-100 dark:border-gray-800'>
                <tr className='text-left text-xs text-gray-500'>
                  <th className='px-5 py-3 font-medium'>Campaign</th>
                  <th className='px-5 py-3 font-medium'>Status</th>
                  <th className='px-5 py-3 font-medium'>Strategy</th>
                  <th className='px-5 py-3 font-medium'>Contributions</th>
                  <th className='px-5 py-3 font-medium'>GAME ID</th>
                  <th className='px-5 py-3 font-medium'></th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-50 dark:divide-gray-800/50'>
                {games.map(g => (
                  <tr
                    key={g.campaignId}
                    className='hover:bg-gray-50/50 dark:hover:bg-gray-800/30'
                  >
                    <td className='px-5 py-3'>
                      <Link
                        href={`/dashboard/campaigns/${g.campaignId}`}
                        className='font-medium text-gray-900 hover:text-green-600 dark:text-white dark:hover:text-green-400'
                      >
                        {g.campaignName}
                      </Link>
                    </td>
                    <td className='px-5 py-3'>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          g.campaignStatus === "published"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                            : g.campaignStatus === "archived"
                              ? "bg-gray-100 text-gray-500"
                              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
                        }`}
                      >
                        {g.campaignStatus}
                      </span>
                    </td>
                    <td className='px-5 py-3'>
                      <StrategyBadge
                        strategyId={
                          g.game?.strategyId ?? g.gameStrategy ?? undefined
                        }
                        strategies={strategies}
                      />
                    </td>
                    <td className='px-5 py-3 text-gray-600 dark:text-gray-400'>
                      {g.contributionCount.toLocaleString()}
                    </td>
                    <td className='px-5 py-3'>
                      {g.game ? (
                        <span className='font-mono text-xs text-gray-500'>
                          {g.game.gameId.slice(0, 8)}…
                        </span>
                      ) : (
                        <span className='text-xs text-gray-300 dark:text-gray-600'>
                          not synced
                        </span>
                      )}
                    </td>
                    <td className='px-5 py-3'>
                      {g.game && (
                        <button
                          onClick={() =>
                            setLeaderboard({
                              gameId: g.game!.gameId,
                              name: g.campaignName
                            })
                          }
                          className='rounded-lg px-3 py-1 text-xs font-medium text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20'
                        >
                          Leaderboard
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Strategies tab ── */}
      {tab === "strategies" && (
        <div className='space-y-3'>
          {loadingStatus ? (
            <div className='space-y-3'>
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className='h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800'
                />
              ))}
            </div>
          ) : strategies.length === 0 ? (
            <div className='rounded-xl border border-dashed border-gray-200 p-10 text-center dark:border-gray-700'>
              <p className='text-sm text-gray-500'>
                No strategies found in GAME engine.
              </p>
            </div>
          ) : (
            strategies.map(s => (
              <div
                key={s.id}
                className='rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900'
              >
                <div className='flex items-start justify-between gap-4'>
                  <div>
                    <h3 className='font-semibold text-gray-900 dark:text-white'>
                      {s.name ?? s.id}
                    </h3>
                    {s.description && (
                      <p className='mt-0.5 text-xs text-gray-500'>
                        {s.description}
                      </p>
                    )}
                    <p className='mt-1 font-mono text-xs text-gray-400'>
                      v{s.version} · {s.id}
                    </p>
                  </div>
                  <span className='rounded-lg bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/20 dark:text-purple-300'>
                    🎯 Strategy
                  </span>
                </div>
                {Object.keys(s.variables).length > 0 && (
                  <div className='mt-3 flex flex-wrap gap-2'>
                    {Object.entries(s.variables).map(([k, v]) => (
                      <span
                        key={k}
                        className='rounded-md bg-gray-50 px-2 py-1 font-mono text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      >
                        {k}:{" "}
                        <span className='font-semibold text-gray-800 dark:text-gray-200'>
                          {v}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Leaderboard modal */}
      {leaderboard && (
        <LeaderboardModal
          gameId={leaderboard.gameId}
          gameName={leaderboard.name}
          onClose={() => setLeaderboard(null)}
        />
      )}
    </div>
  )
}
