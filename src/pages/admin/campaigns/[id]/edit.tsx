import DefaultLayout from "../../../../components/AdminLayout"
import CampaignForm from "../../../../components/AdminLayout/CampaignForm"
import { useRouter } from "next/router"
import Breadcrumb from "../../../../components/Breadcrumbs/Breadcrumb"

export default function EditCampaignPage() {
  const router = useRouter()
  const { id } = router.query

  return (
    <DefaultLayout>
      <Breadcrumb
        pageName={id ? `Edit Campaign ${id}` : "Edit Campaign"}
        breadcrumbPath='Campaigns / Edit'
      />
      {id ? (
        <CampaignForm
          campaignId={id as string}
          onSuccess={() => {
            router.push("/admin/campaigns")
          }}
        />
      ) : (
        <p>Loading...</p>
      )}
    </DefaultLayout>
  )
}
