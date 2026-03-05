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

type GraphNodeKind =
  | "campaign"
  | "area"
  | "openHub"
  | "openTask"
  | "poi"
  | "poiTask"
  | "more"

type GraphNodeMeta =
  | {
      type: "campaign"
      areaCount: number
      taskCount: number
    }
  | {
      type: "area"
      areaId: string
      openTaskCount: number
      poiCount: number
      taskCount: number
    }
  | {
      type: "openHub"
      areaId: string
      openTaskCount: number
    }
  | {
      type: "poi"
      areaId: string
      poiId: string
      poiTaskCount: number
    }
  | {
      type: "task"
      areaId: string
      poiId?: string
      taskId: string
      scope: "open" | "poi"
      taskType: string
      contributions: number
      isDisabled: boolean
    }
  | {
      type: "more"
      parentType: "area" | "openTask" | "poiTask"
      hiddenCount: number
      areaId: string
      poiId?: string
    }

type GraphNode = {
  id: string
  kind: GraphNodeKind
  label: string
  subtitle?: string
  x: number
  y: number
  r: number
  parentId?: string
  meta: GraphNodeMeta
}

type GraphEdge = {
  id: string
  from: string
  to: string
  stroke: string
}

const MAX_POIS_PER_AREA = 4
const MAX_OPEN_TASKS_PER_AREA = 3
const MAX_TASKS_PER_POI = 2

const NODE_STYLE: Record<
  GraphNodeKind,
  { fill: string; stroke: string; text: string }
> = {
  campaign: { fill: "#2563eb", stroke: "#1e40af", text: "#ffffff" },
  area: { fill: "#10b981", stroke: "#047857", text: "#ffffff" },
  openHub: { fill: "#6366f1", stroke: "#4338ca", text: "#ffffff" },
  openTask: { fill: "#f59e0b", stroke: "#b45309", text: "#111827" },
  poi: { fill: "#eab308", stroke: "#a16207", text: "#111827" },
  poiTask: { fill: "#ef4444", stroke: "#b91c1c", text: "#ffffff" },
  more: { fill: "#94a3b8", stroke: "#475569", text: "#ffffff" },
}

function truncate(text: string, max = 14) {
  return text.length > max ? `${text.slice(0, Math.max(1, max - 1))}…` : text
}

function nodeClipId(nodeId: string) {
  return `node-clip-${nodeId.replace(/[^a-zA-Z0-9_-]/g, "-")}`
}

