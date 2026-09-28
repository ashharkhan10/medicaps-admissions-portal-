'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Suggested questions. Three not-yet-asked ones are shown after every answer.
const SUGGESTIONS = [
  'What documents do I need?',
  'What programs are offered?',
  'How does OTP work?',
  'Which campuses are available?',
  'What are the application steps?',
  'Can I save and continue later?',
  'What happens after I submit?',
  'Do postgraduates need work experience details?',
  'Is an English test required?',
  'How do I get my Application ID?',
];

const THANKS = "Thanks, that's all";
const THANKS_REPLY = "You're welcome! Good luck with your application. I'm here if you need anything else.";

function timeNow() {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

const panelClass = "fixed bottom-24 right-6 w-[calc(100vw-3rem)] max-w-sm md:w-96 h-[540px] max-h-[calc(100vh-8rem)] bg-white rounded-3xl shadow-2xl border border-[#1B2A4A]/10 flex flex-col overflow-hidden z-50 animate-[fadeInUp_0.3s_ease-out]";
const headerClass = "bg-gradient-to-r from-[#1B2A4A] to-[#243758] px-5 py-4 flex items-center justify-between";
const headerAvatar = "w-10 h-10 rounded-full bg-[#C9A227] flex items-center justify-center text-[#1B2A4A] text-xs font-bold ring-2 ring-white/20";
const onlineDot = "w-2 h-2 rounded-full bg-green-400";
const closeBtn = "w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition";
const bodyClass = "flex-1 overflow-y-auto px-4 py-5 space-y-4 bg-[#F7F5F1]";
const avatarSmall = "w-7 h-7 rounded-full bg-[#C9A227] flex items-center justify-center text-[#1B2A4A] text-[9px] font-bold shrink-0 shadow-sm";
const botBubble = "bg-white text-[#2A2E35] border border-[#1B2A4A]/5 shadow-sm rounded-2xl rounded-bl-md px-4 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-line";
const userBubble = "bg-[#1B2A4A] text-white shadow-sm rounded-2xl rounded-br-md px-4 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-line";
const chipClass = "text-xs bg-white border border-[#1B2A4A]/15 hover:border-[#C9A227] hover:bg-[#C9A227]/10 text-[#1B2A4A] rounded-full px-3.5 py-1.5 transition text-left";
const thanksChip = "text-xs bg-[#C9A227]/15 border border-[#C9A227]/40 hover:bg-[#C9A227]/25 text-[#1B2A4A] rounded-full px-3.5 py-1.5 transition";
const formClass = "px-3 pt-3 pb-2 bg-white border-t border-[#1B2A4A]/10";
const inputWrap = "flex items-center gap-2 bg-[#F7F5F1] rounded-full pl-4 pr-1.5 py-1.5 focus-within:ring-2 focus-within:ring-[#C9A227] transition";
const inputClass = "flex-1 bg-transparent outline-none text-sm text-[#2A2E35] placeholder:text-[#2A2E35]/40";
const sendBtn = "w-9 h-9 rounded-full bg-[#C9A227] hover:bg-[#b8931f] disabled:opacity-50 flex items-center justify-center text-[#1B2A4A] transition shrink-0";
const launcherClass = "fixed bottom-6 right-6 w-14 h-14 bg-[#C9A227] hover:bg-[#b8931f] hover:scale-105 transition-all rounded-full shadow-lg flex items-center justify-center z-50";
const dotClass = "w-1.5 h-1.5 rounded-full bg-[#1B2A4A]/40 animate-bounce";

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm the Medicaps Admissions Assistant. Ask me anything about the application process.", time: '' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, isOpen]);

  async function sendMessage(e, overrideText) {
    if (e) e.preventDefault();
    const text = overrideText || input;
    if (!text.trim() || loading) return;

    const userMessage = { role: 'user', content: text, time: timeNow() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');

    // "Thanks, that's all" is answered here, without calling the AI or logging it to HubSpot
    if (text === THANKS) {
      setMessages([...newMessages, { role: 'assistant', content: THANKS_REPLY, time: timeNow() }]);
      return;
    }

    setLoading(true);

    try {
      const history = newMessages.slice(1).map((m) => ({ role: m.role, content: m.content }));

      // Send the login token if the student is signed in, so the question can be saved to HubSpot
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(`${API_URL}/api/chatbot/message`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: text, history: history.slice(0, -1) }),
      });

      const data = await response.json();
      setMessages([...newMessages, { role: 'assistant', content: data.reply || 'Sorry, something went wrong.', time: timeNow() }]);
    } catch (err) {
      setMessages([...newMessages, { role: 'assistant', content: 'Sorry, I could not connect. Please try again.', time: timeNow() }]);
    }

    setLoading(false);
  }

  // Work out which suggestion chips to show under the latest answer
  const userMessages = messages.filter((m) => m.role === 'user');
  const asked = new Set(userMessages.map((m) => m.content.trim().toLowerCase()));
  const lastUserText = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';
  const conversationEnded = lastUserText === THANKS;
  const nextQuestions = SUGGESTIONS.filter((q) => !asked.has(q.toLowerCase())).slice(0, 3);
  const showChips = !loading && !conversationEnded;
  const showThanks = showChips && userMessages.length > 0;

  return (
    <>
      {isOpen && (
        <div className={panelClass}>
          <div className={headerClass}>
            <div className="flex items-center gap-3">
              <div className={headerAvatar}>AI</div>
              <div>
                <p className="text-white font-semibold text-sm leading-tight">Medicaps Assistant</p>
                <p className="flex items-center gap-1.5 text-white/60 text-xs mt-0.5"><span className={onlineDot} /> Online · Admissions help</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className={closeBtn} aria-label="Close chat">
              <X size={18} />
            </button>
          </div>

          <div className={bodyClass}>
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              return (
                <div key={i} className={`flex gap-2 items-end ${isUser ? 'justify-end' : 'justify-start'} animate-[fadeInUp_0.25s_ease-out]`}>
                  {!isUser && <div className={avatarSmall}>AI</div>}
                  <div className={`flex flex-col max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
                    <div className={isUser ? userBubble : botBubble}>{msg.content}</div>
                    {msg.time && <span className="text-[10px] text-[#2A2E35]/40 mt-1 px-1">{msg.time}</span>}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-2 items-end justify-start animate-[fadeInUp_0.2s_ease-out]">
                <div className={avatarSmall}>AI</div>
                <div className="bg-white border border-[#1B2A4A]/5 shadow-sm rounded-2xl rounded-bl-md px-4 py-3.5 flex gap-1 items-center">
                  <span className={dotClass} style={{ animationDelay: '0ms' }} />
                  <span className={dotClass} style={{ animationDelay: '150ms' }} />
                  <span className={dotClass} style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            {showChips && (nextQuestions.length > 0 || showThanks) && (
              <div className="flex flex-wrap gap-2 pl-9 animate-[fadeInUp_0.3s_ease-out]">
                {nextQuestions.map((q) => (
                  <button key={q} onClick={() => sendMessage(null, q)} className={chipClass}>{q}</button>
                ))}
                {showThanks && <button onClick={() => sendMessage(null, THANKS)} className={thanksChip}>{THANKS}</button>}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className={formClass}>
            <div className={inputWrap}>
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your question..." className={inputClass} />
              <button type="submit" disabled={loading || !input.trim()} className={sendBtn} aria-label="Send">
                <Send size={15} />
              </button>
            </div>
            <p className="text-[10px] text-center text-[#2A2E35]/40 mt-2">AI assistant · answers may not be perfect</p>
          </form>
        </div>
      )}

      <button onClick={() => setIsOpen(!isOpen)} className={launcherClass} aria-label="Open chat">
        {isOpen ? <X size={22} className="text-[#1B2A4A]" /> : <MessageCircle size={24} className="text-[#1B2A4A]" />}
      </button>
    </>
  );
}