import React, { useState, useEffect } from 'react';
import type { Template, Frame, Font } from '../types';

interface EditorPanelProps {
  onImageUpload: (file: File) => void;
  mainText: string;
  setMainText: (text: string) => void;
  templates: Template[];
  selectedTemplate: Template;
  setSelectedTemplate: (template: Template) => void;
  frames: Frame[];
  selectedFrame: Frame;
  setSelectedFrame: (frame: Frame) => void;
  
  // Image Controls
  imageScale: number;
  setImageScale: (scale: number) => void;
  imagePosition: { x: number; y: number };
  setImagePosition: (pos: { x: number; y: number }) => void;
  imageRotation: number;
  setImageRotation: (rotation: number) => void;

  // Color Controls
  frameColor: string;
  setFrameColor: (color: string) => void;
  mainTextColor: string;
  setMainTextColor: (color: string) => void;
  headerColor: string;
  setHeaderColor: (color: string) => void;

  // Advanced Controls
  textPosition: { x: number; y: number };
  setTextPosition: (position: { x: number; y: number }) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  textAlign: 'left' | 'center' | 'right';
  setTextAlign: (align: 'left' | 'center' | 'right') => void;
  textRotation: number;
  setTextRotation: (rotation: number) => void;
  overlayOpacity: number;
  setOverlayOpacity: (opacity: number) => void;
  glowIntensity: number;
  setGlowIntensity: (intensity: number) => void;
  
  // New Effects
  vignetteIntensity: number;
  setVignetteIntensity: (value: number) => void;
  noiseIntensity: number;
  setNoiseIntensity: (value: number) => void;
  chromaticAberration: number;
  setChromaticAberration: (value: number) => void;

  // Font Controls
  fonts: Font[];
  selectedMainTextFont: Font;
  setSelectedMainTextFont: (font: Font) => void;
  selectedHeaderFont: Font;
  setSelectedHeaderFont: (font: Font) => void;
  onFontUpload: (file: File) => void;

  // Header Controls
  headerText: string;
  setHeaderText: (text: string) => void;
  showHeader: boolean;
  setShowHeader: (show: boolean) => void;
  headerPosition: { x: number; y: number };
  setHeaderPosition: (position: { x: number; y: number }) => void;
  headerFontSize: number;
  setHeaderFontSize: (size: number) => void;
  headerRotation: number;
  setHeaderRotation: (rotation: number) => void;

  // Stroke Controls
  showMainTextStroke: boolean;
  setShowMainTextStroke: (show: boolean) => void;
  mainTextStrokeColor: string;
  setMainTextStrokeColor: (color: string) => void;
  mainTextStrokeWidth: number;
  setMainTextStrokeWidth: (width: number) => void;
  showHeaderStroke: boolean;
  setShowHeaderStroke: (show: boolean) => void;
  headerStrokeColor: string;
  setHeaderStrokeColor: (color: string) => void;
  headerStrokeWidth: number;
  setHeaderStrokeWidth: (width: number) => void;
  
  // Shadow Controls
  showMainTextShadow: boolean;
  setShowMainTextShadow: (show: boolean) => void;
  mainTextShadowColor: string;
  setMainTextShadowColor: (color: string) => void;
  mainTextShadowBlur: number;
  setMainTextShadowBlur: (blur: number) => void;
  mainTextShadowOffsetX: number;
  setMainTextShadowOffsetX: (x: number) => void;
  mainTextShadowOffsetY: number;
  setMainTextShadowOffsetY: (y: number) => void;
  showHeaderShadow: boolean;
  setShowHeaderShadow: (show: boolean) => void;
  headerShadowColor: string;
  setHeaderShadowColor: (color: string) => void;
  headerShadowBlur: number;
  setHeaderShadowBlur: (blur: number) => void;
  headerShadowOffsetX: number;
  setHeaderShadowOffsetX: (x: number) => void;
  headerShadowOffsetY: number;
  setHeaderShadowOffsetY: (y: number) => void;

  // Info Box Controls
  showInfoBox: boolean;
  setShowInfoBox: (show: boolean) => void;
  infoBoxPosition: { x: number; y: number };
  setInfoBoxPosition: (position: { x: number; y: number }) => void;
  infoBoxSize: { width: number; height: number };
  setInfoBoxSize: (size: { width: number; height: number }) => void;

  aiPrompt: string;
  setAiPrompt: (prompt: string) => void;
  onGenerateTitles: () => void;
  aiSuggestions: string[];
  isLoading: boolean;
  error: string | null;
  onDownload: () => void;
  onSaveToLibrary: () => void;
}

