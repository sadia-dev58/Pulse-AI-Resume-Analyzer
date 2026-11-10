import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import path from "path";
import { fileURLToPath } from "url";

// Configuration
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '1mb' })); // Limit payload size for safety
app.use(express.static(__dirname));

// Initialize Gemini
if (!process.env.GEMINI_API_KEY) {
    console.error("❌ CRITICAL ERROR: GEMINI_API_KEY is missing in .env file!");
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Routes
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/analyze", async (req, res) => {
    // Frontend se hum resume text aur job description dono receive kar rahe hain
    const { text: resumeText, jobDescription } = req.body;

    if (!resumeText || resumeText.trim().length < 50) {
        return res.status(400).json({ 
            error: "Please provide a valid resume text (at least 50 characters)." 
        });
    }

    try {
        // Aapka original model name jo aapne diya tha
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        // Prompt ko update kiya taake agar Job Description mile toh woh use bhi evaluate kare
        const prompt = `
            You are a Professional ATS (Applicant Tracking System) Expert.
            Analyze the following resume text and provide a structured report.
            
            FORMAT YOUR RESPONSE LIKE THIS:
            - **ATS Score:** [Score]/100
            - **Detected Skills:** [List skills]
            - **Strengths & Weaknesses:** (Provide 4 clear, short bullet points)
            - **Actionable Improvements:** (List top 3 changes needed)
            - **Pro Tips:** (Provide 4 clear, short bullet points)

            RESUME TEXT:
            ${resumeText}

            ${jobDescription ? `JOB DESCRIPTION FOR MATCHING:\n${jobDescription}` : ''}
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const responseText = response.text();

        res.json({ 
            success: true,
            result: responseText 
        });

    } catch (error) {
        console.error("GEMINI API ERROR:", error.message);
        res.status(500).json({ 
            error: "Failed to analyze resume. Please try again later." 
        });
    }
});

// Start Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`
🚀 Server Started!
📍 URL: http://localhost:${PORT}
🔑 API Key: ${process.env.GEMINI_API_KEY ? "Detected ✅" : "Missing ❌"}
    `);
});