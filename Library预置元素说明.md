# Library 预置元素使用说明

## 📚 什么是Library？

Library（资源库）是Excalidraw中的一个功能，可以保存常用的图形元素组合，方便快速重复使用。就像一个模板库，点击即可插入到画布中。

## ✨ 已预置的8个常用标注元素

### 1. 🔴 红色圆圈
**用途：** 圈出重点区域
- 颜色：红色 `#ff0000`
- 样式：空心圆
- 粗细：3px
- 尺寸：100 x 100

**使用场景：**
- 圈出产品的缺陷位置
- 标记需要关注的区域
- 突出显示重要部分

### 2. ➡️ 红色箭头
**用途：** 指向问题或重点
- 颜色：红色 `#ff0000`
- 样式：箭头
- 粗细：3px
- 尺寸：150 x 100

**使用场景：**
- 指向具体的问题点
- 引导视线方向
- 标注说明

### 3. 🟨 黄色高亮框
**用途：** 突出显示区域
- 边框：橙黄色 `#fab005`
- 填充：淡黄色 `#fff3bf`
- 透明度：70%
- 尺寸：200 x 60

**使用场景：**
- 高亮重要文字
- 标记需要修改的区域
- 临时标注

### 4. 🏷️ "重点" 红色标签
**用途：** 快速标记重点
- 背景：红色边框 + 淡红色填充
- 文字："重点"
- 字体大小：20
- 尺寸：80 x 40

**使用场景：**
- 快速标记重点内容
- 产品评审标注
- 设计反馈

### 5. ⚠️ "问题" 黄色标签
**用途：** 标记存在的问题
- 背景：黄色边框 + 淡黄色填充
- 文字："问题"
- 字体大小：20
- 尺寸：80 x 40

**使用场景：**
- 标记需要修改的问题
- Bug标注
- 设计缺陷提示

### 6. ✅ "通过" 绿色标签
**用途：** 标记已通过/正确
- 背景：绿色边框 + 淡绿色填充
- 文字："通过"
- 字体大小：20
- 尺寸：80 x 40

**使用场景：**
- 审核通过标记
- 验收合格标注
- 完成状态提示

### 7. ✓ 绿色勾号
**用途：** 表示正确或完成
- 颜色：绿色 `#40c057`
- 样式：手绘勾号
- 粗细：4px

**使用场景：**
- 标记正确的部分
- 检查项完成
- 审核通过

### 8. ✗ 红色叉号
**用途：** 表示错误或拒绝
- 颜色：红色 `#ff0000`
- 样式：交叉线
- 粗细：4px
- 尺寸：50 x 50

**使用场景：**
- 标记错误的部分
- 不通过标记
- 需要删除的内容

---

## 🎯 如何使用Library

### 打开Library面板

1. 在Excalidraw画板中，点击左侧工具栏的 **📚 Library** 按钮
2. 或使用快捷键（通常是侧边栏按钮）

### 使用预置元素

1. 打开Library面板
2. 看到8个预置的标注元素
3. 点击任意一个元素
4. 元素自动插入到画布中央
5. 拖动到需要的位置

### 编辑元素

插入后可以：
- 📏 调整大小（拖动角落）
- 🎨 更改颜色（右侧属性面板）
- ✏️ 修改文字内容（双击文字）
- 🔄 旋转和翻转

---

## 🔧 自定义Library元素

### 方法1：在代码中添加

编辑 `components/ImageEditor.tsx` 文件：

```typescript
// 在 libraryItems 数组中添加新元素
const libraryItems = [
  // ... 现有元素
  
  // 9. 你的自定义元素（例如：蓝色矩形）
  [
    {
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 150,
      height: 100,
      strokeColor: '#1456f0',      // 蓝色边框
      backgroundColor: '#e7f5ff',  // 淡蓝色填充
      strokeWidth: 2,
      fillStyle: 'solid',
    }
  ],
  
  // 10. 组合元素（例如：带文字的圆圈）
  [
    {
      type: 'ellipse',
      x: 0,
      y: 0,
      width: 120,
      height: 120,
      strokeColor: '#ff0000',
      backgroundColor: 'transparent',
      strokeWidth: 3,
    },
    {
      type: 'text',
      x: 40,
      y: 50,
      text: '注意',
      fontSize: 24,
      strokeColor: '#ff0000',
    }
  ],
];
```

### 方法2：从画布中保存

1. 在画布中创建你想要的图形组合
2. 选中这些元素
3. 点击Library面板的 **"+"** 按钮
4. 元素会保存到Library中
5. 以后可以重复使用

---

## 📐 元素属性说明

### 基础属性

```typescript
{
  type: 'rectangle',     // 元素类型
  x: 0,                  // X坐标
  y: 0,                  // Y坐标
  width: 100,            // 宽度
  height: 100,           // 高度
  strokeColor: '#ff0000', // 边框颜色
  backgroundColor: '#fff', // 填充颜色
  strokeWidth: 2,        // 线条粗细
  fillStyle: 'solid',    // 填充样式
  opacity: 100,          // 透明度 (0-100)
}
```

### 元素类型

