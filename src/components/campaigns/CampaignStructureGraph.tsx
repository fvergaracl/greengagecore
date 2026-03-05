"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

type TaskNode = {
  id: string
  title: string
  type: string
  isDisabled: boolean
  contributions: number
}

type PoiNode = {
  id: string
  name: string
  isDisabled: boolean
  tasks: TaskNode[]
}

type AreaNode = {
  id: string
  name: string
  isDisabled: boolean
  openTasks: TaskNode[]
  pois: PoiNode[]
}

interface Props {
  campaignId: string
  campaignName: string
  areas: AreaNode[]
}

type StructureView = "tree" | "graph"
type GraphBranch = { kind: "open" } | { kind: "poi"; poiId: string }

function pillClass(active: boolean) {
  return active
    ? "bg-green-100 text-green-700 ring-1 ring-green-300 dark:bg-green-900/30 dark:text-green-300 dark:ring-green-800"
    : "bg-gray-100 text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700"
}

export function CampaignStructureGraph({
  campaignId,
  campaignName,
  areas,
}: Props) {
  const [view, setView] = useState<StructureView>("tree")
  const [query, setQuery] = useState("")
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(
    () => new Set(areas.map((area) => area.id))
  )
  const [expandedPois, setExpandedPois] = useState<Set<string>>(
    () => new Set(areas.flatMap((area) => area.pois.map((poi) => poi.id)))
  )
  const [selectedAreaId, setSelectedAreaId] = useState<string>(areas[0]?.id ?? "")
  const [selectedBranch, setSelectedBranch] = useState<GraphBranch>(() => {
    const firstArea = areas[0]
    if (!firstArea) return { kind: "open" }
    if (firstArea.openTasks.length > 0) return { kind: "open" }
    if (firstArea.pois[0]) return { kind: "poi", poiId: firstArea.pois[0].id }
    return { kind: "open" }
  })

  const filteredAreas = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return areas

    return areas
      .map((area) => {
        const openTasks = area.openTasks.filter((task) =>
          task.title.toLowerCase().includes(q)
        )
        const pois = area.pois
          .map((poi) => ({
            ...poi,
            tasks: poi.tasks.filter((task) => task.title.toLowerCase().includes(q)),
          }))
          .filter(
            (poi) =>
              poi.name.toLowerCase().includes(q) || poi.tasks.length > 0
          )

        const areaMatch = area.name.toLowerCase().includes(q)
        if (!areaMatch && openTasks.length === 0 && pois.length === 0) return null

        return {
          ...area,
          openTasks: areaMatch ? area.openTasks : openTasks,
          pois: areaMatch ? area.pois : pois,
        }
      })
      .filter((area): area is AreaNode => area !== null)
  }, [areas, query])

  const effectiveSelectedAreaId = filteredAreas.some(
    (area) => area.id === selectedAreaId
  )
    ? selectedAreaId
    : (filteredAreas[0]?.id ?? "")

  const selectedArea =
    filteredAreas.find((area) => area.id === effectiveSelectedAreaId) ?? null

  const effectiveSelectedBranch: GraphBranch = (() => {
    if (!selectedArea) return { kind: "open" }
    if (selectedBranch.kind === "open") return selectedBranch
    if (selectedArea.pois.some((poi) => poi.id === selectedBranch.poiId)) {
      return selectedBranch
    }
    if (selectedArea.openTasks.length > 0) return { kind: "open" }
    if (selectedArea.pois[0]) return { kind: "poi", poiId: selectedArea.pois[0].id }
    return { kind: "open" }
  })()

  const selectedPoi =
    selectedArea && effectiveSelectedBranch.kind === "poi"
      ? selectedArea.pois.find((poi) => poi.id === effectiveSelectedBranch.poiId) ??
        null
      : null

  const graphTasks =
    selectedArea === null
      ? []
      : effectiveSelectedBranch.kind === "open"
      ? selectedArea.openTasks
      : selectedPoi?.tasks ?? []

  function toggleArea(areaId: string) {
    setExpandedAreas((prev) => {
      const next = new Set(prev)
      if (next.has(areaId)) next.delete(areaId)
      else next.add(areaId)
      return next
    })
  }

  function togglePoi(poiId: string) {
    setExpandedPois((prev) => {
      const next = new Set(prev)
      if (next.has(poiId)) next.delete(poiId)
      else next.add(poiId)
      return next
    })
  }

  function collapseAll() {
    setExpandedAreas(new Set())
    setExpandedPois(new Set())
  }

  function expandAll() {
    setExpandedAreas(new Set(filteredAreas.map((area) => area.id)))
    setExpandedPois(
      new Set(filteredAreas.flatMap((area) => area.pois.map((poi) => poi.id)))
    )
  }

  function selectAreaInGraph(area: AreaNode) {
    setSelectedAreaId(area.id)
    if (area.openTasks.length > 0) {
      setSelectedBranch({ kind: "open" })
      return
    }
    if (area.pois[0]) {
      setSelectedBranch({ kind: "poi", poiId: area.pois[0].id })
      return
    }
    setSelectedBranch({ kind: "open" })
  }

  return (
    <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            🧭 Campaign Structure
          </h2>
          <p className="text-xs text-gray-500">
            Interactive hierarchy: Campaign → Areas → POIs/OpenTasks → Tasks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setView("tree")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${pillClass(
              view === "tree"
            )}`}
          >
            Tree
          </button>
          <button
            type="button"
            onClick={() => setView("graph")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${pillClass(
              view === "graph"
            )}`}
          >
            Graph
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by area, POI or task…"
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        />
        <button
          type="button"
          onClick={expandAll}
          className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Expand all
        </button>
        <button
          type="button"
          onClick={collapseAll}
          className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Collapse all
        </button>
      </div>

      {filteredAreas.length === 0 ? (
        <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500 dark:bg-gray-900">
          No nodes match this filter.
        </p>
      ) : view === "tree" ? (
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-800 ring-1 ring-green-200 dark:bg-green-900/20 dark:text-green-300 dark:ring-green-800">
              📢 {campaignName}
            </div>
            <div className="ml-4 border-l-2 border-dashed border-green-200 pl-4 pt-3 dark:border-green-800">
              {filteredAreas.map((area) => {
                const isAreaExpanded = expandedAreas.has(area.id)
                return (
                  <div key={area.id} className="mb-3">
                    <button
                      type="button"
                      onClick={() => toggleArea(area.id)}
                      className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm hover:border-green-300 dark:border-gray-700 dark:bg-gray-900"
                    >
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        🗺️ {area.name}
                        {area.isDisabled ? (
                          <span className="ml-2 text-xs text-red-500">disabled</span>
                        ) : null}
                      </span>
                      <span className="text-xs text-gray-500">
                        {isAreaExpanded ? "Hide" : "Show"} · {area.pois.length} POIs ·{" "}
                        {area.openTasks.length} open tasks
                      </span>
                    </button>

                    {isAreaExpanded ? (
                      <div className="ml-4 mt-2 border-l border-gray-200 pl-3 dark:border-gray-700">
                        <div className="mb-2 rounded-md bg-amber-50 px-3 py-1.5 text-xs text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-800">
                          🧭 OpenTasks ({area.openTasks.length})
                        </div>
                        <div className="space-y-1">
                          {area.openTasks.length === 0 ? (
                            <p className="text-xs text-gray-400">No open tasks in this area.</p>
                          ) : (
                            area.openTasks.map((task) => (
                              <div
                                key={task.id}
                                className="rounded-md bg-gray-50 px-3 py-1.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                              >
                                🧩 {task.title} [{task.type}] · {task.contributions} contrib.
                                {task.isDisabled ? " · disabled" : ""}
                              </div>
                            ))
                          )}
                        </div>

                        <div className="mb-2 mt-3 rounded-md bg-blue-50 px-3 py-1.5 text-xs text-blue-700 ring-1 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-800">
                          📌 POIs ({area.pois.length})
                        </div>
                        {area.pois.length === 0 ? (
                          <p className="text-xs text-gray-400">No POIs in this area.</p>
                        ) : (
                          <div className="space-y-2">
                            {area.pois.map((poi) => {
                              const isPoiExpanded = expandedPois.has(poi.id)
                              return (
                                <div key={poi.id}>
                                  <button
                                    type="button"
                                    onClick={() => togglePoi(poi.id)}
                                    className="flex w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-1.5 text-left text-xs hover:border-blue-300 dark:border-gray-700 dark:bg-gray-900"
                                  >
                                    <span className="text-gray-800 dark:text-gray-100">
                                      📌 {poi.name}
                                      {poi.isDisabled ? (
                                        <span className="ml-2 text-[11px] text-red-500">
                                          disabled
                                        </span>
                                      ) : null}
                                    </span>
                                    <span className="text-gray-500">
                                      {isPoiExpanded ? "Hide" : "Show"} · {poi.tasks.length} tasks
                                    </span>
                                  </button>
                                  {isPoiExpanded ? (
                                    <div className="ml-4 mt-1 space-y-1 border-l border-gray-200 pl-3 dark:border-gray-700">
                                      {poi.tasks.length === 0 ? (
                                        <p className="text-xs text-gray-400">
                                          No tasks in this POI.
                                        </p>
                                      ) : (
                                        poi.tasks.map((task) => (
                                          <div
                                            key={task.id}
                                            className="rounded-md bg-gray-50 px-3 py-1.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                          >
                                            🧩 {task.title} [{task.type}] · {task.contributions}{" "}
                                            contrib.
                                            {task.isDisabled ? " · disabled" : ""}
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid min-w-[900px] gap-3 lg:grid-cols-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
              <p className="text-xs text-green-700 dark:text-green-300">Campaign</p>
              <p className="mt-1 text-sm font-semibold text-green-900 dark:text-green-100">
                📢 {campaignName}
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
              <p className="mb-2 text-xs text-gray-500">Areas</p>
              <div className="space-y-1.5">
                {filteredAreas.map((area) => (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => selectAreaInGraph(area)}
                    className={`w-full rounded-md px-2.5 py-2 text-left text-xs ${
                      effectiveSelectedAreaId === area.id
                        ? "bg-green-100 text-green-800 ring-1 ring-green-300 dark:bg-green-900/30 dark:text-green-200 dark:ring-green-800"
                        : "bg-white text-gray-700 ring-1 ring-gray-200 hover:ring-green-300 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700"
                    }`}
                  >
                    🗺️ {area.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
              <p className="mb-2 text-xs text-gray-500">
                Nodes in {selectedArea?.name ?? "selected area"}
              </p>
              {selectedArea ? (
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedBranch({ kind: "open" })}
                    className={`w-full rounded-md px-2.5 py-2 text-left text-xs ${
                      effectiveSelectedBranch.kind === "open"
                        ? "bg-amber-100 text-amber-800 ring-1 ring-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-800"
                        : "bg-white text-gray-700 ring-1 ring-gray-200 hover:ring-amber-300 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700"
                    }`}
                  >
                    🧭 OpenTasks ({selectedArea.openTasks.length})
                  </button>
                  {selectedArea.pois.map((poi) => (
                    <button
                      key={poi.id}
                      type="button"
                      onClick={() =>
                        setSelectedBranch({ kind: "poi", poiId: poi.id })
                      }
                      className={`w-full rounded-md px-2.5 py-2 text-left text-xs ${
                        effectiveSelectedBranch.kind === "poi" &&
                        effectiveSelectedBranch.poiId === poi.id
                          ? "bg-blue-100 text-blue-800 ring-1 ring-blue-300 dark:bg-blue-900/30 dark:text-blue-200 dark:ring-blue-800"
                          : "bg-white text-gray-700 ring-1 ring-gray-200 hover:ring-blue-300 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700"
                      }`}
                    >
                      📌 {poi.name} ({poi.tasks.length} tasks)
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Select an area.</p>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
              <p className="mb-2 text-xs text-gray-500">
                Tasks for{" "}
                {effectiveSelectedBranch.kind === "open"
                  ? "OpenTasks"
                  : `POI: ${selectedPoi?.name ?? "unknown"}`}
              </p>
              {graphTasks.length === 0 ? (
                <p className="text-xs text-gray-400">No tasks in this node.</p>
              ) : (
                <div className="space-y-1.5">
                  {graphTasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-md bg-white px-2.5 py-2 text-xs text-gray-700 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700"
                    >
                      🧩 {task.title}
                      <p className="mt-0.5 text-[11px] text-gray-500">
                        {task.type} · {task.contributions} contributions
                        {task.isDisabled ? " · disabled" : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/dashboard/campaigns/${campaignId}/areas`}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Open areas manager
        </Link>
        <Link
          href={`/dashboard/campaigns/${campaignId}/tasks/new`}
          className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
        >
          Create task node
        </Link>
      </div>
    </section>
  )
}
