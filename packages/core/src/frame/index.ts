import { strict as assert } from 'node:assert';
import path from 'node:path';
import { Readable } from 'node:stream';
import sharp from 'sharp';
import { calculateHash, getHammingDistance } from './utils/index.js';

export class Frame {
  private cachedDHash = '';
  private cachedPixels: number[] = [];

  public readonly number: number;
  public readonly fileName: string;

  constructor(public readonly framePath: string) {
    this.fileName = path.basename(this.framePath);

    const result = this.fileName.match(/\d+/);
    assert.ok(result);

    this.number = Number(result[0]);
  }

  private async getPixelsFromStream(imageStream: Readable): Promise<number[]> {
    const pixels: number[] = [];
    for await (const data of imageStream) {
      pixels.push(...data);
    }

    return pixels;
  }

  async getPixels(): Promise<number[]> {
    if (!this.cachedPixels.length) {
      const imageStream = this.getStream();
      this.cachedPixels = await this.getPixelsFromStream(imageStream);
    }

    return this.cachedPixels;
  }

  private getStream(): Readable {
    return sharp(this.framePath)
      .grayscale()
      .resize(9, 8, {
        fit: 'fill',
      })
      .raw();
  }

  async getDHash(): Promise<string> {
    if (!this.cachedDHash) {
      const pixels = await this.getPixels();
      this.cachedDHash = calculateHash(pixels);
    }

    return this.cachedDHash;
  }

  async isSimilarTo(
    otherFrame: Frame,
    similarityTreshold = 20,
  ): Promise<boolean> {
    const [thisHash, otherHash] = await Promise.all([
      this.getDHash(),
      otherFrame.getDHash(),
    ]);

    return getHammingDistance(thisHash, otherHash) <= similarityTreshold;
  }
}
