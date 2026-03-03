// GreenCrowd V2 — IDs externos determinísticos para GAME
// Mantiene compatibilidad con V1 (gameExternalIds.ts)

const assertId = (value: string, name: string): string => {
  if (!value?.trim()) throw new Error(`${name} is required`)
  return value.trim()
}

export const buildCampaignExternalGameId = (campaignId: string): string =>
  `GREENCROWD_CAMPAIGNID_${assertId(campaignId, "campaignId")}`

export const buildPoiTaskExternalTaskId = (
  campaignId: string,
  poiId: string,
  taskId: string
): string =>
  `GREENCROWD_CAMPAIGNID_${assertId(campaignId, "campaignId")}_POI_${assertId(poiId, "poiId")}_TASK_${assertId(taskId, "taskId")}`

export const buildOpenTaskExternalTaskId = (
  campaignId: string,
  openTaskId: string
): string =>
  `GREENCROWD_CAMPAIGNID_${assertId(campaignId, "campaignId")}_OPENTASK_${assertId(openTaskId, "openTaskId")}`
