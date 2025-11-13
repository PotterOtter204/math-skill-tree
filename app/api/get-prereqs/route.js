import OpenAI from 'openai';
import 'dotenv/config'; 

//import apikey from .env file

const OPEN_ROUTER_API_KEY = process.env.OPEN_ROUTER_API_KEY;

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: OPEN_ROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "<YOUR_SITE_URL>", // Optional. Site URL for rankings on openrouter.ai.
    "X-Title": "<YOUR_SITE_NAME>", // Optional. Site title for rankings on openrouter.ai.
  },
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: "google/gemini-2.5-flash-preview-09-2025",
    messages: [
        {
          "role": "user",
          "content": [
            {
              "type": "text",
              "text": "What is in this image, audio and video?"
            },
            {
              "type": "image_url",
              "image_url": {
                "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg"
              }
            },
            {
              "type": "input_audio",
              "input_audio": {
                "data": "UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB",
                "format": "wav"
              }
            },
            {
              "type": "input_video",
              "video_url": {
                "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              }
            }
          ]
        }
      ]
  });

  console.log(completion.choices[0].message);
}

main();