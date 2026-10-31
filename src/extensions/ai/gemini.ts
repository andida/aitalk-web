import { nanoid } from 'nanoid';

import { getUuid } from '@/shared/lib/hash';

import {
  AIConfigs,
  AIGenerateParams,
  AIImage,
  AIMediaType,
  AIProvider,
  AITaskResult,
  AITaskStatus,
} from './types';
import {
  isRecord,
  readOptions,
  requireRecord,
  requiredString,
  stringArray,
} from './validation';

/**
 * Gemini configs
 */
export interface GeminiConfigs extends AIConfigs {
  apiKey: string;
}

/**
 * Gemini provider
 */
export class GeminiProvider implements AIProvider {
  // provider name
  readonly name = 'gemini';
  // provider configs
  configs: GeminiConfigs;

  // init provider
  constructor(configs: GeminiConfigs) {
    this.configs = configs;
  }

  // generate task
  async generate({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    const { mediaType, model, prompt } = params;

    if (mediaType !== AIMediaType.IMAGE) {
      throw new Error(`mediaType not supported: ${mediaType}`);
    }

    if (typeof model !== 'string' || !model) {
      throw new Error('model is required');
    }

    if (typeof prompt !== 'string' || !prompt) {
      throw new Error('prompt is required');
    }

    const options = readOptions(params.options);
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.configs.apiKey}`;

    const requestParts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    > = [
      {
        text: prompt,
      },
    ];

    if (Array.isArray(options.image_input)) {
      const imageUrls = stringArray(
        options.image_input,
        'invalid gemini image_input: expected strings'
      );
      for (const imageUrl of imageUrls) {
        try {
          const imageResp = await fetch(imageUrl);
          if (imageResp.ok) {
            const arrayBuffer = await imageResp.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64Image = buffer.toString('base64');
            const mimeType =
              imageResp.headers.get('content-type') || 'image/jpeg';

            requestParts.push({
              inlineData: {
                mimeType,
                data: base64Image,
              },
            });
          }
        } catch (e) {
          console.error('failed to fetch image input', imageUrl, e);
        }
      }
    }

    const generationConfig = { ...options };
    delete generationConfig.image_input;

    const payload = {
      contents: {
        role: 'user',
        parts: requestParts,
      },
      generation_config: {
        response_modalities: ['TEXT', 'IMAGE'],
        ...generationConfig,
      },
    };

    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(
        `request failed with status: ${resp.status}, body: ${errorText}`
      );
    }

    const rawData: unknown = await resp.json();
    const data = requireRecord(rawData, 'invalid gemini response');
    const candidates = data.candidates;

    if (!candidates || (Array.isArray(candidates) && candidates.length === 0)) {
      throw new Error('no candidates returned');
    }
    if (!Array.isArray(candidates)) {
      throw new Error('invalid gemini candidates');
    }

    const taskId = nanoid(); // Gemini API doesn't return a task ID for synchronous generation
    const responseCandidates: unknown[] = candidates;
    const candidate = requireRecord(
      responseCandidates[0],
      'invalid gemini candidate'
    );
    const content = candidate.content;
    const parts =
      content == null
        ? undefined
        : requireRecord(content, 'invalid gemini content').parts;

    if (!parts || (Array.isArray(parts) && parts.length === 0)) {
      throw new Error('no parts returned');
    }
    if (!Array.isArray(parts)) {
      throw new Error('invalid gemini parts');
    }

    const responseParts: unknown[] = parts;
    const selectedPart = responseParts.find((part) => {
      const record = requireRecord(part, 'invalid gemini part');
      return Boolean(record.inlineData);
    });

    if (!isRecord(selectedPart)) {
      throw new Error('no image part returned');
    }

    const inlineData = requireRecord(
      selectedPart.inlineData,
      'invalid gemini inlineData'
    );
    const mimeType = requiredString(
      inlineData.mimeType,
      'invalid gemini inlineData.mimeType'
    );
    const base64Data = requiredString(
      inlineData.data,
      'invalid gemini inlineData.data'
    );

    // upload to storage
    const { getStorageService } = await import('@/shared/services/storage');
    const storageService = await getStorageService();
    const buffer = Buffer.from(base64Data, 'base64');
    const ext = mimeType.split('/')[1] || 'png';
    const key = `gemini/image/${getUuid()}.${ext}`;

    const uploadResult = await storageService.uploadFile({
      body: buffer,
      key,
      contentType: mimeType,
    });

    if (!uploadResult || !uploadResult.url) {
      throw new Error('upload image failed');
    }

    // The selected records are references into data; preserve every other part.
    inlineData.data = uploadResult.url;
    selectedPart.thoughtSignature = '';

    const image: AIImage = {
      id: nanoid(),
      createTime: new Date(),
      imageType: mimeType,
      imageUrl: uploadResult.url,
    };

    return {
      taskStatus: AITaskStatus.SUCCESS,
      taskId: taskId,
      taskInfo: {
        images: [image],
        status: 'success',
        createTime: new Date(),
      },
      taskResult: data,
    };
  }
}
