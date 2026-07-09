/**
 * chart-renderer.js
 * Canvas 图表渲染引擎
 *
 * 基于 Canvas 2D API 实现的高性能数据可视化渲染类。
 * 支持折线图、柱状图、饼图、雷达图四种图表类型，
 * 内置坐标轴计算、网格绘制、图例、提示框与动画插值能力。
 *
 * 用法：
 *   const renderer = new ChartRenderer(document.getElementById('chart'));
 *   renderer.drawLine(lineData);
 *   renderer.drawBar(barData);
 *   renderer.drawPie(pieData);
 *   renderer.drawRadar(radarData);
 *
 * 协议：Apache License 2.0
 * 版权：2026 Data Visualization Team
 */

(function (global, factory) {
  'use strict';
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = factory();
  } else {
    global.ChartRenderer = factory();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  // 默认配色方案（Material Design 色板）
  var DEFAULT_PALETTE = [
    '#3f51b5', '#ec407a', '#26a69a', '#ff7043',
    '#7e57c2', '#42a5f5', '#9ccc65', '#ffa726',
    '#5c6bc0', '#ef5350', '#26c6da', '#66bb6a'
  ];

  // 默认配置项
  var DEFAULT_OPTIONS = {
    padding: { top: 40, right: 40, bottom: 50, left: 60 },
    palette: DEFAULT_PALETTE,
    backgroundColor: 'transparent',
    axisColor: '#cfd8dc',
    gridColor: '#eceff1',
    textColor: '#455a64',
    titleColor: '#263238',
    font: '14px "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", sans-serif',
    titleFont: 'bold 16px "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", sans-serif',
    showLegend: true,
    showGrid: true,
    showTooltip: true,
    animate: true,
    duration: 600,
    smooth: true
  };

  /**
   * 合并配置对象（浅合并，padding/palette 单独处理）
   */
  function mergeOptions(base, override) {
    var result = {};
    var key;
    for (key in base) {
      if (Object.prototype.hasOwnProperty.call(base, key)) {
        result[key] = base[key];
      }
    }
    if (override) {
      for (key in override) {
        if (Object.prototype.hasOwnProperty.call(override, key)) {
          if (key === 'padding' && typeof override[key] === 'object') {
            result[key] = Object.assign({}, base[key], override[key]);
          } else {
            result[key] = override[key];
          }
        }
      }
    }
    return result;
  }

  /**
   * 数值格式化，便于坐标轴刻度显示
   */
  function formatNumber(value) {
    if (Math.abs(value) >= 1e8) return (value / 1e8).toFixed(2) + '亿';
    if (Math.abs(value) >= 1e4) return (value / 1e4).toFixed(1) + '万';
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(1);
  }

  /**
   * 计算数值轴的「美观」刻度区间
   */
  function niceScale(min, max, ticks) {
    ticks = ticks || 5;
    if (min === max) {
      max = min + 1;
      min = min - 1;
    }
    var range = max - min;
    var roughStep = range / ticks;
    var magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
    var normalized = roughStep / magnitude;
    var step;
    if (normalized < 1.5) step = 1;
    else if (normalized < 3) step = 2;
    else if (normalized < 7) step = 5;
    else step = 10;
    step *= magnitude;

    var niceMin = Math.floor(min / step) * step;
    var niceMax = Math.ceil(max / step) * step;
    return { min: niceMin, max: niceMax, step: step };
  }

  /**
   * 缓动函数（easeOutCubic）
   */
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  /**
   * 通用动画驱动器
   */
  function animate(duration, onFrame, onDone) {
    if (typeof requestAnimationFrame === 'undefined') {
      onFrame(1);
      onDone && onDone();
      return;
    }
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      onFrame(easeOutCubic(progress));
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        onDone && onDone();
      }
    }
    requestAnimationFrame(step);
  }

  /**
   * Catmull-Rom 样条转贝塞尔，用于折线平滑
   */
  function smoothLine(ctx, points) {
    if (points.length < 2) return;
    ctx.moveTo(points[0].x, points[0].y);
    for (var i = 0; i < points.length - 1; i++) {
      var p0 = points[i === 0 ? 0 : i - 1];
      var p1 = points[i];
      var p2 = points[i + 1];
      var p3 = points[i + 2 < points.length ? i + 2 : i + 1];
      var cp1x = p1.x + (p2.x - p0.x) / 6;
      var cp1y = p1.y + (p2.y - p0.y) / 6;
      var cp2x = p2.x - (p3.x - p1.x) / 6;
      var cp2y = p2.y - (p3.y - p1.y) / 6;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
  }

  /**
   * ChartRenderer 图表渲染引擎主类
   * @param {HTMLCanvasElement|string} canvas Canvas 元素或其选择器
   * @param {Object} [options] 全局配置
   */
  function ChartRenderer(canvas, options) {
    if (typeof canvas === 'string') {
      canvas = document.querySelector(canvas);
    }
    if (!canvas || !canvas.getContext) {
      throw new Error('ChartRenderer: 需要传入有效的 Canvas 元素');
    }
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = mergeOptions(DEFAULT_OPTIONS, options);
    this._tooltipEl = null;
    this._bound = false;
  }

  /**
   * 处理高分屏（DPR）缩放，保证清晰度
   */
  ChartRenderer.prototype._setupDPR = function () {
    var dpr = (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1;
    var rect = this.canvas.getBoundingClientRect();
    var w = rect.width || this.canvas.width || 600;
    var h = rect.height || this.canvas.height || 400;
    this._width = w;
    this._height = h;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width: w, height: h };
  };

  /**
   * 清空画布并填充背景
   */
  ChartRenderer.prototype._clear = function () {
    var size = this._setupDPR();
    this.ctx.clearRect(0, 0, size.width, size.height);
    if (this.options.backgroundColor !== 'transparent') {
      this.ctx.fillStyle = this.options.backgroundColor;
      this.ctx.fillRect(0, 0, size.width, size.height);
    }
    return size;
  };

  /**
   * 绘制标题与绘图区域边距
   * @returns {{plot: {x:number,y:number,w:number,h:number}, size: Object}}
   */
  ChartRenderer.prototype._plotArea = function (size) {
    var o = this.options;
    var pad = o.padding;
    return {
      size: size,
      plot: {
        x: pad.left,
        y: pad.top,
        w: size.width - pad.left - pad.right,
        h: size.height - pad.top - pad.bottom
      }
    };
  };

  /**
   * 绘制图表标题
   */
  ChartRenderer.prototype._drawTitle = function (title, size) {
    if (!title) return;
    var ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = this.options.titleColor;
    ctx.font = this.options.titleFont;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(title, this.options.padding.left, 12);
    ctx.restore();
  };

  /**
   * 绘制图例
   */
  ChartRenderer.prototype._drawLegend = function (items, size) {
    if (!this.options.showLegend || !items || !items.length) return;
    var ctx = this.ctx;
    var o = this.options;
    var x = size.width - o.padding.right + 8;
    var y = o.padding.top;
    var lineH = 22;
    ctx.save();
    ctx.font = o.font;
    ctx.textBaseline = 'middle';
    items.forEach(function (item, i) {
      var oy = y + i * lineH;
      ctx.fillStyle = item.color;
      ctx.fillRect(x, oy - 6, 12, 12);
      ctx.fillStyle = o.textColor;
      ctx.textAlign = 'left';
      ctx.fillText(item.name, x + 18, oy);
    });
    ctx.restore();
  };

  /* ------------------------------------------------------------------ *
   * 折线图
   * ------------------------------------------------------------------ */

  /**
   * 绘制折线图
   * @param {Object} data 数据
   *   { labels: ['周一','周二', ...],
   *     series: [{ name:'访问量', values:[...] }, ...] }
   * @param {Object} [opts] 覆盖配置
   */
  ChartRenderer.prototype.drawLine = function (data, opts) {
    var self = this;
    var o = mergeOptions(this.options, opts);
    this.options = o;
    var size = this._clear();
    var area = this._plotArea(size);
    var plot = area.plot;
    var ctx = this.ctx;

    var labels = data.labels || [];
    var series = data.series || [];
    if (!series.length) return;

    // 计算数值范围
    var allValues = series.reduce(function (acc, s) {
      return acc.concat(s.values || []);
    }, []);
    var dataMax = Math.max.apply(null, allValues);
    var dataMin = Math.min.apply(null, allValues.concat([0]));
    var scale = niceScale(dataMin, dataMax, 5);

    self._drawAxis(plot, scale, labels, 'y', o);
    self._drawTitle(data.title, size);

    var legendItems = series.map(function (s, i) {
      return { name: s.name, color: o.palette[i % o.palette.length] };
    });
    self._drawLegend(legendItems, size);

    var n = labels.length;
    var stepX = n > 1 ? plot.w / (n - 1) : 0;

    function drawAt(progress) {
      // 清掉数据层（重新绘制网格之上的折线）
      // 这里直接重绘整个图表保证简洁
      ctx.clearRect(0, 0, size.width, size.height);
      self._drawAxis(plot, scale, labels, 'y', o);
      self._drawTitle(data.title, size);
      self._drawLegend(legendItems, size);

      series.forEach(function (s, si) {
        var color = o.palette[si % o.palette.length];
        var pts = (s.values || []).map(function (v, i) {
          var x = plot.x + i * stepX;
          var ratio = (v - scale.min) / (scale.max - scale.min || 1);
          var y = plot.y + plot.h - ratio * plot.h * progress;
          return { x: x, y: y, v: v };
        });

        // 填充区域
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(pts[0].x, plot.y + plot.h);
        if (o.smooth) {
          smoothLine(ctx, pts);
        } else {
          pts.forEach(function (p) { ctx.lineTo(p.x, p.y); });
        }
        ctx.lineTo(pts[pts.length - 1].x, plot.y + plot.h);
        ctx.closePath();
        var grad = ctx.createLinearGradient(0, plot.y, 0, plot.y + plot.h);
        grad.addColorStop(0, color + '55');
        grad.addColorStop(1, color + '05');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();

        // 折线
        ctx.save();
        ctx.beginPath();
        if (o.smooth) {
          smoothLine(ctx, pts);
        } else {
          ctx.moveTo(pts[0].x, pts[0].y);
          pts.forEach(function (p) { ctx.lineTo(p.x, p.y); });
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();

        // 数据点
        pts.forEach(function (p) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = '#fff';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = color;
          ctx.stroke();
        });
      });
    }

    if (o.animate) {
      animate(o.duration, drawAt);
    } else {
      drawAt(1);
    }
    self._bindTooltip(plot, labels, series, scale, stepX, o);
  };

  /* ------------------------------------------------------------------ *
   * 柱状图
   * ------------------------------------------------------------------ */

  /**
   * 绘制柱状图
   * @param {Object} data 数据
   *   { labels: ['周一','周二', ...],
   *     series: [{ name:'访问量', values:[...] }, ...] }
   * @param {Object} [opts] 覆盖配置
   */
  ChartRenderer.prototype.drawBar = function (data, opts) {
    var self = this;
    var o = mergeOptions(this.options, opts);
    this.options = o;
    var size = this._clear();
    var plot = this._plotArea(size).plot;
    var ctx = this.ctx;

    var labels = data.labels || [];
    var series = data.series || [];
    if (!series.length) return;

    var allValues = series.reduce(function (acc, s) {
      return acc.concat(s.values || []);
    }, []);
    var dataMax = Math.max.apply(null, allValues.concat([0]));
    var dataMin = Math.min(0, Math.min.apply(null, allValues.concat([0])));
    var scale = niceScale(dataMin, dataMax, 5);

    self._drawAxis(plot, scale, labels, 'y', o);
    self._drawTitle(data.title, size);

    var legendItems = series.map(function (s, i) {
      return { name: s.name, color: o.palette[i % o.palette.length] };
    });
    self._drawLegend(legendItems, size);

    var n = labels.length;
    var groupWidth = plot.w / n;
    var barGap = 4;
    var barWidth = (groupWidth * 0.7 - (series.length - 1) * barGap) / series.length;

    function drawAt(progress) {
      ctx.clearRect(0, 0, size.width, size.height);
      self._drawAxis(plot, scale, labels, 'y', o);
      self._drawTitle(data.title, size);
      self._drawLegend(legendItems, size);

      series.forEach(function (s, si) {
        var color = o.palette[si % o.palette.length];
        (s.values || []).forEach(function (v, i) {
          var ratio = (v - scale.min) / (scale.max - scale.min || 1);
          var fullH = ratio * plot.h;
          var h = fullH * progress;
          var x = plot.x + i * groupWidth + groupWidth * 0.15 + si * (barWidth + barGap);
          var y = plot.y + plot.h - (scale.min < 0 ? 0 : 0) - h;
          var baseY = plot.y + plot.h - (-scale.min) / (scale.max - scale.min) * plot.h;

          ctx.save();
          var grad = ctx.createLinearGradient(0, y, 0, baseY);
          grad.addColorStop(0, color);
          grad.addColorStop(1, color + 'aa');
          ctx.fillStyle = grad;
          var radius = Math.min(barWidth / 2, 6);
          self._roundRect(ctx, x, y, barWidth, Math.max(h, 0.5), radius, radius, 0, 0);
          ctx.fill();
          ctx.restore();

          // 顶部数值标签
          if (progress > 0.9) {
            ctx.save();
            ctx.fillStyle = o.textColor;
            ctx.font = o.font;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(formatNumber(v), x + barWidth / 2, y - 4);
            ctx.restore();
          }
        });
      });
    }

    if (o.animate) {
      animate(o.duration, drawAt);
    } else {
      drawAt(1);
    }
  };

  /* ------------------------------------------------------------------ *
   * 饼图
   * ------------------------------------------------------------------ */

  /**
   * 绘制饼图
   * @param {Object} data 数据
   *   { title: '设备分布',
   *     series: [{ name:'移动端', value:68.4 }, ...] }
   * @param {Object} [opts] 覆盖配置（可设置 donut:true 绘制环形图）
   */
  ChartRenderer.prototype.drawPie = function (data, opts) {
    var self = this;
    var o = mergeOptions(this.options, opts);
    this.options = o;
    var size = this._clear();
    var ctx = this.ctx;
    var cx = size.width / 2 - (o.showLegend ? 60 : 0);
    var cy = size.height / 2 + 10;
    var radius = Math.min(size.width, size.height) / 2 - 60;
    radius = Math.max(radius, 30);

    var series = (data.series || []).filter(function (s) { return s.value > 0; });
    if (!series.length) return;

    var total = series.reduce(function (acc, s) { return acc + s.value; }, 0);
    var legendItems = series.map(function (s, i) {
      return { name: s.name + ' ' + (s.value / total * 100).toFixed(1) + '%', color: o.palette[i % o.palette.length] };
    });
    self._drawLegend(legendItems, size);
    self._drawTitle(data.title, size);

    var startAngle = -Math.PI / 2;

    function drawAt(progress) {
      ctx.clearRect(0, 0, size.width, size.height);
      self._drawLegend(legendItems, size);
      self._drawTitle(data.title, size);

      var angle = startAngle;
      series.forEach(function (s, i) {
        var slice = (s.value / total) * Math.PI * 2 * progress;
        var endAngle = angle + slice;
        var color = o.palette[i % o.palette.length];

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, angle, endAngle);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // 标签
        if (progress > 0.9 && slice > 0.15) {
          var mid = angle + slice / 2;
          var lx = cx + Math.cos(mid) * radius * 0.6;
          var ly = cy + Math.sin(mid) * radius * 0.6;
          ctx.save();
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 13px ' + o.font.split(' ').slice(1).join(' ');
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText((s.value / total * 100).toFixed(1) + '%', lx, ly);
          ctx.restore();
        }
        angle = endAngle;
      });

      // 环形图中心文字
      if (o.donut) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.58, 0, Math.PI * 2);
        ctx.fillStyle = o.backgroundColor === 'transparent' ? '#fff' : o.backgroundColor;
        ctx.fill();
        ctx.fillStyle = o.titleColor;
        ctx.font = o.titleFont;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(formatNumber(total), cx, cy - 6);
        ctx.font = o.font;
        ctx.fillStyle = o.textColor;
        ctx.fillText(data.unit || '', cx, cy + 14);
        ctx.restore();
      }
    }

    if (o.animate) {
      animate(o.duration, drawAt);
    } else {
      drawAt(1);
    }
    self._lastPie = { cx: cx, cy: cy, radius: radius, series: series, total: total, palette: o.palette };
  };

  /* ------------------------------------------------------------------ *
   * 雷达图
   * ------------------------------------------------------------------ */

  /**
   * 绘制雷达图
   * @param {Object} data 数据
   *   { labels: ['性能','可用性','安全','体验','覆盖','响应速度'],
   *     series: [{ name:'当前版本', values:[...] }, ...] }
   * @param {Object} [opts] 覆盖配置（可设置 max:100 指定最大值）
   */
  ChartRenderer.prototype.drawRadar = function (data, opts) {
    var self = this;
    var o = mergeOptions(this.options, opts);
    this.options = o;
    var size = this._clear();
    var ctx = this.ctx;
    var cx = size.width / 2 - (o.showLegend ? 50 : 0);
    var cy = size.height / 2 + 6;
    var radius = Math.min(size.width, size.height) / 2 - 70;
    radius = Math.max(radius, 40);

    var labels = data.labels || [];
    var series = data.series || [];
    var n = labels.length;
    if (!n || !series.length) return;

    var max = o.max || Math.max.apply(null, series.reduce(function (acc, s) {
      return acc.concat(s.values || []);
    }, [1]));
    var levels = 5;
    var legendItems = series.map(function (s, i) {
      return { name: s.name, color: o.palette[i % o.palette.length] };
    });
    self._drawLegend(legendItems, size);
    self._drawTitle(data.title, size);

    var angleStep = (Math.PI * 2) / n;

    function pointFor(value, i, prog) {
      var angle = -Math.PI / 2 + i * angleStep;
      var r = (value / max) * radius * prog;
      return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
    }

    function vertexAt(i, r) {
      var angle = -Math.PI / 2 + i * angleStep;
      return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
    }

    function drawAt(progress) {
      ctx.clearRect(0, 0, size.width, size.height);
      self._drawLegend(legendItems, size);
      self._drawTitle(data.title, size);

      // 网格多边形
      for (var lv = 1; lv <= levels; lv++) {
        var r = (radius / levels) * lv;
        ctx.save();
        ctx.beginPath();
        for (var i = 0; i < n; i++) {
          var p = vertexAt(i, r);
          if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.strokeStyle = o.gridColor;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }

      // 轴线
      for (var j = 0; j < n; j++) {
        var pv = vertexAt(j, radius);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(pv.x, pv.y);
        ctx.strokeStyle = o.axisColor;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }

      // 维度标签
      ctx.save();
      ctx.font = o.font;
      ctx.fillStyle = o.textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (var k = 0; k < n; k++) {
        var lp = vertexAt(k, radius + 22);
        ctx.fillText(labels[k], lp.x, lp.y);
      }
      ctx.restore();

      // 数据多边形
      series.forEach(function (s, si) {
        var color = o.palette[si % o.palette.length];
        var pts = (s.values || []).map(function (v, i) {
          return pointFor(v, i, progress);
        });

        ctx.save();
        ctx.beginPath();
        pts.forEach(function (p, i) {
          if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        });
        ctx.closePath();
        ctx.fillStyle = color + '33';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // 数据点
        pts.forEach(function (p) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = '#fff';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = color;
          ctx.stroke();
        });
      });
    }

    if (o.animate) {
      animate(o.duration, drawAt);
    } else {
      drawAt(1);
    }
  };

  /* ------------------------------------------------------------------ *
   * 公共辅助：坐标轴与圆角矩形
   * ------------------------------------------------------------------ */

  /**
   * 绘制坐标轴、网格与刻度
   */
  ChartRenderer.prototype._drawAxis = function (plot, scale, labels, axis, o) {
    var ctx = this.ctx;
    ctx.save();
    ctx.font = o.font;
    ctx.fillStyle = o.textColor;
    ctx.strokeStyle = o.axisColor;
    ctx.lineWidth = 1;

    var ticks = Math.round((scale.max - scale.min) / scale.step);
    for (var i = 0; i <= ticks; i++) {
      var v = scale.min + i * scale.step;
      var y = plot.y + plot.h - ((v - scale.min) / (scale.max - scale.min)) * plot.h;

      // 网格
      if (o.showGrid) {
        ctx.beginPath();
        ctx.moveTo(plot.x, y);
        ctx.lineTo(plot.x + plot.w, y);
        ctx.strokeStyle = o.gridColor;
        ctx.stroke();
      }
      // Y 轴刻度文字
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = o.textColor;
      ctx.fillText(formatNumber(v), plot.x - 8, y);
    }

    // X 轴标签
    var n = labels.length;
    var stepX = n > 1 ? plot.w / (n - 1) : 0;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    labels.forEach(function (lab, i) {
      var x = plot.x + i * stepX;
      ctx.fillText(String(lab), x, plot.y + plot.h + 8);
    });

    // 主轴线
    ctx.strokeStyle = o.axisColor;
    ctx.beginPath();
    ctx.moveTo(plot.x, plot.y);
    ctx.lineTo(plot.x, plot.y + plot.h);
    ctx.lineTo(plot.x + plot.w, plot.y + plot.h);
    ctx.stroke();
    ctx.restore();
  };

  /**
   * 绘制圆角矩形路径
   */
  ChartRenderer.prototype._roundRect = function (ctx, x, y, w, h, r1, r2, r3, r4) {
    ctx.beginPath();
    ctx.moveTo(x + r1, y);
    ctx.lineTo(x + w - r2, y);
    ctx.arcTo(x + w, y, x + w, y + r2, r2);
    ctx.lineTo(x + w, y + h - r3);
    ctx.arcTo(x + w, y + h, x + w - r3, y + h, r3);
    ctx.lineTo(x + r4, y + h);
    ctx.arcTo(x, y + h, x, y + h - r4, r4);
    ctx.lineTo(x, y + r1);
    ctx.arcTo(x, y, x + r1, y, r1);
    ctx.closePath();
  };

  /**
   * 绑定鼠标提示框（仅折线图场景）
   */
  ChartRenderer.prototype._bindTooltip = function (plot, labels, series, scale, stepX, o) {
    var self = this;
    if (!o.showTooltip || typeof document === 'undefined') return;
    if (self._bound) return;
    self._bound = true;

    self.canvas.addEventListener('mousemove', function (e) {
      var rect = self.canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left;
      var my = e.clientY - rect.top;

      if (mx < plot.x || mx > plot.x + plot.w) {
        self._hideTooltip();
        return;
      }
      var idx = Math.round((mx - plot.x) / (stepX || 1));
      idx = Math.max(0, Math.min(labels.length - 1, idx));

      var rows = series.map(function (s, si) {
        var v = (s.values || [])[idx];
        return '<span style="color:' + o.palette[si % o.palette.length] + '">●</span> ' +
          s.name + ': <b>' + formatNumber(v) + '</b>';
      }).join('<br>');

      self._showTooltip(e.clientX, e.clientY, '<b>' + labels[idx] + '</b><br>' + rows);
    });
    self.canvas.addEventListener('mouseleave', function () {
      self._hideTooltip();
    });
  };

  /**
   * 显示提示框
   */
  ChartRenderer.prototype._showTooltip = function (x, y, html) {
    var el = this._tooltipEl;
    if (!el) {
      el = document.createElement('div');
      el.style.cssText = [
        'position:fixed',
        'pointer-events:none',
        'z-index:9999',
        'padding:8px 10px',
        'background:rgba(38,50,56,0.92)',
        'color:#fff',
        'font-size:12px',
        'border-radius:6px',
        'box-shadow:0 2px 8px rgba(0,0,0,0.2)',
        'line-height:1.5',
        'display:none'
      ].join(';');
      document.body.appendChild(el);
      this._tooltipEl = el;
    }
    el.innerHTML = html;
    el.style.display = 'block';
    el.style.left = (x + 12) + 'px';
    el.style.top = (y + 12) + 'px';
  };

  /**
   * 隐藏提示框
   */
  ChartRenderer.prototype._hideTooltip = function () {
    if (this._tooltipEl) this._tooltipEl.style.display = 'none';
  };

  /**
   * 销毁实例，清理提示框与事件
   */
  ChartRenderer.prototype.destroy = function () {
    this._hideTooltip();
    if (this._tooltipEl && this._tooltipEl.parentNode) {
      this._tooltipEl.parentNode.removeChild(this._tooltipEl);
    }
    this._tooltipEl = null;
    this._bound = false;
  };

  return ChartRenderer;
});