export const InputField: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string }> = ({ label, value, onChange, placeholder }) => (
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition"
    />
  </div>
);

export const Slider: React.FC<{ label: string; value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; min: number; max: number; step: number; unit?: string }> = ({ label, value, onChange, min, max, step, unit }) => (
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-1">{label} <span className="text-gray-400">({value}{unit})</span></label>
    <input 
      type="range" 
      min={min} 
      max={max} 
      step={step} 
      value={value} 
      onChange={onChange} 
      className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-yellow-500"
    />
  </div>
);

export const Section: React.FC<{ title: string, accentColor: string, children: React.ReactNode, defaultOpen?: boolean }> = ({ title, accentColor, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border-t border-gray-700 pt-4">
          <button onClick={() => setIsOpen(!isOpen)} className="w-full text-left font-bold text-lg flex justify-between items-center transition-colors" style={{ color: accentColor }}>
            <span>{title}</span>
            <span className="transform transition-transform duration-300" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
          </button>
          {isOpen && (
            <div className="mt-4 space-y-4 animate-fade-in">
              {children}
            </div>
          )}
        </div>
    );
};

const ColorPickerWithHex: React.FC<{ label: string; color: string; setColor: (color: string) => void; }> = ({ label, color, setColor }) => {
  const [inputValue, setInputValue] = useState(color);

  useEffect(() => {
    setInputValue(color);
  }, [color]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setInputValue(newColor);
    if (/^#[0-9A-F]{6}$/i.test(newColor)) {
      setColor(newColor);
    }
  };
  
  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setColor(e.target.value);
  };
  
  const handleInputBlur = () => {
    if (!/^#[0-9A-F]{6}$/i.test(inputValue)) {
      setInputValue(color);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={color}
          onChange={handleColorPickerChange}
          className="h-10 w-12 bg-gray-700 border border-gray-600 rounded-md p-1 cursor-pointer"
        />
        <input
          type="text"
          value={inputValue.toUpperCase()}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white font-mono focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition"
          maxLength={7}
        />
      </div>
    </div>
  );
};

