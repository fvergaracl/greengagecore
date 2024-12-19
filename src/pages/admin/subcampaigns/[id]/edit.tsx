import DefaultLayout from "../../../../components/AdminLayout"
import dynamic from "next/dynamic"

const SubCampaignForm = dynamic(
  () => import("../../../../components/AdminLayout/SubCampaignForm")
)
import { useRouter } from "next/router"
import Breadcrumb from "../../../../components/Breadcrumbs/Breadcrumb"

export default function EditSubCampaignPage() {
  const router = useRouter()
  const { id } = router.query

  return (
    <DefaultLayout>
      <Breadcrumb
        pageName={id ? `Edit SubCampaign ${id}` : "Edit SubCampaign"}
        breadcrumbPath='SubCampaign / Edit'
      />
      {id ? (
        <SubCampaignForm
          subCampaignId={id as string}
          onSuccess={() => {
            router.push("/admin/subcampaigns")
          }}
        />
      ) : (
        <p>Loading...</p>
      )}
    </DefaultLayout>
  )
}
