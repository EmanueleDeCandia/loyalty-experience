import { ImageAnalysisResult } from '../../types/world';

export async function analyzeReferenceImage(imageUrl: string): Promise<ImageAnalysisResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          throw new Error('Failed to create canvas context');
        }

        const width = Math.min(img.width, 256);
        const height = Math.min(img.height, 256);
        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        // Depth map generation canvas
        const depthCanvas = document.createElement('canvas');
        depthCanvas.width = width;
        depthCanvas.height = height;
        const depthCtx = depthCanvas.getContext('2d');
        const depthImgData = depthCtx ? depthCtx.createImageData(width, height) : null;

        let totalR = 0, totalG = 0, totalB = 0;
        let grassVotes = { r: 0, g: 0, b: 0, count: 0 };
        let roofVotes = { r: 0, g: 0, b: 0, count: 0 };
        let waterVotes = { r: 0, g: 0, b: 0, count: 0 };
        let skyVotes = { r: 0, g: 0, b: 0, count: 0 };
        let rockVotes = { r: 0, g: 0, b: 0, count: 0 };

        const totalPixels = width * height;

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            totalR += r;
            totalG += g;
            totalB += b;

            // Simple heuristic segmentation based on color space
            const isBlueish = b > r * 1.15 && b > g * 0.95;
            const isGreenish = g > r * 1.1 && g > b * 1.05;
            const isReddishOrange = r > 140 && g < r * 0.8 && b < r * 0.7;
            const isRockGray = Math.abs(r - g) < 25 && Math.abs(g - b) < 25 && (r + g + b) / 3 < 150;

            if (y < height * 0.28 && isBlueish) {
              skyVotes.r += r; skyVotes.g += g; skyVotes.b += b; skyVotes.count++;
            } else if (isGreenish) {
              grassVotes.r += r; grassVotes.g += g; grassVotes.b += b; grassVotes.count++;
            } else if (isReddishOrange) {
              roofVotes.r += r; roofVotes.g += g; roofVotes.b += b; roofVotes.count++;
            } else if (isBlueish && y > height * 0.3) {
              waterVotes.r += r; waterVotes.g += g; waterVotes.b += b; waterVotes.count++;
            } else if (isRockGray || y > height * 0.55) {
              rockVotes.r += r; rockVotes.g += g; rockVotes.b += b; rockVotes.count++;
            }

            // Pseudo depth map calculation: distance from camera isometric center
            // In isometric floating island, center of diorama is closer, sky/void is far away
            if (depthImgData) {
              const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
              const dx = (x - width * 0.5) / (width * 0.5);
              const dy = (y - height * 0.55) / (height * 0.5);
              const radial = Math.sqrt(dx * dx + dy * dy);
              const depthVal = Math.max(0, Math.min(255, Math.floor(255 * (1 - radial * 0.55) * (luminance / 255 * 0.5 + 0.5))));

              depthImgData.data[idx] = depthVal;
              depthImgData.data[idx + 1] = depthVal;
              depthImgData.data[idx + 2] = depthVal;
              depthImgData.data[idx + 3] = 255;
            }
          }
        }

        if (depthCtx && depthImgData) {
          depthCtx.putImageData(depthImgData, 0, 0);
        }

        const avg = (v: { r: number; g: number; b: number; count: number }, def: [number, number, number]) => {
          if (v.count === 0) return `rgb(${def[0]}, ${def[1]}, ${def[2]})`;
          return `rgb(${Math.round(v.r / v.count)}, ${Math.round(v.g / v.count)}, ${Math.round(v.b / v.count)})`;
        };

        const result: ImageAnalysisResult = {
          dominantColors: {
            sky: avg(skyVotes, [155, 226, 255]),
            grass: avg(grassVotes, [92, 175, 59]),
            roof: avg(roofVotes, [214, 88, 56]),
            rock: avg(rockVotes, [110, 102, 98]),
            water: avg(waterVotes, [74, 182, 230]),
          },
          brightness: Math.round(((totalR + totalG + totalB) / (3 * totalPixels)) / 255 * 100),
          contrast: 78,
          estimatedComplexity: 84,
          depthMapUrl: depthCanvas.toDataURL(),
          segmentationZones: {
            vegetation: Math.round((grassVotes.count / totalPixels) * 100) || 35,
            water: Math.round((waterVotes.count / totalPixels) * 100) || 15,
            buildings: Math.round((roofVotes.count / totalPixels) * 100) || 18,
            rock: Math.round((rockVotes.count / totalPixels) * 100) || 20,
            sky: Math.round((skyVotes.count / totalPixels) * 100) || 12,
          },
        };

        resolve(result);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      // Fallback default analysis
      resolve({
        dominantColors: {
          sky: 'rgb(155, 226, 255)',
          grass: 'rgb(92, 175, 59)',
          roof: 'rgb(214, 88, 56)',
          rock: 'rgb(110, 102, 98)',
          water: 'rgb(74, 182, 230)',
        },
        brightness: 72,
        contrast: 80,
        estimatedComplexity: 85,
        segmentationZones: {
          vegetation: 38,
          water: 14,
          buildings: 22,
          rock: 16,
          sky: 10,
        },
      });
    };

    img.src = imageUrl;
  });
}
