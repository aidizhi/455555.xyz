<p align="center">
  <img src="https://img.shields.io/npm/v/dataviz-canvas.svg?style=flat-square&color=1976d2" alt="npm version" />
  <img src="https://img.shields.io/github/actions/workflow/status/aidizhi/455555.xyz/ci.yml?branch=main&style=flat-square&label=Build" alt="Build Status" />
  <img src="https://img.shields.io/codecov/c/github/aidizhi/455555.xyz?style=flat-square&color=4caf50" alt="Coverage" />
  <img src="https://img.shields.io/npm/l/dataviz-canvas.svg?style=flat-square&color=ff9800" alt="License" />
  <img src="https://img.shields.io/badge/Material-Design-00bcd4.svg?style=flat-square" alt="Material Design" />
</p>

<h1 align="center">DataViz Canvas</h1>

<p align="center">
  <strong>高性能 Canvas 2D 数据可视化引擎</strong><br/>
  基于 Material Design 规范，用 TypeScript 构建的轻量级图表渲染库
</p>

<p align="center">
  <a href="https://455555.xyz" target="_blank">官方演示站点</a> &nbsp;·&nbsp;
  <a href="https://aidizhi.github.io/455555.xyz/" target="_blank">文档中心</a> &nbsp;·&nbsp;
  <a href="#api-%E6%96%87%E6%A1%A3">API 文档</a> &nbsp;·&nbsp;
  <a href="#%E8%B4%A1%E7%8C%AE%E6%8C%87%E5%8D%97">贡献指南</a>
</p>

---

## 特性

- **纯 Canvas 2D 渲染** — 无 SVG 依赖，在万级数据点下依然保持 60fps 流畅动画
- **Material Design 主题系统** — 内置 Light / Dark 双主题，颜色、圆角、阴影严格遵循 MD3 规范
- **TypeScript 全量类型** — 100% TypeScript 编写，导出完整 `.d.ts` 声明文件，IDE 智能提示开箱即用
- **插件化架构** — 通过 `use(plugin)` 注册自定义渲染器、交互行为和动画策略
- **响应式 & 高清屏适配** — 自动感知 `devicePixelRatio`，支持容器尺寸热更新
- **Tree-shakable** — 基于 ESM 打包，未使用的图表类型不会进入最终产物

---

## 安装

```bash
# npm
npm install dataviz-canvas

# pnpm（推荐）
pnpm add dataviz-canvas

# yarn
yarn add dataviz-canvas
```

> 最低要求：Node.js >= 16 · 现代浏览器（Chrome 90+、Firefox 88+、Safari 15+）

---

## 快速开始

### 1. 创建画布容器

```html
<canvas id="myChart" width="800" height="400"></canvas>
```

### 2. 初始化图表实例

```typescript
import { Chart, LinearScale, BarRenderer, MaterialTheme } from 'dataviz-canvas';

// 创建图表实例，绑定 Canvas 元素
const chart = new Chart(document.getElementById('myChart')!, {
  // 应用 Material Design 暗色主题
  theme: MaterialTheme.dark,

  // 坐标轴配置
  scales: {
    x: new LinearScale({ min: 0, max: 100, title: '时间 (ms)' }),
    y: new LinearScale({ min: 0, max: 500, title: '请求数 (req/s)' }),
  },

  // 渲染器
  renderers: [new BarRenderer()],
});

// 注入数据
chart.setData({
  labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
  datasets: [
    {
      label: 'API Gateway',
      data: [120, 85, 340, 480, 390, 210],
      color: '#1976D2', // Material Blue 700
    },
    {
      label: 'Auth Service',
      data: [60, 45, 190, 310, 260, 150],
      color: '#7B1FA2', // Material Purple 700
    },
  ],
});

// 渲染并启动入场动画
chart.render({ animation: { duration: 800, easing: 'easeOutCubic' } });
```

### 3. 响应容器尺寸变化

```typescript
// 图表自动跟随容器 resize，也可手动触发
const observer = new ResizeObserver(() => chart.resize());
observer.observe(document.getElementById('chart-wrapper')!);
```

