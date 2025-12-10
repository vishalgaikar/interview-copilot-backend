import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: "*", methods: ["GET", "POST", "OPTIONS"] }));
app.use(express.json());

// Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_NAME = "gemini-1.5-flash";

// Health check
app.get("/", (req, res) => {
  res.send("✅ Interview Copilot API is Running");
});

// STREAMING ANSWER GENERATION
app.post("/generate", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).send("Missing prompt");
    if (!process.env.GEMINI_API_KEY) return res.status(500).send("Missing GEMINI_API_KEY");

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const result = await model.generateContentStream({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) res.write(text);
    }

    res.end();
  } catch (err) {
    console.error("Gemini Streaming Error:", err);
    res.status(500).send("AI generation failed");
  }
});

// JD EXTRACTION (NON-STREAMING)
app.post("/api/extract-jd", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, error: "No text provided" });

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `
Extract the following details from the job description text. Output in JSON:

- job_title
- company
- technologies
- seniority
- summary

TEXT:
${text}
`;

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    const responseText = result.response.text();
    res.json({ success: true, data: responseText });
  } catch (err) {
    console.error("JD Extract Error:", err);
    res.status(500).json({ success: false, error: "JD extraction failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
