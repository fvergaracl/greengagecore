import CampaignsScreen from "@/screens/CampaignsScreen"
import DashboardLayout from "../../components/DashboardLayout"
import { useRouter } from "next/router"

export default function Campaigns() {

  const router = useRouter()

  const { invite: campaignId } = router.query
  return (
    <DashboardLayout>
      <CampaignsScreen campaignId={campaignId} />
    </DashboardLayout>
  )
}

