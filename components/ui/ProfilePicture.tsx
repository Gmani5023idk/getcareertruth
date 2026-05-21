'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Camera, X, Check, Loader2 } from 'lucide-react';

interface ProfilePictureProps {
  /** Current photo URL. If null/undefined, shows default avatar. */
  src?: string | null;
  /** Alt text for the image */
  alt: string;
  /** Size in px — card (48) or profile (96). Defaults to 48. */
  size?: 48 | 96;
  /** Show verified badge */
  verified?: boolean;
  /** If true, renders the camera-edit overlay (only for own profile) */
  editable?: boolean;
  /** Called with the new File after the user confirms the crop/preview */
  onUpload?: (file: File) => Promise<void>;
  className?: string;
}

const DEFAULT_AVATAR = '/assets/default-avatar.svg';

export default function ProfilePicture({
  src,
  alt,
  size = 48,
  verified = false,
  editable = false,
  onUpload,
  className = '',
}: ProfilePictureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [imgError, setImgError] = useState(false);

  const currentSrc = imgError || !src ? DEFAULT_AVATAR : src;

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      showToast('error', 'Only JPG, PNG, or WebP images are allowed.');
      return;
    }
    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'Image must be under 5MB.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setPreviewFile(file);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  }, []);

  const handleConfirm = async () => {
    if (!previewFile || !onUpload) return;
    setUploading(true);
    try {
      await onUpload(previewFile);
      showToast('success', 'Profile picture updated!');
    } catch {
      showToast('error', 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setPreview(null);
      setPreviewFile(null);
    }
  };

  const handleCancel = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setPreviewFile(null);
  };

  const badgeSize = size === 96 ? 'w-6 h-6' : 'w-4 h-4';
  const badgeWrap = size === 96 ? '-bottom-1 -right-1 p-1.5' : '-bottom-0.5 -right-0.5 p-1';
  const cameraSize = size === 96 ? 'w-6 h-6' : 'w-4 h-4';

  return (
    <div className={`relative flex-shrink-0 ${className}`} style={{ width: size, height: size }}>
      {/* Avatar */}
      <div
        className="w-full h-full rounded-full overflow-hidden border-2 border-white shadow-md"
        style={{ width: size, height: size }}
      >
        <Image
          src={preview ?? currentSrc}
          alt={alt}
          width={size}
          height={size}
          className="object-cover w-full h-full rounded-full"
          onError={() => setImgError(true)}
          unoptimized={!!preview}
          priority
        />
      </div>

      {/* Verified badge */}
      {verified && !editable && (
        <div className={`absolute ${badgeWrap} bg-teal-500 rounded-full`}>
          <svg className={`${badgeSize} text-white`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Edit overlay (own profile only) */}
      {editable && !preview && (
        <>
          <button
            onClick={() => inputRef.current?.click()}
            className="absolute inset-0 rounded-full bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center group cursor-pointer"
            title="Change profile photo"
            aria-label="Change profile photo"
          >
            <Camera className={`${cameraSize} text-white drop-shadow`} />
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </>
      )}

      {/* Preview confirm / cancel */}
      {editable && preview && (
        <div className="absolute inset-0 rounded-full flex items-center justify-center gap-1">
          {uploading ? (
            <Loader2 className="w-5 h-5 text-white animate-spin drop-shadow" />
          ) : (
            <>
              <button
                onClick={handleConfirm}
                className="bg-green-500 text-white rounded-full p-1 shadow hover:bg-green-600 transition-colors"
                title="Confirm"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={handleCancel}
                className="bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600 transition-colors"
                title="Cancel"
              >
                <X className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`absolute z-50 left-1/2 -translate-x-1/2 -bottom-12 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg pointer-events-none ${
            toast.type === 'success'
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
