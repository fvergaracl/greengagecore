import axios from "axios"

const axiosInstance = axios.create({
  timeout: 10000 // Timeout is set to 10 seconds
})

export default axiosInstance
