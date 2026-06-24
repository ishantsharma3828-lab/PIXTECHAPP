import React, { useEffect } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';

interface CanvasPreviewProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  imageSrc: string | null;
  mainText: string;
  templateId: string;
  frameId: string;
  
  // Color Controls
  frameColor: string;
  mainTextColor: string;
  headerColor: string;

  // Advanced Controls
  textPosition: { x: number; y: number };
  fontSize: number;
  textAlign: 'left' | 'center' | 'right';
  textRotation: number;
  overlayOpacity: number;
  glowIntensity: number;
  mainTextFontFamily: string;
  headerFontFamily: string;

  // Image Controls
  imageScale: number;
  imagePosition: { x: number; y: number };
  imageRotation: number;

  // New Effects
  vignetteIntensity: number;
  noiseIntensity: number;
  chromaticAberration: number;

  // Header Controls
  headerText: string;
  showHeader: boolean;
  headerPosition: { x: number; y: number };
  headerFontSize: number;
  headerRotation: number;
  
  // Stroke Controls
  showMainTextStroke: boolean;
  mainTextStrokeColor: string;
  mainTextStrokeWidth: number;
  showHeaderStroke: boolean;
  headerStrokeColor: string;
  headerStrokeWidth: number;

  // Shadow Controls
  showMainTextShadow: boolean;
  mainTextShadowColor: string;
  mainTextShadowBlur: number;
  mainTextShadowOffsetX: number;
  mainTextShadowOffsetY: number;
  showHeaderShadow: boolean;
  headerShadowColor: string;
  headerShadowBlur: number;
  headerShadowOffsetX: number;
  headerShadowOffsetY: number;

  // Info Box Controls
  showInfoBox: boolean;
  infoBoxPosition: { x: number; y: number };
  infoBoxSize: { width: number; height: number };

  // Watermark Controls
  watermarkImage: string | null;
  watermarkText: string;
  watermarkOpacity: number;
  watermarkScale: number;
  watermarkPosition: { x: number; y: number };
}

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
};

const wrapText = (context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, renderFn: (ctx: CanvasRenderingContext2D, line: string, x: number, y: number) => void) => {
  const words = text.split(' ');
  let line = '';
  let testLine;
  let metrics;
  let testWidth;
  const lines: string[] = [];
  
  for (let n = 0; n < words.length; n++) {
    testLine = line + words[n] + ' ';
    metrics = context.measureText(testLine);
    testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      lines.push(line);
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line);

  const startY = y - (lines.length - 1) * lineHeight / 2;

  lines.forEach((l, i) => {
     renderFn(context, l.trim(), x, startY + i * lineHeight);
  });
};

// --- Effect Drawing Functions ---
const drawScanLines = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  for (let i = 0; i < height; i += 4) {
    ctx.fillRect(0, i, width, 2);
  }
  ctx.restore();
};

const drawDigitalGrid = (ctx: CanvasRenderingContext2D, color: string) => {
    ctx.save();
    ctx.strokeStyle = color + '20'; // Faint color
    ctx.lineWidth = 2;

    const gridSize = 100;
    for (let x = 0; x < CANVAS_WIDTH; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
    }
    
    // Digital artifacts
    ctx.fillStyle = color + '30';
    for(let i=0; i < 20; i++){
        ctx.fillRect(Math.random() * CANVAS_WIDTH, Math.random() * CANVAS_HEIGHT, Math.random() * 20, Math.random() * 20);
    }

    ctx.restore();
};

const drawVignette = (ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number) => {
    if (intensity <= 0) return;
    ctx.save();
    const gradient = ctx.createRadialGradient(width / 2, height / 2, width / 3, width / 2, height / 2, width / 1.5);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(0,0,0,${intensity})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
};

const drawNoise = (ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number) => {
    if (intensity <= 0) return;
    ctx.save();
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const random = (Math.random() - 0.5) * 255 * intensity;
        data[i] += random;
        data[i + 1] += random;
        data[i + 2] += random;
    }
    ctx.putImageData(imageData, 0, 0);
    ctx.restore();
};

const drawNeonNoirLighting = (ctx: CanvasRenderingContext2D, width: number, height: number, color: string) => {
    ctx.save();
    const lightX = width * 0.25;
    const lightY = height * 0.25;
    const gradient = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, width * 0.9);
    gradient.addColorStop(0, `${color}99`);
    gradient.addColorStop(0.4, `${color}55`);
    gradient.addColorStop(1, `${color}00`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
};

