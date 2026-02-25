'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';

export type DocumentType = 'Application' | 'Approval' | 'Correction' | 'Inspection Report' | 'Other';

interface DocumentUploadProps {
  permitId: string;
  onUploadComplete?: () => void;
  onCancel?: () => void;
}

const documentTypes: DocumentType[] = [
  'Application',
  'Approval',
  'Correction',
  'Inspection Report',
  'Other',
];

const acceptedFileTypes = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const maxFileSize = 25 * 1024 * 1024; // 25MB

export function DocumentUpload({ permitId, onUploadComplete, onCancel }: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>('Application');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateFile = (file: File): string | null => {
    if (!acceptedFileTypes.includes(file.type)) {
      return 'Invalid file type. Please upload PDF, PNG, JPG, or DOCX files.';
    }
    if (file.size > maxFileSize) {
      return 'File too large. Maximum size is 25MB.';
    }
    return null;
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('permitId', permitId);
      formData.append('documentType', documentType);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      onUploadComplete?.();

      setSelectedFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-accent bg-accent/10'
            : 'border-border hover:border-muted hover:bg-surface2/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-surface2 flex items-center justify-center">
          <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>

        <p className="text-sm text-text mb-1">
          {isDragging ? 'Drop file here' : 'Drag & drop or click to browse'}
        </p>
        <p className="text-xs text-muted">
          PDF, PNG, JPG, DOCX up to 25MB
        </p>
      </div>

      {/* Selected File Preview */}
      {selectedFile && (
        <div className="bg-surface2 border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <span className="text-accent text-xs font-bold">
                  {selectedFile.name.split('.').pop()?.toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-text truncate max-w-[200px]">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-muted">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
              }}
              className="text-muted hover:text-danger"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Document Type Selector */}
          <div className="mb-4">
            <label className="block text-xs text-muted uppercase tracking-wide mb-1">
              Document Type
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as DocumentType)}
              className="select"
            >
              {documentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg">
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="btn btn-primary flex-1"
            >
              {isUploading ? (
                <>
                  <span className="animate-spin mr-2">⟳</span>
                  Uploading...
                </>
              ) : (
                'Upload Document'
              )}
            </button>
            {onCancel && (
              <button onClick={onCancel} className="btn btn-ghost">
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error without file selected */}
      {error && !selectedFile && (
        <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}
    </div>
  );
}
