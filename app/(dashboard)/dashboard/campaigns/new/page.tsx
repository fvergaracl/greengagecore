// Dashboard — Create campaign page

export const metadata = { title: "New Campaign — GreenCrowd" }

import { NewCampaignForm } from "./_form"

export default function NewCampaignPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">
        New Campaign
      </h1>
      <NewCampaignForm />
    </div>
  )
}
