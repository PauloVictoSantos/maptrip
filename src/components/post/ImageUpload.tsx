"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { ImagePlus, X, Loader2, AlertCircle } from "lucide-react";

type ImageUploadProps = {
  images: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
};

export function ImageUpload({
  images,
  onChange,
  maxImages = 5,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File): Promise<string | null> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Erro no upload");
    }

    return data.url;
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const remaining = maxImages - images.length;
    if (remaining <= 0) {
      setError(`Máximo de ${maxImages} imagens.`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    setError("");

    try {
      const uploadPromises = filesToUpload.map((file) => uploadFile(file));
      const urls = await Promise.all(uploadPromises);
      const validUrls = urls.filter((u): u is string => u !== null);
      onChange([...images, ...validUrls]);
    } catch (err: any) {
      setError(err.message || "Erro ao enviar imagem.");
    }

    setUploading(false);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function removeImage(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Fotos <span className="text-red-400">*</span>
        <span className="font-normal text-gray-400 ml-1">
          ({images.length}/{maxImages})
        </span>
      </label>

      {/* Preview grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((url, i) => (
            <div
              key={url}
              className="group relative aspect-square rounded-xl overflow-hidden border border-gray-100"
            >
              <Image
                src={url}
                alt={`Foto ${i + 1}`}
                fill
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/80"
              >
                <X size={14} />
              </button>
              {i === 0 && (
                <span className="absolute bottom-1.5 left-1.5 badge bg-black/50 text-white text-[10px] backdrop-blur-sm">
                  Capa
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      {images.length < maxImages && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition-colors ${
            uploading
              ? "border-brand-300 bg-brand-50/50"
              : "border-gray-200 bg-gray-50/50 hover:border-brand-300 hover:bg-brand-50/30"
          }`}
        >
          {uploading ? (
            <>
              <Loader2 size={24} className="animate-spin text-brand-500" />
              <p className="text-sm text-brand-600">Enviando...</p>
            </>
          ) : (
            <>
              <ImagePlus size={24} className="text-gray-400" />
              <p className="text-sm text-gray-500">
                Clique ou arraste imagens aqui
              </p>
              <p className="text-xs text-gray-400">
                JPG, PNG, WebP ou GIF — máx. 5MB cada
              </p>
            </>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle size={14} />
          {error}
        </div>
      )}
    </div>
  );
}
