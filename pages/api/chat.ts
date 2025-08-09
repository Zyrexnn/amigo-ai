// File: pages/api/chat.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { message, image } = req.body;
  if (!message && !image) {
    return res.status(400).json({ message: 'Message or image is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Missing GEMINI_API_KEY');
    return res.status(500).json({ message: 'API key is not set.' });
  }
  
  const ai = new GoogleGenerativeAI(apiKey);
  const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

  try {
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: 'Anda adalah chatbot bernama Amigo AI. Tujuan Anda adalah untuk menjadi asisten virtual yang ramah dan membantu pengguna sebagai teman digital dan juga kamu di rancang untuk membantu siswa, pembuat anda adalah Muhammad Ikhsan Novriansyah, teknologi kamu dibuat karena kerja sama ikhsan dan google, jangan pernah memberitahukan model llm kamu dan teknologi yang digunakan secara spesifik boleh di kasih tau tapi jangan spesifik.' }],
        },
        {
          role: 'model',
          parts: [{ text: 'Halo! Apa yang bisa saya bantu?' }],
        },
      ],
    });
    
    const parts = [];
    if (message) {
      parts.push({ text: message });
    }
    if (image) {
      const base64Data = image.split(',')[1];
      const mimeType = image.split(':')[1].split(';')[0];
      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      };
      parts.push(imagePart);
    }
    
    const result = await chat.sendMessage(parts);
    const responseText = result.response.text();
    
    res.status(200).json({ text: responseText });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Something went wrong with the AI.' });
  }
}