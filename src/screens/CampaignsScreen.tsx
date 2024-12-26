import React, { useState, useEffect } from "react"
import { FaGamepad } from "react-icons/fa"
import { useDashboard } from "../context/DashboardContext"
import Swal from "sweetalert2"
import { API_BASE_URL } from "../config/api" // Import API config
import { useRouter } from "next/router"
import { SlEnvolopeLetter } from "react-icons/sl"
export default function CampaignsScreen() {
  const router = useRouter()

  const { setSelectedCampaign, selectedCampaign } = useDashboard()
  const [campaigns, setCampaigns] = useState([])
  const [loadingCampaignId, setLoadingCampaignId] = useState<string | null>(
    null
  )
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const [allCampaignsRes, mineCampaignsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/campaign`),
          fetch(`${API_BASE_URL}/campaign/mine`)
        ])

        const allCampaigns = await allCampaignsRes.json()
        const mineCampaigns = await mineCampaignsRes.json()

        const campaignsWithJoinStatus = allCampaigns.map(campaign => ({
          ...campaign,
          isJoined: mineCampaigns.some(
            (mine: { campaignId: string }) => mine.campaignId === campaign.id
          )
        }))

        const filteredCampaigns = campaignsWithJoinStatus.sort((a, b) => {
          const aExpired = a.deadline
            ? new Date(a.deadline) < new Date()
            : false
          const bExpired = b.deadline
            ? new Date(b.deadline) < new Date()
            : false
          return aExpired - bExpired
        })

        setCampaigns(filteredCampaigns)
      } catch (error) {
        console.error("Error fetching campaigns:", error)
        Swal.fire("Error", "Failed to load campaigns", "error")
      }
    }

    fetchCampaigns()
  }, [])

  const handleJoin = async (campaign: any) => {
    if (campaign.isJoined) {
      setSelectedCampaign(campaign)
      router.push("/dashboard")
    } else {
      setLoadingCampaignId(campaign.id)
      try {
        const response = await fetch(`${API_BASE_URL}/campaign/access`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId: campaign.id,
            accessType: "participant"
          })
        })

        if (response.ok) {
          setCampaigns(prev =>
            prev.map(c => (c.id === campaign.id ? { ...c, isJoined: true } : c))
          )

          Swal.fire(
            "Success",
            "You have successfully joined the campaign!",
            "success"
          )
        } else {
          const errorData = await response.json()
          Swal.fire(
            "Error",
            errorData.error || "Failed to join the campaign",
            "error"
          )
        }
      } catch (error) {
        console.error("Error joining campaign:", error)
        Swal.fire("Error", "An unexpected error occurred", "error")
      } finally {
        setLoadingCampaignId(null)
      }
    }
  }

  return (
    <div className='h-screen flex flex-col items-center bg-gray-50 p-4'>
      <h1
        className='text-2xl font-bold mb-6 text-center text-gray-800'
        data-cy='campaigns-screen-title'
      >
        Select a Campaign to Continue
      </h1>

      <div className='w-full max-w-xxl space-y-4'>
        {campaigns.map(campaign => {
          const isExpired = campaign.deadline
            ? new Date(campaign.deadline) < new Date()
            : false

          const isSelected =
            selectedCampaign && selectedCampaign.id === campaign.id
          return (
            <div
              key={campaign.id}
              className={`flex items-center justify-between p-4 border rounded-lg shadow-md ${
                isExpired
                  ? "bg-gray-200 opacity-70"
                  : isSelected
                  ? "bg-blue-100 border-blue-500"
                  : "bg-white"
              }`}
            >
              <div className='flex items-center'>
                {campaign.gameId && (
                  <FaGamepad className='text-green-500 mr-2 text-xl' />
                )}
                <div>
                  <h2
                    className='text-lg font-semibold text-gray-800 flex items-center'
                    data-cy='campaign-name'
                  >
                    {!campaign?.isOpen && (
                      <span
                        className='relative group text-xs text-red-500'
                        data-cy='campaign-status'
                      >
                        <SlEnvolopeLetter className='text-red-500 mr-1' />
                        <div className='absolute hidden group-hover:flex flex-col items-center left-1/2 transform -translate-x-1 bottom-full mb-2 bg-gray-700 text-white text-xs rounded-md py-1 px-2 shadow-lg w-max'>
                          <span data-cy='campaign-status-message'>
                            Access by invitation only.
                          </span>
                          <span
                            className='text-gray-300'
                            data-cy='campaign-status-message'
                          >
                            You can see this because you were invited.
                          </span>
                        </div>
                      </span>
                    )}

                    <span>{campaign.name}</span>
                  </h2>
                  <p
                    className='text-gray-600 text-sm'
                    data-cy='campaign-description'
                  >
                    {campaign.description}
                  </p>

                  {campaign.deadline && (
                    <span
                      className='text-xs text-red-500'
                      data-cy='campaign-deadline'
                    >
                      Open until:{" "}
                      {new Date(campaign.deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleJoin(campaign)}
                disabled={isExpired || loadingCampaignId === campaign.id}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                  isExpired
                    ? "bg-gray-300 text-gray-400 cursor-not-allowed"
                    : campaign.isJoined
                    ? "bg-green-500 text-white hover:bg-green-600"
                    : "bg-blue-500 text-white hover:bg-blue-600"
                } ${isSelected ? "ring-2 ring-blue-500" : ""}`}
                data-cy='join-campaign-button'
              >
                {loadingCampaignId === campaign.id
                  ? "Joining..."
                  : isExpired
                  ? "Expired"
                  : campaign.isJoined
                  ? isSelected
                    ? "Go to Campaign"
                    : "Joined"
                  : "Join"}
              </button>
            </div>
          )
        })}
      </div>

      {isModalOpen && selectedCampaign && (
        <div className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 p-4'>
          <div className='bg-white p-6 rounded-lg shadow-lg w-full max-w-md'>
            <h2 className='text-lg font-bold mb-4 text-gray-800'>
              Campaign: {selectedCampaign.name}
            </h2>
            <p className='text-gray-600'>{selectedCampaign.description}</p>
            <button
              onClick={() => setIsModalOpen(false)}
              className='mt-4 w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition'
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
