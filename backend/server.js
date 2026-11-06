require("dotenv").config()
const dns = require("node:dns")
const dnsServers = (process.env.DNS_SERVERS || "8.8.8.8,8.8.4.4")
    .split(",")
    .map(server => server.trim())
    .filter(Boolean)

dns.setServers(dnsServers)

const app = require("./src/app")
const connectToDB = require("./src/config/database")

const port = Number(process.env.PORT) || 3000
const requiredEnvironment = ["MONGO_URI", "JWT_SECRET", "GOOGLE_GENAI_API_KEY"]
const missingEnvironment = requiredEnvironment.filter(name => !process.env[name])

if (missingEnvironment.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvironment.join(", ")}`)
}
if (Buffer.byteLength(process.env.JWT_SECRET, "utf8") < 32) {
    throw new Error("JWT_SECRET must be at least 32 bytes long.")
}

async function startServer() {
    await connectToDB()
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`)
    })
}

startServer().catch(error => {
    console.error("Server startup failed:", error.message)
    process.exit(1)
})