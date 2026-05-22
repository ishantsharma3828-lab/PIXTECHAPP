
import React, { useState, useContext } from 'react';
import { SettingsContext } from '../../contexts/SettingsContext';
import { DashboardBanner } from '../../constants/defaultSettings';

const BannerSettings: React.FC = () => {
    const { settings, setSettings, t } = useContext(SettingsContext);
    const [banners, setBanners] = useState<DashboardBanner[]>(settings.dashboardBanners || []);

    const handleChange = (index: number, field: keyof DashboardBanner, value: string) => {
        const newBanners = [...banners];
        newBanners[index] = { ...newBanners[index], [field]: value };
        setBanners(newBanners);
    };

    const handleSave = () => {
        setSettings({ ...settings, dashboardBanners: banners });
        alert(t('settings.saved_success') || "Settings Saved");
    };

    const addBanner = () => {
        setBanners([...banners, { title: 'New Banner', subtitle: 'Subtitle', image: '', path: '', color: 'from-gray-500 to-gray-700' }]);
    };

    const removeBanner = (index: number) => {
        const newBanners = banners.filter((_, i) => i !== index);
        setBanners(newBanners);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Dashboard Banners</h3>
                <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700">
                    Save Changes
                </button>
            </div>

            <div className="grid gap-6">
                {banners.map((banner, index) => (
                    <div key={index} className="bg-slate-50 dark:bg-gray-800 p-4 rounded-lg border border-slate-200 dark:border-zinc-800 relative">
                        <button onClick={() => removeBanner(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Title</label>
                                <input
                                    type="text"
                                    value={banner.title}
                                    onChange={(e) => handleChange(index, 'title', e.target.value)}
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Subtitle</label>
                                <input
                                    type="text"
                                    value={banner.subtitle}
                                    onChange={(e) => handleChange(index, 'subtitle', e.target.value)}
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Image URL</label>
                                <input
                                    type="text"
                                    value={banner.image}
                                    onChange={(e) => handleChange(index, 'image', e.target.value)}
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Link Path</label>
                                <input
                                    type="text"
                                    value={banner.path}
                                    onChange={(e) => handleChange(index, 'path', e.target.value)}
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    placeholder="/inventory"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-500 mb-1">Gradient Colors (Tailwind)</label>
                                <input
                                    type="text"
                                    value={banner.color}
                                    onChange={(e) => handleChange(index, 'color', e.target.value)}
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    placeholder="from-blue-500 to-purple-500"
                                />
                            </div>
                        </div>
                        {banner.image && (
                            <div className="mt-4 h-24 rounded-lg overflow-hidden relative">
                                <img src={banner.image} className="w-full h-full object-cover" />
                                <div className={`absolute inset-0 bg-gradient-to-t ${banner.color} opacity-40 mix-blend-overlay`}></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <h4 className="text-white text-xl font-bold shadow-black drop-shadow-lg">{banner.title}</h4>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <button onClick={addBanner} className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-gray-600 rounded-lg text-slate-500 hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] font-bold transition-colors">
                + Add New Banner
            </button>
        </div>
    );
};

export default BannerSettings;
