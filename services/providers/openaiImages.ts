import { createHttpError } from '../httpError';

type OpenAiImageOptions = {
  model: string;
  prompt: string;
  apiKey: string;
  apiBase?: string;
  size?: string;
  imageDataUrls?: string[];
};

const roundEven = (value: number) => {
  const rounded = Math.max(2, Math.round(value));
  return rounded % 2 === 0 ? rounded : rounded + 1;
};

export const buildOpenAiImageSize = (ratio: string, quality: string) => {
  const baseMap: Record<string, number> = { '1K': 1024, '2K': 2048, '4K': 4096 };
  const base = baseMap[quality] || 1024;
  if (!ratio || ratio === 'auto') {
    return `${base}x${base}`;
  }
  const parts = ratio.split(':').map((p) => Number.parseFloat(p));
  if (parts.length !== 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1]) || parts[0] <= 0 || parts[1] <= 0) {
    return `${base}x${base}`;
  }
  const ratioValue = parts[0] / parts[1];
  let width = base;
  let height = Math.round(base / ratioValue);
  if (ratioValue < 1) {
    height = base;
    width = Math.round(base * ratioValue);
  }
  return `${roundEven(width)}x${roundEven(height)}`;
};

const dataUrlToBlob = (dataUrl: string): Blob => {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const b64 = parts[1] || '';
  const byteStr = atob(b64);
  const ab = new ArrayBuffer(byteStr.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteStr.length; i++) {
    ia[i] = byteStr.charCodeAt(i);
  }
  return new Blob([ab], { type: mime });
};

const toDataUrl = (raw: string): string => {
  if (!raw) throw new Error('图像生成返回为空');
  const trimmed = raw.trim();
  if (trimmed.startsWith('data:image/')) return trimmed;
  const embedded = trimmed.indexOf('data:image/');
  if (embedded >= 0) return trimmed.slice(embedded);
  return `data:image/png;base64,${trimmed}`;
};

const parseImageResult = (json: any): string => {
  const choiceContent = json?.choices?.[0]?.message?.content;
  if (typeof choiceContent === 'string' && choiceContent.trim()) {
    const content = choiceContent.trim();
    if (content.startsWith('data:image/') || content.startsWith('http')) {
      return content;
    }
    return toDataUrl(content);
  }

  const dataField = json?.data;
  if (dataField && typeof dataField === 'object' && !Array.isArray(dataField)) {
    if (dataField.b64_json) return toDataUrl(dataField.b64_json);
    if (dataField.url) return String(dataField.url).trim();
  }

  const item = Array.isArray(dataField) ? dataField[0] : undefined;
  if (item?.url) {
    const rawUrl = String(item.url || '').trim();
    if (rawUrl) return rawUrl;
  }
  if (item?.b64_json) {
    return toDataUrl(item.b64_json);
  }
  throw new Error('图像生成返回为空');
};

const editOpenAiImage = async ({
  model,
  prompt,
  apiKey,
  apiBase,
  size,
  imageDataUrls,
}: OpenAiImageOptions): Promise<string> => {
  const trimmedKey = (apiKey || '').trim();
  if (!trimmedKey) {
    throw new Error('未配置API Key，请在设置中填写。');
  }
  const base = (apiBase || '').trim() || 'https://api.openai.com';

  const sourceImage = imageDataUrls?.find((item) => typeof item === 'string' && item.startsWith('data:image/'));
  if (!sourceImage) {
    throw new Error('图生图需要至少一张参考图片。');
  }

  let lastError: Error | null = null;

  const tryFormdata = async (): Promise<string> => {
    const url = base.replace(/\/$/, '') + '/v1/images/edits';
    const imageBlob = dataUrlToBlob(sourceImage!);
    const ext = sourceImage!.includes('data:image/jpeg') || sourceImage!.includes('data:image/jpg') ? 'jpg' : 'png';
    const mime = ext === 'jpg' ? 'image/jpeg' : 'image/png';
    const imageFile = new File([imageBlob], `image.${ext}`, { type: mime });

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('model', model);
    formData.append('prompt', prompt);
    formData.append('n', '1');
    if (size) formData.append('size', size);

    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${trimmedKey}` },
      body: formData,
    });

    if (!response.ok) {
      let errorText = '';
      try { errorText = await response.text(); } catch { /* ignore */ }
      let msg = `请求失败: ${response.status}`;
      if (errorText) msg += ` - ${errorText}`;
      throw createHttpError(response.status, msg, errorText);
    }

    const json = await response.json();
    return parseImageResult(json);
  };

  const tryJson = async (): Promise<string> => {
    const url = base.replace(/\/$/, '') + '/v1/images/edits';
    const b64 = sourceImage!.split(',')[1] || '';

    const payload: Record<string, any> = {
      model,
      prompt,
      image: b64,
      n: 1,
    };
    if (size) payload.size = size;

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
      try { errorText = await response.text(); } catch { /* ignore */ }
      let msg = `请求失败: ${response.status}`;
      if (errorText) msg += ` - ${errorText}`;
      throw createHttpError(response.status, msg, errorText);
    }

    const json = await response.json();
    return parseImageResult(json);
  };

  for (const attempt of [tryFormdata, tryJson]) {
    try {
      return await attempt();
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError || new Error('图像生成失败');
};

export const generateOpenAiImage = async ({
  model,
  prompt,
  apiKey,
  apiBase,
  size,
  imageDataUrls,
}: OpenAiImageOptions): Promise<string> => {
  const normalizedImages = Array.isArray(imageDataUrls)
    ? imageDataUrls.filter((item) => typeof item === 'string' && item.startsWith('data:image/'))
    : [];

  const isGptImage2 = model === 'gpt-image-2';
  if (isGptImage2 && normalizedImages.length > 0) {
    return editOpenAiImage({ model, prompt, apiKey, apiBase, size, imageDataUrls: normalizedImages });
  }

  const trimmedKey = (apiKey || '').trim();
  if (!trimmedKey) {
    throw new Error('未配置API Key，请在设置中填写。');
  }
  const base = (apiBase || '').trim() || 'https://api.openai.com';
  const url = base.replace(/\/$/, '') + '/v1/images/generations';

  const requestOnce = async (includeImages: boolean): Promise<string> => {
    const payload: Record<string, any> = {
      model,
      prompt,
      n: 1,
      response_format: 'url',
    };
    if (size) payload.size = size;
    if (includeImages && normalizedImages.length > 0) {
      payload.image = normalizedImages.length === 1 ? normalizedImages[0] : normalizedImages;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${trimmedKey}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      const message = err?.message ? String(err.message) : String(err);
      throw new Error(`请求失败：${message}`);
    }

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

    let json: any;
    try {
      json = await response.json();
    } catch (err: any) {
      const message = err?.message ? String(err.message) : String(err);
      throw new Error(`响应解析失败：${message}`);
    }

    return parseImageResult(json);
  };

  let lastError: Error | null = null;
  const shouldTryImages = normalizedImages.length > 0;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const includeImages = attempt === 0 && shouldTryImages;
      return await requestOnce(includeImages);
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError || new Error('图像生成失败');
};
