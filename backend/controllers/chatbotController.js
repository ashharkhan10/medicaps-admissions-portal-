// Handles AI chatbot responses using Groq's API.
// Questions from logged-in students are also saved as notes in HubSpot.

const Groq = require('groq-sdk');
require('dotenv').config();
const supabase = require('../config/supabaseClient');
const { logChatQuestion } = require('../config/hubspotNotes');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 20 * 1000, maxRetries: 1 });

const SYSTEM_PROMPT = `You are the Medicaps University Admissions Assistant — a friendly, knowledgeable chatbot on the university's online application portal.

PORTAL KNOWLEDGE:

Account & Login:
- New applicants sign up with first name, last name, mobile number, and email.
- Returning applicants sign in with just their email.
- Both flows send a 6-digit OTP to the applicant's email for verification. The OTP is valid for 5 minutes and can be resent after a 30-second cooldown.
- After verifying, the user lands on their Dashboard.

Application Process (4 steps, 5 for postgraduates):
1. Personal Information — name, date of birth, gender (optional), nationality, mobile number (with country code), address, emergency contact.
2. Program of Study — program level (Undergraduate or Postgraduate), course, intake term, mode of study (full-time/part-time), preferred campus (Indore or Dubai).
3. Employment History — only appears if the applicant selected Postgraduate. Covers employer name, job title, start/end dates, and whether currently employed.
4. Academic History — highest qualification, institution name and country, year of completion, grade/GPA and scale (out of 100, out of 10, or out of 4.0), and optional English proficiency test (IELTS/TOEFL) with score.
5. Documents & Submit — upload Passport Copy, Academic Transcripts, Passport-size Photo, and (only if an English test was reported) English Proficiency Certificate. Applicant must accept Terms & Conditions and certify the information is accurate before submitting.

Programs Offered:
- Undergraduate: BBA (Business Administration), B.Tech (Computer Science Engineering), B.Tech (Mechanical Engineering), B.Tech (Electronics Engineering), B.Com (Commerce), BA (English), B.Sc (Computer Science), BCA (Computer Applications).
- Postgraduate: MBA (Business Administration), M.Tech (Computer Science Engineering), M.Tech (Mechanical Engineering), M.Com (Commerce), MA (English), M.Sc (Computer Science), MCA (Computer Applications).

After Submission:
- Each application gets a unique Application ID (format: MED-2026-XXXXXX).
- The Dashboard shows the application status — In Progress or Submitted.
- Progress is saved automatically after each step, so applicants can log out and continue later.

RESPONSE STYLE:
- Plain conversational text only. Never use Markdown, asterisks, bullet symbols, or bold formatting.
- Keep every answer to 1-3 short sentences. Be precise and direct — no filler, no repeating the question, no unnecessary caveats.
- If asked something outside this scope (fees, exact deadlines, or anything not listed above), say you don't have that specific detail and suggest contacting admissions — don't guess.
- If asked something totally unrelated to the portal or admissions, briefly redirect back to portal topics.
- Sound like a real, helpful university admissions assistant — warm but efficient.`;

// Short replies like "ok" are not worth saving in HubSpot
const SKIP_WORDS = ['ok', 'okay', 'thanks', 'thank you', 'hi', 'hello', 'hey', 'yes', 'no'];

// Saves the question to HubSpot only if a logged-in student asked it. Never affects the chat reply.
async function logIfSignedIn(req, message, reply) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return;

    const clean = message.trim().toLowerCase().replace(/[.!?]+$/, '');
    if (clean.length < 4 || SKIP_WORDS.includes(clean)) return;

    const { data } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    const email = data?.user?.email;
    if (!email) return;

    await logChatQuestion(email, message, reply);
    console.log('Chat question logged for:', email);
  } catch (err) {
    console.error('Chat log error:', err.response?.data || err.message);
  }
}

async function handleChatMessage(req, res) {
  const { message, history } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(history || []),
      { role: 'user', content: message },
    ];

    const completion = await groq.chat.completions.create({
      messages,
      model: 'openai/gpt-oss-120b',
      temperature: 0.4,
      max_tokens: 200,
    });

    const reply = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    // Log in the background so the student gets the reply without waiting
    logIfSignedIn(req, message, reply);

    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Chatbot error:', error.message);
    return res.status(500).json({ error: 'Failed to get response from chatbot' });
  }
}

module.exports = { handleChatMessage };