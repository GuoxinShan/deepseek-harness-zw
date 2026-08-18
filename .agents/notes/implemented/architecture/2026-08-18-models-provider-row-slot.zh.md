# Agent Note：Models 页面的提供方行级 slot

Status: implemented

[English](2026-08-18-models-provider-row-slot.md) | 中文

## Problem

树外功能插件需要在 Models 设置页上呈现按提供方区分的内容——例如 provider 名称旁的额度/余额胶囊。该页面的行由 `ui-settings-models` 内部渲染、没有任何扩展点，因此唯一的进入方式要么替换整个 `settings.section` 注册，要么从外部操作 DOM。两者都会破坏页面自身的组合：替换方需要复制页面的目录/settings/凭据 join 并随之漂移；DOM 注入既活不过页面的重渲染，也活不过页面自己的状态切换。

## Decision

Models 入口在其 `settings.section` 注册的 `children` 里声明一个列表 slot：`settings.models.provider`，并在每个已配置提供方的行内于行标识（名称、自定义标签、凭据点）与行操作（编辑、删除）之间渲染一次。该 slot 的规范类型与所有其他设置 slot 类型一起放在 `ui-settings`——即再深一层的 `settings.general.item` 先例——因此贡献方依赖的是设置领域契约，而不是 Models 插件。

owner share 只有该行当前的标识：`provider`（编辑无法改变的稳定路由 id，因此是贡献方取数或缓存所用的键）与 `displayName`（可被编辑改写、因而可能在已挂载贡献方之下变化的显示名称）。任何写操作、凭据状态、namespace 内部信息都不越过边界；需要自己数据的贡献方以路由 id 为键、经自己的服务取数。

该座位只在行上渲染。首次运行姿态下以展开设置卡片呈现的整分节提供方没有行、因而没有座位；休眠目录条目和新增/声明卡片不受影响。贡献列表为空时只渲染 outlet 的 `display:contents` 锚点，因此没有贡献方的页面与引入 slot 之前像素级一致，卸载贡献插件后页面精确还原。

注册遵循标准跨插件模式：贡献方使用 `ctx.slots.inject('settings.models.provider', ...)`，它等待 Models 入口的声明、在其卸载时随之坍塌、在重新声明时重新注册——没有激活顺序或静态导入依赖。

## Alternatives considered

**由功能插件替换整个 `settings.section` 条目。** 弃用：替换方持有一份会与页面漂移的平行目录/settings/凭据 join，且两个注册在同一个 `settings.section` 单元格上互相争抢。

**功能插件做 DOM 注入。** 弃用：注入的节点位于 React 树之外，页面的重渲染（失效驱动的重载、编辑卡片开合、提供方删除）会使其孤儿化或翻倍，销毁也无法可靠。

**通过 `chain` slot 整页接管。** 弃用：需求是行级的，不是页级的；接管方为了每行放一颗胶囊仍要重新实现整页。

**把提供方列表当作数据交给功能插件。** 弃用：这颠倒了所有权——Models 页面的 join 是视图状态，把它复制进另一个插件的 store 来渲染胶囊会制造第二事实源及其特有的过期问题。

## Consequences

Models 页面获得恰好一个扩展面：每个已配置行上一个有文档、有类型、有序的列表。`dsh-provider-balance` 是第一个消费者（经自己的宿主路由取数、以路由 id 为键的余额胶囊）。未来的按提供方内容——健康徽标、用量表——以同样方式注册，无需再改 `ui-settings-models`。

组合依赖是单向的：贡献方等待 Models 声明、没有声明就不渲染，与 General 偏好行等待 `settings.general.item` 完全一致。slot 目录生成器自动收录新键（`pnpm run gen-client-catalog`），清单保持生成而非手工维护。
