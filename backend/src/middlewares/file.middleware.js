const multer = require("multer")


const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 4 * 1024 * 1024,
        fieldSize: 20 * 1024,
        fields: 2,
        files: 1,
        parts: 3
    },
    fileFilter(req, file, callback) {
        const supportedMimeType = ["application/pdf", "application/octet-stream", ""].includes(file.mimetype)
        if (!supportedMimeType || !file.originalname.toLowerCase().endsWith(".pdf")) {
            return callback(new Error("Only PDF resumes are supported."))
        }
        return callback(null, true)
    }
})


module.exports = upload