const ws = new WebSocket("ws://localhost:8080")

// WebSocket event handlers
ws.onopen = () => {
  console.log("WebSocket connected")
}

ws.onmessage = event => {
  const data = JSON.parse(event.data)
  console.log("Received:", data)

  // Handle incoming messages
  if (data.type === "dataEntries") {
    console.log("Data Entries:", data.payload)
  }

  if (data.type === "subCampaigns") {
    console.log("SubCampaigns:", data.payload)
  }
}

ws.onclose = () => {
  console.log("WebSocket disconnected")
}

export default ws
