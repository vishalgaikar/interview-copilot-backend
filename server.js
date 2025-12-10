import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const modelName = "gemini-2.0-flash"; // FASTEST MODEL

// ----------------------------
// STREAMING ANSWER GENERATION
// ----------------------------
app.post("/generate", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).send("Missing prompt");
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Transfer-Encoding", "chunked");

    // Gemini streaming:
    const streaming = await genAI
      .getGenerativeModel({ model: modelName })
      .generateContentStream({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      });

    for await (const chunk of streaming.stream) {
      const text = chunk.text();
      if (text && text.trim() !== "") {
        res.write(text);
      }
    }

    res.end();
  } catch (err) {
    console.error("Gemini Streaming Error:", err);
    res.status(500).send("AI generation failed");
  }
});

// ----------------------------
// EXISTING JD Extraction Route
// (KEPT AS-IS, You can convert later if needed)
// ----------------------------
app.post("/api/extract-jd", async (req, res) => {
  try {
    const { text } = req.body;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash", // use flash here too
    });

    const prompt = `
Extract the following details from the job description text. Output in JSON.

fields:
- "job_title"
- "company"
- "technologies"
- "seniority"
- "summary"

TEXT:
${text}
`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    res.json({ success: true, data: response });
  } catch (err) {
    console.error("JD Extract Error:", err);
    res.status(500).json({ success: false, error: "JD extraction failed" });
  }
});

// ----------------------------
// Start Server
// ----------------------------
app.listen(3000, () => {
  console.log("Server running on port 3000");
});
