import { NextApiRequest, NextApiResponse } from "next"
import CampaignController from "@/controllers/admin/CampaignController"

const { API_GAME_BASE_URL, API_GAME_APIKEY } = process.env

const checkGameId = async (formattedCampaign: string) => {
  const response = await fetch(
    `${API_GAME_BASE_URL}/games?externalGameId=${formattedCampaign}`,
    {
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_GAME_APIKEY!
      }
    }
  )

  if (!response.ok) throw new Error("Failed to fetch game ID")
  const data = await response.json()
  return data.items?.[0]?.gameId || null
}

const createTaskInGame = async (
  externalTaskId: string,
  gameId: string,
  strategyId: string
) => {
  const response = await fetch(`${API_GAME_BASE_URL}/games/${gameId}/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_GAME_APIKEY!
    },
    body: JSON.stringify({
      externalTaskId,
      strategyId,
      params: [{ key: "variable_bonus_points", value: 10 }]
    })
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Failed to create task "${externalTaskId}": ${err}`)
  }

  return response.json()
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { campaignId } = req.query
  const { strategyId } = req.body || {}

  if (!campaignId)
    return res.status(400).json({ error: "Campaign ID is required" })

  const formattedCampaign = `GREENCROWD_CAMPAIGNID_${campaignId}`

  try {
    const campaign = await CampaignController.getCampaignById(
      campaignId as string
    )
    console.dir(campaign, { depth: null })
    if (!campaign) return res.status(404).json({ error: "Campaign not found" })

    switch (req.method) {
      case "GET": {
        const gameId = await checkGameId(formattedCampaign)
        return gameId
          ? res.status(200).json({ gameId })
          : res.status(404).json({ error: "Game not found" })
      }

      case "POST": {
        if (!strategyId) {
          return res.status(400).json({ error: "Strategy ID is required" })
        }

        let gameId = await checkGameId(formattedCampaign)

        if (!gameId) {
          const createGameRes = await fetch(`${API_GAME_BASE_URL}/games`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-Key": API_GAME_APIKEY!
            },
            body: JSON.stringify({
              externalGameId: formattedCampaign,
              platform: "GREENCROWD",
              strategyId,
              params: [{ key: "variable_basic_points", value: 10 }]
            })
          })

          if (!createGameRes.ok) {
            const err = await createGameRes.text()
            return res
              .status(500)
              .json({ error: "Failed to create game", details: err })
          }

          const newGame = await createGameRes.json()
          gameId = newGame.gameId
          await CampaignController.updateGameId(campaignId as string, gameId)
        }

        // Fetch current tasks in GAME
        const gameTasksRes = await fetch(
          `${API_GAME_BASE_URL}/games/${gameId}/tasks?page_size=1000`,
          {
            headers: {
              "Content-Type": "application/json",
              "X-API-Key": API_GAME_APIKEY!
            }
          }
        )
        if (!gameTasksRes.ok) throw new Error("Failed to fetch tasks from game")
        const gameTasksData = await gameTasksRes.json()
        const existingExternalTaskIds = gameTasksData.items.map(
          (t: any) => t.externalTaskId
        )

        const tasks = await CampaignController.getAllTasksByCampaignId(
          campaignId as string
        )
        const poiId = campaign.poiId || null
        // WIP
        const newTasks = tasks.filter(
          task =>
            !existingExternalTaskIds.includes(
              `GREENCROWD_CAMPAIGNID_${campaignId}_POI_${poiId}_TASK_${task.id}`
            )
        )
        const allCreatedTaskIds = []
        for (const task of newTasks) {
          const extId = `GREENCROWD_CAMPAIGNID_${campaignId}_POI_${poiId}_TASK_${task.id}`
          await createTaskInGame(extId, gameId, strategyId)
          allCreatedTaskIds.push(extId)
        }

        const openTasks = await CampaignController.getAllOpenTasksByCampaignId(
          campaignId as string
        )
        const newOpenTasks = openTasks.filter(
          task =>
            !existingExternalTaskIds.includes(
              `GREENCROWD_CAMPAIGNID_${campaignId}_OPENTASK_${task.id}`
            )
        )
        const allCreatedOpenTaskIds = []
        for (const task of newOpenTasks) {
          const extId = `GREENCROWD_CAMPAIGNID_${campaignId}_OPENTASK_${task.id}`
          await createTaskInGame(extId, gameId, strategyId)
          allCreatedOpenTaskIds.push(extId)
        }

        return res.status(201).json({
          gameId,
          createdTasks: allCreatedTaskIds,
          createdOpenTasks: allCreatedOpenTaskIds,
          message: "Game and associated tasks created successfully"
        })
      }

      case "DELETE": {
        await CampaignController.updateGameId(campaignId as string, "")
        return res
          .status(204)
          .json({ message: "Game ID removed from campaign" })
      }

      default:
        res.setHeader("Allow", ["GET", "POST", "DELETE"])
        return res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (err: any) {
    console.error("❌ API Error:", err)
    return res
      .status(500)
      .json({ error: err?.message || "Internal Server Error" })
  }
}
