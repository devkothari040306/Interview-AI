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

test("health endpoint confirms the API can serve requests", async () => {
    const server = app.listen(0)
    await new Promise(resolve => server.once("listening", resolve))

    try {
        const response = await new Promise((resolve, reject) => {
            http.get(`http://127.0.0.1:${server.address().port}/api/health`, incoming => {
                let body = ""
                incoming.setEncoding("utf8")
                incoming.on("data", chunk => { body += chunk })
                incoming.on("end", () => resolve({
                    status: incoming.statusCode,
                    body: JSON.parse(body)
                }))
            }).on("error", reject)
        })

        assert.equal(response.status, 200)
        assert.deepEqual(response.body, { status: "ok" })
    } finally {
        await new Promise((resolve, reject) => {
            server.close(error => error ? reject(error) : resolve())
        })
    }
})
