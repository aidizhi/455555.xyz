# lib 目录说明

本目录存放 `canvas-data-viz` 项目的核心渲染库，全部基于原生 Canvas 2D API 实现，零第三方运行时依赖。包含两个独立模块：

| 文件 | 说明 |
|------|------|
| [`chart-renderer.js`](./chart-renderer.js) | Canvas 图表渲染引擎，支持折线图、柱状图、饼图、雷达图 |
| [`particle-engine.js`](./particle-engine.js) | 粒子物理引擎，支持重力、碰撞、力场与交互效果 |

两个模块均采用 UMD 包装，既可通过 `<script>` 标签直接在浏览器中引入（挂载到 `window`），也可通过 CommonJS 在 Node.js 环境中 `require`。

---

## 快速开始

### 浏览器环境

```html
<canvas id="chart" width="800" height="400"></canvas>
<canvas id="stage" width="800" height="400"></canvas>

<script src="lib/chart-renderer.js"></script>
<script src="lib/particle-engine.js"></script>
<script>
  // 图表渲染
  const renderer = new ChartRenderer('#chart');
  renderer.drawLine({
    title: '近 14 天访问量',
    labels: ['06-26', '06-27', '06-28', '06-29'],
    series: [{ name: '访问量', values: [118230, 125470, 142880, 151320] }]
  });

  // 粒子动画
  const engine = new ParticleEngine('#stage', { count: 200, gravity: 0.08 });
  engine.init().start();
</script>
```

### Node.js / 构建环境

```js
const ChartRenderer = require('./lib/chart-renderer.js');
const ParticleEngine = require('./lib/particle-engine.js');
```

> 说明：渲染类依赖 DOM 与 Canvas API，需在浏览器或 jsdom + node-canvas 等环境中执行实际绘制。

---

## chart-renderer.js

### 类：`ChartRenderer`

Canvas 图表渲染引擎。负责坐标轴计算、网格绘制、数据图形渲染、图例与提示框。

#### 构造函数

