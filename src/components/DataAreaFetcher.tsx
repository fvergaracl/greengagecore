import React, { useEffect, useState } from "react"
import ws from "../utils/websocket"

const DataAreaFetcher = () => {
  const [dataEntries, setDataEntries] = useState([])
  const [areas, setAreas] = useState([])
  const [isWebSocketReady, setIsWebSocketReady] = useState(false)

  useEffect(() => {
    // Open WebSocket connection and mark as ready
    ws.onopen = () => {
      setIsWebSocketReady(true)
    }

    // Handle WebSocket messages
    ws.onmessage = event => {
      const data = JSON.parse(event.data)

      if (data.type === "dataEntries") {
        setDataEntries(data.payload)
      }

      if (data.type === "areas") {
        setAreas(data.payload)
      }
    }

    ws.onerror = error => {
      console.error("WebSocket Error:", error)
    }

    return () => {
      ws.close()
    }
  }, [])

  useEffect(() => {
    if (isWebSocketReady) {
      // Send requests only when the WebSocket is ready
      ws.send(JSON.stringify({ type: "getDataEntries" }))
      ws.send(JSON.stringify({ type: "getAreas" }))
    }
  }, [isWebSocketReady])

  return (
    <div>
      <h1>Data Entries</h1>
      <ul>
        {dataEntries.map(entry => (
          <li key={entry.id}>{JSON.stringify(entry)}</li>
        ))}
      </ul>

      <h1>Areas</h1>
      <ul>
        {areas.map(campaign => (
          <li key={campaign.id}>{JSON.stringify(campaign)}</li>
        ))}
      </ul>
    </div>
  )
}

export default DataAreaFetcher
