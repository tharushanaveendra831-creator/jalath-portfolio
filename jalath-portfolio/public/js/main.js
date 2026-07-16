(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mobile navigation
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');
  if (menuButton && nav) {
    menuButton.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      nav.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
    }));
  }

  // Scroll reveal and animated skill bars
  const revealElements = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      entry.target.querySelectorAll?.('.skill-fill').forEach(fill => {
        fill.style.width = `${Math.min(100, Number(fill.dataset.width) || 0)}%`;
      });
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
  revealElements.forEach(element => revealObserver.observe(element));

  // Navigation active state
  const sections = [...document.querySelectorAll('main section[id]')];
  const navLinks = [...document.querySelectorAll('.main-nav a[href^="#"]')];
  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
    });
  }, { rootMargin: '-42% 0px -48% 0px', threshold: 0 });
  sections.forEach(section => sectionObserver.observe(section));

  // Typewriter
  const typewriter = document.getElementById('typewriter');
  const roles = [
    'Computer Science Undergraduate',
    'Cybersecurity Learner',
    'Data Science Explorer',
    'Machine Learning Enthusiast',
    'Full-Stack Developer in Progress'
  ];
  if (typewriter) {
    if (reducedMotion) {
      typewriter.textContent = roles[0];
    } else {
      let roleIndex = 0;
      let characterIndex = 0;
      let deleting = false;
      const type = () => {
        const current = roles[roleIndex];
        typewriter.textContent = current.slice(0, characterIndex);
        if (!deleting && characterIndex < current.length) {
          characterIndex += 1;
          setTimeout(type, 45 + Math.random() * 32);
        } else if (!deleting) {
          deleting = true;
          setTimeout(type, 1400);
        } else if (characterIndex > 0) {
          characterIndex -= 1;
          setTimeout(type, 24);
        } else {
          deleting = false;
          roleIndex = (roleIndex + 1) % roles.length;
          setTimeout(type, 280);
        }
      };
      type();
    }
  }

  // Dynamic age
  const birthday = document.body.dataset.birthday;
  const ageTarget = document.getElementById('dynamic-age');
  if (birthday && ageTarget) {
    const dob = new Date(`${birthday}T00:00:00`);
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const beforeBirthday = now.getMonth() < dob.getMonth() ||
      (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
    if (beforeBirthday) age -= 1;
    ageTarget.textContent = String(age);
  }

  // Counters
  const counterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const target = entry.target;
      const end = Number(target.dataset.counter) || 0;
      if (reducedMotion) {
        target.textContent = end;
      } else {
        const started = performance.now();
        const duration = 1000;
        const update = now => {
          const progress = Math.min(1, (now - started) / duration);
          target.textContent = Math.round(end * (1 - Math.pow(1 - progress, 3)));
          if (progress < 1) requestAnimationFrame(update);
        };
        requestAnimationFrame(update);
      }
      counterObserver.unobserve(target);
    });
  }, { threshold: 0.7 });
  document.querySelectorAll('[data-counter]').forEach(counter => counterObserver.observe(counter));

  // Subtle 3D card tilt
  if (!reducedMotion && window.matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('.tilt-card').forEach(card => {
      card.addEventListener('mousemove', event => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(900px) rotateX(${y * -6}deg) rotateY(${x * 7}deg) translateY(-2px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  // Contact form
  const contactForm = document.getElementById('contact-form');
  const formStatus = document.getElementById('form-status');
  if (contactForm && formStatus) {
    contactForm.addEventListener('submit', async event => {
      event.preventDefault();
      const submitButton = contactForm.querySelector('button[type="submit"]');
      const originalText = submitButton.innerHTML;
      submitButton.disabled = true;
      submitButton.textContent = 'Sending…';
      formStatus.className = 'form-status';
      formStatus.textContent = '';

      try {
        const payload = Object.fromEntries(new FormData(contactForm).entries());
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Unable to send your message.');
        formStatus.className = 'form-status success';
        formStatus.textContent = result.message;
        contactForm.reset();
      } catch (error) {
        formStatus.className = 'form-status error';
        formStatus.textContent = error.message;
      } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
      }
    });
  }

  // Live GitHub repositories
  const repoContainer = document.getElementById('github-repos');
  const githubStats = document.getElementById('github-stats');
  if (repoContainer && githubStats) {
    fetch('/api/github')
      .then(response => response.json())
      .then(result => {
        if (!result.ok) throw new Error(result.message || 'GitHub data unavailable');
        githubStats.innerHTML = `
          <span><strong>${result.profile.publicRepos}</strong> public repositories</span>
          <span><strong>${result.profile.followers}</strong> followers</span>
          <span><strong>${result.profile.following}</strong> following</span>
        `;
        if (!result.repos.length) {
          repoContainer.innerHTML = '<p class="github-empty">Public repositories will appear here automatically.</p>';
          return;
        }
        repoContainer.innerHTML = result.repos.map(repo => `
          <a class="repo-card" href="${escapeAttribute(repo.url)}" target="_blank" rel="noreferrer">
            <h4>${escapeHtml(repo.name)}</h4>
            <p>${escapeHtml(repo.description)}</p>
            <div class="repo-meta">
              <span>${escapeHtml(repo.language || 'Code')}</span>
              <span>★ ${repo.stars}</span>
              <span>⑂ ${repo.forks}</span>
            </div>
          </a>
        `).join('');
      })
      .catch(error => {
        githubStats.innerHTML = '<span>Live GitHub data could not be loaded right now.</span>';
        repoContainer.innerHTML = `<p class="github-empty">${escapeHtml(error.message)}</p>`;
      });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[character]);
  }

  function escapeAttribute(value) {
    return String(value).replace(/[^a-zA-Z0-9:/?&=._#%-]/g, '');
  }

  // Lightweight animated constellation background
  const canvas = document.getElementById('particle-canvas');
  if (canvas && !reducedMotion) {
    const context = canvas.getContext('2d');
    const particles = [];
    let width = 0;
    let height = 0;
    let animationFrame;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.min(75, Math.max(28, Math.floor(width / 18)));
      particles.length = 0;
      for (let index = 0; index < count; index += 1) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.16,
          vy: (Math.random() - 0.5) * 0.16,
          radius: Math.random() * 1.3 + 0.4
        });
      }
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      particles.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.x < 0 || particle.x > width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > height) particle.vy *= -1;

        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fillStyle = 'rgba(140, 224, 255, 0.48)';
        context.fill();

        for (let otherIndex = index + 1; otherIndex < particles.length; otherIndex += 1) {
          const other = particles[otherIndex];
          const dx = particle.x - other.x;
          const dy = particle.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 115) {
            context.beginPath();
            context.moveTo(particle.x, particle.y);
            context.lineTo(other.x, other.y);
            context.strokeStyle = `rgba(108, 229, 255, ${0.085 * (1 - distance / 115)})`;
            context.lineWidth = 0.6;
            context.stroke();
          }
        }
      });
      animationFrame = requestAnimationFrame(draw);
    };

    resize();
    draw();
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 180);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(animationFrame);
      else draw();
    });
  }
})();
