const assert = require("node:assert/strict")
const http = require("node:http")
const { test } = require("node:test")

process.env.NODE_ENV = "test"
process.env.MONGO_URI = "mongodb://127.0.0.1:27017/resume_builder_test"
process.env.JWT_SECRET = "test-secret-with-more-than-thirty-two-bytes"
process.env.GOOGLE_GENAI_API_KEY = "test-key"
process.env.CORS_ORIGINS = "http://localhost:5173"

const databaseModulePath = require.resolve("../src/config/database")
const previousDatabaseModule = require.cache[databaseModulePath]
require.cache[databaseModulePath] = {
    id: databaseModulePath,
    filename: databaseModulePath,
    loaded: true,
    exports: async () => {}
}

const app = require("../src/app")

if (previousDatabaseModule) {
    require.cache[databaseModulePath] = previousDatabaseModule
} else {
    delete require.cache[databaseModulePath]
}

test("health and protected route handlers survive router module loading", async () => {
    const server = app.listen(0)
    await new Promise(resolve => server.once("listening", resolve))

    try {
        const getResponse = path => new Promise((resolve, reject) => {
            http.get(`http://127.0.0.1:${server.address().port}${path}`, incoming => {
                let body = ""
                incoming.setEncoding("utf8")
                incoming.on("data", chunk => { body += chunk })
                incoming.on("end", () => resolve({
                    status: incoming.statusCode,
                    body: JSON.parse(body)
                }))
            }).on("error", reject)
        })

        assert.deepEqual(await getResponse("/api/health"), {
            status: 200,
            body: { status: "ok" }
        })
        assert.deepEqual(await getResponse("/api/auth/get-me"), {
            status: 401,
            body: { message: "Token not provided." }
        })
    } finally {
        await new Promise((resolve, reject) => {
            server.close(error => error ? reject(error) : resolve())
        })
    }
})
