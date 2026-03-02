/**
 * 文本自动换行工具函数
 * 根据固定宽度按字符宽度估算自动换行
 */

/**
 * 根据固定宽度自动换行文本
 * @param text 原始文本
 * @param maxWidth 最大宽度（像素）
 * @param fontSize 字体大小
 * @returns 换行后的文本行数组
 */
export const wrapTextByWidth = (text: string, maxWidth: number, fontSize: number): string[] => {
  const lines: string[] = [];
  const chineseCharWidth = fontSize;
  const uppercaseCharWidth = fontSize * 0.7;
  const lowercaseCharWidth = fontSize * 0.5;
  const numberCharWidth = fontSize * 0.6;
  const specialCharWidth = fontSize * 0.5;
  const spaceWidth = fontSize * 0.4;
  const punctuationPattern = /[，。、""''：《》＜＞<>（）()、；;：:，,.!?！？""]/;
  const operatorPattern = /[+\-*/=^%]/;

  // 按中文单字、英文单词、空白、单个符号切分，保留所有字符
  const tokens = text.match(/([\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]|[A-Za-z0-9]+|\s+|.)/g) || [];

  let currentLine = '';
  let currentLineWidth = 0;

  const getCharWidth = (char: string): number => {
    if (/\s/.test(char)) return spaceWidth;
    if (/[A-Z]/.test(char)) return uppercaseCharWidth;
    if (/[a-z]/.test(char)) return lowercaseCharWidth;
    if (/[0-9]/.test(char)) return numberCharWidth;
    if (/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(char)) return chineseCharWidth;
    return specialCharWidth;
  };

  const getTokenWidth = (token: string) => {
    let width = 0;
    for (let i = 0; i < token.length; i++) {
      width += getCharWidth(token[i]);
    }
    return width;
  };

  tokens.forEach((token) => {
    const isPunct = punctuationPattern.test(token) || operatorPattern.test(token);
    const isSpace = /^\s+$/.test(token);
    const tokenWidth = getTokenWidth(token);

    // 不让行首出现空白
    if (isSpace && currentLineWidth === 0) {
      return;
    }

    // 如果行首遇到标点/运算符且已有上一行，则附加到上一行末尾
    if (isPunct && currentLineWidth === 0 && lines.length > 0) {
      lines[lines.length - 1] += token;
      return;
    }

    const wouldExceed = currentLineWidth + tokenWidth > maxWidth - 16;

    if (wouldExceed && currentLineWidth > 0) {
      lines.push(currentLine);
      currentLine = '';
      currentLineWidth = 0;
    }

    currentLine += token;
    currentLineWidth += tokenWidth;
  });

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines;
};
