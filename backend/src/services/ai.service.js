const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})

function reportGenerationError(message, cause) {
    const error = new Error(message, { cause })
    error.statusCode = 502
    error.publicMessage = message
    return error
}


const interviewReportSchema = z.object({
    matchScore: z.number().min(0).max(100),
    technicalQuestions: z.array(z.object({
        question: z.string(),
        intention: z.string(),
        answer: z.string()
    })).min(1),
    behavioralQuestions: z.array(z.object({
        question: z.string(),
        intention: z.string(),
        answer: z.string()
    })).min(1),
    skillGaps: z.array(z.object({
        skill: z.string(),
        severity: z.enum([ "low", "medium", "high" ])
    })).min(1),
    preparationPlan: z.array(z.object({
        day: z.number().int().min(1),
        focus: z.string(),
        tasks: z.array(z.string()).min(1)
    })).min(1),
    title: z.string().min(1)
})

const interviewReportJsonSchema = {
    type: "object",
    properties: {
        matchScore: { type: "number" },
        technicalQuestions: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    question: { type: "string" },
                    intention: { type: "string" },
                    answer: { type: "string" }
                },
                required: [ "question", "intention", "answer" ]
            }
        },
        behavioralQuestions: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    question: { type: "string" },
                    intention: { type: "string" },
                    answer: { type: "string" }
                },
                required: [ "question", "intention", "answer" ]
            }
        },
        skillGaps: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    skill: { type: "string" },
                    severity: { type: "string", enum: [ "low", "medium", "high" ] }
                },
                required: [ "skill", "severity" ]
            }
        },
        preparationPlan: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    day: { type: "integer" },
                    focus: { type: "string" },
                    tasks: { type: "array", items: { type: "string" } }
                },
                required: [ "day", "focus", "tasks" ]
            }
        },
        title: { type: "string" }
    },
    required: [
        "matchScore",
        "technicalQuestions",
        "behavioralQuestions",
        "skillGaps",
        "preparationPlan",
        "title"
    ],
    additionalProperties: false
}

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {

    const prompt = `Create a personalized interview-preparation report using this candidate information.
Return at least three technical questions, three behavioral questions, one skill gap, and a preparation plan.
Use a match score from 0 to 100. Return only data that matches the supplied JSON schema.

Resume:
${resume || "Not provided"}

Self-description:
${selfDescription || "Not provided"}

Job description:
${jobDescription}
`

    let response
    try {
        response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseJsonSchema: interviewReportJsonSchema
            }
        })
    } catch (error) {
        console.error("Gemini interview report request failed:", error)
        throw reportGenerationError("The AI service could not generate the interview report. Check the API key, model access, and quota, then try again.", error)
    }

    if (!response.text) {
        throw reportGenerationError("The AI service returned an empty interview report. Please try again.")
    }

    let parsedResponse
    try {
        parsedResponse = JSON.parse(response.text)
    } catch (error) {
        console.error("Gemini returned invalid JSON for the interview report:", error)
        throw reportGenerationError("The AI service returned an invalid report. Please try again.", error)
    }

    try {
        return interviewReportSchema.parse(parsedResponse)
    } catch (error) {
        console.error("Gemini interview report did not match the expected structure:", error)
        throw reportGenerationError("The AI service returned an incomplete report. Please try again.", error)
    }

}



async function generatePdfFromHtml(htmlContent) {
    let browser
    if (process.env.VERCEL) {
        const chromium = require("@sparticuz/chromium")
        const puppeteer = require("puppeteer-core")
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless
        })
    } else {
        browser = await require("puppeteer").launch()
    }

    try {
        const page = await browser.newPage()
        await page.setJavaScriptEnabled(false)
        await page.setRequestInterception(true)
        page.on("request", request => {
            if (request.url() === "about:blank" || request.url().startsWith("data:")) {
                request.continue()
            } else {
                request.abort()
            }
        })
        await page.setContent(htmlContent, { waitUntil: "domcontentloaded" })

        return await page.pdf({
            format: "A4", margin: {
                top: "20mm",
                bottom: "20mm",
                left: "15mm",
                right: "15mm"
            }
        })
    } finally {
        await browser.close()
    }
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {

    const resumePdfSchema = z.object({
        html: z.string().describe("The HTML content of the resume which can be converted to PDF using any library like puppeteer")
    })

    const prompt = `Generate resume for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}

                        the response should be a JSON object with a single field "html" which contains the HTML content of the resume which can be converted to PDF using any library like puppeteer.
                        The resume should be tailored for the given job description and should highlight the candidate's strengths and relevant experience. The HTML content should be well-formatted and structured, making it easy to read and visually appealing.
                        The content of resume should be not sound like it's generated by AI and should be as close as possible to a real human-written resume.
                        you can highlight the content using some colors or different font styles but the overall design should be simple and professional.
                        The content should be ATS friendly, i.e. it should be easily parsable by ATS systems without losing important information.
                        The resume should not be so lengthy, it should ideally be 1-2 pages long when converted to PDF. Focus on quality rather than quantity and make sure to include all the relevant information that can increase the candidate's chances of getting an interview call for the given job description.
                    `

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseJsonSchema: {
                type: "object",
                properties: { html: { type: "string" } },
                required: [ "html" ],
                additionalProperties: false
            },
        }
    })


    const jsonContent = JSON.parse(response.text)

    const pdfBuffer = await generatePdfFromHtml(jsonContent.html)

    return pdfBuffer

}

module.exports = { generateInterviewReport, generateResumePdf }