import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Increase payload limit for base64 image uploads
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error('API key is not configured. Please set GEMINI_API_KEY.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Check Compliance Endpoint
app.post('/api/check-compliance', async (req: Request, res: Response) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const ai = getGeminiClient();
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

    const complianceSchema = {
      type: Type.OBJECT,
      properties: {
        isCompliant: { type: Type.BOOLEAN },
        score: { type: Type.NUMBER, description: 'Compliance score from 0 to 100' },
        issues: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List of specific compliance issues (e.g., 'Eyebrows covered', 'Mouth open', 'Uneven lighting')"
        }
      },
      required: ['isCompliant', 'score', 'issues']
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            text: `Analyze this image for strict official Passport and ID photo compliance standards.
Check carefully:
1. Even, neutral lighting without harsh facial shadows or backlighting.
2. Neutral facial expression or gentle closed-mouth smile.
3. Eyes open, looking straight into camera, clearly visible without glasses glare or red-eye.
4. Eyebrows and ears visible, hair not obscuring key features.
5. Head centered, facing forward, not tilted.
6. Clean solid or neutral plain background.
Score the compliance strictly from 0 to 100 and list issues.`
          },
          {
            inlineData: {
              data: cleanBase64,
              mimeType: 'image/jpeg'
            }
          }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: complianceSchema
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text.trim());
      return res.json(parsed);
    }

    return res.status(500).json({ error: 'No response received from Gemini.' });
  } catch (error: any) {
    console.error('Compliance API Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to check photo compliance',
      isCompliant: false,
      score: 50,
      issues: ['Service temporarily unavailable: ' + (error.message || 'Unknown error')]
    });
  }
});

// Edit Photo Endpoint
app.post('/api/edit-photo', async (req: Request, res: Response) => {
  try {
    const { imageBase64, promptInstruction } = req.body;
    if (!imageBase64 || !promptInstruction) {
      return res.status(400).json({ error: 'imageBase64 and promptInstruction are required' });
    }

    const ai = getGeminiClient();
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: 'image/jpeg'
            }
          },
          {
            text: `You are an expert ID Photo Stylist and professional portrait retoucher.
Task: Edit the provided portrait photo strictly according to this instruction: "${promptInstruction}".

Mandatory requirements:
1. Perfectly maintain the identity, gender, face structure, skin tone, and distinguishing facial features of the person in the photo.
2. The output must be a clean, sharp, high-resolution portrait suitable for government ID, passport, or professional resume.
3. Keep head and shoulders composition centered with standard passport portrait framing.
4. Ensure seamless blending, clean hair edges, and professional studio lighting.`
          }
        ]
      }
    });

    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      for (const part of candidates[0].content?.parts || []) {
        if (part.inlineData && part.inlineData.data) {
          const mime = part.inlineData.mimeType || 'image/jpeg';
          return res.json({
            image: `data:${mime};base64,${part.inlineData.data}`
          });
        }
      }
    }

    return res.status(500).json({ error: 'No image was returned from the styling model.' });
  } catch (error: any) {
    console.error('Edit Photo API Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to edit photo with Gemini'
    });
  }
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.use((_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
