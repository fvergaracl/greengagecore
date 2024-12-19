import DefaultLayout from "../../../components/AdminLayout"
import dynamic from "next/dynamic";


const SubCampaignForm = dynamic(
  () => import("../../../components/AdminLayout/SubCampaignForm"),
  { ssr: false } 
);
import { useRouter } from "next/router"
import Breadcrumb from "../../../components/Breadcrumbs/Breadcrumb"
export default function CreateSubCampaignPage() {
  const router = useRouter()

  return (
    <DefaultLayout>
      <Breadcrumb
        pageName='Create SubCampaign'
        breadcrumbPath='SubCampaign / Create'
      />
      <SubCampaignForm
        onSuccess={() => {
          router.push("/admin/subcampaigns")
        }}
      />
    </DefaultLayout>
  )
}
