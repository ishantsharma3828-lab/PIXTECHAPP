import React, { useState, useRef, useCallback, useEffect } from 'react';
import { EditorPanel } from './components/EditorPanel';
import { CanvasPreview } from './components/CanvasPreview';
import { WatermarkPanel } from './components/WatermarkPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { generateTitles } from './services/geminiService';
import { TEMPLATES, FRAMES, FONTS } from './constants';
import type { Template, Frame, Font, SavedThumbnail } from './types';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const App: React.FC = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [mainText, setMainText] = useState<string>('QUALITY IS NOT AN ACT, IT IS A HABIT.');
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(TEMPLATES[0]);
  const [selectedFrame, setSelectedFrame] = useState<Frame>(FRAMES[1]); // Changed default
  
  // Decoupled Color Controls
  const [frameColor, setFrameColor] = useState<string>('#FFFF00');
  const [mainTextColor, setMainTextColor] = useState<string>('#FFFFFF');
  const [headerColor, setHeaderColor] = useState<string>('#FFFF00');

  // Advanced Controls State
  const [textPosition, setTextPosition] = useState({ x: 50, y: 50 });
  const [fontSize, setFontSize] = useState<number>(100);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [textRotation, setTextRotation] = useState<number>(0);
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.7);
  const [glowIntensity, setGlowIntensity] = useState<number>(20);

  // Image Transformations
  const [imageScale, setImageScale] = useState<number>(1);
  const [imagePosition, setImagePosition] = useState({ x: 50, y: 50 });
  const [imageRotation, setImageRotation] = useState<number>(0);

  // New Effects State
  const [vignetteIntensity, setVignetteIntensity] = useState<number>(0.5);
  const [noiseIntensity, setNoiseIntensity] = useState<number>(0.1);
  const [chromaticAberration, setChromaticAberration] = useState<number>(5);

  // Font Controls State (Decoupled)
  const [selectedMainTextFont, setSelectedMainTextFont] = useState<Font>(FONTS[2]);
  const [selectedHeaderFont, setSelectedHeaderFont] = useState<Font>(FONTS[2]);
  const [customFonts, setCustomFonts] = useState<Font[]>([]);
  
  // Watermark State
  const [watermarkImage, setWatermarkImage] = useState<string | null>(null);
  const [watermarkText, setWatermarkText] = useState<string>('');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.5);
  const [watermarkScale, setWatermarkScale] = useState<number>(0.2);
  const [watermarkPosition, setWatermarkPosition] = useState({ x: 90, y: 90 });

  // Settings State 
  const [companyName, setCompanyName] = useState<string>('');
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);

  // Header Controls State
  const [headerText, setHeaderText] = useState<string>('REELS');
  const [showHeader, setShowHeader] = useState<boolean>(true);
  const [headerPosition, setHeaderPosition] = useState({ x: 50, y: 5 });
  const [headerFontSize, setHeaderFontSize] = useState<number>(70);
  const [headerRotation, setHeaderRotation] = useState<number>(0);

  // Stroke Controls State
  const [showMainTextStroke, setShowMainTextStroke] = useState<boolean>(false);
  const [mainTextStrokeColor, setMainTextStrokeColor] = useState<string>('#000000');
  const [mainTextStrokeWidth, setMainTextStrokeWidth] = useState<number>(4);
  const [showHeaderStroke, setShowHeaderStroke] = useState<boolean>(false);
  const [headerStrokeColor, setHeaderStrokeColor] = useState<string>('#000000');
  const [headerStrokeWidth, setHeaderStrokeWidth] = useState<number>(2);

  // Shadow Controls State
  const [showMainTextShadow, setShowMainTextShadow] = useState<boolean>(false);
  const [mainTextShadowColor, setMainTextShadowColor] = useState<string>('#000000');
  const [mainTextShadowBlur, setMainTextShadowBlur] = useState<number>(10);
  const [mainTextShadowOffsetX, setMainTextShadowOffsetX] = useState<number>(5);
  const [mainTextShadowOffsetY, setMainTextShadowOffsetY] = useState<number>(5);
  const [showHeaderShadow, setShowHeaderShadow] = useState<boolean>(false);
  const [headerShadowColor, setHeaderShadowColor] = useState<string>('#000000');
  const [headerShadowBlur, setHeaderShadowBlur] = useState<number>(5);
  const [headerShadowOffsetX, setHeaderShadowOffsetX] = useState<number>(2);
  const [headerShadowOffsetY, setHeaderShadowOffsetY] = useState<number>(2);

  // Info Box State
  const [showInfoBox, setShowInfoBox] = useState<boolean>(true);
  const [infoBoxPosition, setInfoBoxPosition] = useState({ x: 50, y: 50 });
  const [infoBoxSize, setInfoBoxSize] = useState({ width: 90, height: 30 });

  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'editor' | 'watermark' | 'settings' | 'library'>('editor');
  const [library, setLibrary] = useState<SavedThumbnail[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
     const saved = localStorage.getItem('thumbnailLibrary');
     if (saved) {
         try { setLibrary(JSON.parse(saved)); } catch (e) { console.error("Could not parse library", e); }
     } else {
         // Create a default example if library is empty
         const defaultExample: SavedThumbnail = {
            id: 'example-1',
            name: 'QUALITY IS NOT AN ACT',
            createdAt: Date.now(),
            previewImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', // Placeholder 1x1 black image, will be replaced when they save their own
            state: {
               mainText: 'QUALITY IS NOT AN ACT, IT IS A HABIT.',
               selectedTemplateId: TEMPLATES[0].id,
               selectedFrameId: FRAMES[1].id,
               frameColor: '#FFFF00',
               mainTextColor: '#FFFFFF',
               headerColor: '#FFFF00',
               textPosition: { x: 50, y: 50 },
               fontSize: 100,
               textAlign: 'center',
               textRotation: 0,
               overlayOpacity: 0.7,
               glowIntensity: 20,
               vignetteIntensity: 0.5,
               noiseIntensity: 0.1,
               chromaticAberration: 5,
               imageScale: 1,
               imagePosition: { x: 50, y: 50 },
               imageRotation: 0,
               selectedMainTextFontId: FONTS[2].id,
               selectedHeaderFontId: FONTS[2].id,
               headerText: 'REELS',
               showHeader: true,
               headerPosition: { x: 50, y: 5 },
               headerFontSize: 70,
               headerRotation: 0,
               watermarkPosition: { x: 90, y: 90 },
               watermarkScale: 0.2,
               watermarkOpacity: 0.5
            }
         };
         setLibrary([defaultExample]);
     }

     const storedSettings = localStorage.getItem('appSettings');
     if (storedSettings) {
         try {
             const parsed = JSON.parse(storedSettings);
             setCompanyName(parsed.companyName || '');
             setCompanyLogo(parsed.companyLogo || null);
         } catch (e) {}
     }
  }, []);

  const updateCompanyName = (name: string) => {
     setCompanyName(name);
     localStorage.setItem('appSettings', JSON.stringify({ companyName: name, companyLogo }));
  };

  const updateCompanyLogo = (logo: string | null) => {
     setCompanyLogo(logo);
     localStorage.setItem('appSettings', JSON.stringify({ companyName, companyLogo: logo }));
  };

  const saveToLibrary = () => {
       if (canvasRef.current) {
          const previewImage = canvasRef.current.toDataURL('image/jpeg', 0.5);
          const state = {
             uploadedImage,
             mainText,
             selectedTemplateId: selectedTemplate.id,
             selectedFrameId: selectedFrame.id,
             frameColor,
             mainTextColor,
             headerColor,
             textPosition,
             fontSize,
             textAlign,
             textRotation,
             overlayOpacity,
             glowIntensity,
             vignetteIntensity,
             noiseIntensity,
             chromaticAberration,
             imageScale,
             imagePosition,
             imageRotation,
             selectedMainTextFontId: selectedMainTextFont.id,
             selectedHeaderFontId: selectedHeaderFont.id,
             headerText,
             showHeader,
             headerPosition,
             headerFontSize,
             headerRotation,
             showMainTextStroke,
             mainTextStrokeColor,
             mainTextStrokeWidth,
             showHeaderStroke,
             headerStrokeColor,
             headerStrokeWidth,
             showMainTextShadow,
             mainTextShadowColor,
             mainTextShadowBlur,
             mainTextShadowOffsetX,
             mainTextShadowOffsetY,
             showHeaderShadow,
             headerShadowColor,
             headerShadowBlur,
             headerShadowOffsetX,
             headerShadowOffsetY,
             showInfoBox,
             infoBoxPosition,
             infoBoxSize,
             watermarkImage,
             watermarkText,
             watermarkOpacity,
             watermarkScale,
             watermarkPosition
          };
          const newThumb: SavedThumbnail = {
             id: Date.now().toString(),
             name: mainText || 'Untitled',
             createdAt: Date.now(),
             previewImage,
             state
          };
          const newLibrary = [newThumb, ...library];
          setLibrary(newLibrary);
          localStorage.setItem('thumbnailLibrary', JSON.stringify(newLibrary));
          setActiveTab('library');
       }
    };

    const loadFromLibrary = (thumb: SavedThumbnail) => {
       const state = thumb.state;
       setUploadedImage(state.uploadedImage);
       setMainText(state.mainText);
       const tmpl = TEMPLATES.find(t => t.id === state.selectedTemplateId) || TEMPLATES[0];
       setSelectedTemplate(tmpl);
       const frm = FRAMES.find(f => f.id === state.selectedFrameId) || FRAMES[0];
       setSelectedFrame(frm);
       
       setFrameColor(state.frameColor);
       setMainTextColor(state.mainTextColor);
       setHeaderColor(state.headerColor);
       setTextPosition(state.textPosition);
       setFontSize(state.fontSize);
       setTextAlign(state.textAlign);
       setTextRotation(state.textRotation);
       setOverlayOpacity(state.overlayOpacity);
       setGlowIntensity(state.glowIntensity);
       
       setVignetteIntensity(state.vignetteIntensity);
       setNoiseIntensity(state.noiseIntensity);
       setChromaticAberration(state.chromaticAberration);
       
       setImageScale(state.imageScale || 1);
       setImagePosition(state.imagePosition || {x:50, y:50});
       setImageRotation(state.imageRotation || 0);
       
       const mFont = [...FONTS, ...customFonts].find(f => f.id === state.selectedMainTextFontId) || FONTS[2];
       setSelectedMainTextFont(mFont);
       const hFont = [...FONTS, ...customFonts].find(f => f.id === state.selectedHeaderFontId) || FONTS[2];
       setSelectedHeaderFont(hFont);
       
       setHeaderText(state.headerText);
       setShowHeader(state.showHeader);
       setHeaderPosition(state.headerPosition);
       setHeaderFontSize(state.headerFontSize);
       setHeaderRotation(state.headerRotation);
       
       setShowMainTextStroke(state.showMainTextStroke);
       setMainTextStrokeColor(state.mainTextStrokeColor);
       setMainTextStrokeWidth(state.mainTextStrokeWidth);
       setShowHeaderStroke(state.showHeaderStroke);
       setHeaderStrokeColor(state.headerStrokeColor);
       setHeaderStrokeWidth(state.headerStrokeWidth);
       
       setShowMainTextShadow(state.showMainTextShadow);
       setMainTextShadowColor(state.mainTextShadowColor);
       setMainTextShadowBlur(state.mainTextShadowBlur);
       setMainTextShadowOffsetX(state.mainTextShadowOffsetX);
       setMainTextShadowOffsetY(state.mainTextShadowOffsetY);
       
       setShowHeaderShadow(state.showHeaderShadow);
       setHeaderShadowColor(state.headerShadowColor);
       setHeaderShadowBlur(state.headerShadowBlur);
       setHeaderShadowOffsetX(state.headerShadowOffsetX);
       setHeaderShadowOffsetY(state.headerShadowOffsetY);
       
       setShowInfoBox(state.showInfoBox);
       setInfoBoxPosition(state.infoBoxPosition);
       setInfoBoxSize(state.infoBoxSize);
       
       setWatermarkImage(state.watermarkImage || null);
       setWatermarkText(state.watermarkText || '');
       setWatermarkOpacity(state.watermarkOpacity ?? 0.5);
       setWatermarkScale(state.watermarkScale ?? 0.2);
       setWatermarkPosition(state.watermarkPosition ?? {x: 90, y: 90});
       
       setActiveTab('editor');
    };
    
    const deleteFromLibrary = (id: string, e: React.MouseEvent) => {
       e.stopPropagation();
       const newLib = library.filter(t => t.id !== id);
       setLibrary(newLib);
       localStorage.setItem('thumbnailLibrary', JSON.stringify(newLib));
    };

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFontUpload = async (file: File) => {
    const fontName = file.name.split('.')[0];
    const newFont = new FontFace(fontName, await file.arrayBuffer());
    await newFont.load();
    document.fonts.add(newFont);

    const fontData = { id: fontName, name: fontName };
    setCustomFonts(prev => [...prev, fontData]);
    setSelectedMainTextFont(fontData);
  };

  const handleGenerateTitles = useCallback(async () => {
    if (!aiPrompt) {
      setError('Please enter a topic to generate titles.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setAiSuggestions([]);
    try {
      const titles = await generateTitles(aiPrompt);
      setAiSuggestions(titles);
      if (titles.length > 0) {
        setMainText(titles[0]);
      }
    } catch (err) {
      console.error("Failed to generate titles:", err);
      setError('Could not generate titles. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [aiPrompt]);

  const handleDownload = async () => {
    if (canvasRef.current) {
      const base64Data = canvasRef.current.toDataURL('image/png', 1.0);
      
      if (Capacitor.isNativePlatform()) {
        try {
          const fileName = `instareel-${Date.now()}.png`;
          // Save file to the cache directory first
          const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache,
          });

          // Share the saved image (which prompts to save to gallery, send to chat, etc.)
          await Share.share({
            title: 'InstaReel Thumbnail',
            text: 'Share or save your new thumbnail!',
            url: savedFile.uri,
            dialogTitle: 'Save Thumbnail',
          });
        } catch (err) {
          console.error("Failed to save or share on Android", err);
        }
      } else {
        // Browser fallback
        const link = document.createElement('a');
        link.download = `instareel-${Date.now()}.png`;
        link.href = base64Data;
        link.click();
      }
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-950 text-white overflow-hidden">
      {/* Top Header & Navigation */}
      <header className="bg-gray-900 border-b border-gray-800 p-3 md:p-4 flex-shrink-0 z-10 flex justify-between items-center shadow-lg">
        <div>
           <h1 className="text-lg md:text-2xl font-bold tracking-tight" style={{ color: frameColor }}>InstaReel Pro</h1>
        </div>
        <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700">
            <button onClick={() => setActiveTab('editor')} className={`px-4 py-1.5 md:py-1 text-sm rounded transition-colors ${activeTab === 'editor' ? 'bg-yellow-500 text-gray-900 font-bold' : 'text-gray-300 hover:text-white'}`}>Editor</button>
            <button onClick={() => setActiveTab('library')} className={`px-4 py-1.5 md:py-1 text-sm rounded transition-colors ${activeTab === 'library' ? 'bg-yellow-500 text-gray-900 font-bold' : 'text-gray-300 hover:text-white'}`}>Library</button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Canvas / Preview Area - Sticky on mobile in editor mode, visible on Desktop */}
        <main className={`flex-shrink-0 md:flex-1 h-[40vh] md:h-auto flex flex-col items-center justify-center p-2 md:p-4 bg-gray-950/80 transition-all ${activeTab === 'library' ? 'hidden md:flex opacity-30 pointer-events-none filter blur-sm' : 'flex'} relative overflow-hidden`}>
           <div className="w-full h-full flex items-center justify-center max-h-full">
             <CanvasPreview

               canvasRef={canvasRef}
               imageSrc={uploadedImage}
               mainText={mainText}
               templateId={selectedTemplate.id}
               frameId={selectedFrame.id}
               
               frameColor={frameColor}
               mainTextColor={mainTextColor}
               headerColor={headerColor}

               textPosition={textPosition}
               fontSize={fontSize}
               textAlign={textAlign}
               textRotation={textRotation}
               overlayOpacity={overlayOpacity}
               glowIntensity={glowIntensity}
               mainTextFontFamily={selectedMainTextFont.id}
               headerFontFamily={selectedHeaderFont.id}

               vignetteIntensity={vignetteIntensity}
               noiseIntensity={noiseIntensity}
               chromaticAberration={chromaticAberration}
               
               imageScale={imageScale}
               imagePosition={imagePosition}
               imageRotation={imageRotation}

               watermarkImage={watermarkImage}
               watermarkText={watermarkText}
               watermarkOpacity={watermarkOpacity}
               watermarkScale={watermarkScale}
               watermarkPosition={watermarkPosition}

               headerText={headerText}
               showHeader={showHeader}
               headerPosition={headerPosition}
               headerFontSize={headerFontSize}
               headerRotation={headerRotation}

               showMainTextStroke={showMainTextStroke}
               mainTextStrokeColor={mainTextStrokeColor}
               mainTextStrokeWidth={mainTextStrokeWidth}
               showHeaderStroke={showHeaderStroke}
               headerStrokeColor={headerStrokeColor}
               headerStrokeWidth={headerStrokeWidth}
               
               showMainTextShadow={showMainTextShadow}
               mainTextShadowColor={mainTextShadowColor}
               mainTextShadowBlur={mainTextShadowBlur}
               mainTextShadowOffsetX={mainTextShadowOffsetX}
               mainTextShadowOffsetY={mainTextShadowOffsetY}
               showHeaderShadow={showHeaderShadow}
               headerShadowColor={headerShadowColor}
               headerShadowBlur={headerShadowBlur}
               headerShadowOffsetX={headerShadowOffsetX}
               headerShadowOffsetY={headerShadowOffsetY}

               showInfoBox={showInfoBox}
               infoBoxPosition={infoBoxPosition}
               infoBoxSize={infoBoxSize}
             />
           </div>
        </main>

        {/* Right Sidebar / Bottom Panel for Editor Control */}
        <aside className={`w-full md:w-96 lg:w-[450px] bg-gray-900 border-t md:border-t-0 md:border-l border-gray-800 shadow-2xl flex flex-col overflow-hidden transition-transform ${['editor', 'watermark', 'settings'].includes(activeTab) ? 'flex-1 md:flex-none' : 'hidden'}`}>
           <div className="flex-1 flex flex-col h-full w-full">
              {activeTab === 'editor' && (
                <EditorPanel
                  onImageUpload={handleImageUpload}
                  mainText={mainText}
                  setMainText={setMainText}
                  templates={TEMPLATES}
                  selectedTemplate={selectedTemplate}
                  setSelectedTemplate={setSelectedTemplate}
                  frames={FRAMES}
                  selectedFrame={selectedFrame}
                  setSelectedFrame={setSelectedFrame}
                  
                  frameColor={frameColor}
                  setFrameColor={setFrameColor}
                  mainTextColor={mainTextColor}
                  setMainTextColor={setMainTextColor}
                  headerColor={headerColor}
                  setHeaderColor={setHeaderColor}
                  
                  textPosition={textPosition}
                  setTextPosition={setTextPosition}
                  fontSize={fontSize}
                  setFontSize={setFontSize}
                  textAlign={textAlign}
                  setTextAlign={setTextAlign}
                  textRotation={textRotation}
                  setTextRotation={setTextRotation}
                  overlayOpacity={overlayOpacity}
                  setOverlayOpacity={setOverlayOpacity}
                  glowIntensity={glowIntensity}
                  setGlowIntensity={setGlowIntensity}
  
                  vignetteIntensity={vignetteIntensity}
                  setVignetteIntensity={setVignetteIntensity}
                  noiseIntensity={noiseIntensity}
                  setNoiseIntensity={setNoiseIntensity}
                  chromaticAberration={chromaticAberration}
                  setChromaticAberration={setChromaticAberration}
                  
                  imageScale={imageScale}
                  setImageScale={setImageScale}
                  imagePosition={imagePosition}
                  setImagePosition={setImagePosition}
                  imageRotation={imageRotation}
                  setImageRotation={setImageRotation}
  
                  fonts={[...FONTS, ...customFonts]}
                  selectedMainTextFont={selectedMainTextFont}
                  setSelectedMainTextFont={setSelectedMainTextFont}
                  selectedHeaderFont={selectedHeaderFont}
                  setSelectedHeaderFont={setSelectedHeaderFont}
                  onFontUpload={handleFontUpload}
  
                  headerText={headerText}
                  setHeaderText={setHeaderText}
                  showHeader={showHeader}
                  setShowHeader={setShowHeader}
                  headerPosition={headerPosition}
                  setHeaderPosition={setHeaderPosition}
                  headerFontSize={headerFontSize}
                  setHeaderFontSize={setHeaderFontSize}
                  headerRotation={headerRotation}
                  setHeaderRotation={setHeaderRotation}
                  
                  showMainTextStroke={showMainTextStroke}
                  setShowMainTextStroke={setShowMainTextStroke}
                  mainTextStrokeColor={mainTextStrokeColor}
                  setMainTextStrokeColor={setMainTextStrokeColor}
                  mainTextStrokeWidth={mainTextStrokeWidth}
                  setMainTextStrokeWidth={setMainTextStrokeWidth}
                  showHeaderStroke={showHeaderStroke}
                  setShowHeaderStroke={setShowHeaderStroke}
                  headerStrokeColor={headerStrokeColor}
                  setHeaderStrokeColor={setHeaderStrokeColor}
                  headerStrokeWidth={headerStrokeWidth}
                  setHeaderStrokeWidth={setHeaderStrokeWidth}
  
                  showMainTextShadow={showMainTextShadow}
                  setShowMainTextShadow={setShowMainTextShadow}
                  mainTextShadowColor={mainTextShadowColor}
                  setMainTextShadowColor={setMainTextShadowColor}
                  mainTextShadowBlur={mainTextShadowBlur}
                  setMainTextShadowBlur={setMainTextShadowBlur}
                  mainTextShadowOffsetX={mainTextShadowOffsetX}
                  setMainTextShadowOffsetX={setMainTextShadowOffsetX}
                  mainTextShadowOffsetY={mainTextShadowOffsetY}
                  setMainTextShadowOffsetY={setMainTextShadowOffsetY}
                  showHeaderShadow={showHeaderShadow}
                  setShowHeaderShadow={setShowHeaderShadow}
                  headerShadowColor={headerShadowColor}
                  setHeaderShadowColor={setHeaderShadowColor}
                  headerShadowBlur={headerShadowBlur}
                  setHeaderShadowBlur={setHeaderShadowBlur}
                  headerShadowOffsetX={headerShadowOffsetX}
                  setHeaderShadowOffsetX={setHeaderShadowOffsetX}
                  headerShadowOffsetY={headerShadowOffsetY}
                  setHeaderShadowOffsetY={setHeaderShadowOffsetY}
                  
                  showInfoBox={showInfoBox}
                  setShowInfoBox={setShowInfoBox}
                  infoBoxPosition={infoBoxPosition}
                  setInfoBoxPosition={setInfoBoxPosition}
                  infoBoxSize={infoBoxSize}
                  setInfoBoxSize={setInfoBoxSize}
  
                  aiPrompt={aiPrompt}
                  setAiPrompt={setAiPrompt}
                  onGenerateTitles={handleGenerateTitles}
                  aiSuggestions={aiSuggestions}
                  isLoading={isLoading}
                  error={error}
                  onDownload={handleDownload}
                  onSaveToLibrary={saveToLibrary}
                />
              )}
              {activeTab === 'watermark' && (
                <WatermarkPanel 
                  watermarkImage={watermarkImage}
                  setWatermarkImage={setWatermarkImage}
                  watermarkText={watermarkText}
                  setWatermarkText={setWatermarkText}
                  watermarkOpacity={watermarkOpacity}
                  setWatermarkOpacity={setWatermarkOpacity}
                  watermarkScale={watermarkScale}
                  setWatermarkScale={setWatermarkScale}
                  watermarkPosition={watermarkPosition}
                  setWatermarkPosition={setWatermarkPosition}
                  companyLogo={companyLogo}
                />
              )}
              {activeTab === 'settings' && (
                <SettingsPanel 
                  companyName={companyName}
                  setCompanyName={updateCompanyName}
                  companyLogo={companyLogo}
                  setCompanyLogo={updateCompanyLogo}
                />
              )}
           </div>
        </aside>

        {/* Library Menu Overlay/Sidebar */}
        <aside className={`w-full bg-gray-900 flex flex-col transition-all duration-300 ${activeTab === 'library' ? 'absolute inset-0 z-20 md:static md:w-[450px] md:border-l border-gray-800' : 'hidden'}`}>
           <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 custom-scrollbar">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white border-b-2 border-yellow-500 pb-2 inline-block">Saved Designs</h2>
                <button onClick={() => setActiveTab('editor')} className="md:hidden p-2 text-gray-400 hover:text-white">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                </button>
              </div>
              
              {library.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-400">Your library is empty.<br/>Create a thumbnail and save it here.</p>
                 </div>
              ) : (
                 <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                    {library.map((thumb) => (
                       <div key={thumb.id} onClick={() => loadFromLibrary(thumb)} className="group relative rounded-lg overflow-hidden border border-gray-700 hover:border-yellow-500 transition cursor-pointer bg-gray-800 shadow-lg">
                          <img src={thumb.previewImage} alt={thumb.name} className="w-full aspect-[9/16] object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent opacity-90 transition-opacity"></div>
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                             <p className="text-sm font-bold text-white truncate drop-shadow-md">{thumb.name}</p>
                             <p className="text-xs text-gray-400">{new Date(thumb.createdAt).toLocaleDateString()}</p>
                          </div>
                          <button onClick={(e) => deleteFromLibrary(thumb.id, e)} className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-500 text-white p-1.5 rounded-full opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                             </svg>
                          </button>
                       </div>
                    ))}
                 </div>
              )}
           </div>
           
           <div className="p-4 border-t border-gray-800 bg-gray-900 md:hidden">
              <button onClick={() => setActiveTab('editor')} className="w-full bg-gray-700 text-white font-bold py-3 px-4 rounded-md hover:bg-gray-600 transition-colors">
                 Close Library
              </button>
           </div>
        </aside>
      </div>

      {/* Mobile Bottom Navigation Context */}
      <nav className="md:hidden flex-none bg-gray-900 border-t border-gray-800 flex justify-between items-center px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] relative z-[60]">
         {[
           { id: 'editor', label: 'Editor', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg> },
           { id: 'watermark', label: 'Watermark', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg> },
           { id: 'settings', label: 'Settings', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
           { id: 'library', label: 'Library', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> }
         ].map(tab => (
           <button 
             key={tab.id}
             onClick={() => setActiveTab(tab.id as typeof activeTab)}
             className={`flex flex-col items-center justify-center w-full px-2 py-1 transition-colors ${activeTab === tab.id ? 'text-yellow-500' : 'text-gray-400 hover:text-white'}`}
           >
             {tab.icon}
             <span className="text-[10px] uppercase font-bold tracking-wider">{tab.label}</span>
           </button>
         ))}
      </nav>
    </div>
  );
};

export default App;
