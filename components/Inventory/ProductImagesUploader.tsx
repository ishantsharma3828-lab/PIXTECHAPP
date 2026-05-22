import React, { useEffect, useRef, useState, useCallback } from "react";
import * as imageService from "../../services/imageService";

interface ImageHandle {
    id: string;
    url: string;
}

interface ProductImagesUploaderProps {
    productId: string;
    initialImages: ImageHandle[];
    onChange: (images: ImageHandle[]) => void;
}

const ProductImagesUploader: React.FC<ProductImagesUploaderProps> = ({ productId, initialImages, onChange }) => {
  const [images, setImages] = useState<ImageHandle[]>(initialImages);
  const [isDragging, setIsDragging] = useState(false);
  const dropRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setImages(initialImages);
  }, [initialImages]);

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = Array.from(e.clipboardData.items);
      const blobs = items
        .filter(it => it.type.startsWith("image"))
        .map(it => it.getAsFile())
        .filter(Boolean) as File[];

      if (blobs.length > 0) {
        handleBlobs(blobs);
      }
  }, [images, productId]);

  useEffect(() => {
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  const handleBlobs = async (blobs: Blob[]) => {
      if (images.length + blobs.length > 5) {
          alert("You can upload a maximum of 5 images.");
          return;
      }
      const saved = await imageService.saveMultiple(productId, blobs);
      const newImages = [...images, ...saved];
      setImages(newImages);
      onChange?.(newImages);
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const blobs = Array.from(files);
    await handleBlobs(blobs);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    await handleFiles(files);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
  };
  const handleDragEnter = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
  }
   const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
  }

  const removeImage = async (id: string) => {
    // Revoke URL before deleting
    const imageToRemove = images.find(i => i.id === id);
    if(imageToRemove?.url) URL.revokeObjectURL(imageToRemove.url);

    await imageService.deleteImageById(id);
    const newImages = images.filter(i => i.id !== id);
    setImages(newImages);
    onChange?.(newImages);
  };

  const move = (fromIndex: number, toIndex: number) => {
    const arr = [...images];
    const [item] = arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, item);
    setImages(arr);
    onChange?.(arr);
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div
        ref={dropRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl sm:rounded-2xl p-4 sm:p-8 text-center cursor-pointer transition-all duration-300 group
        ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-slate-300 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/30 hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
      >
        <input type="file" multiple accept="image/*" onChange={(e)=>handleFiles(e.target.files)} ref={fileInputRef} className="hidden" />
        <div className="flex flex-col items-center gap-1.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-slate-200 dark:bg-zinc-900/50 flex items-center justify-center text-slate-500 group-hover:text-blue-500 group-hover:bg-slate-300 dark:group-hover:bg-slate-700/50 transition-all">
            <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <p className="text-[9px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            Drop images or <span className="text-blue-500">browse</span>
            <span className="block text-[7px] sm:text-[10px] mt-1 sm:mt-2 text-slate-400 dark:text-slate-500 font-medium normal-case tracking-normal">Max 5 images • Paste supported</span>
          </p>
        </div>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
            {images.map((img, idx) => (
            <div key={img.id} className="relative group aspect-square rounded-lg sm:rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-900/30 shadow-inner">
                <img src={img.url} alt={`upload preview ${idx}`} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-[2px] flex flex-col items-center justify-center gap-1 sm:gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <button onClick={(e)=>{e.stopPropagation(); move(idx, idx-1);}} disabled={idx === 0} title="Move Left" className="text-slate-700 dark:text-white p-1 sm:p-2 rounded-md sm:rounded-xl bg-slate-200 dark:bg-zinc-800 hover:bg-blue-500 dark:hover:bg-blue-600 hover:text-white disabled:opacity-20 transition-colors">
                           <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <button onClick={(e)=>{e.stopPropagation(); move(idx, idx+1);}} disabled={idx === images.length - 1} title="Move Right" className="text-slate-700 dark:text-white p-1 sm:p-2 rounded-md sm:rounded-xl bg-slate-200 dark:bg-zinc-800 hover:bg-blue-500 dark:hover:bg-blue-600 hover:text-white disabled:opacity-20 transition-colors">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </div>
                    <button onClick={(e)=>{e.stopPropagation(); removeImage(img.id);}} title="Remove Image" className="text-red-500 p-1 sm:p-2 rounded-md sm:rounded-xl bg-red-100 dark:bg-red-500/20 hover:bg-red-500 hover:text-white transition-all">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            </div>
            ))}
        </div>
      )}
    </div>
  );
}

export default ProductImagesUploader;