const { GoogleGenAI } = require('@google/genai');
const { z } = require('zod');

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
});

const interviewReportSchema = z.object({
    title: z.string().optional(),
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
        severity: z.enum([ 'low', 'medium', 'high' ])
    })).min(1),
    preparationPlan: z.array(z.object({
        day: z.number().int().min(1),
        focus: z.string(),
        tasks: z.array(z.string()).min(1)
    })).min(1)
});

const responseJsonSchema = {
    type: 'object',
    properties: {
        title: { type: 'string' },
        matchScore: { type: 'number' },
        technicalQuestions: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    question: { type: 'string' },
                    intention: { type: 'string' },
                    answer: { type: 'string' }
                },
                required: [ 'question', 'intention', 'answer' ]
            }
        },
        behavioralQuestions: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    question: { type: 'string' },
                    intention: { type: 'string' },
                    answer: { type: 'string' }
                },
                required: [ 'question', 'intention', 'answer' ]
            }
        },
        skillGaps: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    skill: { type: 'string' },
                    severity: {
                        type: 'string',
                        enum: [ 'low', 'medium', 'high' ]
                    }
                },
                required: [ 'skill', 'severity' ]
            }
        },
        preparationPlan: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    day: { type: 'integer' },
                    focus: { type: 'string' },
                    tasks: {
                        type: 'array',
                        items: { type: 'string' }
                    }
                },
                required: [ 'day', 'focus', 'tasks' ]
            }
        }
    },
    additionalProperties: false,
    required: [
        'matchScore',
        'technicalQuestions',
        'behavioralQuestions',
        'skillGaps',
        'preparationPlan'
    ]
};

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {
    if (!process.env.GOOGLE_GENAI_API_KEY) {
        throw new Error('GOOGLE_GENAI_API_KEY is not configured.');
    }

    const prompt = `Create a complete interview-preparation report using the candidate information below.
Return a JSON object matching the supplied schema. Include at least three technical questions,
three behavioral questions, one skill gap, and a preparation plan with at least one day.
The title is optional; do not invent one if it is unclear.

Resume:
${resume}

Self-description:
${selfDescription}

Job description:
${jobDescription}`;

    const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseJsonSchema
        }
    });

    const responseText = response.text;
    if (!responseText) {
        throw new Error('The AI returned an empty interview report.');
    }

    let parsed;
    try {
        parsed = JSON.parse(responseText);
    } catch (error) {
        throw new Error(`The AI returned invalid JSON for the interview report: ${error.message}`);
    }

    return interviewReportSchema.parse(parsed);
}

module.exports = generateInterviewReport;
