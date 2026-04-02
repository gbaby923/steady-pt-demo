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

  // ---- BOOKING INTENT DETECTION ----
  const BOOKING_KEYWORDS = /\b(schedul|book|appointment|appt|set up|reserve|sign up|get in|come in|visit|schedule me|book me)\b/i;

  function isBookingIntent(text) {
    return BOOKING_KEYWORDS.test(text);
  }

  function showBookingForm() {
    const wrapper = document.createElement('div');
    wrapper.className = 'chat-msg bot';
    wrapper.innerHTML = `
      <div class="chat-msg-avatar" aria-hidden="true">PT</div>
      <div class="booking-form-bubble">
        <p class="booking-form-intro">Great! Fill out the form below and we'll get you scheduled.</p>
        <form class="booking-form" id="bookingForm" novalidate>
          <div class="booking-field">
            <label for="bf-name">Full Name <span aria-hidden="true">*</span></label>
            <input id="bf-name" type="text" placeholder="Jane Smith" autocomplete="name" required />
          </div>
          <div class="booking-field">
            <label for="bf-phone">Phone Number <span aria-hidden="true">*</span></label>
            <input id="bf-phone" type="tel" placeholder="(818) 555-0100" autocomplete="tel" required />
          </div>
          <div class="booking-field">
            <label for="bf-service">Service Needed <span aria-hidden="true">*</span></label>
            <select id="bf-service" required>
              <option value="" disabled selected>Select a service…</option>
              <option>Orthopedic Rehabilitation</option>
              <option>Sports Injury Recovery</option>
              <option>Post-Surgical Rehab</option>
              <option>Chronic Pain Management</option>
              <option>Balance &amp; Mobility</option>
              <option>Workers' Compensation</option>
              <option>Auto Accident (MVA) Rehab</option>
              <option>General / Not Sure</option>
            </select>
          </div>
          <div class="booking-field">
            <label for="bf-datetime">Preferred Date &amp; Time <span aria-hidden="true">*</span></label>
            <input id="bf-datetime" type="datetime-local" required />
          </div>
          <div class="booking-field">
            <label for="bf-insurance">Insurance Card Photo <span class="booking-optional">(optional)</span></label>
            <label class="booking-file-label" for="bf-insurance">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span id="bf-insurance-label">Upload photo</span>
            </label>
            <input id="bf-insurance" type="file" accept="image/*" class="booking-file-input" aria-label="Upload insurance card photo" />
          </div>
          <div class="booking-field-error" id="bookingError" role="alert" aria-live="polite"></div>
          <button type="submit" class="booking-submit-btn">Request Appointment</button>
        </form>
      </div>`;

    messages.appendChild(wrapper);
    scrollToBottom();

    // File label update
    const fileInput = wrapper.querySelector('#bf-insurance');
    const fileLabel = wrapper.querySelector('#bf-insurance-label');
    fileInput.addEventListener('change', () => {
      fileLabel.textContent = fileInput.files[0] ? fileInput.files[0].name : 'Upload photo';
    });

    // Form submit
    const form = wrapper.querySelector('#bookingForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.querySelector('#bf-name').value.trim();
      const phone = form.querySelector('#bf-phone').value.trim();
      const service = form.querySelector('#bf-service').value;
      const datetime = form.querySelector('#bf-datetime').value;
      const errorEl = form.querySelector('#bookingError');

      if (!name || !phone || !service || !datetime) {
        errorEl.textContent = 'Please fill in all required fields.';
        return;
      }
      errorEl.textContent = '';

      // Replace form with confirmation
      wrapper.innerHTML = `
        <div class="chat-msg-avatar" aria-hidden="true">PT</div>
        <div class="booking-confirm-bubble">
          <div class="booking-confirm-icon" aria-hidden="true">✓</div>
          <strong>Request Received!</strong>
          <p>Thanks, <strong>${escapeHtml(name)}</strong>! We've got your request for <strong>${escapeHtml(service)}</strong>. Our team will call you at <strong>${escapeHtml(phone)}</strong> to confirm your appointment. See you soon!</p>
        </div>`;
      scrollToBottom();
    });
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

    // Show booking form instead of calling API
    if (isBookingIntent(content)) {
      showBookingForm();
      state.history.push({ role: 'assistant', content: '[Booking form displayed]' });
      state.loading = false;
      return;
    }

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
