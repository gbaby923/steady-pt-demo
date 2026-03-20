/**
 * Steady Physical Therapy — Chat API Proxy Server
 *
 * Express server that:
 *  1. Serves static site files
 *  2. Proxies /api/chat to Anthropic Claude API
 *     (keeps API key server-side, never exposed to browser)
 *
 * Usage:
 *   npm install
 *   ANTHROPIC_API_KEY=sk-ant-... node server.js
 *
 * Or with .env file:
 *   cp .env.example .env
 *   # fill in ANTHROPIC_API_KEY
 *   node server.js
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname)));

// ---- STEADY PT SYSTEM PROMPT ----
const SYSTEM_PROMPT = `You are a friendly, knowledgeable patient assistant for Steady Physical Therapy in Van Nuys, CA. Your job is to help patients get information about the clinic, services, and scheduling.

CLINIC INFORMATION:
- Name: Steady Physical Therapy (Steady PT)
- Address: 6629 Van Nuys Blvd, Van Nuys, CA 91405
- Phone: 818-714-1691
- Email: info@steadyptla.com
- Website: steadyptla.com
- Hours: Monday–Friday, 7:00 AM – 6:00 PM (by appointment only)
- Weekend: Closed

PROVIDER:
- The clinic is owned and operated by a Doctor of Physical Therapy (DPT)
- All sessions are 1-on-1 directly with the owner/therapist — no aides or assistants
- Credentials: Doctor of Physical Therapy, Certified Movement Specialist, Pain & Injury Expert

SERVICES:
1. Orthopedic Rehabilitation — joint, muscle, and bone injuries (knee, shoulder, hip, back, ankle, wrist)
2. Sports Injuries — sprains, strains, overuse injuries, tendinitis, return-to-sport rehab
3. Post-Operative Recovery — ACL, rotator cuff, hip/knee replacement, spinal surgery rehab
4. Chronic Pain — back pain, neck pain, fibromyalgia, arthritis, nerve pain/sciatica
5. Balance & Mobility — fall prevention, vestibular/vertigo, Parkinson's, gait dysfunction
6. Work-Related Accident Rehabilitation — Workers' Compensation accepted, return-to-work programs
7. Motor Vehicle Accident Rehabilitation — whiplash, back/neck trauma, personal injury documentation

INSURANCE & PAYMENT:
- Private insurance accepted
- Medicare accepted
- Workers' Compensation accepted
- Personal Injury / Attorney Lien accepted (MVA cases)
- Self-pay / cash pay accepted
- (For specific coverage questions, always recommend they call the clinic)

BOOKING:
- All appointments are by appointment only
- To book: call 818-714-1691 or email info@steadyptla.com
- They can also fill out the booking form at steadyptla.com/contact.html
- No referral required in California (direct access state)

RESPONSE GUIDELINES:
- Be warm, friendly, and professional — like a helpful clinic staff member
- Keep responses concise (2–4 sentences unless more detail is clearly needed)
- For booking, always direct to call 818-714-1691 or email info@steadyptla.com
- Never diagnose conditions or provide specific medical advice
- For medical emergencies, always refer to 911 or the nearest emergency room
- If asked about something outside your knowledge, say so honestly and offer to help with what you do know
- Don't make up information not listed above`;

// ---- CHAT ENDPOINT ----
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array required' });
    }

    // Sanitize: only allow role/content, max 40 turns
    const sanitized = messages
      .slice(-40)
      .filter((m) => m.role && typeof m.content === 'string')
      .map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content.slice(0, 2000),
      }));

    if (sanitized.length === 0) {
      return res.status(400).json({ error: 'No valid messages' });
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: sanitized,
    });

    res.json(response);
  } catch (err) {
    console.error('[/api/chat]', err.message);
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Internal server error' });
  }
});

// ---- FALLBACK: SPA-style, serve index for unknown routes ----
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n✅ Steady PT server running at http://localhost:${PORT}`);
  console.log(`   API key: ${process.env.ANTHROPIC_API_KEY ? '✓ set' : '✗ missing (set ANTHROPIC_API_KEY)'}\n`);
});
