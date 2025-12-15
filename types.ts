
export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export type ArtStyle = 'Realistic' | 'Cinematic' | 'Anime' | 'Cyberpunk' | 'Watercolor' | '3D Render' | 'Architecture' | 'Oil Painting';

export const STYLES: ArtStyle[] = ['Realistic', 'Cinematic', 'Anime', 'Cyberpunk', 'Watercolor', '3D Render', 'Architecture', 'Oil Painting'];

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text?: string;
  imageUrl?: string; // For generated results or displayed sketches
  timestamp: number;
  isSketch?: boolean; // To distinguish user sketches from model results
  originalSketchUrl?: string; // For "Press to compare" functionality
  styleUsed?: string;
}

export interface GenerationConfig {
  prompt: string;
  sketchData: string; // Base64
}

export interface DrawingTool {
  color: string;
  width: number;
  mode: 'brush' | 'eraser';
  shape: 'round' | 'square';
  opacity: number;
}
