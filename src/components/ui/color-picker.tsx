import { useState, useRef, useEffect } from 'react';
import { Input } from './input';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E', '#78716C', '#71717A', '#64748B',
];

const DEFAULT_COLOR = PRESET_COLORS[0]; // Red as default

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [hexInput, setHexInput] = useState(value || DEFAULT_COLOR);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hueRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHueDragging, setIsHueDragging] = useState(false);
  const [hue, setHue] = useState(0); // Start at red (hue 0)
  const [saturation, setSaturation] = useState(100);
  const [lightness, setLightness] = useState(50);
  
  // Initialize with default color on mount if no value
  useEffect(() => {
    if (!value) {
      onChange(DEFAULT_COLOR);
    }
  }, []);

  useEffect(() => {
    setHexInput(value);
    // Parse hex to HSL for initial position
    const rgb = hexToRgb(value);
    if (rgb) {
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      setHue(hsl.h);
      setSaturation(hsl.s);
      setLightness(hsl.l);
    }
  }, [value]);

  useEffect(() => {
    drawColorCanvas();
  }, [hue]);

  useEffect(() => {
    drawHueSlider();
  }, []);

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  };

  const hslToHex = (h: number, s: number, l: number) => {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  const drawColorCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Create saturation gradient
    const satGradient = ctx.createLinearGradient(0, 0, width, 0);
    satGradient.addColorStop(0, '#fff');
    satGradient.addColorStop(1, `hsl(${hue}, 100%, 50%)`);
    ctx.fillStyle = satGradient;
    ctx.fillRect(0, 0, width, height);

    // Create lightness gradient
    const lightGradient = ctx.createLinearGradient(0, 0, 0, height);
    lightGradient.addColorStop(0, 'rgba(0,0,0,0)');
    lightGradient.addColorStop(1, '#000');
    ctx.fillStyle = lightGradient;
    ctx.fillRect(0, 0, width, height);
  };

  const drawHueSlider = () => {
    const canvas = hueRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    for (let i = 0; i <= 360; i += 60) {
      gradient.addColorStop(i / 360, `hsl(${i}, 100%, 50%)`);
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newSat = (x / rect.width) * 100;
    const newLight = 100 - (y / rect.height) * 100;
    setSaturation(newSat);
    setLightness(newLight);
    const newColor = hslToHex(hue, newSat, newLight * 0.5 + (100 - newSat) * 0.5 * (newLight / 100));
    onChange(newColor);
    setHexInput(newColor);
  };

  const handleHueClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = hueRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newHue = (x / rect.width) * 360;
    setHue(newHue);
    const newColor = hslToHex(newHue, saturation, lightness);
    onChange(newColor);
    setHexInput(newColor);
  };

  const handleHexChange = (input: string) => {
    // Remove # if user types it, then add it back
    const cleanHex = input.replace(/^#/, '').toUpperCase();
    const hexWithHash = `#${cleanHex}`;
    setHexInput(hexWithHash);
    if (/^#[0-9A-Fa-f]{6}$/.test(hexWithHash)) {
      onChange(hexWithHash);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-10 w-16 p-1"
          style={{ backgroundColor: value }}
        >
          <span className="sr-only">Escolher cor</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 space-y-3 z-50" align="start" side="bottom" sideOffset={4}>
        {/* Color Canvas */}
        <canvas
          ref={canvasRef}
          width={232}
          height={150}
          className="w-full h-[150px] rounded cursor-crosshair border"
          onClick={handleCanvasClick}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          onMouseMove={(e) => isDragging && handleCanvasClick(e)}
        />

        {/* Hue Slider */}
        <canvas
          ref={hueRef}
          width={232}
          height={16}
          className="w-full h-4 rounded cursor-pointer border"
          onClick={handleHueClick}
          onMouseDown={() => setIsHueDragging(true)}
          onMouseUp={() => setIsHueDragging(false)}
          onMouseLeave={() => setIsHueDragging(false)}
          onMouseMove={(e) => isHueDragging && handleHueClick(e)}
        />

        {/* Preset Colors */}
        <div className="grid grid-cols-10 gap-1">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              className="h-5 w-5 rounded border border-border hover:scale-110 transition-transform"
              style={{ backgroundColor: color }}
              onClick={() => {
                onChange(color);
                setHexInput(color);
              }}
            />
          ))}
        </div>

        {/* Hex Input */}
        <div className="flex gap-2 items-center">
          <div
            className="h-8 w-8 rounded border"
            style={{ backgroundColor: value }}
          />
          <div className="flex-1 flex items-center h-8 border rounded-md bg-background">
            <span className="pl-3 text-sm font-mono text-muted-foreground">#</span>
            <Input
              value={hexInput.replace(/^#/, '')}
              onChange={(e) => handleHexChange(e.target.value)}
              placeholder="000000"
              maxLength={6}
              className="flex-1 h-8 text-sm font-mono border-0 pl-1 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
