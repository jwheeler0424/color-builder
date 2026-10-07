import type { ColorStop } from './color-stop.ts';

import { colorToStop } from './color-stop.ts';
import { colorValue } from './color.ts';
import { extractColors } from './extract.ts';

export async function extractImageColors(file: File, count = 8): Promise<ColorStop[]> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, 200 / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      try {
        const context = canvas.getContext('2d', { colorSpace: 'display-p3' });
        if (!context) throw new Error('Image decoding is unavailable.');
        context.drawImage(image, 0, 0, width, height);
        const canvasSpace = context.getContextAttributes?.().colorSpace ?? 'srgb';
        let pixels: ImageData;
        try {
          pixels = context.getImageData(0, 0, width, height, { colorSpace: canvasSpace });
        } catch {
          pixels = context.getImageData(0, 0, width, height);
        }
        const pixelGamut = pixels.colorSpace === 'display-p3' ? 'p3' : 'srgb';
        resolve(
          extractColors(pixels.data, { count, pixelGamut }).map((color) =>
            colorToStop(colorValue(color.xyz, 1, color.display)),
          ),
        );
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not decode this image.'));
    };
    image.src = objectUrl;
  });
}
