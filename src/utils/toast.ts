import { bitable } from '@lark-base-open/js-sdk';

/**
 * 显示 Toast 提示
 * @param message 提示消息
 * @param type Toast 类型，默认为 'info'
 */
export const showToast = async (
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' | 'loading' = 'info'
): Promise<void> => {
  try {
    await bitable.ui.showToast({
      toastType: type as any,
      message: message,
    });
  } catch (error) {
    console.error('Failed to show toast:', error);
    // 降级到 console，避免完全静默失败
    console.log(`[Toast ${type}]: ${message}`);
  }
};

