/**
 * Drag-and-drop / file-picker upload zone.
 * Validates file type (.docx) and size (≤ 10 MB) client-side before calling onFileSelect.
 */
import { useCallback, useRef, useState } from 'react';

interface Props {
  onFileSelect: (file: File) => void;
  loading: boolean;
  error: string | null;
  onReset: () => void;
  hasResults: boolean;
}

const MAX_MB = 10;

export function UploadZone({ onFileSelect, loading, error, onReset, hasResults }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setLocalError(null);
      if (!file.name.toLowerCase().endsWith('.docx')) {
        setLocalError('Only .docx files are accepted.');
        return;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        setLocalError(`File is too large. Maximum size is ${MAX_MB} MB.`);
        return;
      }
      setFileName(file.name);
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so the same file can be re-uploaded after a reset
    e.target.value = '';
  };

  const displayError = localError ?? error;

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload .docx file"
        onClick={() => !loading && inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && !loading && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative rounded-2xl border-2 border-dashed p-12 text-center transition-all cursor-pointer select-none
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-gray-50'}
          ${loading ? 'cursor-not-allowed opacity-60' : ''}
        `}
      >
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            <p className="text-sm font-medium text-gray-600">
              Analysing document with GPT…
            </p>
            <p className="text-xs text-gray-400">
              This typically takes 30–90 seconds. Please don't close the tab.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <span className="text-5xl" aria-hidden>📄</span>
            <p className="text-lg font-semibold text-gray-800">
              Drop your .docx file here
            </p>
            <p className="text-sm text-gray-500">or click anywhere in this box to browse</p>
            <span className="mt-2 inline-block rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
              Browse File
            </span>
            <p className="text-xs text-gray-400">Accepts .docx files up to {MAX_MB} MB</p>
            {fileName && !hasResults && (
              <p className="text-sm text-gray-500">
                Selected:{' '}
                <span className="font-medium text-gray-800">{fileName}</span>
              </p>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".docx"
          className="hidden"
          onChange={handleChange}
        />
      </div>

      {displayError && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {displayError}
        </div>
      )}

      {hasResults && !loading && (
        <div className="mt-4 text-center">
          <button
            onClick={onReset}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            ↑ Check another document
          </button>
        </div>
      )}
    </div>
  );
}