const Toggle: React.FC<{ label: string; enabled: boolean; setEnabled: (enabled: boolean) => void; }> = ({ label, enabled, setEnabled }) => (
    <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-300">{label}</label>
        <button
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${enabled ? 'bg-yellow-500' : 'bg-gray-600'}`}
        >
            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    </div>
);

export const EditorPanel: React.FC<EditorPanelProps> = (props) => {
  const {
    onImageUpload, mainText, setMainText,
    templates, selectedTemplate, setSelectedTemplate,
    frames, selectedFrame, setSelectedFrame,
    frameColor, setFrameColor, mainTextColor, setMainTextColor, headerColor, setHeaderColor,
    textPosition, setTextPosition, fontSize, setFontSize, textAlign, setTextAlign,
    textRotation, setTextRotation, overlayOpacity, setOverlayOpacity, glowIntensity, setGlowIntensity,
    vignetteIntensity, setVignetteIntensity, noiseIntensity, setNoiseIntensity, chromaticAberration, setChromaticAberration,
    imageScale, setImageScale, imagePosition, setImagePosition, imageRotation, setImageRotation,
    fonts, selectedMainTextFont, setSelectedMainTextFont, selectedHeaderFont, setSelectedHeaderFont, onFontUpload,
    headerText, setHeaderText, showHeader, setShowHeader, headerPosition, setHeaderPosition,
    headerFontSize, setHeaderFontSize, headerRotation, setHeaderRotation,
    showMainTextStroke, setShowMainTextStroke, mainTextStrokeColor, setMainTextStrokeColor, mainTextStrokeWidth, setMainTextStrokeWidth,
    showHeaderStroke, setShowHeaderStroke, headerStrokeColor, setHeaderStrokeColor, headerStrokeWidth, setHeaderStrokeWidth,
    showMainTextShadow, setShowMainTextShadow, mainTextShadowColor, setMainTextShadowColor, mainTextShadowBlur, setMainTextShadowBlur, mainTextShadowOffsetX, setMainTextShadowOffsetX, mainTextShadowOffsetY, setMainTextShadowOffsetY,
    showHeaderShadow, setShowHeaderShadow, headerShadowColor, setHeaderShadowColor, headerShadowBlur, setHeaderShadowBlur, headerShadowOffsetX, setHeaderShadowOffsetX, headerShadowOffsetY, setHeaderShadowOffsetY,
    showInfoBox, setShowInfoBox, infoBoxPosition, setInfoBoxPosition, infoBoxSize, setInfoBoxSize,
    aiPrompt, setAiPrompt, onGenerateTitles, aiSuggestions,
    isLoading, error, onDownload, onSaveToLibrary
  } = props;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageUpload(e.target.files[0]);
    }
  };

  const handleFontFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFontUpload(e.target.files[0]);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6 custom-scrollbar">
        <div>
          <h2 className="text-xl font-bold border-b-2 pb-2 mb-2" style={{ color: frameColor, borderColor: `${frameColor}4D` }}>Editor Controls</h2>
        </div>

        <Section title="Media & Content" accentColor={frameColor} defaultOpen={true}>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Upload Image</label>
              <div className="flex gap-2 mb-2">
                 <label className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-semibold py-2 px-4 rounded-md text-center cursor-pointer text-sm transition">
                    Use Image File
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                 </label>
                 <label className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-md text-center cursor-pointer text-sm transition flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Camera
                    <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
                 </label>
              </div>
              <div className="space-y-4 border-l-2 border-gray-700 pl-4 py-2 mt-2">
                 <Slider label="Image Scale" value={imageScale} onChange={(e) => setImageScale(Number(e.target.value))} min={0.1} max={3} step={0.05} unit="x" />
                 <Slider label="Image X Position" value={imagePosition.x} onChange={(e) => setImagePosition({ ...imagePosition, x: Number(e.target.value) })} min={0} max={100} step={1} unit="%" />
                 <Slider label="Image Y Position" value={imagePosition.y} onChange={(e) => setImagePosition({ ...imagePosition, y: Number(e.target.value) })} min={0} max={100} step={1} unit="%" />
                 <Slider label="Image Rotation" value={imageRotation} onChange={(e) => setImageRotation(Number(e.target.value))} min={-180} max={180} step={1} unit="°" />
              </div>
            </div>
            
            <InputField label="Main Text" value={mainText} onChange={(e) => setMainText(e.target.value)} placeholder="Your catchy title..." />
        </Section>
        
        <Section title="Layout & Theme" accentColor={frameColor} defaultOpen={true}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Template Style</label>
                <select
                  value={selectedTemplate.id}
                  onChange={(e) => {
                    const newTemplate = templates.find(t => t.id === e.target.value);
                    if (newTemplate) setSelectedTemplate(newTemplate);
                  }}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition"
                >
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>{template.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Frame Style</label>
                <select
                  value={selectedFrame.id}
                  onChange={(e) => {
                    const newFrame = frames.find(f => f.id === e.target.value);
                    if (newFrame) setSelectedFrame(newFrame);
                  }}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition"
                >
                  {frames.map(frame => (
                    <option key={frame.id} value={frame.id}>{frame.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <ColorPickerWithHex label="Frame & Accent Color" color={frameColor} setColor={setFrameColor} />
            <ColorPickerWithHex label="Main Text Color" color={mainTextColor} setColor={setMainTextColor} />
        </Section>

        {/* Advanced Controls Sections */}
        <Section title="Typography Advanced" accentColor={frameColor}>
            <div className="space-y-2 border-l-2 border-gray-700 pl-4 py-2">
                <Toggle label="Enable Text Stroke" enabled={showMainTextStroke} setEnabled={setShowMainTextStroke} />
                {showMainTextStroke && (
                    <div className="space-y-4 pt-2">
                        <ColorPickerWithHex label="Stroke Color" color={mainTextStrokeColor} setColor={setMainTextStrokeColor} />
                        <Slider label="Stroke Width" value={mainTextStrokeWidth} onChange={(e) => setMainTextStrokeWidth(Number(e.target.value))} min={1} max={20} step={1} unit="px" />
                    </div>
                )}
            </div>
             <div className="space-y-2 border-l-2 border-gray-700 pl-4 py-2">
                <Toggle label="Enable Text Shadow" enabled={showMainTextShadow} setEnabled={setShowMainTextShadow} />
                {showMainTextShadow && (
                    <div className="space-y-4 pt-2">
                        <ColorPickerWithHex label="Shadow Color" color={mainTextShadowColor} setColor={setMainTextShadowColor} />
                        <Slider label="Shadow Blur" value={mainTextShadowBlur} onChange={(e) => setMainTextShadowBlur(Number(e.target.value))} min={0} max={50} step={1} unit="px" />
                        <Slider label="Shadow X Offset" value={mainTextShadowOffsetX} onChange={(e) => setMainTextShadowOffsetX(Number(e.target.value))} min={-30} max={30} step={1} unit="px" />
                        <Slider label="Shadow Y Offset" value={mainTextShadowOffsetY} onChange={(e) => setMainTextShadowOffsetY(Number(e.target.value))} min={-30} max={30} step={1} unit="px" />
                    </div>
                )}
            </div>
            <hr className="border-gray-600"/>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Main Text Font</label>
              <select
                value={selectedMainTextFont.id}
                onChange={(e) => {
                  const newFont = fonts.find(f => f.id === e.target.value);
                  if (newFont) setSelectedMainTextFont(newFont);
                }}
                className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition"
              >
                {fonts.map(font => (
                  <option key={font.id} value={font.id}>{font.name}</option>
                ))}
              </select>
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Upload Custom Font (.ttf, .otf)</label>
              <input
                type="file"
                accept=".ttf,.otf,.woff,.woff2"
                onChange={handleFontFileChange}
                className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-600 file:text-white hover:file:bg-gray-500 cursor-pointer"
              />
            </div>
            <hr className="border-gray-600"/>
            <Slider label="Font Size" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} min={50} max={250} step={2} unit="px" />
            <Slider label="Text X Position" value={textPosition.x} onChange={(e) => setTextPosition({ ...textPosition, x: Number(e.target.value) })} min={0} max={100} step={1} unit="%" />
            <Slider label="Text Y Position" value={textPosition.y} onChange={(e) => setTextPosition({ ...textPosition, y: Number(e.target.value) })} min={0} max={100} step={1} unit="%" />
            <Slider label="Text Rotation" value={textRotation} onChange={(e) => setTextRotation(Number(e.target.value))} min={-45} max={45} step={1} unit="°" />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Text Alignment</label>
              <div className="flex gap-2">
                {(['left', 'center', 'right'] as const).map(align => (
                  <button key={align} onClick={() => setTextAlign(align)} className={`flex-1 capitalize text-sm py-2 px-3 rounded-md transition ${textAlign === align ? 'font-bold text-gray-900' : 'bg-gray-600 hover:bg-gray-500'}`} style={{ backgroundColor: textAlign === align ? frameColor : undefined }}>
                    {align}
                  </button>
                ))}
              </div>
            </div>
        </Section>
        
        <Section title="Header" accentColor={frameColor}>
             <Toggle label="Show Header" enabled={showHeader} setEnabled={setShowHeader} />
            {showHeader && (
                <div className="space-y-4 animate-fade-in">
                    <InputField label="Header Text" value={headerText} onChange={(e) => setHeaderText(e.target.value)} />
                    <ColorPickerWithHex label="Header Color" color={headerColor} setColor={setHeaderColor} />
                    <div className="space-y-2 border-l-2 border-gray-700 pl-4 py-2">
                        <Toggle label="Enable Header Stroke" enabled={showHeaderStroke} setEnabled={setShowHeaderStroke} />
                        {showHeaderStroke && (
                            <div className="space-y-4 pt-2">
                                <ColorPickerWithHex label="Header Stroke Color" color={headerStrokeColor} setColor={setHeaderStrokeColor} />
                                <Slider label="Header Stroke Width" value={headerStrokeWidth} onChange={(e) => setHeaderStrokeWidth(Number(e.target.value))} min={1} max={10} step={0.5} unit="px" />
                            </div>
                        )}
                    </div>
                    <div className="space-y-2 border-l-2 border-gray-700 pl-4 py-2">
                        <Toggle label="Enable Header Shadow" enabled={showHeaderShadow} setEnabled={setShowHeaderShadow} />
                        {showHeaderShadow && (
                            <div className="space-y-4 pt-2">
                                <ColorPickerWithHex label="Header Shadow Color" color={headerShadowColor} setColor={setHeaderShadowColor} />
                                <Slider label="Header Shadow Blur" value={headerShadowBlur} onChange={(e) => setHeaderShadowBlur(Number(e.target.value))} min={0} max={50} step={1} unit="px" />
                                <Slider label="Header Shadow X Offset" value={headerShadowOffsetX} onChange={(e) => setHeaderShadowOffsetX(Number(e.target.value))} min={-30} max={30} step={1} unit="px" />
                                <Slider label="Header Shadow Y Offset" value={headerShadowOffsetY} onChange={(e) => setHeaderShadowOffsetY(Number(e.target.value))} min={-30} max={30} step={1} unit="px" />
                            </div>
                        )}
                    </div>
                    <hr className="border-gray-600"/>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Header Font</label>
                      <select
                        value={selectedHeaderFont.id}
                        onChange={(e) => {
                          const newFont = fonts.find(f => f.id === e.target.value);
                          if (newFont) setSelectedHeaderFont(newFont);
                        }}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition"
                      >
                        {fonts.map(font => (
                          <option key={font.id} value={font.id}>{font.name}</option>
                        ))}
                      </select>
                    </div>
                    <Slider label="Header Font Size" value={headerFontSize} onChange={(e) => setHeaderFontSize(Number(e.target.value))} min={20} max={150} step={1} unit="px" />
                    <Slider label="Header X Position" value={headerPosition.x} onChange={(e) => setHeaderPosition({ ...headerPosition, x: Number(e.target.value) })} min={0} max={100} step={1} unit="%" />
                    <Slider label="Header Y Position" value={headerPosition.y} onChange={(e) => setHeaderPosition({ ...headerPosition, y: Number(e.target.value) })} min={0} max={100} step={1} unit="%" />
                    <Slider label="Header Rotation" value={headerRotation} onChange={(e) => setHeaderRotation(Number(e.target.value))} min={-45} max={45} step={1} unit="°" />
                </div>
            )}
        </Section>

        <Section title="Info Box / Backdrop" accentColor={frameColor}>
          <Toggle label="Show Info Box" enabled={showInfoBox} setEnabled={setShowInfoBox} />
          {showInfoBox && (
              <div className="space-y-4 animate-fade-in">
                  <Slider label="Box X Position" value={infoBoxPosition.x} onChange={(e) => setInfoBoxPosition({ ...infoBoxPosition, x: Number(e.target.value) })} min={0} max={100} step={1} unit="%" />
                  <Slider label="Box Y Position" value={infoBoxPosition.y} onChange={(e) => setInfoBoxPosition({ ...infoBoxPosition, y: Number(e.target.value) })} min={0} max={100} step={1} unit="%" />
                  <Slider label="Box Width" value={infoBoxSize.width} onChange={(e) => setInfoBoxSize({ ...infoBoxSize, width: Number(e.target.value) })} min={10} max={100} step={1} unit="%" />
                  <Slider label="Box Height" value={infoBoxSize.height} onChange={(e) => setInfoBoxSize({ ...infoBoxSize, height: Number(e.target.value) })} min={10} max={100} step={1} unit="%" />
              </div>
          )}
        </Section>
        
        <Section title="Effects & Lighting" accentColor={frameColor}>
            <Slider label="Lighting (Overlay)" value={overlayOpacity} onChange={(e) => setOverlayOpacity(Number(e.target.value))} min={0} max={1} step={0.05} unit="" />
            <Slider label="Glow Intensity" value={glowIntensity} onChange={(e) => setGlowIntensity(Number(e.target.value))} min={0} max={50} step={1} unit="px" />
            <Slider label="Vignette" value={vignetteIntensity} onChange={(e) => setVignetteIntensity(Number(e.target.value))} min={0} max={1} step={0.05} unit="" />
            <Slider label="Noise" value={noiseIntensity} onChange={(e) => setNoiseIntensity(Number(e.target.value))} min={0} max={1} step={0.05} unit="" />
            <Slider label="Chromatic Aberration" value={chromaticAberration} onChange={(e) => setChromaticAberration(Number(e.target.value))} min={0} max={20} step={1} unit="px" />
        </Section>

        <div className="border-t border-gray-700 pt-6 space-y-4">
           <h3 className="text-lg font-bold" style={{ color: frameColor }}>AI Title Generator</h3>
           <InputField label="Describe your video topic" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="e.g., Unboxing a new gaming controller" />
           <button onClick={onGenerateTitles} disabled={isLoading} className="w-full text-gray-900 font-bold py-2 px-4 rounded-md hover:opacity-90 transition-opacity disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center" style={{ backgroundColor: frameColor }}>
            {isLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="http://www.w3.org/2000/svg">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : null}
            {isLoading ? 'Generating...' : 'Generate Titles'}
           </button>
           {error && <p className="text-sm text-red-400">{error}</p>}
           {aiSuggestions.length > 0 && (
             <div className="space-y-2">
                <p className="text-sm text-gray-300">Suggestions (click to apply):</p>
                <div className="flex flex-wrap gap-2">
                  {aiSuggestions.map((s, i) => (
                    <button key={i} onClick={() => setMainText(s)} className="bg-gray-600 hover:bg-gray-500 text-white text-sm py-1 px-3 rounded-full transition">
                      {s}
                    </button>
                  ))}
                </div>
             </div>
           )}
        </div>
      </div>
      
      <div className="flex-none p-4 mt-2 bg-gray-900 border-t border-gray-800 space-y-3">
        <button onClick={onSaveToLibrary} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-md hover:bg-blue-500 transition-colors text-lg flex items-center justify-center gap-2">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          Save to Library
        </button>
        <button onClick={onDownload} className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-md hover:bg-green-500 transition-colors text-lg flex items-center justify-center gap-2">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          Download Thumbnail
        </button>
      </div>
    </div>
  );
};