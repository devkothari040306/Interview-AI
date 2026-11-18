const mongoose = require("mongoose")

class MongoRateLimitStore {
    constructor(namespace) {
        this.namespace = namespace
        this.windowMs = 0
        this.indexPromise = null
    }

    init(options) {
        this.windowMs = options.windowMs
    }

    async increment(key) {
        const collection = mongoose.connection.collection("rateLimitCounters")
        if (!this.indexPromise) {
            this.indexPromise = collection.createIndex(
                { expiresAt: 1 },
                { expireAfterSeconds: 0 }
            ).catch(error => {
                this.indexPromise = null
                throw error
            })
        }
        await this.indexPromise

        const now = new Date()
        const expiresAt = new Date(now.getTime() + this.windowMs)
        const id = `${this.namespace}:${key}`
        const update = [ {
            $set: {
                totalHits: {
                    $cond: [
                        { $gt: [ "$expiresAt", now ] },
                        { $add: [ { $ifNull: [ "$totalHits", 0 ] }, 1 ] },
                        1
                    ]
                },
                expiresAt: {
                    $cond: [
                        { $gt: [ "$expiresAt", now ] },
                        "$expiresAt",
                        expiresAt
                    ]
                }
            }
        } ]

        let record
        try {
            record = await collection.findOneAndUpdate(
                { _id: id },
                update,
                { upsert: true, returnDocument: "after" }
            )
        } catch (error) {
            if (error.code !== 11000) {
                throw error
            }
            record = await collection.findOneAndUpdate(
                { _id: id },
                update,
                { returnDocument: "after" }
            )
        }

        if (!record) {
            throw new Error("MongoDB did not return the updated rate-limit counter.")
        }

        return {
            totalHits: record.totalHits,
            resetTime: record.expiresAt
        }
    }

    async decrement(key) {
        await mongoose.connection.collection("rateLimitCounters").updateOne(
            { _id: `${this.namespace}:${key}` },
            { $inc: { totalHits: -1 } }
        )
    }

    async resetKey(key) {
        await mongoose.connection.collection("rateLimitCounters").deleteOne({
            _id: `${this.namespace}:${key}`
        })
    }
}

module.exports = MongoRateLimitStore
