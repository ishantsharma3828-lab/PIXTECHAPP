import React from 'react';
import { Slider, InputField, Section } from './EditorPanel';

interface Props {
  watermarkImage: string | null;
  setWatermarkImage: (val: string | null) => void;
  watermarkText: string;
  setWatermarkText: (val: string) => void;
  watermarkOpacity: number;
  setWatermarkOpacity: (val: number) => void;
  watermarkScale: number;
  setWatermarkScale: (val: number) => void;
  watermarkPosition: { x: number; y: number };
  setWatermarkPosition: (val: { x: number; y: number }) => void;
  companyLogo: string | null;
}

export const WatermarkPanel: React.FC<Props> = (props) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => props.setWatermarkImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6 custom-scrollbar">
        <div>
          <h2 className="text-xl font-bold border-b-2 pb-2 mb-2 border-green-500/30 text-white">Watermark Overlay</h2>
        </div>
        <Section title="Media & Overlays" accentColor="#10B981" defaultOpen={true}>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Watermark / Logo Art</label>
            <div className="flex gap-2 mb-2">
              <label className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-semibold py-2 px-4 rounded-md text-center cursor-pointer text-sm transition">
                Upload Custom
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
              {props.companyLogo && (
                <button 
                  onClick={() => props.setWatermarkImage(props.companyLogo)} 
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-md text-center text-sm transition"
                >
                  Apply Brand Logo
                </button>
              )}
            </div>
            {props.watermarkImage && (
              <button 
                onClick={() => props.setWatermarkImage(null)} 
                className="w-full mb-4 bg-red-600/80 hover:bg-red-500 text-white py-1.5 rounded-md text-sm transition"
              >
                Remove Watermark Image
              </button>
            )}
            
            <InputField 
               label="Or Add Watermark Text" 
               value={props.watermarkText} 
               onChange={(e) => props.setWatermarkText(e.target.value)} 
               placeholder="e.g. @MyBrand" 
            />
          </div>
          <div className="space-y-4 border-l-2 border-gray-700 pl-4 py-2 mt-4 mt-2">
            <Slider label="Opacity" value={props.watermarkOpacity} onChange={(e) => props.setWatermarkOpacity(Number(e.target.value))} min={0} max={1} step={0.05} unit="" />
            <Slider label="Scale" value={props.watermarkScale} onChange={(e) => props.setWatermarkScale(Number(e.target.value))} min={0.02} max={1} step={0.02} unit="x" />
            <Slider label="X Position" value={props.watermarkPosition.x} onChange={(e) => props.setWatermarkPosition({ ...props.watermarkPosition, x: Number(e.target.value) })} min={0} max={100} step={1} unit="%" />
            <Slider label="Y Position" value={props.watermarkPosition.y} onChange={(e) => props.setWatermarkPosition({ ...props.watermarkPosition, y: Number(e.target.value) })} min={0} max={100} step={1} unit="%" />
          </div>
        </Section>
      </div>
    </div>
  );
};
