const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")
const multer = require("multer")
const mongoose = require("mongoose")
const connectToDB = require("./config/database")

const app = express()
let databaseConnection
const configuredOrigins = (process.env.CORS_ORIGINS || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5173"))
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean)
const deploymentOrigins = [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
]
    .filter(Boolean)
    .map(host => `https://${host}`)
const allowedOrigins = new Set([...configuredOrigins, ...deploymentOrigins])

if (process.env.NODE_ENV === "production" && allowedOrigins.size === 0) {
    throw new Error("Set CORS_ORIGINS to the frontend origin before starting in production.")
}

const sameSite = (process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === "production" ? "none" : "lax")).toLowerCase()
if (!["lax", "strict", "none"].includes(sameSite.toLowerCase())) {
    throw new Error("COOKIE_SAME_SITE must be lax, strict, or none.")
}

const trustProxySetting = process.env.TRUST_PROXY?.toLowerCase()
const trustProxy = trustProxySetting === "false"
    ? false
    : trustProxySetting === "true"
        ? 1
        : trustProxySetting && /^\d+$/.test(trustProxySetting)
            ? Number(trustProxySetting)
            : trustProxySetting || (process.env.NODE_ENV === "production" ? 1 : false)
app.set("trust proxy", trustProxy)

app.use(express.json({ limit: "32kb" }))
app.use(cookieParser())
app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
            return callback(null, true)
        }
        return callback(new Error("Origin is not allowed by CORS."))
    },
    credentials: true
}))
app.use((req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        return next()
    }

    const origin = req.get("origin")
    if (!origin || !allowedOrigins.has(origin)) {
        return res.status(403).json({ message: "Request origin is not allowed." })
    }

    return next()
})

app.use(async (req, res, next) => {
    const missingEnvironment = ["MONGO_URI", "JWT_SECRET", "GOOGLE_GENAI_API_KEY"]
        .filter(name => !process.env[name])

    if (missingEnvironment.length > 0) {
        console.error(`Missing required environment variables: ${missingEnvironment.join(", ")}`)
        return res.status(503).json({ message: "The service is not configured yet." })
    }

    if (Buffer.byteLength(process.env.JWT_SECRET, "utf8") < 32) {
        console.error("JWT_SECRET must be at least 32 bytes long.")
        return res.status(503).json({ message: "The service is not configured yet." })
    }

    try {
        if (mongoose.connection.readyState !== 1) {
            databaseConnection ??= connectToDB().catch(error => {
                databaseConnection = undefined
                throw error
            })
            await databaseConnection
        }
    } catch (error) {
        console.error("MongoDB connection failed:", error.message)
        return res.status(503).json({ message: "The database is temporarily unavailable." })
    }

    return next()
})

/* require all the routes here */
function resolveRouter(routerModule) {
    const router = typeof routerModule === "function" ? routerModule : routerModule.default
    if (typeof router !== "function") {
        throw new TypeError("An API route module did not export an Express router.")
    }
    return router
}

const authRouter = resolveRouter(require("./routes/auth.routes"))
const interviewRouter = resolveRouter(require("./routes/interview.routes"))

/* using all the routes here */
app.use("/api/auth", authRouter)
app.use("/api/interview", interviewRouter)

app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error)
    }

    if (error instanceof multer.MulterError) {
        const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400
        return res.status(status).json({
            message: status === 413 ? "Resume must be 4 MB or smaller." : "Resume upload is invalid."
        })
    }

    if (error.type === "entity.parse.failed") {
        return res.status(400).json({ message: "Request body contains invalid JSON." })
    }

    if (error.type === "entity.too.large") {
        return res.status(413).json({ message: "Request body is too large." })
    }

    if (error.code === 11000) {
        return res.status(409).json({ message: "An account already exists with those details." })
    }

    if (error.statusCode === 502 && error.publicMessage) {
        return res.status(502).json({ message: error.publicMessage })
    }

    if (error.message === "Only PDF resumes are supported.") {
        return res.status(400).json({ message: error.message })
    }

    if (error.message === "Origin is not allowed by CORS.") {
        return res.status(403).json({ message: "Request origin is not allowed." })
    }

    console.error(error)
    return res.status(500).json({ message: "An unexpected server error occurred." })
})


module.exports = app