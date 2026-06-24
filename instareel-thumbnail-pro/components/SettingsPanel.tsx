import React from 'react';
import { InputField, Section } from './EditorPanel';

interface Props {
  companyName: string;
  setCompanyName: (val: string) => void;
  companyLogo: string | null;
  setCompanyLogo: (val: string | null) => void;
}

export const SettingsPanel: React.FC<Props> = (props) => {
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => props.setCompanyLogo(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6 custom-scrollbar">
        <div>
          <h2 className="text-xl font-bold border-b-2 pb-2 mb-2 border-blue-500/30 text-white">App & Brand Settings</h2>
        </div>
        <Section title="Brand Identity (Global)" accentColor="#3B82F6" defaultOpen={true}>
          <InputField 
             label="Brand / Company Name" 
             value={props.companyName} 
             onChange={(e) => props.setCompanyName(e.target.value)} 
             placeholder="Enter your brand name..." 
          />
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-300 mb-1">Global Brand Logo</label>
            {props.companyLogo && (
              <div className="mb-2 w-32 h-32 relative rounded border border-gray-600 overflow-hidden bg-gray-800 flex items-center justify-center">
                <img src={props.companyLogo} alt="Company Logo" className="max-w-full max-h-full object-contain" />
              </div>
            )}
            <div className="flex gap-2">
              <label className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-md text-center cursor-pointer text-sm transition">
                Upload Logo
                <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
              </label>
              <label className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-md text-center cursor-pointer text-sm transition flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Camera
                <input type="file" accept="image/*" capture="environment" onChange={handleLogoChange} className="hidden" />
              </label>
            </div>
            {props.companyLogo && (
              <button 
                 onClick={() => props.setCompanyLogo(null)} 
                 className="w-full mt-2 bg-red-600/80 hover:bg-red-500 text-white py-1.5 rounded-md text-sm"
              >
                 Remove Logo
              </button>
            )}
            <p className="text-xs text-gray-500 mt-2">
               Your primary brand logo and details will be saved globally and can be applied as watermarks in the Watermark tab.
            </p>
          </div>
        </Section>
      </div>
    </div>
  );
};
