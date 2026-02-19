// ============================================
// 打字肉鸽 - 粒子效果
// ============================================

import { getElements } from '../ui/elements';

// === 生成粒子 ===
export function spawnParticles(
  origin: HTMLElement,
  count: number,
  color: string
): void {
  const el = getElements();
  const rect = origin.getBoundingClientRect();
  const containerRect = el.container.getBoundingClientRect();

  const x = rect.left + rect.width / 2 - containerRect.left;
  const y = rect.top + rect.height / 2 - containerRect.top;

  for (let i = 0; i < count; i++) {
    createParticle(x, y, color);
  }
}

// === 创建单个粒子 ===
function createParticle(x: number, y: number, color: string): void {
  const el = getElements();
  const particle = document.createElement('div');
  particle.className = 'particle';
  particle.style.background = color;
  particle.style.left = `${x}px`;
  particle.style.top = `${y}px`;

  // 随机方向
  const angle = Math.random() * Math.PI * 2;
  const distance = 30 + Math.random() * 50;
  const dx = Math.cos(angle) * distance;
  const dy = Math.sin(angle) * distance;

  particle.style.setProperty('--dx', `${dx}px`);
  particle.style.setProperty('--dy', `${dy}px`);

  el.particles.appendChild(particle);

  // 动画结束后移除
  setTimeout(() => particle.remove(), 350);
}
