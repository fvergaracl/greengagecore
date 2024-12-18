import DefaultLayout from "../../../components/AdminLayout"
import CampaignForm from "../../../components/AdminLayout/CampaignForm"
import { useRouter } from "next/router"
import Breadcrumb from "../../../components/Breadcrumbs/Breadcrumb"
export default function CreateCampaignPage() {
  const router = useRouter()

  return (
    <DefaultLayout>
      <Breadcrumb pageName='Create Campaign' breadcrumbPath='Campaigns / Create' />
      <CampaignForm
        onSuccess={() => {
          router.push("/admin/campaigns")
        }}
      />
    </DefaultLayout>
  )
}
