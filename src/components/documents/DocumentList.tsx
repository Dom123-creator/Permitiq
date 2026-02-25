'use client';

import { useState } from 'react';
import { DocumentType } from './DocumentUpload';

export interface Document {
  id: string;
  permitId: string;
  filename: string;
  type: DocumentType;
  size?: number;
  version: number;
  storageUrl: string;
  uploadedBy?: string;
  uploadedAt: Date;
}

interface DocumentListProps {
  documents: Document[];
  onDownload?: (document: Document) => void;
  onDelete?: (document: Document) => void;
  onPreview?: (document: Document) => void;
}

const typeColors: Record<DocumentType, string> = {
  Application: 'badge-info',
  Approval: 'badge-success',
  Correction: 'badge-warn',
  'Inspection Report': 'badge-purple',
  Other: 'bg-muted/20 text-muted',
};

const fileIcons: Record<string, string> = {
  pdf: '📄',
  png: '🖼️',
  jpg: '🖼️',
  jpeg: '🖼️',
  doc: '📝',
  docx: '📝',
};

export function DocumentList({ documents, onDownload, onDelete, onPreview }: DocumentListProps) {
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const getFileExtension = (filename: string): string => {
    return filename.split('.').pop()?.toLowerCase() || '';
  };

  const getFileIcon = (filename: string): string => {
    const ext = getFileExtension(filename);
    return fileIcons[ext] || '📎';
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface2 flex items-center justify-center">
          <svg className="w-8 h-8 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-muted text-sm">No documents uploaded yet</p>
      </div>
    );
  }

  // Group documents by type
  const groupedDocs = documents.reduce((acc, doc) => {
    if (!acc[doc.type]) {
      acc[doc.type] = [];
    }
    acc[doc.type].push(doc);
    return acc;
  }, {} as Record<DocumentType, Document[]>);

  return (
    <div className="space-y-4">
      {Object.entries(groupedDocs).map(([type, docs]) => (
        <div key={type}>
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            {type} ({docs.length})
          </h4>
          <div className="space-y-2">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="bg-surface2 border border-border rounded-lg overflow-hidden"
              >
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-border/30 transition-colors"
                  onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                >
                  {/* File Icon */}
                  <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center text-lg">
                    {getFileIcon(doc.filename)}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">{doc.filename}</p>
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <span>{formatFileSize(doc.size)}</span>
                      <span>•</span>
                      <span>v{doc.version}</span>
                      {doc.uploadedBy && (
                        <>
                          <span>•</span>
                          <span>{doc.uploadedBy}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Type Badge */}
                  <span className={`badge ${typeColors[doc.type]}`}>{doc.type}</span>

                  {/* Expand Arrow */}
                  <svg
                    className={`w-5 h-5 text-muted transition-transform ${
                      expandedDoc === doc.id ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Expanded Actions */}
                {expandedDoc === doc.id && (
                  <div className="px-3 pb-3 pt-1 border-t border-border">
                    <div className="text-xs text-muted mb-3">
                      Uploaded {formatDate(doc.uploadedAt)}
                    </div>
                    <div className="flex items-center gap-2">
                      {onPreview && (
                        <button
                          onClick={() => onPreview(doc)}
                          className="btn btn-secondary btn-sm flex-1"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Preview
                        </button>
                      )}
                      {onDownload && (
                        <button
                          onClick={() => onDownload(doc)}
                          className="btn btn-primary btn-sm flex-1"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(doc)}
                          className="btn btn-ghost btn-sm text-danger hover:bg-danger/10"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
