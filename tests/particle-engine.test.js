/**
 * @jest-environment jsdom
 */
const { ParticleEngine } = require('../lib/particle-engine');

describe('ParticleEngine', () => {
  test('should initialize with config', () => {
    const engine = new ParticleEngine({ particleCount: 50 });
    expect(engine.particles.length).toBe(50);
  });

  test('should apply gravity over time', () => {
    const engine = new ParticleEngine({ particleCount: 1, gravity: 0.5 });
    const initialVY = engine.particles[0].vy;
    engine.update();
    expect(engine.particles[0].vy).toBeGreaterThan(initialVY);
  });

  test('should create burst effect', () => {
    const engine = new ParticleEngine({ particleCount: 10 });
    engine.burst(100, 100);
    expect(engine.particles.some(p => p.vx !== 0 && p.vy !== 0)).toBe(true);
  });
});