export function CampaignStructureGraph({
  campaignId,
  campaignName,
  areas,
}: Props) {
  const [query, setQuery] = useState("")
  const [activeNodeId, setActiveNodeId] = useState<string>("campaign")
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null)

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

  const graph = useMemo(() => {
    const areaCount = filteredAreas.length
    const width = Math.max(980, areaCount * 300 + 200)
    const height = 640
    const centerX = width / 2

    const nodes: GraphNode[] = []
    const edges: GraphEdge[] = []

    const totalTaskCount = filteredAreas.reduce(
      (sum, area) =>
        sum + area.openTasks.length + area.pois.reduce((poiSum, poi) => poiSum + poi.tasks.length, 0),
      0
    )

    nodes.push({
      id: "campaign",
      kind: "campaign",
      label: "Campaign",
      subtitle: truncate(campaignName, 18),
      x: centerX,
      y: 70,
      r: 42,
      meta: {
        type: "campaign",
        areaCount,
        taskCount: totalTaskCount,
      },
    })

    if (areaCount === 0) {
      return { width, height, nodes, edges }
    }

    const areaY = 200
    const openTaskY = 300
    const poiY = 390
    const poiTaskY = 540
    const marginX = 130
    const areaStep = areaCount === 1 ? 0 : (width - marginX * 2) / (areaCount - 1)

    filteredAreas.forEach((area, areaIndex) => {
      const areaX = areaCount === 1 ? centerX : marginX + areaStep * areaIndex
      const areaId = `area:${area.id}`
      const openHubId = `open:${area.id}`
      const areaTaskCount =
        area.openTasks.length +
        area.pois.reduce((sum, poi) => sum + poi.tasks.length, 0)

      nodes.push({
        id: areaId,
        kind: "area",
        label: area.name,
        subtitle: `${areaTaskCount} tasks`,
        x: areaX,
        y: areaY,
        r: 36,
        parentId: "campaign",
        meta: {
          type: "area",
          areaId: area.id,
          openTaskCount: area.openTasks.length,
          poiCount: area.pois.length,
          taskCount: areaTaskCount,
        },
      })
      edges.push({
        id: `edge:campaign:${area.id}`,
        from: "campaign",
        to: areaId,
        stroke: "#93c5fd",
      })

      const openHubX = areaX - 120
      nodes.push({
        id: openHubId,
        kind: "openHub",
        label: "OpenTask",
        subtitle: `${area.openTasks.length}`,
        x: openHubX,
        y: areaY,
        r: 28,
        parentId: areaId,
        meta: {
          type: "openHub",
          areaId: area.id,
          openTaskCount: area.openTasks.length,
        },
      })
      edges.push({
        id: `edge:area-open:${area.id}`,
        from: areaId,
        to: openHubId,
        stroke: "#a5b4fc",
      })

      const shownOpenTasks = area.openTasks.slice(0, MAX_OPEN_TASKS_PER_AREA)
      const openSpacing = 72
      const openStartX =
        openHubX - ((shownOpenTasks.length - 1) * openSpacing) / 2

      shownOpenTasks.forEach((task, taskIndex) => {
        const taskId = `open-task:${task.id}`
        const taskX = openStartX + taskIndex * openSpacing
        nodes.push({
          id: taskId,
          kind: "openTask",
          label: task.title,
          subtitle: `${task.contributions} c`,
          x: taskX,
          y: openTaskY,
          r: 24,
          parentId: openHubId,
          meta: {
            type: "task",
            areaId: area.id,
            taskId: task.id,
            scope: "open",
            taskType: task.type,
            contributions: task.contributions,
            isDisabled: task.isDisabled,
          },
        })
        edges.push({
          id: `edge:open-task:${task.id}`,
          from: openHubId,
          to: taskId,
          stroke: "#fcd34d",
        })
      })

      if (area.openTasks.length > MAX_OPEN_TASKS_PER_AREA) {
        const hiddenCount = area.openTasks.length - MAX_OPEN_TASKS_PER_AREA
        const moreId = `open-more:${area.id}`
        const moreX = openStartX + shownOpenTasks.length * openSpacing
        nodes.push({
          id: moreId,
          kind: "more",
          label: `+${hiddenCount}`,
          subtitle: "tasks",
          x: moreX,
          y: openTaskY,
          r: 20,
          parentId: openHubId,
          meta: {
            type: "more",
            parentType: "openTask",
            hiddenCount,
            areaId: area.id,
          },
        })
        edges.push({
          id: `edge:open-more:${area.id}`,
          from: openHubId,
          to: moreId,
          stroke: "#cbd5e1",
        })
      }

      const shownPois = area.pois.slice(0, MAX_POIS_PER_AREA)
      const poiSpacing = 95
      const poiStartX = areaX - ((shownPois.length - 1) * poiSpacing) / 2

      shownPois.forEach((poi, poiIndex) => {
        const poiNodeId = `poi:${poi.id}`
        const poiX = poiStartX + poiIndex * poiSpacing
        nodes.push({
          id: poiNodeId,
          kind: "poi",
          label: poi.name,
          subtitle: `${poi.tasks.length} tasks`,
          x: poiX,
          y: poiY,
          r: 28,
          parentId: areaId,
          meta: {
            type: "poi",
            areaId: area.id,
            poiId: poi.id,
            poiTaskCount: poi.tasks.length,
          },
        })
        edges.push({
          id: `edge:area-poi:${area.id}:${poi.id}`,
          from: areaId,
          to: poiNodeId,
          stroke: "#86efac",
        })

        const shownPoiTasks = poi.tasks.slice(0, MAX_TASKS_PER_POI)
        const taskSpacing = 68
        const taskStartX =
          poiX - ((shownPoiTasks.length - 1) * taskSpacing) / 2

        shownPoiTasks.forEach((task, taskIndex) => {
          const taskNodeId = `poi-task:${task.id}`
          const taskX = taskStartX + taskIndex * taskSpacing
          nodes.push({
            id: taskNodeId,
            kind: "poiTask",
            label: task.title,
            subtitle: `${task.contributions} c`,
            x: taskX,
            y: poiTaskY,
            r: 24,
            parentId: poiNodeId,
            meta: {
              type: "task",
              areaId: area.id,
              poiId: poi.id,
              taskId: task.id,
              scope: "poi",
              taskType: task.type,
              contributions: task.contributions,
              isDisabled: task.isDisabled,
            },
          })
          edges.push({
            id: `edge:poi-task:${poi.id}:${task.id}`,
            from: poiNodeId,
            to: taskNodeId,
            stroke: "#fde68a",
          })
        })

        if (poi.tasks.length > MAX_TASKS_PER_POI) {
          const hiddenCount = poi.tasks.length - MAX_TASKS_PER_POI
          const moreId = `poi-more:${poi.id}`
          const moreX = taskStartX + shownPoiTasks.length * taskSpacing
          nodes.push({
            id: moreId,
            kind: "more",
            label: `+${hiddenCount}`,
            subtitle: "tasks",
            x: moreX,
            y: poiTaskY,
            r: 20,
            parentId: poiNodeId,
            meta: {
              type: "more",
              parentType: "poiTask",
              hiddenCount,
              areaId: area.id,
              poiId: poi.id,
            },
          })
          edges.push({
            id: `edge:poi-more:${poi.id}`,
            from: poiNodeId,
            to: moreId,
            stroke: "#cbd5e1",
          })
        }
      })

      if (area.pois.length > MAX_POIS_PER_AREA) {
        const hiddenPois = area.pois.length - MAX_POIS_PER_AREA
        const morePoiId = `area-poi-more:${area.id}`
        const morePoiX = poiStartX + shownPois.length * poiSpacing
        nodes.push({
          id: morePoiId,
          kind: "more",
          label: `+${hiddenPois}`,
          subtitle: "POIs",
          x: morePoiX,
          y: poiY,
          r: 20,
          parentId: areaId,
          meta: {
            type: "more",
            parentType: "area",
            hiddenCount: hiddenPois,
            areaId: area.id,
          },
        })
        edges.push({
          id: `edge:area-poi-more:${area.id}`,
          from: areaId,
          to: morePoiId,
          stroke: "#cbd5e1",
        })
      }
    })

    return { width, height, nodes, edges }
  }, [campaignName, filteredAreas])

  const nodeMap = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node])),
    [graph.nodes]
  )

  const effectiveActiveNodeId = nodeMap.has(activeNodeId) ? activeNodeId : "campaign"
  const focusedNodeId = hoverNodeId ?? effectiveActiveNodeId
  const selectedNode = nodeMap.get(effectiveActiveNodeId) ?? graph.nodes[0] ?? null

  function isAncestor(ancestorId: string, nodeId: string) {
    let currentId: string | undefined = nodeId
    while (currentId) {
      if (currentId === ancestorId) return true
      currentId = nodeMap.get(currentId)?.parentId
    }
    return false
  }

  function isNodeHighlighted(nodeId: string) {
    if (!focusedNodeId) return true
    return (
      isAncestor(focusedNodeId, nodeId) || isAncestor(nodeId, focusedNodeId)
    )
  }

  function isEdgeHighlighted(edge: GraphEdge) {
    if (!focusedNodeId) return true
    return isNodeHighlighted(edge.from) && isNodeHighlighted(edge.to)
  }

  function describeSelectedNode(node: GraphNode | null) {
    if (!node) return { title: "No selection", lines: [] as string[] }

    switch (node.meta.type) {
      case "campaign":
        return {
          title: "Campaign node",
          lines: [
            `${node.meta.areaCount} areas`,
            `${node.meta.taskCount} tasks represented in the graph`,
          ],
        }
      case "area":
        return {
          title: `Area: ${node.label}`,
          lines: [
            `${node.meta.poiCount} POIs`,
            `${node.meta.openTaskCount} open tasks`,
            `${node.meta.taskCount} total tasks`,
          ],
        }
      case "openHub":
        return {
          title: "OpenTask hub",
          lines: [`${node.meta.openTaskCount} open tasks in this area`],
        }
      case "poi":
        return {
          title: `POI: ${node.label}`,
          lines: [`${node.meta.poiTaskCount} tasks linked to this POI`],
        }
      case "task":
        return {
          title: `Task: ${node.label}`,
          lines: [
            `Scope: ${node.meta.scope === "open" ? "Area-wide OpenTask" : "POI task"}`,
            `Type: ${node.meta.taskType}`,
            `${node.meta.contributions} contributions`,
            node.meta.isDisabled ? "Status: disabled" : "Status: active",
          ],
        }
      case "more":
        return {
          title: "Collapsed group",
          lines: [`${node.meta.hiddenCount} hidden ${node.subtitle ?? "nodes"}`],
        }
      default:
        return { title: node.label, lines: [] as string[] }
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            🧭 Campaign Structure
          </h2>
          <p className="text-xs text-gray-500">
            Interactive graph: Campaign → Areas → POIs/OpenTasks → Tasks
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 p-2 dark:bg-gray-900">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by area, POI or task…"
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        />
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            Campaign
          </span>
          <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            Areas
          </span>
          <span className="rounded bg-indigo-100 px-2 py-0.5 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
            OpenTask
          </span>
          <span className="rounded bg-yellow-100 px-2 py-0.5 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
            POIs
          </span>
          <span className="rounded bg-red-100 px-2 py-0.5 text-red-700 dark:bg-red-900/30 dark:text-red-300">
            Tasks
          </span>
        </div>
      </div>

      {filteredAreas.length === 0 ? (
        <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500 dark:bg-gray-900">
          No nodes match this filter.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-gradient-to-b from-white to-gray-50 dark:border-gray-700 dark:from-gray-800 dark:to-gray-900">
            <svg
              viewBox={`0 0 ${graph.width} ${graph.height}`}
              className="h-[42rem] w-full min-w-[980px]"
              role="img"
              aria-label="Campaign graph"
            >
              <defs>
                {graph.nodes.map((node) => (
                  <clipPath id={nodeClipId(node.id)} key={`clip:${node.id}`}>
                    <circle cx={node.x} cy={node.y} r={node.r - 2} />
                  </clipPath>
                ))}
              </defs>

              {graph.edges.map((edge) => {
                const from = nodeMap.get(edge.from)
                const to = nodeMap.get(edge.to)
                if (!from || !to) return null
                const highlighted = isEdgeHighlighted(edge)
                return (
                  <line
                    key={edge.id}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={edge.stroke}
                    strokeWidth={highlighted ? 3 : 1.5}
                    opacity={highlighted ? 0.9 : 0.18}
                  />
                )
              })}

              {graph.nodes.map((node) => {
                const style = NODE_STYLE[node.kind]
                const highlighted = isNodeHighlighted(node.id)
                const selected = node.id === effectiveActiveNodeId
                const labelMax =
                  node.kind === "campaign" ? 14 : node.kind === "area" ? 11 : 9
                const label = truncate(
                  node.label,
                  labelMax
                )
                const subtitle = node.subtitle ? truncate(node.subtitle, 12) : null
                const forceFitLabel = label.length > 7
                const forceFitSubtitle = Boolean(subtitle && subtitle.length > 9)
                const clipId = nodeClipId(node.id)

                return (
                  <g
                    key={node.id}
                    onClick={() => setActiveNodeId(node.id)}
                    onMouseEnter={() => setHoverNodeId(node.id)}
                    onMouseLeave={() => setHoverNodeId(null)}
                    className="cursor-pointer"
                    style={{ opacity: highlighted ? 1 : 0.22 }}
                  >
                    {selected && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.r + 8}
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth={2.5}
                        opacity={0.85}
                      />
                    )}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.r}
                      fill={style.fill}
                      stroke={style.stroke}
                      strokeWidth={2}
                    />
                    <g clipPath={`url(#${clipId})`}>
                      <text
                        x={node.x}
                        y={subtitle ? node.y - 4 : node.y + 4}
                        textAnchor="middle"
                        fill={style.text}
                        fontSize={node.kind === "campaign" ? 14 : 12}
                        fontWeight={700}
                        stroke="rgba(0,0,0,0.35)"
                        strokeWidth={0.8}
                        paintOrder="stroke"
                        textLength={forceFitLabel ? node.r * 1.45 : undefined}
                        lengthAdjust={
                          forceFitLabel ? "spacingAndGlyphs" : undefined
                        }
                      >
                        {label}
                      </text>
                      {subtitle && (
                        <text
                          x={node.x}
                          y={node.y + 13}
                          textAnchor="middle"
                          fill={style.text}
                          opacity={0.9}
                          fontSize={10}
                          fontWeight={500}
                          stroke="rgba(0,0,0,0.28)"
                          strokeWidth={0.6}
                          paintOrder="stroke"
                          textLength={
                            forceFitSubtitle ? node.r * 1.4 : undefined
                          }
                          lengthAdjust={
                            forceFitSubtitle ? "spacingAndGlyphs" : undefined
                          }
                        >
                          {subtitle}
                        </text>
                      )}
                    </g>
                  </g>
                )
              })}
            </svg>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Selected node
            </p>
            {selectedNode ? (
              <>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                  {describeSelectedNode(selectedNode).title}
                </p>
                <ul className="mt-1 space-y-0.5 text-xs text-gray-600 dark:text-gray-300">
                  {describeSelectedNode(selectedNode).lines.map((line) => (
                    <li key={line}>• {line}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-1 text-xs text-gray-500">Select a node.</p>
            )}
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
