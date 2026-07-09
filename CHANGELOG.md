# 更新日志（CHANGELOG）

本项目所有显著变更均会记录于此文件。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [Unreleased]

### 计划中
- WebGL 渲染后端，支持十万级粒子
- 图表主题切换（深色 / 浅色 / 高对比度）
- 服务端渲染（SSR）同构支持

---

## [2.0.0] - 2026-07-09

### 重构与破坏性变更
- **协议变更**：开源协议由 MIT 切换为 **Apache License 2.0**，新增专利授权条款
- 重构 `ChartRenderer` 为类形式，采用面向对象 API，移除旧版函数式调用入口
- `ParticleEngine` 配置项结构变更，`radius` 改为 `{ min, max }` 对象，需迁移配置
- 最低 Node.js 版本提升至 20（同步更新 `.nvmrc` 与 `engines`）

### 新增
- 新增 `ChartRenderer.drawRadar()` 雷达图渲染，支持多数据集对比与维度标签
- 新增 `ChartRenderer.drawPie()` 饼图，支持环形图（`donut`）模式与中心汇总文字
- 折线图支持 Catmull-Rom 样条平滑曲线与渐变填充区域
- 柱状图新增圆角柱体与顶部数值标签
- 图表新增统一的鼠标悬浮提示框（tooltip）与高分屏（DPR）自适应
- `ParticleEngine` 新增力场系统：径向吸引、径向排斥、涡旋、定向风力四种类型
- `ParticleEngine` 新增 `burst()` 爆发（烟花）效果与粒子生命周期衰减
- 新增 `data/metrics.json` 示例数据集，覆盖日访问量、响应时间、可用线路等指标
- 新增 `lib/README.md` 库目录 API 文档

### 优化
- 物理引擎引入基于时间的步长计算（dt），不同帧率下表现一致
- 粒子碰撞采用基于质量的弹性碰撞响应，避免穿透
- 坐标轴采用「美观刻度」算法（niceScale），刻度更易读
- 大量图表元素支持入场动画（easeOutCubic 缓动）

### 修复
- 修复高分屏下图表文字模糊问题
- 修复粒子在边界处反复抖动的稳定性问题
- 修复折线图数据点过密时图例溢出绘图区的问题

---

## [1.3.0] - 2026-05-20

### 新增
- `ParticleEngine` 新增粒子间连线（link）效果，距离越近线越亮
- 新增鼠标交互力场，粒子可被鼠标吸引
- 折线图支持多数据系列叠加渲染

### 优化
- 动画循环改用 `requestAnimationFrame`，降低 CPU 占用
- 粒子渲染合并绘制路径，提升大量粒子下的帧率

### 修复
- 修复窗口缩放后画布尺寸未更新的问题

---

## [1.2.0] - 2026-04-06

### 新增
- `ChartRenderer.drawBar()` 柱状图支持多系列分组
- 新增图例（legend）自动绘制
- 新增 `.gitignore`，规范化 Node.js 项目忽略规则

### 优化
- 抽离公共坐标轴绘制逻辑，减少重复代码
- 配色方案切换为 Material Design 色板

### 修复
- 修复数值全为负数时柱状图方向错误的问题

---

## [1.1.0] - 2026-02-18

### 新增
- 新增 `ParticleEngine` 粒子物理引擎，支持重力、阻尼与边界碰撞
- 折线图新增网格线与坐标刻度

### 优化
- 统一配置项合并逻辑

### 修复
- 修复空数据时抛出异常的问题

---

## [1.0.0] - 2026-01-10

### 首次发布
- 初始化 `canvas-data-viz` 项目骨架
- 实现 `ChartRenderer` 图表渲染引擎，支持折线图（`drawLine`）基础渲染
- 纯 Canvas 2D 实现，零第三方依赖
- 确立项目目录结构与构建脚本

---

[Unreleased]: https://github.com/aidizhi/455555.xyz/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/aidizhi/455555.xyz/compare/v1.3.0...v2.0.0
[1.3.0]: https://github.com/aidizhi/455555.xyz/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/aidizhi/455555.xyz/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/aidizhi/455555.xyz/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/aidizhi/455555.xyz/releases/tag/v1.0.0