### 4. 交互事件

```typescript
chart.on('hover', (point) => {
  console.log(`悬停数据: ${point.dataset.label} = ${point.value}`);
});

chart.on('click', (point) => {
  // 点击时弹出 Material 风格 Tooltip
  chart.showTooltip(point, { elevation: 3 });
});
```

---

## 支持的图表类型

| 图表类型 | 类名 | 说明 |
|:--------:|:-----:|:-----|
| 柱状图 | `BarRenderer` | 垂直/水平柱状图，支持堆叠与分组 |
| 折线图 | `LineRenderer` | 平滑曲线/折线，支持面积填充与标记点 |
| 饼图 | `PieRenderer` | 环形/饼图，支持交互式扇区分离 |
| 散点图 | `ScatterRenderer` | 自由散点分布，支持聚类着色 |
| 面积图 | `AreaRenderer` | 堆叠面积图，渐变透明填充 |
| 雷达图 | `RadarRenderer` | 多维度雷达分析图 |
| 热力图 | `HeatmapRenderer` | 二维色阶热力矩阵 |
| 仪表盘 | `GaugeRenderer` | 弧形仪表盘，支持多指针 |

---

## API 文档

### 核心：`Chart` 类

| 方法 / 属性 | 签名 | 说明 |
|:------------|:-----|:-----|
| `new Chart()` | `(canvas: HTMLCanvasElement, options: ChartOptions) => Chart` | 构造图表实例 |
| `setData()` | `(payload: ChartData) => void` | 设置或更新图表数据 |
| `render()` | `(opts?: RenderOptions) => void` | 执行渲染（可选动画配置） |
| `resize()` | `() => void` | 重新计算尺寸并重绘 |
| `destroy()` | `() => void` | 销毁实例，释放 Canvas 上下文与事件监听 |
| `on()` | `(event: string, handler: Function) => Chart` | 注册交互事件监听 |
| `off()` | `(event: string, handler?: Function) => Chart` | 移除事件监听 |
| `showTooltip()` | `(point: DataPoint, opts?: TooltipOptions) => void` | 在指定数据点弹出提示框 |
| `use()` | `(plugin: ChartPlugin) => Chart` | 注册插件 |
| `theme` | `ThemeConfig` (读写) | 运行时切换主题 |

### 坐标轴：`LinearScale` / `CategoryScale`

| 参数 | 类型 | 默认值 | 说明 |
|:-----|:-----|:------:|:-----|
| `min` | `number` | `auto` | 轴最小值 |
| `max` | `number` | `auto` | 轴最大值 |
| `title` | `string` | `''` | 轴标题文本 |
| `ticks` | `number` | `5` | 刻度数量 |
| `grid` | `boolean` | `true` | 是否显示网格线 |
| `format` | `(v: number) => string` | `String` | 刻度值格式化函数 |

### 渲染选项：`RenderOptions`

| 参数 | 类型 | 默认值 | 说明 |
|:-----|:-----|:------:|:-----|
| `animation` | `object \| false` | `{ duration: 600 }` | 入场动画配置，`false` 禁用 |
| `animation.duration` | `number` | `600` | 动画时长 (ms) |
| `animation.easing` | `string` | `'easeOutCubic'` | 缓动函数名 |
| `pixelRatio` | `number` | `devicePixelRatio` | 手动指定像素比 |

---

## 性能基准

在 `Chrome 120 / macOS 14 / M2 Pro` 环境下的测试结果：

| 场景 | 数据量 | 首帧渲染 | 持续帧率 (fps) | 内存占用 |
|:-----|-------:|---------:|:--------------:|---------:|
| 柱状图 | 10,000 条 | 12ms | 60 | 3.2 MB |
| 折线图 | 50,000 条 | 28ms | 58 | 5.8 MB |
| 散点图 | 100,000 点 | 45ms | 55 | 8.4 MB |
| 热力图 (100x100) | 10,000 格 | 18ms | 60 | 4.1 MB |
| 多数据集叠加 | 5 x 10,000 | 35ms | 57 | 6.6 MB |

