'use client';

import { useState, useEffect } from 'react';
import { DocumentUpload } from './DocumentUpload';
import { DocumentList, Document } from './DocumentList';

interface DocumentPanelProps {
  permitId: string;
  permitName: string;
  isOpen: boolean;
  onClose: () => void;
}


export function DocumentPanel({ permitId, permitName, isOpen, onClose }: DocumentPanelProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDocuments();
    }
  }, [isOpen, permitId]);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/documents?permitId=${permitId}`);
      const data = await response.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadComplete = () => {
    setShowUpload(false);
    loadDocuments();
  };

  const handleDownload = async (document: Document) => {
    try {
      const response = await fetch(`/api/documents/${document.id}/download`);
      const { url } = await response.json();
      window.open(url, '_blank');
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleDelete = async (document: Document) => {
    if (!confirm(`Delete ${document.filename}? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/documents/${document.id}`, { method: 'DELETE' });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== document.id));
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handlePreview = (document: Document) => {
    // In production, get signed URL for preview
    setPreviewUrl(document.storageUrl);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[480px] bg-surface border-l border-border z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-text">Documents</h2>
            <p className="text-sm text-muted truncate">{permitName}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-text p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
            </div>
          ) : showUpload ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-text">Upload Document</h3>
                <button
                  onClick={() => setShowUpload(false)}
                  className="text-xs text-muted hover:text-text"
                >
                  Cancel
                </button>
              </div>
              <DocumentUpload
                permitId={permitId}
                onUploadComplete={handleUploadComplete}
                onCancel={() => setShowUpload(false)}
              />
            </div>
          ) : (
            <DocumentList
              documents={documents}
              onDownload={handleDownload}
              onDelete={handleDelete}
              onPreview={handlePreview}
            />
          )}
        </div>

        {/* Footer */}
        {!showUpload && !isLoading && (
          <div className="p-4 border-t border-border">
            <button
              onClick={() => setShowUpload(true)}
              className="btn btn-primary w-full"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload Document
            </button>
            <p className="text-xs text-muted text-center mt-2">
              {documents.length} document{documents.length !== 1 ? 's' : ''} • PDF, PNG, JPG, DOCX
            </p>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80">
          <div className="relative max-w-4xl max-h-[90vh] bg-surface rounded-lg overflow-hidden">
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-bg/80 rounded-full flex items-center justify-center text-text hover:bg-bg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="p-8 text-center">
              <p className="text-muted">Document preview would appear here</p>
              <p className="text-xs text-muted mt-2">
                (Requires R2 storage configuration for actual file preview)
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
