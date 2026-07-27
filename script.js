// Nav scroll effect
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
});

// Mobile burger menu
const burger = document.querySelector('.nav__burger');
const navLinks = document.querySelector('.nav__links');
burger.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});
navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => navLinks.classList.remove('open'));
});

// Contact form — Web3Forms
const contactForm = document.querySelector('.form');
if (contactForm) {
  contactForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = contactForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Envoi en cours…';
    const data = new FormData(contactForm);
    try {
      const res = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: data });
      const json = await res.json();
      if (json.success) {
        const success = document.getElementById('formSuccess');
        success.classList.add('visible');
        contactForm.reset();
        setTimeout(() => success.classList.remove('visible'), 6000);
      } else {
        alert("Une erreur s'est produite. Veuillez réessayer ou nous contacter par email.");
      }
    } catch {
      alert("Erreur réseau. Veuillez réessayer.");
    }
    btn.disabled = false;
    btn.textContent = 'Envoyer ma demande →';
  });
}

// Fade-in on scroll
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity = '1';
      e.target.style.transform = 'translateY(0)';
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.offre__card, .realisation__card, .atout, .stats__item').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(el);
});
