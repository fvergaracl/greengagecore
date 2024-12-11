const WebSocket = require("ws")
const server = new WebSocket.Server({ port: 8080 })

let puntos = [
  {
    latitud: 40.416775,
    longitud: -3.70379,
    titulo: "Madrid",
    detalle: "Capital de España",
    tipo: "Ciudad",
    punto: "1"
  },
  {
    latitud: 41.3874,
    longitud: 2.1686,
    titulo: "Barcelona",
    detalle: "Ciudad famosa por Gaudí",
    tipo: "Ciudad",
    punto: "2"
  }
]

let poligonos = [
  {
    coordinates: [
      [40.416775, -3.70379],
      [40.420775, -3.70379],
      [40.420775, -3.70979],
      [40.416775, -3.70979]
    ],
    score: 50
  },
  {
    coordinates: [
      [41.3874, 2.1686],
      [41.3904, 2.1686],
      [41.3904, 2.1736],
      [41.3874, 2.1736]
    ],
    score: 75
  }
]

server.on("connection", socket => {
  console.log("Client connected")

  // Emit initial data
  socket.send(JSON.stringify({ puntos, poligonos }))

  // Example: Update data every 10 seconds
  setInterval(() => {
    puntos.push({
      latitud: 42.0 + Math.random(),
      longitud: -4.0 + Math.random(),
      titulo: `New Point ${Math.random()}`,
      detalle: "Generated in real-time",
      tipo: "Random",
      punto: `${Math.random()}`
    })

    socket.send(JSON.stringify({ puntos, poligonos }))
  }, 10000)

  socket.on("close", () => console.log("Client disconnected"))
})