> 性能测试脚本位于 `benchmarks/` 目录，可运行 `pnpm bench` 在本机复现。

---

## 浏览器兼容性

| 浏览器 | 最低版本 | 支持状态 |
|:-------|:-------:|:-------:|
| Chrome | 90+ | ✅ 完全支持 |
| Firefox | 88+ | ✅ 完全支持 |
| Safari | 15+ | ✅ 完全支持 |
| Edge | 90+ | ✅ 完全支持 |
| IE 11 | — | ❌ 不支持 |
| Node.js (SSR) | 16+ | ⚠️ 仅数据预处理 |

> 底层依赖 Canvas 2D API，不依赖任何 Polyfill。服务端渲染时可使用 `node-canvas` 进行静态图片导出。

---

## 项目结构

```
455555.xyz/
├── src/
│   ├── core/            # 图表核心（Chart、Scale、Animation）
│   ├── renderers/       # 各图表类型渲染器
│   ├── themes/          # Material Design 主题定义
│   ├── plugins/         # 内置插件（Tooltip、Legend、Zoom）
│   ├── utils/           # 工具函数
│   └── index.ts         # 入口导出
├── benchmarks/          # 性能基准测试
├── tests/               # Jest 单元测试 & 集成测试
├── docs/                # API 文档与使用指南
├── playground/          # Vite 交互式演示
├── vite.config.ts
├── tsconfig.json
├── jest.config.ts
└── package.json
```

---

## 开发

```bash
# 克隆仓库
git clone https://github.com/aidizhi/455555.xyz.git
cd 455555.xyz

# 安装依赖
pnpm install

# 启动本地开发服务器（Vite + HMR）
pnpm dev

# 运行单元测试（Jest）
pnpm test

# 运行测试并生成覆盖率报告
pnpm test:coverage

# 构建生产产物
pnpm build

# 运行性能基准测试
pnpm bench

# 代码检查与格式化
pnpm lint && pnpm format
```

---

## 贡献指南

我们欢迎任何形式的贡献，包括但不限于提交 Bug 报告、改进文档或发起 Pull Request。

在贡献前，请阅读完整的 [贡献指南 (CONTRIBUTING.md)](./CONTRIBUTING.md)，了解代码规范、提交信息格式和 PR 流程。

提交流程概要：

1. Fork 本仓库并创建特性分支 (`git checkout -b feature/my-feature`)
2. 编写代码并确保通过所有测试 (`pnpm test`)
3. 提交变更 (`git commit -m 'feat(renderer): add waterfall chart support'`)
4. 推送到远程分支 (`git push origin feature/my-feature`)
5. 创建 Pull Request，描述变更内容与动机

---

## 技术栈

| 技术 | 用途 |
|:----:|:-----|
| TypeScript | 核心代码开发，类型安全 |
| Vite | 开发服务器与生产构建 |
| Jest | 单元测试 & 覆盖率 |
| Canvas 2D API | 图表渲染引擎 |
| Material Design 3 | 主题与视觉规范 |
| npm / pnpm | 包管理与发布 |

---

## 路线图

- [x] v1.0 — 核心图表类型 (柱状图、折线图、饼图、散点图)
- [x] v1.1 — Material Design 主题系统
- [x] v1.2 — 插件架构 & Tooltip / Legend 插件
- [x] v1.3 — 性能优化 (虚拟化渲染、离屏 Canvas 缓存)
- [ ] v2.0 — 地图渲染器 (GeoJSON)
- [ ] v2.0 — WebGL 加速层 (大数据量场景)
- [ ] v2.1 — 服务端渲染 (SSR) 静态导出
- [ ] v2.2 — React / Vue 框架绑定层

---

## 许可证

本项目基于 [Apache-2.0 许可证](https://www.apache.org/licenses/LICENSE-2.0) 开源。

```
Copyright 2024 爱爱大学

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

---

<p align="center">
  <sub>Built with passion by <strong>爱爱大学</strong> · Hosted on GitHub</sub>
</p>
