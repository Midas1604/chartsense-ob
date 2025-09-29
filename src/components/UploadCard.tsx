'use client';

import { useCallback, useState } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UploadCardProps {
  onFileSelected: (file: File) => void;
  isAnalyzing: boolean;
  previewUrl?: string;
}

export function UploadCard({ onFileSelected, isAnalyzing, previewUrl }: UploadCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      onFileSelected(imageFile);
    }
  }, [onFileSelected]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelected(file);
    }
  }, [onFileSelected]);

  if (isAnalyzing && previewUrl) {
    return (
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <div className="text-center">
          <div className="mb-4">
            <img 
              src={previewUrl} 
              alt="Preview do gráfico" 
              className="max-w-full max-h-64 mx-auto rounded-lg border border-gray-700"
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-white font-medium">Analisando gráfico...</span>
            </div>
            
            <div className="space-y-2">
              <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse"></div>
              </div>
              <p className="text-sm text-gray-400">
                Processando padrões técnicos e calculando probabilidades
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
          isDragOver
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-gray-700 hover:border-gray-600'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-white font-semibold text-lg">
              Envie seu gráfico
            </h3>
            <p className="text-gray-400 text-sm max-w-sm mx-auto">
              Arraste e solte uma imagem PNG ou JPG do seu gráfico aqui
            </p>
          </div>
          
          <div className="space-y-3">
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleFileInput}
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input">
              <Button 
                asChild
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium px-6 py-2 rounded-lg transition-all duration-200 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Selecionar Imagem
                </span>
              </Button>
            </label>
            
            <p className="text-xs text-gray-500 mt-3">
              Máximo 10MB • PNG, JPG
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}