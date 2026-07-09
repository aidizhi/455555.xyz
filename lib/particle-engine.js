/**
 * particle-engine.js
 * 粒子物理引擎
 *
 * 基于 Canvas 2D API 与 requestAnimationFrame 实现的轻量级粒子系统，
 * 内置重力、空气阻尼、边界碰撞、粒子间碰撞与力场（吸引/排斥/涡旋）能力。
 * 适用于背景粒子动画、数据可视化点缀效果与实时物理模拟演示。
 *
 * 用法：
 *   const engine = new ParticleEngine(document.getElementById('stage'), {
 *     count: 200,
 *     gravity: 0.08,
 *     damping: 0.985
 *   });
 *   engine.start();
 *
 * 协议：Apache License 2.0
 * 版权：2026 Data Visualization Team
 */

(function (global, factory) {
  'use strict';
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = factory();
  } else {
    global.ParticleEngine = factory();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  // 力场类型枚举
  var FORCE_TYPE = {
    ATTRACT: 'attract',   // 径向吸引
    REPEL: 'repel',       // 径向排斥
    VORTEX: 'vortex',     // 涡旋（切向）
    WIND: 'wind'          // 定向风力
  };

  // 默认颜色方案
  var DEFAULT_COLORS = ['#3f51b5', '#5c6bc0', '#7986cb', '#9fa8da', '#c5cae9'];

  // 默认配置
  var DEFAULT_OPTIONS = {
    count: 150,                // 粒子数量
    maxSpeed: 3.2,              // 最大速度上限
    gravity: 0.08,              // 全局重力加速度（向下为正）
    damping: 0.985,             // 速度阻尼系数（每帧衰减）
    radius: { min: 1.5, max: 4 }, // 粒子半径范围
    colors: DEFAULT_COLORS,
    backgroundColor: 'transparent',
    linkDistance: 90,           // 连线最大距离（设为 0 关闭连线）
    linkColor: 'rgba(63,81,181,0.18)',
    bounce: 0.8,                // 边界碰撞弹性系数（0~1）
    collision: true,            // 是否启用粒子间碰撞
    mouseAttract: true,          // 是否响应鼠标力场
    mouseRadius: 140            // 鼠标作用半径
  };

  /**
   * 生成 [min, max) 范围内的随机浮点数
   */
  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  /**
   * 简单二维向量运算对象（避免新建类的开销）
   */
  function vec(x, y) { return { x: x, y: y }; }

  /**
   * Particle 单个粒子
   */
  function Particle(x, y, opts) {
    this.x = x;
    this.y = y;
    this.vx = rand(-1, 1);
    this.vy = rand(-1, 1);
    this.radius = rand(opts.radius.min, opts.radius.max);
    this.mass = this.radius * this.radius; // 质量与面积成正比
    this.color = opts.colors[Math.floor(Math.random() * opts.colors.length)];
    this.life = 1;             // 生命周期（0~1），1 表示满
    this.decay = 0;            // 每帧衰减量，0 表示永生
  }

  /**
   * ForceField 力场
   * @param {number} x  中心 x
   * @param {number} y  中心 y
   * @param {string} type 力场类型，见 FORCE_TYPE
   * @param {number} strength 强度
   * @param {number} radius 作用半径（0 表示无限远）
   */
  function ForceField(x, y, type, strength, radius) {
    this.x = x;
    this.y = y;
    this.type = type || FORCE_TYPE.ATTRACT;
    this.strength = strength == null ? 0.12 : strength;
    this.radius = radius == null ? 200 : radius;
  }

  /**
   * ParticleEngine 粒子物理引擎主类
   * @param {HTMLCanvasElement|string} canvas Canvas 元素或选择器
   * @param {Object} [options] 配置项
   */
  function ParticleEngine(canvas, options) {
    if (typeof canvas === 'string') {
      canvas = document.querySelector(canvas);
    }
    if (!canvas || !canvas.getContext) {
      throw new Error('ParticleEngine: 需要传入有效的 Canvas 元素');
    }
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = Object.assign({}, DEFAULT_OPTIONS, options, {
      radius: Object.assign({}, DEFAULT_OPTIONS.radius, (options || {}).radius)
    });
    this.particles = [];
    this.fields = [];
    this._rafId = null;
    this._running = false;
    this._lastTime = 0;
    this.mouse = { x: -9999, y: -9999, active: false };
    this._onTick = null;
    this._setupCanvas();
    this._bindEvents();
  }

  /**
   * 初始化画布尺寸与 DPR
   */
  ParticleEngine.prototype._setupCanvas = function () {
    // 兼容无 window 环境（如 Node.js 测试 / SSR），缺省 DPR 为 1
    var dpr = (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1;
    var rect = this.canvas.getBoundingClientRect();
    var w = rect.width || this.canvas.clientWidth || 600;
    var h = rect.height || this.canvas.clientHeight || 400;
    this.width = w;
    this.height = h;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  /**
   * 绑定鼠标 / 触摸事件，用于交互力场
   */
  ParticleEngine.prototype._bindEvents = function () {
    var self = this;
    function setMouse(e) {
      var rect = self.canvas.getBoundingClientRect();
      var pt = e.touches ? e.touches[0] : e;
      self.mouse.x = pt.clientX - rect.left;
      self.mouse.y = pt.clientY - rect.top;
      self.mouse.active = true;
    }
    this.canvas.addEventListener('mousemove', setMouse);
    this.canvas.addEventListener('touchmove', function (e) { setMouse(e); e.preventDefault(); }, { passive: false });
    this.canvas.addEventListener('mouseleave', function () {
      self.mouse.active = false;
      self.mouse.x = -9999;
      self.mouse.y = -9999;
    });
    this.canvas.addEventListener('touchend', function () {
      self.mouse.active = false;
    });

    // 窗口尺寸变化时重设画布
    this._onResize = function () { self._setupCanvas(); };
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this._onResize);
    }
  };

  /**
   * 初始化粒子集合
   */
  ParticleEngine.prototype.init = function () {
    this.particles = [];
    var o = this.options;
    for (var i = 0; i < o.count; i++) {
      this.particles.push(new Particle(rand(0, this.width), rand(0, this.height), o));
    }
    return this;
  };

  /**
   * 添加一个力场
   * @returns {ForceField} 新建的力场对象
   */
  ParticleEngine.prototype.addField = function (x, y, type, strength, radius) {
    var f = new ForceField(x, y, type, strength, radius);
    this.fields.push(f);
    return f;
  };

  /**
   * 移除全部力场
   */
  ParticleEngine.prototype.clearFields = function () {
    this.fields = [];
    return this;
  };

  /**
   * 添加单个粒子
   */
  ParticleEngine.prototype.addParticle = function (x, y, vx, vy) {
    var p = new Particle(x != null ? x : rand(0, this.width), y != null ? y : rand(0, this.height), this.options);
    if (vx != null) p.vx = vx;
    if (vy != null) p.vy = vy;
    this.particles.push(p);
    return p;
  };

  /**
   * 在指定位置爆发一批粒子（烟花效果）
   */
  ParticleEngine.prototype.burst = function (x, y, count, speed) {
    count = count || 30;
    speed = speed || 4;
    for (var i = 0; i < count; i++) {
      var angle = (Math.PI * 2 * i) / count + rand(-0.1, 0.1);
      var s = rand(speed * 0.4, speed);
      var p = this.addParticle(x, y, Math.cos(angle) * s, Math.sin(angle) * s);
      p.decay = rand(0.008, 0.02); // 爆发粒子带衰减
    }
    return this;
  };

  /**
   * 应用重力
   */
  ParticleEngine.prototype._applyGravity = function (p) {
    p.vy += this.options.gravity;
  };

  /**
   * 应用阻尼
   */
  ParticleEngine.prototype._applyDamping = function (p) {
    p.vx *= this.options.damping;
    p.vy *= this.options.damping;
  };

  /**
   * 应用力场（吸引/排斥/涡旋/风）
   */
  ParticleEngine.prototype._applyFields = function (p) {
    var fields = this.fields;
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      var dx = f.x - p.x;
      var dy = f.y - p.y;
      var dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
      // 超出作用半径则跳过（radius=0 表示无限远）
      if (f.radius > 0 && dist > f.radius) continue;

      var nx = dx / dist;
      var ny = dy / dist;
      var falloff = f.radius > 0 ? (1 - dist / f.radius) : 1;
      var force = f.strength * falloff;

      switch (f.type) {
        case FORCE_TYPE.ATTRACT:
          p.vx += nx * force;
          p.vy += ny * force;
          break;
        case FORCE_TYPE.REPEL:
          p.vx -= nx * force;
          p.vy -= ny * force;
          break;
        case FORCE_TYPE.VORTEX:
          // 切向力（垂直于径向方向）
          p.vx += -ny * force;
          p.vy += nx * force;
          break;
        case FORCE_TYPE.WIND:
          // 定向力，强度即风向量分量（存储在 strength 中作统一接口）
          p.vx += f.strength;
          p.vy += 0;
          break;
      }
    }

    // 鼠标力场（吸引）
    if (this.options.mouseAttract && this.mouse.active) {
      var mdx = this.mouse.x - p.x;
      var mdy = this.mouse.y - p.y;
      var mdist = Math.sqrt(mdx * mdx + mdy * mdy) || 0.001;
      if (mdist < this.options.mouseRadius) {
        var mf = (1 - mdist / this.options.mouseRadius) * 0.6;
        p.vx += (mdx / mdist) * mf;
        p.vy += (mdy / mdist) * mf;
      }
    }
  };

  /**
   * 限制最大速度
   */
  ParticleEngine.prototype._clampSpeed = function (p) {
    var max = this.options.maxSpeed;
    var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (sp > max) {
      p.vx = (p.vx / sp) * max;
      p.vy = (p.vy / sp) * max;
    }
  };

  /**
   * 边界碰撞处理
   */
  ParticleEngine.prototype._handleBounds = function (p) {
    var bounce = this.options.bounce;
    if (p.x - p.radius < 0) {
      p.x = p.radius;
      p.vx = -p.vx * bounce;
    } else if (p.x + p.radius > this.width) {
      p.x = this.width - p.radius;
      p.vx = -p.vx * bounce;
    }
    if (p.y - p.radius < 0) {
      p.y = p.radius;
      p.vy = -p.vy * bounce;
    } else if (p.y + p.radius > this.height) {
      p.y = this.height - p.radius;
      p.vy = -p.vy * bounce;
    }
  };

  /**
   * 粒子间碰撞检测与弹性响应（基于半径的圆形碰撞）
   */
  ParticleEngine.prototype._handleCollisions = function () {
    if (!this.options.collision) return;
    var ps = this.particles;
    for (var i = 0; i < ps.length; i++) {
      for (var j = i + 1; j < ps.length; j++) {
        var a = ps[i];
        var b = ps[j];
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var minDist = a.radius + b.radius;
        if (dist < minDist && dist > 0) {
          // 分离重叠
          var overlap = (minDist - dist) / 2;
          var nx = dx / dist;
          var ny = dy / dist;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;

          // 一维弹性碰撞（沿法线方向交换动量）
          var relVel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (relVel < 0) {
            var totalMass = a.mass + b.mass;
            var impulse = (2 * relVel) / totalMass;
            a.vx += impulse * b.mass * nx;
            a.vy += impulse * b.mass * ny;
            b.vx -= impulse * a.mass * nx;
            b.vy -= impulse * a.mass * ny;
          }
        }
      }
    }
  };

  /**
   * 更新所有粒子物理状态
   * @param {number} dt 时间步长（单位：帧，默认 1）
   */
  ParticleEngine.prototype.update = function (dt) {
    dt = dt || 1;
    var ps = this.particles;
    for (var i = ps.length - 1; i >= 0; i--) {
      var p = ps[i];
      this._applyGravity(p);
      this._applyFields(p);
      this._applyDamping(p);
      this._clampSpeed(p);

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // 生命周期衰减（爆发粒子）
      if (p.decay > 0) {
        p.life -= p.decay * dt;
        if (p.life <= 0) {
          ps.splice(i, 1);
          continue;
        }
      }

      this._handleBounds(p);
    }
    this._handleCollisions();
  };

  /**
   * 绘制一帧
   */
  ParticleEngine.prototype.render = function () {
    var ctx = this.ctx;
    var o = this.options;

    // 背景处理（带轻微拖尾效果）
    if (o.backgroundColor === 'transparent') {
      ctx.clearRect(0, 0, this.width, this.height);
    } else {
      ctx.fillStyle = o.backgroundColor;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    var ps = this.particles;

    // 绘制粒子间连线
    if (o.linkDistance > 0) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = o.linkColor;
      for (var i = 0; i < ps.length; i++) {
        for (var j = i + 1; j < ps.length; j++) {
          var dx = ps[i].x - ps[j].x;
          var dy = ps[i].y - ps[j].y;
          var dist2 = dx * dx + dy * dy;
          if (dist2 < o.linkDistance * o.linkDistance) {
            var alpha = 1 - Math.sqrt(dist2) / o.linkDistance;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.moveTo(ps[i].x, ps[i].y);
            ctx.lineTo(ps[j].x, ps[j].y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    // 绘制粒子
    for (var k = 0; k < ps.length; k++) {
      var p = ps[k];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  /**
   * 设置每帧回调（用于自定义渲染钩子）
   */
  ParticleEngine.prototype.onTick = function (fn) {
    this._onTick = fn;
    return this;
  };

  /**
   * 启动动画循环
   */
  ParticleEngine.prototype.start = function () {
    if (this._running) return this;
    if (!this.particles.length) this.init();
    // 无 requestAnimationFrame 环境（如 Node.js）时仅执行单帧，便于测试
    if (typeof requestAnimationFrame !== 'function') {
      this.update(1);
      this.render();
      if (this._onTick) this._onTick(1, this);
      return this;
    }
    this._running = true;
    this._lastTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    var self = this;

    function loop(now) {
      if (!self._running) return;
      // 以 60fps 为基准计算时间步长，保证不同帧率下物理表现一致
      var elapsed = now - self._lastTime;
      self._lastTime = now;
      var dt = Math.min(elapsed / 16.6667, 2); // 限制最大步长避免大跳跃
      if (!isFinite(dt) || dt <= 0) dt = 1;

      self.update(dt);
      self.render();
      if (self._onTick) self._onTick(dt, self);

      self._rafId = requestAnimationFrame(loop);
    }
    this._rafId = requestAnimationFrame(loop);
    return this;
  };

  /**
   * 停止动画循环
   */
  ParticleEngine.prototype.stop = function () {
    this._running = false;
    if (this._rafId && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this._rafId);
    }
    this._rafId = null;
    return this;
  };

  /**
   * 销毁引擎，移除事件与动画
   */
  ParticleEngine.prototype.destroy = function () {
    this.stop();
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this._onResize);
    }
    this.particles = [];
    this.fields = [];
    return this;
  };

  /**
   * 获取当前粒子数量
   */
  ParticleEngine.prototype.count = function () {
    return this.particles.length;
  };

  // 暴露常量与构造器
  ParticleEngine.ForceField = ForceField;
  ParticleEngine.Particle = Particle;
  ParticleEngine.FORCE_TYPE = FORCE_TYPE;

  return ParticleEngine;
});