```js
new ChartRenderer(canvas, options?)
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `canvas` | `HTMLCanvasElement \| string` | Canvas 元素或其 CSS 选择器 |
| `options` | `Object` | 全局配置（见下表） |

#### 全局配置项 `options`

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `padding` | `Object` | `{top:40,right:40,bottom:50,left:60}` | 绘图区内边距 |
| `palette` | `string[]` | Material 色板 | 系列颜色循环数组 |
| `showLegend` | `boolean` | `true` | 是否显示图例 |
| `showGrid` | `boolean` | `true` | 是否显示网格线 |
| `showTooltip` | `boolean` | `true` | 是否启用鼠标提示框 |
| `animate` | `boolean` | `true` | 是否启用入场动画 |
| `duration` | `number` | `600` | 动画时长（毫秒） |
| `smooth` | `boolean` | `true` | 折线图是否使用平滑曲线 |
| `font` | `string` | — | 正文字体 CSS 字符串 |
| `titleFont` | `string` | — | 标题字体 CSS 字符串 |

#### 实例方法

##### `drawLine(data, options?)` — 折线图

绘制折线图，支持多数据系列、平滑曲线、渐变填充区域与数据点。

```js
renderer.drawLine({
  title: '每日访问量趋势',
  labels: ['周一', '周二', '周三', '周四', '周五'],
  series: [
    { name: '访问量', values: [1200, 1800, 1500, 2100, 1900] },
    { name: '独立访客', values: [800, 1200, 1000, 1500, 1300] }
  ]
}, { smooth: true });
```

| 数据字段 | 类型 | 说明 |
|----------|------|------|
| `title` | `string` | 图表标题 |
| `labels` | `string[]` | X 轴标签 |
| `series` | `Array<{name, values}>` | 数据系列，每个系列包含名称与数值数组 |

##### `drawBar(data, options?)` — 柱状图

绘制柱状图，支持多系列分组、圆角柱体与顶部数值标签。

```js
renderer.drawBar({
  title: '各线路延迟对比',
  labels: ['主域名', 'GitHub', 'Cloudflare', 'Netlify'],
  series: [{ name: '延迟(ms)', values: [86, 124, 78, 132] }]
});
```

##### `drawPie(data, options?)` — 饼图

绘制饼图。设置 `options.donut = true` 可绘制环形图，并在中心显示汇总值。

```js
renderer.drawPie({
  title: '设备分布',
  series: [
    { name: '移动端', value: 68.4 },
    { name: '桌面端', value: 24.7 },
    { name: '平板', value: 5.2 }
  ]
}, { donut: true });
```

##### `drawRadar(data, options?)` — 雷达图

绘制雷达图，支持多数据集对比。可通过 `options.max` 指定各维度最大值。

```js
renderer.drawRadar({
  title: '能力雷达',
  labels: ['性能', '可用性', '安全', '体验', '覆盖', '响应速度'],
  series: [
    { name: '当前版本', values: [92, 99, 95, 88, 90, 86] },
    { name: '上一版本', values: [78, 96, 88, 72, 76, 81] }
  ]
}, { max: 100 });
```

##### `destroy()` — 销毁实例

移除提示框 DOM 与事件监听，释放资源。

---

## particle-engine.js

### 类：`ParticleEngine`

粒子物理引擎。基于 `requestAnimationFrame` 的实时模拟循环，内置重力、阻尼、边界碰撞、粒子间碰撞与力场。

#### 构造函数

```js
new ParticleEngine(canvas, options?)
```

#### 配置项 `options`

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `count` | `number` | `150` | 粒子数量 |
| `maxSpeed` | `number` | `3.2` | 最大速度上限 |
| `gravity` | `number` | `0.08` | 全局重力加速度（向下为正） |
| `damping` | `number` | `0.985` | 速度阻尼系数（每帧衰减） |
| `radius` | `Object` | `{min:1.5,max:4}` | 粒子半径范围 |
| `colors` | `string[]` | 靛蓝色系 | 粒子颜色池 |
| `linkDistance` | `number` | `90` | 连线最大距离（0 关闭） |
| `bounce` | `number` | `0.8` | 边界碰撞弹性系数（0~1） |
| `collision` | `boolean` | `true` | 是否启用粒子间碰撞 |
| `mouseAttract` | `boolean` | `true` | 是否响应鼠标力场 |
| `mouseRadius` | `number` | `140` | 鼠标作用半径 |

#### 力场类型 `FORCE_TYPE`

| 常量 | 值 | 说明 |
|------|----|------|
| `ATTRACT` | `'attract'` | 径向吸引 |
| `REPEL` | `'repel'` | 径向排斥 |
| `VORTEX` | `'vortex'` | 涡旋（切向力） |
| `WIND` | `'wind'` | 定向风力 |

#### 实例方法

##### `init()` — 初始化粒子

根据 `count` 生成粒子集合，返回引擎实例（可链式调用）。

##### `addField(x, y, type, strength, radius)` — 添加力场

在 `(x, y)` 位置创建一个力场，返回 `ForceField` 对象。

```js
engine.addField(400, 200, ParticleEngine.FORCE_TYPE.ATTRACT, 0.2, 250);
engine.addField(200, 200, ParticleEngine.FORCE_TYPE.VORTEX, 0.15, 200);
```

##### `burst(x, y, count?, speed?)` — 爆发效果

在指定位置生成一批带生命周期衰减的粒子，模拟烟花。

##### `addParticle(x?, y?, vx?, vy?)` — 添加单个粒子

##### `start()` / `stop()` — 启动 / 停动动画循环

##### `onTick(fn)` — 设置每帧回调

回调签名：`fn(dt, engine)`，`dt` 为归一化时间步长。

##### `clearFields()` — 清空所有力场

##### `destroy()` — 销毁引擎

停止动画并移除事件监听。

---

## 数据约定

示例数据集见 [`../data/metrics.json`](../data/metrics.json)，包含：

- `dailyVisits`：每日访问量、独立访客、新访客（折线图 / 柱状图）
- `responseTime`：各时刻响应延迟（折线图）
- `availableLines`：各线路延迟、可用率、状态（柱状图）
- `deviceDistribution`：设备占比（饼图）
- `radarCapabilities`：能力维度对比（雷达图）
- `particleConfig`：粒子引擎参数示例

---

## 许可证

Apache License 2.0，版权所有 2026 Data Visualization Team。详见项目根目录 [`LICENSE`](../LICENSE)。
