export async function login(username, password) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket("ws://localhost:8080")

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "login",
          username,
          password
        })
      )
    }

    ws.onmessage = event => {
      const response = JSON.parse(event.data)

      if (response.type === "login_success") {
        resolve({ success: true, token: response.token })
      } else if (response.type === "login_error") {
        resolve({ success: false, error: response.message })
      }
    }

    ws.onerror = error => {
      reject(new Error("WebSocket error: " + error.message))
    }

    ws.onclose = () => {
      console.log("Conexión WebSocket cerrada.")
    }
  })
}
