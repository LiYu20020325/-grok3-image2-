import { createHttpError } from '../httpError';

export type KlingImageReference = {
  imageUrl: string;
  type?: 'first_frame' | 'end_frame';
};

export type KlingVideoOptions = {
  prompt: string;
  apiKey: string;
  apiBase?: string;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  mode?: 'std' | 'pro';
  duration?: number;
  imageList?: KlingImageReference[];
  videoList?: string[];
  callbackUrl?: string;
};

export type KlingTaskResponse = {
  code: number;
  message: string;
  request_id: string;
  data: {
    task_id: string;
    task_status: 'submitted' | 'processing' | 'succeed' | 'failed';
    created_at: number;
    updated_at: number;
  };
};

export type KlingVideoResult = {
  taskId: string;
  status: 'submitted' | 'processing' | 'succeed' | 'failed';
  videoUrl?: string;
  createdAt: number;
  updatedAt: number;
};

const MAX_IMAGE_SIZE_MB = 10;
const MIN_IMAGE_DIMENSION = 300;

/**
 * 验证图片尺寸和格式
 */
const validateImage = async (imageUrl: string): Promise<{ valid: boolean; error?: string }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // 检查最小尺寸
      if (img.width < MIN_IMAGE_DIMENSION || img.height < MIN_IMAGE_DIMENSION) {
        resolve({ valid: false, error: `图片尺寸不能小于 ${MIN_IMAGE_DIMENSION}px` });
        return;
      }
      // 检查宽高比 (1:2.5 ~ 2.5:1)
      const ratio = img.width / img.height;
      if (ratio < 0.4 || ratio > 2.5) {
        resolve({ valid: false, error: '图片宽高比需在 1:2.5 到 2.5:1 之间' });
        return;
      }
      resolve({ valid: true });
    };
    img.onerror = () => {
      resolve({ valid: false, error: '图片加载失败' });
    };
    img.src = imageUrl;
  });
};

/**
 * 获取 Base64 图片的大小（MB）
 */
const getBase64SizeMB = (base64String: string): number => {
  const base64Length = base64String.replace(/^data:image\/\w+;base64,/, '').length;
  return (base64Length * 3) / 4 / 1024 / 1024;
};

/**
 * 提交可灵视频生成任务（多图参考）
 */
export const submitKlingVideoTask = async ({
  prompt,
  apiKey,
  apiBase,
  aspectRatio = '16:9',
  mode = 'pro',
  duration = 5,
  imageList = [],
  videoList = [],
  callbackUrl,
}: KlingVideoOptions): Promise<KlingTaskResponse> => {
  const trimmedKey = (apiKey || '').trim();
  if (!trimmedKey) {
    throw new Error('未配置 API Key，请在设置中填写。');
  }

  // 验证图片
  for (const img of imageList) {
    const validation = await validateImage(img.imageUrl);
    if (!validation.valid) {
      throw new Error(`图片验证失败: ${validation.error}`);
    }
    const sizeMB = getBase64SizeMB(img.imageUrl);
    if (sizeMB > MAX_IMAGE_SIZE_MB) {
      throw new Error(`图片大小不能超过 ${MAX_IMAGE_SIZE_MB}MB`);
    }
  }

  // 验证图片数量限制
  const maxImages = videoList.length > 0 ? 4 : 7;
  if (imageList.length > maxImages) {
    throw new Error(
      videoList.length > 0
        ? `有参考视频时，参考图片数量不得超过 4 张`
        : `无参考视频时，参考图片数量不得超过 7 张`
    );
  }


  const base = (apiBase || '').trim() || 'https://ai.gptcard.cn';
  const url = base.replace(/\/$/, '') + '/kling/v1/videos/omni-video';

  // 构建请求体
  const payload: Record<string, any> = {
    model_name: 'kling-video-o1',
    prompt: prompt.slice(0, 2500), // 最大2500字符
    aspect_ratio: aspectRatio,
    mode,
    duration,
  };

  if (imageList.length > 0) {
    payload.image_list = imageList.map((img) => {
      // 如果是 Base64 data URL，去掉前缀，只保留纯 Base64 内容
      let imageUrl = img.imageUrl;
      if (imageUrl.startsWith('data:image/')) {
        imageUrl = imageUrl.replace(/^data:image\/\w+;base64,/, '');
      }
      const item: Record<string, string> = { image_url: imageUrl };
      if (img.type) {
        item.type = img.type;
      }
      return item;
    });
  }

  if (videoList && videoList.length > 0) {
    payload.video_list = videoList.map((v) => ({ video_url: v }));
  }

  if (callbackUrl) {
    payload.callback_url = callbackUrl;
  }

  // Debug: 打印请求体
  console.log('[Kling API] Request payload:', JSON.stringify(payload, null, 2));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${trimmedKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorText = '';
    try {
      errorText = await response.text();
    } catch {
      // ignore
    }
    let message = `请求失败: ${response.status}`;
    if (errorText) message += ` - ${errorText}`;
    throw createHttpError(response.status, message, errorText);
  }

  const json: KlingTaskResponse = await response.json();

  if (json.code !== 0) {
    throw new Error(json.message || '提交任务失败');
  }

  return json;
};

/**
 * 查询可灵视频生成任务状态
 */
export const queryKlingVideoTask = async (
  taskId: string,
  apiKey: string,
  apiBase?: string
): Promise<KlingVideoResult> => {
  const trimmedKey = (apiKey || '').trim();
  if (!trimmedKey) {
    throw new Error('未配置 API Key');
  }

  const base = (apiBase || '').trim() || 'https://ai.gptcard.cn';
  const url = base.replace(/\/$/, '') + `/kling/v1/videos/omni-video/${taskId}`;

  console.log('[Kling API] Query URL:', url);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${trimmedKey}`,
    },
  });

  console.log('[Kling API] Query response status:', response.status);

  if (!response.ok) {
    let errorText = '';
    try {
      errorText = await response.text();
    } catch {
      // ignore
    }
    console.log('[Kling API] Query error:', errorText);
    throw new Error(`查询任务失败: ${response.status}${errorText ? ` - ${errorText}` : ''}`);
  }

  const json: any = await response.json();
  console.log('[Kling API] Query response:', json);

  if (json.code !== 0) {
    throw new Error(json.message || '查询任务失败');
  }

  const data = json.data;
  // 从 task_result.videos 中提取视频URL
  const videoUrl = data.task_result?.videos?.[0]?.url;
  return {
    taskId: data.task_id,
    status: data.task_status,
    videoUrl: videoUrl,
    createdAt: typeof data.created_at === 'string' ? Date.parse(data.created_at) : data.created_at,
    updatedAt: typeof data.updated_at === 'string' ? Date.parse(data.updated_at) : data.updated_at,
  };
};

/**
 * 轮询等待视频生成完成
 */
export const waitForKlingVideo = async (
  taskId: string,
  apiKey: string,
  apiBase?: string,
  onProgress?: (status: string) => void,
  abortSignal?: AbortSignal
): Promise<KlingVideoResult> => {
  const maxAttempts = 180; // 最多轮询180次（15分钟，间隔5秒）
  const intervalMs = 5000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (abortSignal?.aborted) {
      throw new Error('任务已取消');
    }

    const result = await queryKlingVideoTask(taskId, apiKey, apiBase);

    onProgress?.(result.status);

    if (result.status === 'succeed') {
      return result;
    }

    if (result.status === 'failed') {
      throw new Error('视频生成失败');
    }

    // 继续等待
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error('等待视频生成超时');
};
