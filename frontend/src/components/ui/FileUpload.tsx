import React, { useRef, useState, useCallback } from 'react';

export interface FileUploadProps {
  onUpload: (files: File[]) => void;
  accept?: string;
  maxSize?: number; // in bytes
  multiple?: boolean;
  children?: React.ReactNode;
}

export function FileUpload({
  onUpload,
  accept,
  maxSize,
  multiple = false,
  children,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFiles = useCallback(
    (files: File[]): File[] => {
      const validFiles: File[] = [];
      const errors: string[] = [];

      for (const file of files) {
        // Check file type
        if (accept) {
          const acceptedTypes = accept.split(',').map((t) => t.trim());
          const isValidType = acceptedTypes.some((type) => {
            if (type.startsWith('.')) {
              return file.name.toLowerCase().endsWith(type.toLowerCase());
            }
            if (type.endsWith('/*')) {
              return file.type.startsWith(type.replace('/*', '/'));
            }
            return file.type === type;
          });

          if (!isValidType) {
            errors.push(`${file.name}: Invalid file type`);
            continue;
          }
        }

        // Check file size
        if (maxSize && file.size > maxSize) {
          const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
          errors.push(`${file.name}: File exceeds ${maxSizeMB}MB limit`);
          continue;
        }

        validFiles.push(file);
      }

      if (errors.length > 0) {
        setError(errors.join(', '));
      } else {
        setError(null);
      }

      return validFiles;
    },
    [accept, maxSize]
  );

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;

      const files = Array.from(fileList);
      const filesToUpload = multiple ? files : files.slice(0, 1);
      const validFiles = validateFiles(filesToUpload);

      if (validFiles.length > 0) {
        onUpload(validFiles);
      }
    },
    [multiple, validateFiles, onUpload]
  );

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // Reset input value to allow re-uploading the same file
    e.target.value = '';
  };

  return (
    <div>
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-colors duration-150
          ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
        `.trim().replace(/\s+/g, ' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="hidden"
        />
        {children || (
          <div>
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-600">
              <span className="text-blue-600 font-medium">Click to upload</span> or drag and drop
            </p>
            {accept && (
              <p className="mt-1 text-xs text-gray-500">
                Accepted: {accept}
              </p>
            )}
            {maxSize && (
              <p className="mt-1 text-xs text-gray-500">
                Max size: {(maxSize / (1024 * 1024)).toFixed(1)}MB
              </p>
            )}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
