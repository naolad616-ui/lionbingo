import { useEffect, useRef } from 'react';

const COLORS = [
  '#ff1744',
  '#f50057',
  '#d500f9',
  '#651fff',
  '#2979ff',
  '#00b0ff',
  '#00e676',
  '#76ff03',
  '#ffea00',
  '#ffc400',
  '#ff9100',
  '#ff3d00',
  '#ffffff',
  '#ff80ab',
  '#82b1ff',
];

const SHAPES = ['rect', 'ribbon', 'circle'];
const BURST_COUNT = 120;
const STREAM_COUNT = 90;
const DURATION_MS = 4200;
const STREAM_MS = 1800;
const MAX_OPACITY = 0.88;

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function randomShape() {
  return SHAPES[Math.floor(Math.random() * SHAPES.length)];
}

function createFallingParticle(width, fromTop = true) {
  const size = 8 + Math.random() * 10;

  return {
    x: Math.random() * width,
    y: fromTop ? -10 - Math.random() * 40 : Math.random() * 0.2 * width,
    vx: (Math.random() - 0.5) * 3.5,
    vy: 1.8 + Math.random() * 3.2,
    size,
    width: size * (0.45 + Math.random() * 0.7),
    height: size * (0.7 + Math.random() * 1.1),
    color: randomColor(),
    shape: randomShape(),
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 14,
    gravity: 0.045 + Math.random() * 0.05,
    sway: (Math.random() - 0.5) * 0.12,
    drag: 0.992,
    opacity: MAX_OPACITY,
  };
}

function createBurstParticle(width, height) {
  const angle = Math.random() * Math.PI * 2;
  const speed = 2.5 + Math.random() * 7;
  const size = 9 + Math.random() * 11;

  return {
    x: width * (0.2 + Math.random() * 0.6),
    y: height * (0.08 + Math.random() * 0.18),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed * 0.55 - (2 + Math.random() * 4),
    size,
    width: size * (0.5 + Math.random() * 0.8),
    height: size * (0.65 + Math.random() * 1.2),
    color: randomColor(),
    shape: randomShape(),
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 16,
    gravity: 0.08 + Math.random() * 0.07,
    sway: (Math.random() - 0.5) * 0.08,
    drag: 0.988,
    opacity: MAX_OPACITY,
  };
}

function drawParticle(context, particle) {
  context.save();
  context.translate(particle.x, particle.y);
  context.rotate((particle.rotation * Math.PI) / 180);
  context.globalAlpha = particle.opacity;
  context.fillStyle = particle.color;

  if (particle.shape === 'circle') {
    context.beginPath();
    context.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
    context.fill();
  } else if (particle.shape === 'ribbon') {
    context.fillRect(
      -particle.width / 2,
      -particle.height / 2,
      particle.width * 0.35,
      particle.height,
    );
  } else {
    context.fillRect(
      -particle.width / 2,
      -particle.height / 2,
      particle.width,
      particle.height * 0.55,
    );
  }

  context.restore();
}

export default function CheckCardWinnerConfetti({ active, celebrationKey = 0 }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(0);

  useEffect(() => {
    if (!active || celebrationKey <= 0) {
      return undefined;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const parent = canvas.parentElement;
    if (!parent) {
      return undefined;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return undefined;
    }

    let width = 0;
    let height = 0;
    let particles = [];
    let startTime = 0;
    let lastSpawn = 0;
    let running = true;

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      const nextWidth = Math.max(1, Math.round(rect.width));
      const nextHeight = Math.max(1, Math.round(rect.height));
      const ratio = window.devicePixelRatio || 1;

      canvas.width = nextWidth * ratio;
      canvas.height = nextHeight * ratio;
      canvas.style.width = `${nextWidth}px`;
      canvas.style.height = `${nextHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      width = nextWidth;
      height = nextHeight;
    };

    const spawnStream = (count) => {
      for (let index = 0; index < count; index += 1) {
        particles.push(createFallingParticle(width, true));
      }
    };

    const draw = (timestamp) => {
      if (!running) {
        return;
      }

      if (!startTime) {
        startTime = timestamp;
        lastSpawn = timestamp;
        particles = [
          ...Array.from({ length: BURST_COUNT }, () => createBurstParticle(width, height)),
          ...Array.from({ length: STREAM_COUNT }, () => createFallingParticle(width, true)),
        ];
      }

      const elapsed = timestamp - startTime;
      const fadeStart = DURATION_MS * 0.62;
      const lifeOpacity = elapsed < fadeStart
        ? MAX_OPACITY
        : Math.max(0, MAX_OPACITY * (1 - (elapsed - fadeStart) / (DURATION_MS - fadeStart)));

      if (elapsed < STREAM_MS && timestamp - lastSpawn > 90) {
        spawnStream(10 + Math.floor(Math.random() * 8));
        lastSpawn = timestamp;
      }

      context.clearRect(0, 0, width, height);

      for (const particle of particles) {
        particle.vx = (particle.vx + particle.sway) * particle.drag;
        particle.vy += particle.gravity;
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.rotation += particle.rotationSpeed;
        particle.opacity = lifeOpacity;

        if (
          particle.y < height + 40
          && particle.x > -40
          && particle.x < width + 40
        ) {
          drawParticle(context, particle);
        }
      }

      if (particles.length > 420) {
        particles = particles.slice(-360);
      }

      if (elapsed < DURATION_MS) {
        animationRef.current = window.requestAnimationFrame(draw);
      } else {
        context.clearRect(0, 0, width, height);
      }
    };

    resize();
    animationRef.current = window.requestAnimationFrame(draw);

    const observer = typeof ResizeObserver === 'function'
      ? new ResizeObserver(resize)
      : null;
    observer?.observe(parent);

    return () => {
      running = false;
      window.cancelAnimationFrame(animationRef.current);
      observer?.disconnect();
      context.clearRect(0, 0, width, height);
    };
  }, [active, celebrationKey]);

  if (!active || celebrationKey <= 0) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="check-card-winner-confetti"
      aria-hidden="true"
    />
  );
}
