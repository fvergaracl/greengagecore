async function handleSearch(ws, message, collection) {
  try {
    const query = JSON.parse(message)
    const results = await collection.find(query).toArray()
    ws.send(JSON.stringify({ type: "search_results", results }))
  } catch (error) {
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Error al buscar: " + error.message
      })
    )
  }
}

async function handleAdd(ws, message, collection) {
  try {
    const newRecord = JSON.parse(message)
    const result = await collection.insertOne(newRecord)
    ws.send(
      JSON.stringify({ type: "add_success", insertedId: result.insertedId })
    )
  } catch (error) {
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Error al agregar: " + error.message
      })
    )
  }
}

module.exports = { handleSearch, handleAdd }
