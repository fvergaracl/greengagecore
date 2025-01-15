const WebSocket = require("ws")
const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

const server = new WebSocket.Server({ port: 8080 })

server.on("connection", ws => {
  console.log("Client connected")

  ws.on("message", async message => {
    try {
      const data = JSON.parse(message)
      if (data.type === "getDataEntries") {
        const dataEntries = await prisma.dataEntry.findMany()
        ws.send(JSON.stringify({ type: "dataEntries", payload: dataEntries }))
      }

      if (data.type === "getAreas") {
        const areas = await prisma.area.findMany()
        ws.send(JSON.stringify({ type: "areas", payload: areas }))
      }
    } catch (err) {
      console.error("Error handling message:", err)
    }
  })

  ws.on("close", () => {
    console.log("Client disconnected")
  })
})

console.log("WebSocket server is running on ws://localhost:8080")
