import 'dotenv/config';
import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const app = express();
app.use(express.json());

// Server-side Google Search Grounding for live Indian market rates & reduced shift GST guidance
app.post('/api/market-rates', async (req, res) => {
  const { query, city } = req.body as { query?: string; city?: string };
  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'Please specify a service or job shift title.' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      error: 'GEMINI_API_KEY is not configured in Settings > Secrets.',
    });
  }

  try {
    const cleanCity = (city || 'Bengaluru').split('·')[0].trim();
    const prompt = `Look up current 2026 Indian metro market pricing / daily shift wage rates in ${cleanCity}, India for: "${query.trim()}".
Provide:
1. Typical consumer or B2B shift market rate range in INR (₹).
2. Recommended ZEVRO fair-market rate and how applying ZEVRO's reduced 5% Shift GST (instead of 18% GST) lowers the customer/business invoice while keeping 100% of worker shift take-home intact.
Keep the summary concise (3–4 bullet points) and cite factual prevailing Indian market benchmarks.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const rawChunks =
      response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const groundingLinks = rawChunks
      .map((chunk: { web?: { uri?: string; title?: string } }) =>
        chunk.web?.uri
          ? {
              uri: chunk.web.uri,
              title: chunk.web.title || chunk.web.uri,
            }
          : null
      )
      .filter((item): item is { uri: string; title: string } => Boolean(item));

    return res.json({
      summary:
        response.text ??
        'Market rate summary retrieved. Apply standard metro rate with reduced 5% Shift GST.',
      groundingLinks,
    });
  } catch (error) {
    console.error('Search grounding error (/api/market-rates):', error);
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch live market rate grounding.',
    });
  }
});

// Server-side Google Maps Grounding for nearby service hubs, clinics, pools & industrial corridors
app.post('/api/nearby-hubs', async (req, res) => {
  const { query, latitude, longitude, city } = req.body as {
    query?: string;
    latitude?: number;
    longitude?: number;
    city?: string;
  };

  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'Please specify a service hub or place query.' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      error: 'GEMINI_API_KEY is not configured in Settings > Secrets.',
    });
  }

  try {
    const lat = typeof latitude === 'number' ? latitude : 12.9784;
    const lng = typeof longitude === 'number' ? longitude : 77.6408;
    const cleanCity = (city || 'Bengaluru').split('·')[0].trim();

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Find real, active locations near ${cleanCity} for ZEVRO dispatch, training, or service fulfillment related to: "${query.trim()}". Include neighborhood landmarks and practical access details.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lng,
            },
          },
        },
      },
    });

    const rawChunks =
      response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const mapPlaces = rawChunks
      .map(
        (chunk: {
          maps?: {
            uri?: string;
            title?: string;
            placeAnswerSources?: {
              reviewSnippets?: { content?: string; googleMapsUri?: string }[];
            };
          };
        }) =>
          chunk.maps?.uri
            ? {
                uri: chunk.maps.uri,
                title: chunk.maps.title || 'View on Google Maps',
                reviewSnippets:
                  chunk.maps.placeAnswerSources?.reviewSnippets
                    ?.map((r) => r.content)
                    .filter((c): c is string => Boolean(c)) ?? [],
              }
            : null
      )
      .filter(
        (
          item
        ): item is { uri: string; title: string; reviewSnippets: string[] } =>
          Boolean(item)
      );

    return res.json({
      summary: response.text ?? 'Nearby service hubs located.',
      mapPlaces,
    });
  } catch (error) {
    console.error('Maps grounding error (/api/nearby-hubs):', error);
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch Google Maps grounded locations.',
    });
  }
});

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ZEVRO server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
