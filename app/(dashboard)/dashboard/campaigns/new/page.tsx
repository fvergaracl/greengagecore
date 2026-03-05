// Dashboard — Create campaign page

export const metadata = { title: "New Campaign — GreenCrowd" }

import { NewCampaignForm } from "./_form"
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"

export default function NewCampaignPage() {
  return (
    <div className="max-w-2xl">
      <Breadcrumbs
        items={[
          { href: "/dashboard", label: "Dashboard", emoji: "🏠" },
          { href: "/dashboard/campaigns", label: "Campaigns", emoji: "📢" },
          { label: "New campaign", emoji: "🆕" },
        ]}
      />
      <h1 className="mb-6 mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
        🆕 New Campaign
      </h1>
      <NewCampaignForm />
    </div>
  )
}
