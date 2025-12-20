import type { ExcalidrawImperativeAPI } from '../types/excalidraw';

/**
 * 初始化 Excalidraw 的预设库（library items）
 * 包含常用的批改标记工具：圆圈、箭头、高亮框、标签、对勾、叉号等
 */
export const initializeExcalidrawLibrary = (excalidrawAPI: ExcalidrawImperativeAPI) => {
  const libraryItems = [
    // 1. Red circle
    [{
      type: 'ellipse',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      strokeColor: '#ff0000',
      backgroundColor: 'transparent',
      strokeWidth: 3,
      fillStyle: 'solid',
    }],
    // 2. Red arrow
    [{
      type: 'arrow',
      x: 0,
      y: 0,
      width: 150,
      height: 100,
      strokeColor: '#ff0000',
      strokeWidth: 3,
      points: [[0, 0], [150, 100]],
    }],
    // 3. Yellow highlight box
    [{
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 200,
      height: 60,
      strokeColor: '#fab005',
      backgroundColor: '#fff3bf',
      strokeWidth: 2,
      fillStyle: 'solid',
      opacity: 70,
    }],
    // 4. "重点" red label
    [{
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 80,
      height: 40,
      strokeColor: '#ff0000',
      backgroundColor: '#ffe8e8',
      strokeWidth: 2,
      fillStyle: 'solid',
    }, {
      type: 'text',
      x: 15,
      y: 10,
      width: 50,
      height: 20,
      text: '重点',
      fontSize: 24,
      strokeColor: '#ff0000',
      fontFamily: 4,
    }],
    // 5. "问题" yellow label
    [{
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 80,
      height: 40,
      strokeColor: '#fab005',
      backgroundColor: '#fff3bf',
      strokeWidth: 2,
      fillStyle: 'solid',
    }, {
      type: 'text',
      x: 15,
      y: 10,
      width: 50,
      height: 20,
      text: '问题',
      fontSize: 24,
      strokeColor: '#fab005',
      fontFamily: 4,
    }],
    // 6. "通过" green label
    [{
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 80,
      height: 40,
      strokeColor: '#40c057',
      backgroundColor: '#d3f9d8',
      strokeWidth: 2,
      fillStyle: 'solid',
    }, {
      type: 'text',
      x: 15,
      y: 10,
      width: 50,
      height: 20,
      text: '通过',
      fontSize: 24,
      strokeColor: '#40c057',
      fontFamily: 4,
    }],
    // 7. Green check
    [{
      type: 'draw',
      x: 0,
      y: 0,
      strokeColor: '#40c057',
      strokeWidth: 6,
      points: [
        [0, 30],
        [10, 40],
        [15, 45],
        [20, 50],
        [40, 20],
        [50, 10],
        [60, 0],
      ],
    }],
    // 8. Red cross
    [{
      type: 'draw',
      x: 0,
      y: 0,
      strokeColor: '#ff0000',
      strokeWidth: 6,
      points: [[0, 0], [50, 50]],
    }, {
      type: 'draw',
      x: 0,
      y: 50,
      strokeColor: '#ff0000',
      strokeWidth: 6,
      points: [[0, 0], [50, -50]],
    }],
  ];

  // Format for Excalidraw
  const formattedLibraryItems = libraryItems.map((elements, index) => ({
    status: 'published',
    id: `preset_${index}`,
    created: Date.now(),
    elements: elements as any,
  }));

  // Update library
  excalidrawAPI.updateLibrary({
    libraryItems: formattedLibraryItems as any,
  });
};

