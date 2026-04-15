# 🎬 Hushh Studio - FREE AI Video Generation

> Powered by Google Veo 3.1 | Made with ❤️ for India

## Overview

Hushh Studio is a free AI video generation platform that allows users to create stunning videos using Google's latest Veo 3.1 model. No login required - just start creating!

## Features

### 🎥 Text-to-Video
Generate videos from text descriptions. Simply describe the scene you want to create, and Veo 3.1 will bring it to life.

### 🖼️ Image-to-Video
Transform static images into dynamic videos. Upload an image and describe the motion you want to add.

### ➕ Extend Video
Extend existing videos by 7 seconds. Continue the story with additional generated content.

## Technical Specifications

### Aspect Ratios
- **16:9** - Landscape format (YouTube, Desktop)
- **9:16** - Portrait format (Reels, TikTok, Shorts)

### Resolutions
- **720p** - Standard HD
- **1080p** - Full HD
- **4K** - Ultra HD (best quality)

### Duration
- 4 seconds
- 6 seconds (default)
- 8 seconds

## API Integration

This module uses the Google Gemini API with the `veo-3.1-generate-preview` model.

### Environment Variables

```env
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### API Usage Pattern

```javascript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });

// Generate video from text
let operation = await ai.models.generateVideos({
  model: 'veo-3.1-generate-preview',
  prompt: 'Your video description',
  config: {
    aspectRatio: '16:9',
    resolution: '1080p',
  },
});

// Poll for completion (10 second intervals)
while (!operation.done) {
  await new Promise((resolve) => setTimeout(resolve, 10000));
  operation = await ai.operations.getVideosOperation({ operation });
}

// Access generated video
const videoUrl = operation.response.generatedVideos[0].video.uri;
```

## File Structure

```
src/hushh-studio/
├── App.tsx                      # Main application component
├── types.ts                     # Type definitions
├── README.md                    # This file
├── pages/
│   └── index.tsx               # Route entry point
├── services/
│   └── veoService.ts           # Veo 3.1 API integration
└── hooks/
    └── useVideoGeneration.ts   # Custom hook for video generation
```

## Route

Accessible at `/studio`

## Sample Prompts for Inspiration 🇮🇳

- "A beautiful sunrise over the Himalayan mountains with golden light streaming through clouds"
- "A traditional Indian wedding celebration with colorful decorations and dancing"
- "A bustling Mumbai street scene with rickshaws and people walking"
- "A serene Kerala backwaters scene with a houseboat floating peacefully"
- "A Bollywood-style dance sequence with vibrant costumes and energetic moves"
- "A time-lapse of the Taj Mahal from dawn to dusk with changing colors"
- "A chef preparing butter chicken in a traditional Indian kitchen"
- "A festival of lights (Diwali) celebration with fireworks and diyas"
- "A yoga session at sunrise on a peaceful Goan beach"
- "A colorful Holi celebration with people throwing colored powder"

## Key Features for Indian Audience

- 🆓 **Completely FREE** - No payment required
- 🔓 **No Login Required** - Open access for everyone
- 🇮🇳 **Made for India** - Sample prompts featuring Indian culture
- 📱 **Mobile Responsive** - Works on all devices
- ⬇️ **Download Videos** - Save generated videos directly

## Native Audio Support

Veo 3.1 includes native audio generation. Generated videos will automatically include appropriate audio/sound effects that match the visual content.

## Performance Notes

- Video generation typically takes 1-3 minutes
- Polling happens every 10 seconds
- Maximum wait time is 10 minutes before timeout
- Higher resolutions may take longer to generate

## Error Handling

The module includes comprehensive error handling:
- API key validation
- Generation timeout handling
- User-friendly error messages
- Automatic retry suggestions

## Future Enhancements

- [ ] Video gallery with cloud storage
- [ ] Sharing to social media
- [ ] Video editing features
- [ ] Batch generation
- [ ] Custom audio upload
- [ ] Watermark customization

---

Built with ❤️ by Hushh.ai | Empowering creators across India
