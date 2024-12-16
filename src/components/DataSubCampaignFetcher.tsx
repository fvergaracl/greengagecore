import React, { useEffect, useState } from "react"
import ws from "../utils/websocket"

const DataSubCampaignFetcher = () => {
  const [dataEntries, setDataEntries] = useState([])
  const [subCampaigns, setSubCampaigns] = useState([])

  useEffect(() => {
    // Request data on mount
    ws.send(JSON.stringify({ type: "getDataEntries" }))
    ws.send(JSON.stringify({ type: "getSubCampaigns" }))

    // Handle WebSocket messages
    ws.onmessage = event => {
      const data = JSON.parse(event.data)

      if (data.type === "dataEntries") {
        setDataEntries(data.payload)
      }

      if (data.type === "subCampaigns") {
        setSubCampaigns(data.payload)
      }
    }

    return () => {
      ws.close()
    }
  }, [])

  return (
    <div>
      <h1>Data Entries</h1>
      <ul>
        {dataEntries.map(entry => (
          <li key={entry.id}>{JSON.stringify(entry)}</li>
        ))}
      </ul>

      <h1>SubCampaigns</h1>
      <ul>
        {subCampaigns.map(campaign => (
          <li key={campaign.id}>{JSON.stringify(campaign)}</li>
        ))}
      </ul>
    </div>
  )
}

export default DataSubCampaignFetcher
