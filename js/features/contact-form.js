export function showToast(message, duration = 5000, container = null) {
  document.querySelectorAll('.site-toast').forEach(toast => toast.remove());
  const target = container || document.querySelector('.form-submit-row') || document.body;
  const toast = document.createElement('div');
  toast.className = 'site-toast';
  toast.innerHTML = '<span class="site-toast-dot"></span>';
  const text = document.createElement('span');
  text.textContent = message;
  toast.append(text);
  target.append(toast);
  window.setTimeout(() => {
    toast.classList.add('is-hiding');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

export function initContactForm() {
  const form = document.getElementById('contact-form') || document.querySelector('.form-stack');
  if (!form) return;
  const clearErrors = () => {
    form.querySelectorAll('.form-input').forEach(input => input.classList.remove('is-invalid'));
    form.querySelectorAll('.form-error-msg').forEach(message => message.remove());
  };
  const showError = (input, message) => {
    if (!input) return;
    input.classList.add('is-invalid');
    const parent = input.closest('.form-field') || input.parentElement;
    if (!parent || parent.querySelector('.form-error-msg')) return;
    const error = document.createElement('span');
    error.className = 'form-error-msg';
    error.textContent = message;
    parent.append(error);
  };

  form.querySelectorAll('.form-input').forEach(input => input.addEventListener('input', () => {
    input.classList.remove('is-invalid');
    (input.closest('.form-field') || input.parentElement)?.querySelector('.form-error-msg')?.remove();
  }));

  form.addEventListener('submit', async event => {
    event.preventDefault();
    clearErrors();
    const button = form.querySelector('button[type="submit"]');
    const nameInput = form.querySelector('#name');
    const emailInput = form.querySelector('#email');
    const messageInput = form.querySelector('#message');
    const name = nameInput?.value.trim() || '';
    const email = emailInput?.value.trim() || '';
    const message = messageInput?.value.trim() || '';
    const invalid = [];
    if (!name) invalid.push([nameInput, 'Please fill in your name.']);
    if (!email) invalid.push([emailInput, 'Please fill in your email address.']);
    else if (!/^\S+@\S+\.\S+$/.test(email)) invalid.push([emailInput, 'Please enter a valid email address.']);
    if (!message) invalid.push([messageInput, 'Please enter project details.']);
    invalid.forEach(([input, text]) => showError(input, text));
    if (invalid.length) {
      invalid[0][0]?.focus();
      return;
    }

    const originalText = button?.textContent || 'Send Message';
    if (button) {
      button.disabled = true;
      button.textContent = 'Sending...';
    }
    try {
      const endpoint = form.dataset.formspreeUrl;
      if (!endpoint) {
        const subject = encodeURIComponent(`Contact Form Submission from ${name}`);
        const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`);
        window.location.href = `mailto:muramets007@icloud.com?subject=${subject}&body=${body}`;
        return;
      }
      const response = await fetch(endpoint, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('Form service rejected the request.');
      form.reset();
      showToast("Message sent! Thank you, I'll get back to you soon.");
    } catch (_) {
      showError(button?.parentElement, 'Connection error. Please try again.');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  });
}
