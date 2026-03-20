/* =========================================
   STEADY PT — CHAT WIDGET
   Floating Claude AI-powered patient assistant
   Calls backend proxy at /api/chat
   ========================================= */

(function () {
  'use strict';

  // ---- STATE ----
  const state = {
    open: false,
    loading: false,
    history: [], // { role: 'user'|'assistant', content: string }
    initialized: false,
  };

  // ---- ELEMENTS ----
  const widget    = document.getElementById('chatWidget');
  const fab       = document.getElementById('chatFab');
  const panel     = document.getElementById('chatPanel');
  const messages  = document.getElementById('chatMessages');
  const input     = document.getElementById('chatInput');
  const sendBtn   = document.getElementById('chatSend');
  const quickReplies = document.getElementById('quickReplies');

  if (!widget || !fab || !panel || !messages || !input || !sendBtn) return;

  // ---- QUICK REPLIES ----
  const QUICK_REPLIES = [
    'What services do you offer?',
    'How do I book an appointment?',
    'What are your hours?',
    'Do you accept insurance?',
  ];

  // ---- WELCOME MESSAGE ----
  const WELCOME = "Hi! I'm the Steady PT virtual assistant. I can answer questions about our services, hours, location, and help you get started with booking. How can I help you today?";

  // ---- OPEN / CLOSE ----
  function openChat() {
    state.open = true;
    widget.classList.add('open');
    fab.setAttribute('aria-expanded', 'true');
    panel.removeAttribute('aria-hidden');
    input.focus();
    // Remove badge
    const badge = fab.querySelector('.chat-fab-badge');
    if (badge) badge.style.display = 'none';
    // Initialize on first open
    if (!state.initialized) {
      state.initialized = true;
      appendMessage('bot', WELCOME);
      renderQuickReplies();
    }
  }

  function closeChat() {
    state.open = false;
    widget.classList.remove('open');
    fab.setAttribute('aria-expanded', 'false');
    panel.setAttribute('aria-hidden', 'true');
    fab.focus();
  }

  fab.addEventListener('click', () => {
    state.open ? closeChat() : openChat();
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.open) closeChat();
  });

  // ---- RENDER QUICK REPLIES ----
  function renderQuickReplies() {
    quickReplies.innerHTML = '';
    QUICK_REPLIES.forEach((text) => {
      const btn = document.createElement('button');
      btn.className = 'quick-reply-btn';
      btn.textContent = text;
      btn.addEventListener('click', () => {
        quickReplies.innerHTML = '';
        sendMessage(text);
      });
      quickReplies.appendChild(btn);
    });
  }

  // ---- APPEND MESSAGE ----
  function appendMessage(role, content) {
    const isBot = role === 'bot' || role === 'assistant';
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg ${isBot ? 'bot' : 'user'}`;

    const avatar = document.createElement('div');
    avatar.className = 'chat-msg-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = isBot ? 'PT' : 'You';

    const bubble = document.createElement('div');
    bubble.className = 'chat-msg-bubble';
    // Render line breaks and basic formatting
    bubble.innerHTML = escapeHtml(content).replace(/\n/g, '<br>');

    const time = document.createElement('div');
    time.className = 'chat-msg-time';
    time.setAttribute('aria-hidden', 'true');
    time.textContent = getTime();

    if (isBot) {
      msgDiv.appendChild(avatar);
      msgDiv.appendChild(bubble);
      msgDiv.appendChild(time);
    } else {
      msgDiv.appendChild(time);
      msgDiv.appendChild(bubble);
      msgDiv.appendChild(avatar);
    }

    messages.appendChild(msgDiv);
    scrollToBottom();
    return msgDiv;
  }

  // ---- TYPING INDICATOR ----
  function showTyping() {
    const el = document.createElement('div');
    el.className = 'chat-typing';
    el.id = 'typingIndicator';
    el.setAttribute('aria-label', 'Assistant is typing');
    el.innerHTML = `
      <div class="chat-msg-avatar" aria-hidden="true">PT</div>
      <div class="chat-typing-bubble">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>`;
    messages.appendChild(el);
    scrollToBottom();
  }

  function hideTyping() {
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
  }

  // ---- SEND MESSAGE ----
  async function sendMessage(text) {
    const content = (text || input.value).trim();
    if (!content || state.loading) return;

    input.value = '';
    if (window.autoResizeTextarea) window.autoResizeTextarea(input);
    sendBtn.disabled = true;
    quickReplies.innerHTML = '';

    appendMessage('user', content);
    state.history.push({ role: 'user', content });

    state.loading = true;
    showTyping();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: state.history }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const reply = data.content?.[0]?.text || data.reply || 'Sorry, I had trouble with that. Please call us at 818-714-1691.';

      hideTyping();
      appendMessage('bot', reply);
      state.history.push({ role: 'assistant', content: reply });

    } catch (err) {
      hideTyping();
      appendMessage('bot', "I'm having trouble connecting right now. Please call us directly at **818-714-1691** or email **info@steadyptla.com** — we're here Mon–Fri 7am–6pm.");
      console.warn('[SteadyPT Chat]', err.message);
    } finally {
      state.loading = false;
    }
  }

  // ---- INPUT HANDLERS ----
  input.addEventListener('input', () => {
    if (window.autoResizeTextarea) window.autoResizeTextarea(input);
    sendBtn.disabled = !input.value.trim();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) sendMessage();
    }
  });

  sendBtn.addEventListener('click', () => sendMessage());

  // ---- UTILITIES ----
  function scrollToBottom() {
    requestAnimationFrame(() => {
      messages.scrollTop = messages.scrollHeight;
    });
  }

  function getTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
})();
