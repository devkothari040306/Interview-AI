const assert = require("node:assert/strict")
const { test } = require("node:test")
const blacklistTokenModel = require("../src/models/blacklist.model")
const interviewReportModel = require("../src/models/interviewReport.model")

test("interview reports have an index for each user's newest reports", () => {
    const indexes = interviewReportModel.schema.indexes()

    assert.ok(indexes.some(([ fields ]) =>
        fields.user === 1 && fields.createdAt === -1
    ))
})

test("blacklisted tokens expire when their one-day JWT lifetime ends", () => {
    const indexes = blacklistTokenModel.schema.indexes()

    assert.ok(indexes.some(([ fields, options ]) =>
        fields.createdAt === 1 && options.expireAfterSeconds === 24 * 60 * 60
    ))
})
