import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CRITICAL: Allow your Hostinger domain to access this server
app.use(cors({
    origin: '*', // For testing. In production, change '*' to 'https://www.interviewcopilotapp.com'
    methods: ['POST', 'GET', 'OPTIONS']
}));

app.use(express.json());

// Root route to check if server is running
app.get('/', (req, res) => {
    res.send('✅ Interview Copilot API is Running');
});

// 1. Generate Answer Endpoint
app.post('/generate', async (req, res) => {
    const { prompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return res.status(500).json({ error: 'Server Config Error: API Key missing' });

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            }
        );
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ error: 'Failed to generate answer' });
    }
});

// 2. Extract JD Endpoint
app.post('/api/extract-jd', async (req, res) => {
    const { text } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!text) return res.status(400).json({ error: 'No text provided' });
    if (!apiKey) return res.status(500).json({ error: 'Missing API Key' });

    const prompt = `Analyze this JD. Extract 'Job Title' and 'Company'. JSON only: { "position": "...", "company": "..." }. Text: ${text.slice(0, 3000)}`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            }
        );
        const data = await response.json();
        let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        res.json(JSON.parse(rawText));
    } catch (error) {
        console.error("Extraction Error:", error);
        res.status(500).json({ position: '', company: '' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});