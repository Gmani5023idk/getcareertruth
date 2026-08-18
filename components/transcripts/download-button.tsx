'use client';

import { Download } from 'lucide-react';
import { useState } from 'react';
import Button from '@/components/ui/Button';

interface TranscriptDownloadButtonProps {
  transcriptId: string;
  bookingId: string;
  size?: 'sm' | 'md';
}

/**
 * "Download Transcript" button.
 * Fetches the PDF from the secure /api/transcripts/[id]/download endpoint
 * and triggers a browser file download.
 */
export function TranscriptDownloadButton({
  transcriptId,
  bookingId,
  size = 'sm',
}: TranscriptDownloadButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/transcripts/${transcriptId}/download`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Download failed' }));
        throw new Error(err.error || 'Download failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transcript-${bookingId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[TranscriptDownloadButton] Download error:', err);
      alert('Download failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size={size}
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center gap-1"
    >
      <Download className="w-4 h-4" />
      {loading ? 'Generating…' : 'Download Transcript'}
    </Button>
  );
}