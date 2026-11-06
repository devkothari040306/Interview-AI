const pdfParse = require("pdf-parse")
const { z } = require("zod")
const { generateInterviewReport, generateResumePdf } = require("../services/ai.service")
const interviewReportModel = require("../models/interviewReport.model")

const reportIdSchema = z.string().regex(/^[\da-f]{24}$/i)
const interviewRequestSchema = z.object({
    jobDescription: z.string().trim().min(1).max(5000),
    selfDescription: z.string().trim().max(2000).optional().default("")
})



/**
 * @description Controller to generate interview report based on user self description, resume and job description.
 */
async function generateInterViewReportController(req, res) {
    const parsedBody = interviewRequestSchema.safeParse(req.body)
    if (!parsedBody.success) {
        return res.status(400).json({
            message: "Job description is required and must be 5000 characters or fewer; self-description must be 2000 characters or fewer."
        })
    }

    const { selfDescription, jobDescription } = parsedBody.data
    if (!req.file && !selfDescription) {
        return res.status(400).json({
            message: "Upload a PDF resume or provide a self-description."
        })
    }

    let resume = ""
    if (req.file) {
        if (req.file.buffer.subarray(0, 5).toString() !== "%PDF-") {
            return res.status(400).json({ message: "The uploaded file is not a valid PDF." })
        }

        try {
            const resumeContent = await (new pdfParse.PDFParse(Uint8Array.from(req.file.buffer))).getText()
            resume = resumeContent.text.trim()
        } catch {
            return res.status(400).json({ message: "The uploaded PDF could not be read." })
        }

        if (!resume && !selfDescription) {
            return res.status(400).json({
                message: "This PDF contains no readable text. Provide a self-description or upload a text-based PDF."
            })
        }
    }

    const interviewReportByAi = await generateInterviewReport({
        resume,
        selfDescription,
        jobDescription
    })

    const interviewReport = await interviewReportModel.create({
        user: req.user.id,
        resume,
        selfDescription,
        jobDescription,
        ...interviewReportByAi
    })

    res.status(201).json({
        message: "Interview report generated successfully.",
        interviewReport
    })

}

/**
 * @description Controller to get interview report by interviewId.
 */
async function getInterviewReportByIdController(req, res) {

    const { interviewId } = req.params
    if (!reportIdSchema.safeParse(interviewId).success) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id })

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    res.status(200).json({
        message: "Interview report fetched successfully.",
        interviewReport
    })
}


/** 
 * @description Controller to get all interview reports of logged in user.
 */
async function getAllInterviewReportsController(req, res) {
    const interviewReports = await interviewReportModel.find({ user: req.user.id }).sort({ createdAt: -1 }).select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")

    res.status(200).json({
        message: "Interview reports fetched successfully.",
        interviewReports
    })
}


/**
 * @description Controller to generate resume PDF based on user self description, resume and job description.
 */
async function generateResumePdfController(req, res) {
    const { interviewReportId } = req.params

    if (!reportIdSchema.safeParse(interviewReportId).success) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    const interviewReport = await interviewReportModel.findOne({
        _id: interviewReportId,
        user: req.user.id
    })

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    const { resume, jobDescription, selfDescription } = interviewReport

    const pdfBuffer = await generateResumePdf({ resume, jobDescription, selfDescription })

    res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`
    })

    res.send(pdfBuffer)
}

module.exports = { generateInterViewReportController, getInterviewReportByIdController, getAllInterviewReportsController, generateResumePdfController }