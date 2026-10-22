(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  $('#year').textContent = new Date().getFullYear();

  // Header background on scroll
  const header = $('.site-header');
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile menu
  const toggle = $('.nav-toggle'), links = $('.nav-links');
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });
  $$('.nav-links a').forEach((a) => a.addEventListener('click', () => {
    links.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }));

  // Active nav link + reveal animations
  const navMap = new Map($$('.nav-links a[href^="#"]').map((a) => [a.getAttribute('href').slice(1), a]));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.target.classList.contains('reveal') && en.isIntersecting) {
        en.target.classList.add('in');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.12 });
  $$('.reveal').forEach((el) => io.observe(el));

  const sectionIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      navMap.forEach((a) => a.classList.remove('active'));
      navMap.get(en.target.id)?.classList.add('active');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach((s) => sectionIO.observe(s));

  // Certificate lightbox
  const lb = $('#lightbox'), lbImg = $('img', lb), lbCap = $('figcaption', lb);
  let lastFocus;
  const closeLb = () => { lb.hidden = true; document.body.style.overflow = ''; lastFocus?.focus(); };
  $$('.cert').forEach((btn) => btn.addEventListener('click', () => {
    lastFocus = btn;
    lbImg.src = btn.dataset.full;
    lbImg.alt = btn.dataset.caption;
    lbCap.textContent = btn.dataset.caption;
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    $('.lb-close', lb).focus();
  }));
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lb-close')) closeLb(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !lb.hidden) closeLb(); });

  // Pre-select enquiry type from CTA buttons
  $$('[data-enquiry]').forEach((a) => a.addEventListener('click', () => {
    $('#enquiryType').value = a.dataset.enquiry;
  }));

  // Contact form
  const form = $('#contactForm');
  const status = $('.form-status', form);
  const submitBtn = $('button[type="submit"]', form);
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PHONE_RE = /^[+\d][\d\s-]{6,16}$/;

  const setError = (name, msg) => {
    const err = $(`.err[data-for="${name}"]`, form);
    if (err) err.textContent = msg || '';
    form.elements[name]?.closest('.field')?.classList.toggle('invalid', !!msg);
  };

  function validate(d) {
    const errors = {};
    if (d.name.length < 2) errors.name = 'Please enter your full name.';
    if (!EMAIL_RE.test(d.email)) errors.email = 'Please enter a valid email address.';
    if (d.phone && !PHONE_RE.test(d.phone)) errors.phone = 'Please enter a valid phone number.';
    if (!d.enquiryType) errors.enquiryType = 'Please choose an enquiry type.';
    if (d.message.length < 10) errors.message = 'Message should be at least 10 characters.';
    if (!d.consent) errors.consent = 'Please accept the privacy policy.';
    return errors;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.className = 'form-status';
    status.textContent = '';
    const f = form.elements;
    const data = {
      name: f.name.value.trim(),
      email: f.email.value.trim(),
      phone: f.phone.value.trim(),
      enquiryType: f.enquiryType.value,
      message: f.message.value.trim(),
      consent: f.consent.checked,
      website: f.website.value,
    };
    ['name', 'email', 'phone', 'enquiryType', 'message', 'consent'].forEach((n) => setError(n, ''));
    const errors = validate(data);
    if (Object.keys(errors).length) {
      Object.entries(errors).forEach(([k, v]) => setError(k, v));
      form.elements[Object.keys(errors)[0]]?.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const out = await res.json().catch(() => ({}));
      if (res.ok && out.ok) {
        form.reset();
        status.classList.add('ok');
        status.textContent = `Thank you, ${data.name}! Your message has been sent${out.ref ? ` (Ref: ${out.ref})` : ''}. A confirmation has been emailed to ${data.email}.`;
      } else {
        if (out.errors) Object.entries(out.errors).forEach(([k, v]) => setError(k, v));
        status.classList.add('fail');
        status.textContent = out.message || 'Please correct the highlighted fields and try again.';
      }
    } catch {
      status.classList.add('fail');
      status.textContent = 'Network error. Please check your connection and try again.';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message';
    }
  });
})();
