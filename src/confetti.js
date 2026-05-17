/**
 * confetti.js - Confetti efekt pro oslavu perfektní kontroly
 */

export function triggerConfetti(duration = 3000) {
  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const confettiCount = 50;
  const confettiElements = [];

  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.animationDelay = Math.random() * 2 + 's';
    confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';

    document.body.appendChild(confetti);
    confettiElements.push(confetti);
  }

  // Odstranění po dokončení
  setTimeout(() => {
    confettiElements.forEach(el => el.remove());
  }, duration + 3000);
}

