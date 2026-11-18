const assert = require("node:assert/strict")
const { test } = require("node:test")
const mongoose = require("mongoose")
const MongoRateLimitStore = require("../src/middlewares/mongo-rate-limit.store")

test("rate-limit counters are shared by store instances using the same namespace", async () => {
    const records = new Map()
    const collection = {
        createIndex: async () => "expiresAt_1",
        findOneAndUpdate: async (filter, update, options) => {
            assert.deepEqual(filter, { _id: "auth:127.0.0.1" })
            assert.equal(options.upsert, true)

            const values = update[0].$set
            const now = new Date()
            const current = records.get(filter._id)
            const active = current && current.expiresAt > now
            const record = {
                totalHits: active ? current.totalHits + 1 : 1,
                expiresAt: active ? current.expiresAt : values.expiresAt.$cond[2]
            }
            records.set(filter._id, record)
            return record
        }
    }
    const originalCollection = mongoose.connection.collection
    mongoose.connection.collection = () => collection

    try {
        const firstStore = new MongoRateLimitStore("auth")
        const secondStore = new MongoRateLimitStore("auth")
        firstStore.init({ windowMs: 60_000 })
        secondStore.init({ windowMs: 60_000 })

        const [ first, second ] = await Promise.all([
            firstStore.increment("127.0.0.1"),
            secondStore.increment("127.0.0.1")
        ])

        assert.deepEqual([ first.totalHits, second.totalHits ].sort(), [ 1, 2 ])
    } finally {
        mongoose.connection.collection = originalCollection
    }
})