- **`rectangle`** - 矩形
- **`ellipse`** - 椭圆/圆形
- **`arrow`** - 箭头
- **`line`** - 直线
- **`freedraw`** - 自由绘制
- **`text`** - 文字
- **`diamond`** - 菱形

### 填充样式

- **`solid`** - 实心填充
- **`hachure`** - 斜线填充
- **`cross-hatch`** - 交叉线填充

### 常用颜色

```typescript
红色系：
'#ff0000' - 纯红色
'#ffe8e8' - 淡红色
'#c92a2a' - 深红色

黄色系：
'#fab005' - 橙黄色
'#fff3bf' - 淡黄色

绿色系：
'#40c057' - 绿色
'#d3f9d8' - 淡绿色
'#087f5b' - 深绿色

蓝色系：
'#1456f0' - 飞书蓝
'#e7f5ff' - 淡蓝色
'#228be6' - 天蓝色
```

---

## 🎨 创建实用的Library元素示例

### 示例1：审核印章

```typescript
[
  // 外圆
  {
    type: 'ellipse',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    strokeColor: '#ff0000',
    strokeWidth: 4,
    backgroundColor: 'transparent',
  },
  // 内文字
  {
    type: 'text',
    x: 25,
    y: 35,
    text: '已审核',
    fontSize: 24,
    strokeColor: '#ff0000',
    fontFamily: 1,
  }
]
```

### 示例2：评分星星

```typescript
[
  {
    type: 'freedraw',
    strokeColor: '#fab005',
    strokeWidth: 3,
    fillStyle: 'solid',
    backgroundColor: '#fab005',
    points: [
      // 五角星的坐标点
      [25, 0],
      [30, 15],
      [45, 20],
      [35, 30],
      [40, 45],
      [25, 35],
      [10, 45],
      [15, 30],
      [5, 20],
      [20, 15],
      [25, 0],
    ],
  }
]
```

### 示例3：对话气泡

```typescript
[
  // 气泡主体
  {
    type: 'rectangle',
    x: 0,
    y: 0,
    width: 150,
    height: 60,
    strokeColor: '#1456f0',
    backgroundColor: '#e7f5ff',
    strokeWidth: 2,
    fillStyle: 'solid',
  },
  // 小三角（指针）
  {
    type: 'line',
    x: 20,
    y: 60,
    strokeColor: '#1456f0',
    strokeWidth: 2,
    points: [[0, 0], [10, 15], [20, 0]],
    fillStyle: 'solid',
    backgroundColor: '#e7f5ff',
  }
]
```

---

## 💡 最佳实践

### 设计建议

1. **颜色统一**
   - 使用一致的颜色方案
   - 红色表示问题/错误
   - 黄色表示警告/待处理
   - 绿色表示正确/通过

2. **尺寸适中**
   - 不要太大（遮挡图片）
   - 不要太小（看不清楚）
   - 推荐：40-200px 范围

3. **组合使用**
   - 箭头 + 文字说明
   - 圆圈 + 标签
   - 高亮框 + 注释

### 使用技巧

**快速标注流程：**
```
1. 打开Library面板
2. 点击"红色圆圈"
3. 拖动到问题位置
4. 点击"红色箭头"
5. 调整箭头指向
6. 点击"问题"标签
7. 放在旁边说明
8. 完成标注！
```

**批量使用：**
```
1. 多次点击同一个Library元素
2. 快速放置到不同位置
3. 提高标注效率
```

---

## 🔍 查看和管理Library

### 查看已有元素

在Excalidraw画板中：
1. 点击左侧工具栏的 **📚** 图标
2. 看到所有预置的8个元素
3. 滚动查看更多

### 添加新元素

**从画布添加：**
1. 在画布上创建图形
2. 选中要保存的元素
3. 点击Library面板的 **"+"** 按钮
4. 元素保存到Library

### 删除元素

1. 打开Library面板
2. 将鼠标悬停在元素上
3. 点击右上角的 **"×"** 按钮
4. 确认删除

---

## 📊 Library元素结构详解

### 单个元素

```typescript
[
  {
    type: 'rectangle',        // 必需：元素类型
    x: 0,                     // 必需：X坐标
    y: 0,                     // 必需：Y坐标
    width: 100,               // 必需：宽度
    height: 100,              // 必需：高度
    strokeColor: '#ff0000',   // 可选：边框颜色
    backgroundColor: '#fff',  // 可选：填充颜色
    strokeWidth: 2,           // 可选：线条粗细（默认1）
    fillStyle: 'solid',       // 可选：填充样式
    opacity: 100,             // 可选：透明度（0-100）
  }
]
```

### 组合元素

```typescript
[
  // 第一个元素（背景框）
  {
    type: 'rectangle',
    x: 0,
    y: 0,
    width: 80,
    height: 40,
    strokeColor: '#ff0000',
    backgroundColor: '#ffe8e8',
  },
  // 第二个元素（文字）
  {
    type: 'text',
    x: 15,              // 相对于第一个元素的偏移
    y: 10,
    text: '重点',
    fontSize: 20,
    strokeColor: '#ff0000',
  }
]
```

### 完整配置项