const drawHoloGrid = (ctx: CanvasRenderingContext2D, width: number, height: number, color: string) => {
    ctx.save();
    ctx.strokeStyle = color + '60';
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    const horizonY = height * 0.4;
    const vanishingPointX = width / 2;
    for (let i = 0; i < 20; i++) {
        const y = horizonY + i * i * 1.5;
        if (y > height) break;
        ctx.globalAlpha = 1 - (y / height) * 0.7;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    const numVerticalLines = 8;
    for (let i = 0; i < numVerticalLines; i++) {
        const x = (width / (numVerticalLines - 1)) * i;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(vanishingPointX, horizonY);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    ctx.restore();
};

const drawCRTEffect = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save();
    ctx.fillStyle = 'rgba(10, 10, 10, 0.2)';
    for (let i = 0; i < height; i += 4) {
        ctx.fillRect(0, i, width, 2);
    }
    const gradient = ctx.createRadialGradient(width / 2, height / 2, width/2, width / 2, height / 2, width);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
};

const drawLensflare = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const flareColor = `rgba(255, 255, 230, 0.8)`;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 200);
    gradient.addColorStop(0, flareColor);
    gradient.addColorStop(0.2, `${color}99`);
    gradient.addColorStop(1, `${color}00`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    for(let i=0; i<3; i++) {
      const radius = 100 + i * 150;
      const alpha = 0.1 - i * 0.03;
      ctx.strokeStyle = `rgba(255, 255, 220, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.stroke();
    }
    ctx.restore();
};

const drawGlitchRects = (ctx: CanvasRenderingContext2D, width: number, height: number, color: string) => {
    ctx.save();
    for (let i = 0; i < 10; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const w = Math.random() * 200 + 50;
        const h = Math.random() * 10 + 5;
        
        if (Math.random() > 0.5) {
            ctx.fillStyle = color + '80';
        } else {
            ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
        }
        ctx.fillRect(x, y, w, h);
    }
    ctx.restore();
};


// --- Frame Drawing Functions ---
const drawNexusCornersFrame = (ctx: CanvasRenderingContext2D, color: string, glow: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.shadowColor = color;
    ctx.shadowBlur = glow;

    const cornerSize = 100;
    const offset = 40;

    // Top-left
    ctx.beginPath();
    ctx.moveTo(offset + cornerSize, offset);
    ctx.lineTo(offset, offset);
    ctx.lineTo(offset, offset + cornerSize);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH - offset - cornerSize, offset);
    ctx.lineTo(CANVAS_WIDTH - offset, offset);
    ctx.lineTo(CANVAS_WIDTH - offset, offset + cornerSize);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(offset + cornerSize, CANVAS_HEIGHT - offset);
    ctx.lineTo(offset, CANVAS_HEIGHT - offset);
    ctx.lineTo(offset, CANVAS_HEIGHT - offset - cornerSize);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH - offset - cornerSize, CANVAS_HEIGHT - offset);
    ctx.lineTo(CANVAS_WIDTH - offset, CANVAS_HEIGHT - offset);
    ctx.lineTo(CANVAS_WIDTH - offset, CANVAS_HEIGHT - offset - cornerSize);
    ctx.stroke();
};

const drawDataStreamFrame = (ctx: CanvasRenderingContext2D, color: string, glow: number) => {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.shadowColor = color;
    ctx.shadowBlur = glow * 0.75;

    const offset = 40;
    const barWidth = 15;
    const barHeight = 80;

    // Side bars
    ctx.fillRect(offset, CANVAS_HEIGHT / 2 - barHeight / 2, barWidth, barHeight);
    ctx.fillRect(CANVAS_WIDTH - offset - barWidth, CANVAS_HEIGHT / 2 - barHeight / 2, barWidth, barHeight);
    
    // Top and Bottom lines
    ctx.beginPath();
    ctx.moveTo(offset, offset);
    ctx.lineTo(CANVAS_WIDTH - offset, offset);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(offset, CANVAS_HEIGHT - offset);
    ctx.lineTo(CANVAS_WIDTH - offset, CANVAS_HEIGHT - offset);
    ctx.stroke();

    // Small corner details
    ctx.fillRect(offset, offset, 50, 4);
    ctx.fillRect(CANVAS_WIDTH - offset - 50, offset, 50, 4);
    ctx.fillRect(offset, CANVAS_HEIGHT - offset - 4, 50, 4);
    ctx.fillRect(CANVAS_WIDTH - offset - 50, CANVAS_HEIGHT - offset - 4, 50, 4);
};

const drawQuantumEdgeFrame = (ctx: CanvasRenderingContext2D, color: string, glow: number) => {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = glow;
    
    const offset = 40;

    // Bottom-left detail
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(offset, CANVAS_HEIGHT - 300);
    ctx.lineTo(offset, CANVAS_HEIGHT - offset);
    ctx.lineTo(300, CANVAS_HEIGHT - offset);
    ctx.stroke();
    ctx.fillRect(offset + 20, CANVAS_HEIGHT - offset - 20, 100, 10);
    ctx.fillRect(offset + 20, CANVAS_HEIGHT - offset - 40, 60, 10);

    // Top-right detail
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH - offset, 200);
    ctx.lineTo(CANVAS_WIDTH - offset, offset);
    ctx.lineTo(CANVAS_WIDTH - 200, offset);
    ctx.stroke();
};

const drawHudInterfaceFrame = (ctx: CanvasRenderingContext2D, color: string, glow: number) => {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = glow * 1.25;
    ctx.lineWidth = 6;

    const offset = 40;
    const w = CANVAS_WIDTH;
    const h = CANVAS_HEIGHT;

    // Main border
    ctx.beginPath();
    ctx.moveTo(offset, 150);
    ctx.lineTo(offset, h - 150);
    ctx.lineTo(offset + 100, h - offset);
    ctx.lineTo(w - offset - 100, h - offset);
    ctx.lineTo(w - offset, h - 150);
    ctx.lineTo(w - offset, 150);
    ctx.lineTo(w - offset - 100, offset);
    ctx.lineTo(offset + 100, offset);
    ctx.closePath();
    ctx.stroke();

    // Left side details
    ctx.fillRect(offset - 20, 300, 10, 200);
    ctx.fillRect(offset - 20, h - 500, 10, 200);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(offset, 550);
    ctx.lineTo(offset + 50, 550);
    ctx.stroke();

    // Right side details
    ctx.fillRect(w - offset + 10, 200, 10, 250);
    ctx.fillRect(w - offset + 10, h - 450, 10, 250);

    ctx.lineWidth = 4;
    for(let i=0; i<8; i++){
      ctx.beginPath();
      ctx.moveTo(w - offset - 20, 500 + i*20);
      ctx.lineTo(w - offset, 520 + i*20);
      ctx.stroke();
    }
    
    for(let i=0; i<8; i++){
      ctx.beginPath();
      ctx.moveTo(w - offset - 20, h - 700 + i*20);
      ctx.lineTo(w - offset, h - 680 + i*20);
      ctx.stroke();
    }
};

const drawNightCityInterfaceFrame = (ctx: CanvasRenderingContext2D, color: string, glow: number) => {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = glow * 1.25;
    ctx.lineWidth = 4;

    const offset = 60;
    const w = CANVAS_WIDTH;
    const h = CANVAS_HEIGHT;

    // Top border
    ctx.beginPath();
    ctx.moveTo(offset, 200);
    ctx.lineTo(offset, 100);
    ctx.lineTo(offset + 100, offset);
    ctx.lineTo(w - offset - 100, offset);
    ctx.lineTo(w - offset, 100);
    ctx.lineTo(w - offset, 200);
    ctx.stroke();

    // Bottom border
    ctx.beginPath();
    ctx.moveTo(offset, h - 200);
    ctx.lineTo(offset, h - 100);
    ctx.lineTo(offset + 100, h - offset);
    ctx.lineTo(w - offset - 100, h - offset);
    ctx.lineTo(w - offset, h - 100);
    ctx.lineTo(w - offset, h - 200);
    ctx.stroke();

    // Side details - Right
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w - offset + 20, 300);
    ctx.lineTo(w - offset, 320);
    ctx.lineTo(w - offset, h - 320);
    ctx.lineTo(w - offset + 20, h - 300);
    ctx.stroke();

    for(let i=0; i<10; i++) {
        ctx.fillRect(w-offset+5, 400 + i * 20, 10, 5);
    }
    for(let i=0; i<15; i++) {
        ctx.fillRect(w-offset+5, h - 600 + i * 20, 10, 5);
    }
     ctx.fillStyle = '#FFA500'; // Orange accent
     ctx.fillRect(w-offset+5, 400 + 4 * 20, 10, 5);
     ctx.fillStyle = color;

    // Side details - Left
    ctx.beginPath();
    ctx.moveTo(offset - 20, 300);
    ctx.lineTo(offset, 320);
    ctx.lineTo(offset, h - 320);
    ctx.lineTo(offset - 20, h - 300);
    ctx.stroke();
    
    ctx.save();
    ctx.fillStyle = color + '90';
    ctx.font = '24px Orbitron';
    ctx.textAlign = 'left';
    ctx.translate(offset - 10, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('// SYS_STATUS: ACTIVE', 0, 0);
    ctx.restore();
};

const drawGlitchInterfaceFrame = (ctx: CanvasRenderingContext2D, color: string, glow: number) => {
    ctx.strokeStyle = '#FFFFFF';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = color;
    ctx.shadowBlur = glow * 0.5;
    ctx.lineWidth = 6;

    const offset = 40;
    const w = CANVAS_WIDTH;
    const h = CANVAS_HEIGHT;

    // Main outline
    ctx.beginPath();
    ctx.moveTo(offset + 80, offset);
    ctx.lineTo(w - offset, offset);
    ctx.lineTo(w - offset, h - offset - 120);
    ctx.lineTo(w - offset - 100, h - offset);
    ctx.lineTo(offset, h - offset);
    ctx.lineTo(offset, offset + 80);
    ctx.closePath();
    ctx.stroke();

    // Top left detail
    ctx.beginPath();
    ctx.moveTo(offset, 250);
    ctx.lineTo(offset + 80, 250);
    ctx.lineTo(offset + 80, offset);
    ctx.stroke();

    // Bottom right detail
    ctx.beginPath();
    ctx.moveTo(w - offset - 250, h - offset);
    ctx.lineTo(w - offset - 250, h - offset - 120);
    ctx.lineTo(w - offset, h - offset - 120);
    ctx.stroke();
    
    // Diagonal background shapes
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.2);
    ctx.lineTo(w, h * 0.4);
    ctx.lineTo(w, h * 0.8);
    ctx.lineTo(0, h * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Decorative text and elements
    ctx.font = '32px VT323';
    ctx.textAlign = 'left';
    ctx.fillText("Creator >>>", w - offset - 200, offset + 40);
    ctx.save();
    ctx.translate(w-offset-150, h/2);
    ctx.rotate(Math.PI / 2);
    ctx.fillText("S h a t t e r e d", 0, 0);
    ctx.restore();

    // Left yellow bar
    ctx.fillStyle = color; // Accent color
    ctx.fillRect(offset, 280, 80, 300);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 30px Rajdhani';
    ctx.save();
    ctx.translate(offset + 70, 550);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('SYSTEM RUNNING', 0, 0);
    ctx.restore();


    // Japanese characters
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '150px Cairo';
    ctx.fillText("神", offset + 50, h - 150);
};

const drawInfoBox = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, glow: number) => {
    const notchSize = Math.min(40, w * 0.1, h * 0.2);

    const createPath = () => {
        ctx.beginPath();
        ctx.moveTo(x + notchSize, y);
        ctx.lineTo(x, y + notchSize);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x + w, y);
        ctx.closePath();
    };

    // 1. Draw blurred background
    ctx.save();
    createPath();
    ctx.clip();
    // Slightly expand the drawImage source to avoid hard edges from the blur
    const blurPadding = 10;
    ctx.filter = `blur(${blurPadding}px)`;
    ctx.drawImage(ctx.canvas, -blurPadding, -blurPadding, ctx.canvas.width + blurPadding*2, ctx.canvas.height + blurPadding*2);
    ctx.restore();

    // 2. Draw semi-transparent overlay on the box
    ctx.save();
    createPath();
    ctx.fillStyle = 'rgba(10, 10, 10, 0.6)';
    ctx.fill();
    
    // 3. Draw the border
    ctx.strokeStyle = color + 'A0';
    ctx.lineWidth = 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = glow;
    ctx.stroke();
    ctx.restore();
    
    // 4. Draw decorative elements (scaled to the box size)
    ctx.save();
    ctx.strokeStyle = '#FFFFFF';
    ctx.shadowBlur = 0;
    
    // Top right chevrons
    ctx.lineWidth = Math.max(2, w * 0.01);
    const chevronHeight = Math.min(40, h * 0.2);
    const chevronWidth = chevronHeight * 0.6;
    const chevronSpacing = chevronWidth * 0.9;
    const chevronX = x + w - chevronWidth * 1.5;
    const chevronY = y + chevronHeight * 0.6;
    for(let i=0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(chevronX - i*chevronSpacing, chevronY - chevronHeight/2);
        ctx.lineTo(chevronX - chevronWidth - i*chevronSpacing, chevronY);
        ctx.lineTo(chevronX - i*chevronSpacing, chevronY + chevronHeight/2);
        ctx.stroke();
    }

    // Bottom left slanted lines
    ctx.lineWidth = Math.max(1, w * 0.005);
    const linesX = x + w * 0.05;
    const linesY = y + h - h * 0.2;
    const lineLength = Math.min(30, w * 0.05, h * 0.1);
    const lineSpacing = lineLength * 0.6;
    for(let i=0; i<18; i++) {
        ctx.beginPath();
        ctx.moveTo(linesX + i*lineSpacing, linesY);
        ctx.lineTo(linesX + lineLength + i*lineSpacing, linesY + lineLength);
        ctx.stroke();
    }
    
    ctx.restore();
};

const drawFrame = (ctx: CanvasRenderingContext2D, frameId: string, color: string, glow: number) => {
    ctx.save();
    switch (frameId) {
        case 'nexus-corners':
            drawNexusCornersFrame(ctx, color, glow);
            break;
        case 'data-stream':
            drawDataStreamFrame(ctx, color, glow);
            break;
        case 'quantum-edge':
            drawQuantumEdgeFrame(ctx, color, glow);
            break;
        case 'hud-interface':
            drawHudInterfaceFrame(ctx, color, glow);
            break;
        case 'night-city-interface':
            drawNightCityInterfaceFrame(ctx, color, glow);
            break;
        case 'glitch-interface':
            drawGlitchInterfaceFrame(ctx, color, glow);
            break;
    }
    ctx.restore();
};

const drawHeader = (ctx: CanvasRenderingContext2D, props: Omit<CanvasPreviewProps, 'canvasRef' | 'imageSrc' | 'mainText' | 'templateId' | 'frameId' | 'infoBoxPosition' | 'infoBoxSize' | 'showInfoBox' >) => {
    if (!props.showHeader) return;

    const headerPixelX = CANVAS_WIDTH * (props.headerPosition.x / 100);
    const headerPixelY = CANVAS_HEIGHT * (props.headerPosition.y / 100);

    ctx.save();
    ctx.translate(headerPixelX, headerPixelY);
    ctx.rotate(props.headerRotation * Math.PI / 180);

    ctx.font = `bold ${props.headerFontSize}px ${props.headerFontFamily}`;
    
    if (props.showHeaderShadow) {
        ctx.shadowColor = props.headerShadowColor;
        ctx.shadowBlur = props.headerShadowBlur;
        ctx.shadowOffsetX = props.headerShadowOffsetX;
        ctx.shadowOffsetY = props.headerShadowOffsetY;
    } else {
        ctx.shadowColor = props.headerColor;
        ctx.shadowBlur = props.glowIntensity;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if (props.showHeaderStroke && props.headerStrokeWidth > 0) {
        ctx.strokeStyle = props.headerStrokeColor;
        ctx.lineWidth = props.headerStrokeWidth;
        ctx.strokeText(props.headerText, 0, 0);
    }
    
    ctx.fillStyle = props.headerColor;
    ctx.fillText(props.headerText, 0, 0);

    ctx.restore();
};


export const CanvasPreview: React.FC<CanvasPreviewProps> = (props) => { 
  const { 
    canvasRef, imageSrc, mainText, templateId, frameId, 
    frameColor, mainTextColor, headerColor,
    textPosition, fontSize, textAlign, textRotation, overlayOpacity, glowIntensity, mainTextFontFamily,
    imageScale, imagePosition, imageRotation,
    vignetteIntensity, noiseIntensity, chromaticAberration,
    watermarkImage, watermarkText, watermarkOpacity, watermarkScale, watermarkPosition,
    showMainTextStroke, mainTextStrokeColor, mainTextStrokeWidth,
    showMainTextShadow, mainTextShadowColor, mainTextShadowBlur, mainTextShadowOffsetX, mainTextShadowOffsetY,
    showInfoBox, infoBoxPosition, infoBoxSize,
  } = props;

  useEffect(() => {
    const draw = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // --- DRAWING PIPELINE ---
      // 1. Clear and set background
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // 2. Draw frame-specific background effects
      if (frameId === 'night-city-interface') {
          drawDigitalGrid(ctx, frameColor);
      }

      // 3. Draw user image
      if (imageSrc) {
        try {
          const img = await loadImage(imageSrc);
          const canvasAspect = CANVAS_WIDTH / CANVAS_HEIGHT;
          const imgAspect = img.width / img.height;
          let sWidth, sHeight;

          if (imgAspect > canvasAspect) {
            sHeight = img.height;
            sWidth = sHeight * canvasAspect;
          } else {
            sWidth = img.width;
            sHeight = sWidth / canvasAspect;
          }
          
          ctx.save();
          // Position relative to canvas center
          const px = CANVAS_WIDTH * (imagePosition.x / 100);
          const py = CANVAS_HEIGHT * (imagePosition.y / 100);
          
          ctx.translate(px, py);
          ctx.rotate(imageRotation * Math.PI / 180);
          ctx.scale(imageScale, imageScale);

          // We want the image to cover the canvas when scale is 1 and pos is center,
          // so we draw it centered at 0, 0 using the cover dimensions we calculated.
          // Wait, sWidth/sHeight are crop dimensions. We want to draw the whole image,
          // just scaled so that it covers the canvas by default.
          
          // Let's actually calculate draw dimensions based on 'cover'
          let drawW, drawH;
          if (imgAspect > canvasAspect) {
             drawH = CANVAS_HEIGHT;
             drawW = drawH * imgAspect;
          } else {
             drawW = CANVAS_WIDTH;
             drawH = drawW / imgAspect;
          }

          ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
          ctx.restore();
           if (templateId === 'analog-dream') {
              ctx.save();
              ctx.globalCompositeOperation = 'luminosity';
              ctx.fillStyle = 'rgba(200, 180, 160, 0.2)'; // Sepia tint
              ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
              ctx.globalCompositeOperation = 'color';
              ctx.fillStyle = 'rgba(128, 128, 128, 0.1)'; // Desaturate
              ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
              ctx.restore();
          }
        } catch (error) {
          console.error('Failed to load image for canvas', error);
          // Error handling remains the same
        }
      }

      // 3.5 Draw template-specific image overlays
      if (templateId === 'arcade-overload') {
        drawCRTEffect(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      // 4. Draw overlay
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      gradient.addColorStop(0, `rgba(10,10,10,${overlayOpacity * 0.9})`);
      gradient.addColorStop(0.5, `rgba(10,10,10,${overlayOpacity * 0.5})`);
      gradient.addColorStop(1, `rgba(10,10,10,${Math.min(1, overlayOpacity * 1.2)})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 4.5 Draw template-specific lighting
      if (templateId === 'neon-noir') {
          drawNeonNoirLighting(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, frameColor);
      } else if (templateId === 'holo-grid') {
          drawHoloGrid(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, frameColor);
      } else if (templateId === 'data-corruption') {
          drawGlitchRects(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, frameColor);
      }
      
      // 5. Draw Vignette
      drawVignette(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, vignetteIntensity);
      
      // 6. Draw Frame
      drawFrame(ctx, frameId, frameColor, glowIntensity);

      // 6.5 Draw Info Box Layer
      if (showInfoBox) {
          const boxPixelWidth = CANVAS_WIDTH * (infoBoxSize.width / 100);
          const boxPixelHeight = CANVAS_HEIGHT * (infoBoxSize.height / 100);
          const boxPixelX = (CANVAS_WIDTH * (infoBoxPosition.x / 100)) - boxPixelWidth / 2;
          const boxPixelY = (CANVAS_HEIGHT * (infoBoxPosition.y / 100)) - boxPixelHeight / 2;
          
          drawInfoBox(ctx, boxPixelX, boxPixelY, boxPixelWidth, boxPixelHeight, frameColor, glowIntensity);
      }

      // 7. Draw Header
      drawHeader(ctx, props);

      // 8. Draw Main Text
      const textPixelX = CANVAS_WIDTH * (textPosition.x / 100);
      const textPixelY = CANVAS_HEIGHT * (textPosition.y / 100);

      ctx.save();
      ctx.translate(textPixelX, textPixelY);
      ctx.rotate(textRotation * Math.PI / 180);
      
      ctx.textAlign = textAlign;
      ctx.textBaseline = 'middle';
      
      if (showMainTextShadow) {
        ctx.shadowColor = mainTextShadowColor;
        ctx.shadowBlur = mainTextShadowBlur;
        ctx.shadowOffsetX = mainTextShadowOffsetX;
        ctx.shadowOffsetY = mainTextShadowOffsetY;
      }

      const applyStroke = (ctx: CanvasRenderingContext2D) => {
          if(showMainTextStroke && mainTextStrokeWidth > 0){
              ctx.strokeStyle = mainTextStrokeColor;
              ctx.lineWidth = mainTextStrokeWidth;
              return true;
          }
          return false;
      }
      
      if (templateId === 'cyber-glitch') {
        ctx.font = `900 ${fontSize}px ${mainTextFontFamily}`;
        const renderGlitchText = (ctx: CanvasRenderingContext2D, line: string, x: number, y: number) => {
            const randomOffset = () => (Math.random() - 0.5) * (fontSize / 20);
            
            if (!showMainTextShadow) {
              ctx.shadowBlur = 0;
            }
            
            ctx.fillStyle = 'rgba(255, 0, 128, 0.7)';
            ctx.fillText(line, x + randomOffset(), y + randomOffset());
            ctx.fillStyle = 'rgba(0, 255, 255, 0.7)';
            ctx.fillText(line, x + randomOffset(), y + randomOffset());
            
            if (applyStroke(ctx)) {
                ctx.strokeText(line, x, y);
            }
            ctx.fillStyle = mainTextColor;
            if (!showMainTextShadow) {
              ctx.shadowColor = '#000';
              ctx.shadowBlur = 10;
            }
            ctx.fillText(line, x, y);
        };
        wrapText(ctx, mainText, 0, 0, CANVAS_WIDTH - 150, fontSize, renderGlitchText);
        
        drawScanLines(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);

      } else if (templateId === 'pixel-arcade') {
        ctx.font = `${fontSize}px ${mainTextFontFamily}`;
        const renderPixelText = (ctx: CanvasRenderingContext2D, line: string, x: number, y: number) => {
             if (!showMainTextShadow) {
                ctx.shadowColor = 'transparent';
             }
             ctx.fillStyle = '#000';
             if(applyStroke(ctx)) ctx.strokeText(line, x+6, y+6);
             ctx.fillText(line, x + 6, y + 6);

             ctx.fillStyle = frameColor;
             if(applyStroke(ctx)) ctx.strokeText(line, x+3, y+3);
             ctx.fillText(line, x + 3, y + 3);

             ctx.fillStyle = mainTextColor;
             if(applyStroke(ctx)) ctx.strokeText(line, x, y);
             ctx.fillText(line, x, y);
        };
        wrapText(ctx, mainText, 0, 0, CANVAS_WIDTH - 150, fontSize * 0.9, renderPixelText);

      } else if (templateId === 'future-neon') {
        ctx.font = `900 ${fontSize}px ${mainTextFontFamily}`;
        const renderNeonText = (ctx: CanvasRenderingContext2D, line: string, x: number, y: number) => {
            if (!showMainTextShadow) {
              ctx.shadowColor = frameColor;
              ctx.shadowBlur = glowIntensity;
            }
            
            if (showMainTextStroke && mainTextStrokeWidth > 0) {
                 ctx.strokeStyle = mainTextStrokeColor;
                 ctx.lineWidth = mainTextStrokeWidth;
                 ctx.strokeText(line, x, y);
            } else {
                 ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                 ctx.lineWidth = 4;
                 ctx.strokeText(line, x, y);
            }

            ctx.fillStyle = mainTextColor;
            ctx.fillText(line, x, y);

            if (chromaticAberration > 0) {
              ctx.save();
              ctx.globalCompositeOperation = 'lighter';
              ctx.shadowBlur = 0;
              ctx.fillStyle = 'rgba(255, 0, 255, 0.6)';
              ctx.fillText(line, x - chromaticAberration, y);
              ctx.fillStyle = 'rgba(0, 255, 255, 0.6)';
              ctx.fillText(line, x + chromaticAberration, y);
              ctx.restore();
            }
        };
        wrapText(ctx, mainText, 0, 0, CANVAS_WIDTH - 150, fontSize, renderNeonText);
      } else if (templateId === 'neon-noir') {
        ctx.font = `900 ${fontSize}px ${mainTextFontFamily}`;
        const renderNoirText = (ctx: CanvasRenderingContext2D, line: string, x: number, y: number) => {
            if (!showMainTextShadow) {
                ctx.shadowColor = mainTextColor;
                ctx.shadowBlur = glowIntensity * 1.2;
            }
            if(applyStroke(ctx)) ctx.strokeText(line, x, y);
            ctx.fillStyle = mainTextColor;
            ctx.fillText(line, x, y);
        };
        wrapText(ctx, mainText, 0, 0, CANVAS_WIDTH - 150, fontSize, renderNoirText);
      } else if (templateId === 'holo-grid') {
        ctx.font = `700 ${fontSize * 0.9}px ${mainTextFontFamily}`;
        const renderHoloText = (ctx: CanvasRenderingContext2D, line: string, x: number, y: number) => {
            if (!showMainTextShadow) {
                ctx.shadowColor = mainTextColor;
                ctx.shadowBlur = glowIntensity;
            }
            if(applyStroke(ctx)) ctx.strokeText(line, x, y);
            ctx.fillStyle = mainTextColor + 'E6';
            ctx.fillText(line, x, y);
        };
        wrapText(ctx, mainText, 0, 0, CANVAS_WIDTH - 150, fontSize, renderHoloText);
      } else if (templateId === 'arcade-overload') {
        ctx.font = `${fontSize}px VT323`;
        const renderPixelText = (ctx: CanvasRenderingContext2D, line: string, x: number, y: number) => {
             if (!showMainTextShadow) {
                ctx.shadowColor = 'transparent';
             }
             ctx.fillStyle = '#00000080';
             ctx.fillText(line, x + 4, y + 4);
             if(applyStroke(ctx)) ctx.strokeText(line, x, y);
             ctx.fillStyle = mainTextColor;
             ctx.fillText(line, x, y);
        };
        wrapText(ctx, mainText, 0, 0, CANVAS_WIDTH - 150, fontSize * 0.9, renderPixelText);
      } else if (templateId === 'quantum-flare') {
        ctx.font = `900 ${fontSize}px ${mainTextFontFamily}`;
        const renderFlareText = (ctx: CanvasRenderingContext2D, line: string, x: number, y: number) => {
            if(applyStroke(ctx)) {
                 if (!showMainTextShadow) {
                    ctx.shadowColor = mainTextStrokeColor;
                    ctx.shadowBlur = 10;
                 }
                 ctx.strokeText(line, x, y);
            }
            if (!showMainTextShadow) {
                ctx.shadowColor = mainTextColor;
                ctx.shadowBlur = glowIntensity;
            }
            ctx.fillStyle = mainTextColor;
            ctx.fillText(line, x, y);
        };
        wrapText(ctx, mainText, 0, 0, CANVAS_WIDTH - 150, fontSize, renderFlareText);
      } else if (templateId === 'data-corruption') {
        ctx.font = `900 ${fontSize}px ${mainTextFontFamily}`;
        const renderCorruptionText = (ctx: CanvasRenderingContext2D, line: string, x: number, y: number) => {
            const offset = chromaticAberration * 1.5;
            
            if(applyStroke(ctx)) {
                ctx.strokeText(line, x, y);
            }

            ctx.fillStyle = mainTextColor;
            ctx.fillText(line, x, y);
            
            // Heavy chromatic aberration
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255, 0, 100, 0.7)';
            ctx.fillText(line, x - offset, y);
            ctx.fillStyle = 'rgba(0, 100, 255, 0.7)';
            ctx.fillText(line, x + offset, y);
            ctx.restore();
        };
        wrapText(ctx, mainText, 0, 0, CANVAS_WIDTH - 150, fontSize, renderCorruptionText);
      } else if (templateId === 'analog-dream') {
        ctx.font = `700 ${fontSize}px ${mainTextFontFamily}`;
        const renderAnalogText = (ctx: CanvasRenderingContext2D, line: string, x: number, y: number) => {
            if (!showMainTextShadow) {
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 15;
                ctx.shadowOffsetX = 4;
                ctx.shadowOffsetY = 4;
            }
            
            if(applyStroke(ctx)) {
                ctx.lineWidth = mainTextStrokeWidth * 0.75;
                ctx.strokeText(line, x, y);
            }

            ctx.fillStyle = mainTextColor;
            ctx.fillText(line, x, y);
        };
        wrapText(ctx, mainText, 0, 0, CANVAS_WIDTH - 200, fontSize, renderAnalogText);
      }
      
      ctx.restore(); // Restore from text transformations
      
      // 9. Draw template-specific foreground effects
      if (templateId === 'quantum-flare') {
        drawLensflare(ctx, CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.35, frameColor);
      }

      // 10. Draw Noise
      drawNoise(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, noiseIntensity);

      // 11. Draw Watermark
      if (watermarkOpacity > 0) {
        ctx.save();
        ctx.globalAlpha = watermarkOpacity;
        const wx = CANVAS_WIDTH * (watermarkPosition.x / 100);
        const wy = CANVAS_HEIGHT * (watermarkPosition.y / 100);

        if (watermarkImage) {
          try {
            const wImg = await loadImage(watermarkImage);
            const aspectRatio = wImg.width / wImg.height;
            // Base width is a fraction of canvas width, modified by scale
            const baseW = CANVAS_WIDTH * 0.3 * watermarkScale;
            const w = baseW;
            const h = baseW / aspectRatio;
            
            // Draw centered on position
            ctx.drawImage(wImg, wx - w/2, wy - h/2, w, h);
          } catch (e) {
            console.error("Failed to load watermark image", e);
          }
        }
        
        if (watermarkText) {
          ctx.font = `600 ${40 * watermarkScale}px 'Inter', sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#FFFFFF';
          // Add a subtle drop shadow to text watermark for visibility
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 2;
          // Subtly position it below the image if both exist, otherwise place at exact watermarkPosition
          const textYOffset = watermarkImage ? (CANVAS_WIDTH * 0.3 * watermarkScale) / 2 + (20 * watermarkScale) : 0;
          ctx.fillText(watermarkText, wx, wy + textYOffset);
        }
        
        ctx.restore();
      }

      // Reset shadows
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    };
    draw();
  }, [
      imageSrc, mainText, templateId, frameId, 
      frameColor, mainTextColor, headerColor,
      canvasRef, 
      textPosition, fontSize, textAlign, textRotation, overlayOpacity, glowIntensity, mainTextFontFamily,
      imageScale, imagePosition, imageRotation,
      watermarkImage, watermarkText, watermarkOpacity, watermarkScale, watermarkPosition,
      vignetteIntensity, noiseIntensity, chromaticAberration,
      props.headerText, props.showHeader, props.headerPosition, props.headerFontSize, props.headerRotation, props.headerFontFamily,
      showMainTextStroke, mainTextStrokeColor, mainTextStrokeWidth,
      props.showHeaderStroke, props.headerStrokeColor, props.headerStrokeWidth,
      showMainTextShadow, mainTextShadowColor, mainTextShadowBlur, mainTextShadowOffsetX, mainTextShadowOffsetY,
      props.showHeaderShadow, props.headerShadowColor, props.headerShadowBlur, props.headerShadowOffsetX, props.headerShadowOffsetY,
      showInfoBox, infoBoxPosition, infoBoxSize
  ]);

  return (
    <div className="w-full h-full max-w-[450px] flex items-center justify-center rounded-lg overflow-hidden relative">
        <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full h-full object-contain shadow-2xl rounded-lg"
        />
    </div>
  );
};