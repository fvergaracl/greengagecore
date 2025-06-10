import DashboardLayout from "@/components/DashboardLayout"
import { useTranslation } from "@/hooks/useTranslation"
import { useDashboard } from "@/context/DashboardContext"
import CampaignsScreen from "@/screens/CampaignsScreen"
import { usePendingQuestionnaires } from "@/hooks/usePendingQuestionnaires"
import { useRouter } from "next/router"
import {
  Box,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Button,
  Alert
} from "@mui/material"
import { motion } from "framer-motion"

export default function QuestionnairesPage() {
  const { t } = useTranslation()
  const { selectedCampaign } = useDashboard()
  const router = useRouter()

  const { pending, loading, error } = usePendingQuestionnaires(
    selectedCampaign?.id
  )

  if (!selectedCampaign) {
    return (
      <DashboardLayout>
        <CampaignsScreen />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <Box p={2}>
        <Typography variant='h4' gutterBottom>
          {t("📝 Pending Questionnaires")}
        </Typography>
        <Typography variant='body1' color='text.secondary' mb={3}>
          {t(
            "You need to complete the following questionnaires to continue participating in the campaign."
          )}
        </Typography>

        {loading && (
          <Box display='flex' justifyContent='center' mt={6}>
            <CircularProgress size={48} />
          </Box>
        )}

        {error && (
          <Alert severity='error' sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && pending.length === 0 && (
          <Box mt={6} textAlign='center'>
            <Typography variant='h5' gutterBottom>
              {t("🎉 All questionnaires completed!")}
            </Typography>
            <Typography variant='body1' color='text.secondary'>
              {t("You have no pending questionnaires for this campaign.")}
            </Typography>
          </Box>
        )}

        {!loading &&
          !error &&
          pending.map((q, index) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card variant='outlined' sx={{ mb: 2, boxShadow: 1 }}>
                <CardContent>
                  <Typography variant='h6' gutterBottom>
                    {q.title}
                  </Typography>
                  <Typography variant='body2' color='text.secondary' mb={1}>
                    {t("Condition")}: {t(q.condition)}
                    {q.frequencyInDays
                      ? ` (${q.frequencyInDays} ${t("days")})`
                      : ""}
                  </Typography>
                  <Chip
                    label={t(q.reason)}
                    color='warning'
                    size='small'
                    sx={{ mb: 2 }}
                  />

                  <Box display='flex' justifyContent='flex-end'>
                    <Button
                      variant='contained'
                      color='primary'
                      onClick={() =>
                        router.push(`/dashboard/questionnaires/${q.id}`)
                      }
                    >
                      {t("Start now")}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          ))}
      </Box>
    </DashboardLayout>
  )
}