```typescript
{
  // 必需属性
  type: string,              // 元素类型
  x: number,                 // X坐标
  y: number,                 // Y坐标
  
  // 尺寸属性（根据类型）
  width: number,             // 宽度
  height: number,            // 高度
  
  // 样式属性
  strokeColor: string,       // 边框颜色（十六进制）
  backgroundColor: string,   // 填充颜色
  strokeWidth: number,       // 线条粗细 (1-8)
  fillStyle: string,         // 填充样式
  opacity: number,           // 透明度 (0-100)
  
  // 文字属性（text类型）
  text: string,              // 文字内容
  fontSize: number,          // 字体大小 (16, 20, 28, 36)
  fontFamily: number,        // 字体 (1-4)
  textAlign: string,         // 对齐方式
  
  // 线条属性（line/arrow类型）
  points: number[][],        // 路径点 [[x1,y1], [x2,y2], ...]
  
  // 其他属性
  angle: number,             // 旋转角度（弧度）
  roughness: number,         // 粗糙度 (0-2)
  strokeSharpness: string,   // 'sharp' | 'round'
  groupIds: string[],        // 分组ID
}
```

---

## 🚀 高级定制

### 创建复杂图形

**示例：创建一个完整的标注框**

```typescript
[
  // 外框
  {
    type: 'rectangle',
    x: 0,
    y: 0,
    width: 200,
    height: 100,
    strokeColor: '#ff0000',
    backgroundColor: '#ffe8e8',
    strokeWidth: 2,
  },
  // 标题
  {
    type: 'text',
    x: 10,
    y: 10,
    text: '问题描述',
    fontSize: 20,
    strokeColor: '#ff0000',
    fontFamily: 1,
  },
  // 分隔线
  {
    type: 'line',
    x: 0,
    y: 35,
    points: [[10, 0], [190, 0]],
    strokeColor: '#ff0000',
    strokeWidth: 1,
  },
  // 内容文字
  {
    type: 'text',
    x: 10,
    y: 45,
    text: '这里有问题需要修改',
    fontSize: 16,
    strokeColor: '#000000',
    fontFamily: 1,
  }
]
```

### 导入外部Library

如果你有从其他地方导出的 `.excalidrawlib` 文件：

```typescript
// 可以通过API加载
const response = await fetch('path/to/library.excalidrawlib');
const libraryData = await response.json();

excalidrawAPI.updateLibrary({
  libraryItems: libraryData.library,
  merge: true,  // 合并而不是替换
});
```

---

## 📝 实际使用示例

### 场景：产品图片标注

**准备的Library元素：**
1. 红色圆圈 ✓
2. 红色箭头 ✓
3. "问题"标签 ✓
4. "通过"标签 ✓

**标注流程：**
```
1. 加载产品图片到画板
2. 打开Library面板
3. 点击"红色圆圈" → 圈出缺陷位置
4. 点击"红色箭头" → 指向具体问题点
5. 点击"问题"标签 → 标记问题类型
6. 使用文字工具添加详细说明
7. 对正确的部分使用"通过"标签
8. 导出到多维表格
```

### 场景：设计稿反馈

**使用元素：**
- 黄色高亮框 → 标记需要修改的区域
- 红色箭头 → 指出具体位置
- 文字工具 → 添加修改建议

### 场景：质量检查

**使用元素：**
- 绿色勾号 → 标记合格项
- 红色叉号 → 标记不合格项
- 红色圆圈 → 圈出问题区域
- "通过"/"问题"标签 → 快速分类

---

## 🎯 快速参考

| 元素 | 颜色 | 用途 | 快捷操作 |
|------|------|------|----------|
| 红色圆圈 | 🔴 | 圈重点 | 拖放调整大小 |
| 红色箭头 | 🔴 | 指问题 | 拖动端点调方向 |
| 黄色高亮 | 🟨 | 突出显示 | 调整覆盖范围 |
| "重点"标签 | 🔴 | 标记重点 | 双击改文字 |
| "问题"标签 | 🟨 | 标记问题 | 双击改文字 |
| "通过"标签 | 🟢 | 标记通过 | 双击改文字 |
| 绿色勾号 | ✅ | 表示正确 | 直接使用 |
| 红色叉号 | ❌ | 表示错误 | 直接使用 |

---

## 💾 保存和分享Library

### 导出Library

```typescript
// 在Excalidraw中
// 1. 点击菜单 → Export
// 2. 选择 "Export library"
// 3. 下载 .excalidrawlib 文件
```

### 分享给团队

1. 导出Library文件
2. 分享给团队成员
3. 团队成员导入使用
4. 保持标注风格统一

---

## 🌐 实时查看

访问：**http://localhost:3001**

1. 选中附件单元格
2. 点击编辑
3. 点击左侧的 **📚 Library** 按钮
4. 看到8个预置元素
5. 开始使用！

---

## ✨ 总结

预置的Library元素让标注工作更高效：

- ✅ 8个常用元素开箱即用
- ✅ 一键插入，无需重复绘制
- ✅ 统一风格，专业美观
- ✅ 可自定义，灵活扩展
- ✅ 提高工作效率

**现在打开画板，体验Library功能吧！** 🎉

