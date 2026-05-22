import React, { useContext, useState } from 'react';
import { SettingsContext } from '../../contexts/SettingsContext';
import { ProductField } from '../../constants/inventoryFields';

const FieldManager: React.FC = () => {
    const { settings, setSettings } = useContext(SettingsContext);
    const [newFieldLabel, setNewFieldLabel] = useState('');
    const [newFieldType, setNewFieldType] = useState<ProductField['type']>('text');
    const [editingField, setEditingField] = useState<ProductField | null>(null);
    const [fieldToDelete, setFieldToDelete] = useState<ProductField | null>(null);

    const handleVisibilityToggle = (key: string) => {
        const updatedFields = settings.productFields.map(field =>
            field.key === key ? { ...field, isVisible: !field.isVisible } : field
        );
        setSettings({ ...settings, productFields: updatedFields });
    };

    const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (editingField) {
            setEditingField({ ...editingField, label: e.target.value });
        }
    }

    const saveLabelChange = () => {
        if (editingField) {
             const updatedFields = settings.productFields.map(field =>
                field.key === editingField.key ? editingField : field
            );
            setSettings({ ...settings, productFields: updatedFields });
            setEditingField(null);
        }
    }

    const handleAddNewField = () => {
        if (!newFieldLabel.trim()) return;

        const newFieldKey = newFieldLabel.trim().toLowerCase().replace(/\s+/g, '_');
        if (settings.productFields.some(f => f.key === newFieldKey)) {
            alert('A field with this key already exists.');
            return;
        }

        const newField: ProductField = {
            key: newFieldKey,
            label: newFieldLabel.trim(),
            type: newFieldType,
            isCore: false,
            isVisible: true,
        };
        
        setSettings({ ...settings, productFields: [...settings.productFields, newField]});
        setNewFieldLabel('');
        setNewFieldType('text');
    };
    
    const executeDelete = () => {
        if (!fieldToDelete) return;
        const updatedFields = settings.productFields.filter(field => field.key !== fieldToDelete.key);
        setSettings({ ...settings, productFields: updatedFields });
        setFieldToDelete(null);
    };

    const cancelDelete = () => {
        setFieldToDelete(null);
    };
    
    const renderDeleteConfirmation = () => {
        if (!fieldToDelete) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full border dark:border-zinc-800">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirm Deletion</h3>
                    <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
                        Are you sure you want to delete the field "<strong>{fieldToDelete.label}</strong>"? This action cannot be undone.
                    </p>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button 
                            onClick={cancelDelete}
                            className="px-4 py-2 bg-slate-200 dark:bg-gray-600 text-slate-800 dark:text-gray-200 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={executeDelete}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-gray-400">
                Manage the fields for your products. Hidden fields will not appear as columns in the inventory list view.
            </p>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {settings.productFields.map(field => (
                    <div key={field.key} className="flex items-center gap-4 p-2 bg-slate-50 dark:bg-gray-700/50 rounded-md">
                        <label className="flex items-center space-x-2 cursor-pointer flex-shrink-0">
                            <input
                                type="checkbox"
                                checked={field.isVisible}
                                onChange={() => handleVisibilityToggle(field.key)}
                                className="h-4 w-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-secondary)]"
                            />
                            <span className="text-slate-700 dark:text-gray-300">Show</span>
                        </label>
                        
                        <div className="flex-1 min-w-0">
                            {editingField?.key === field.key ? (
                                <input 
                                    type="text"
                                    value={editingField.label}
                                    onChange={handleLabelChange}
                                    onBlur={saveLabelChange}
                                    onKeyDown={(e) => e.key === 'Enter' && saveLabelChange()}
                                    className="form-input text-sm py-1 w-full"
                                    autoFocus
                                />
                            ) : (
                                <p className="font-medium text-slate-800 dark:text-gray-200 truncate" title={field.label}>
                                    {field.label}
                                </p>
                            )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-gray-400 bg-slate-200 dark:bg-gray-600 px-2 py-1 rounded-full capitalize">{field.type}</span>
                            <button onClick={() => setEditingField(field)} disabled={field.isVirtual} className="p-1 hover:bg-slate-200 dark:hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
                            </button>
                            {!field.isCore && (
                                <button onClick={() => setFieldToDelete(field)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200 dark:border-zinc-800">
                <input
                    type="text"
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    placeholder="New field label (e.g., 'Serial Number')"
                    className="form-input flex-grow min-w-[200px]"
                />
                 <select
                    value={newFieldType}
                    onChange={(e) => setNewFieldType(e.target.value as ProductField['type'])}
                    className="form-select flex-shrink-0"
                >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="longtext">Long Text</option>
                    <option value="boolean">Yes/No</option>
                </select>
                <button
                    onClick={handleAddNewField}
                    className="px-4 py-2 bg-slate-200 dark:bg-gray-600 rounded-md font-semibold hover:bg-slate-300 dark:hover:bg-slate-500"
                >
                    Add Custom Field
                </button>
            </div>
            {renderDeleteConfirmation()}
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.2s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default FieldManager;