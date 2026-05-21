'use client';

import { useState, useEffect } from 'react';
import { Download, Share2, Search, FileText, Clock, User, Building2, CheckCircle, ChevronDown, ChevronUp, ShieldCheck, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { motion, AnimatePresence } from 'framer-motion';

interface Transcript {
  id: string;
  bookingId: string;
  content: string;
  summary?: string;
  keyPoints?: string[];
  actionItems?: string[];
  createdAt: Date;
  booking: {
    scheduledAt: string;
    topic: string;
    employee: {
      studentProfile: { fullName: string } | null;
      employeeProfile: { fullName: string; companyName: string; designation: string } | null;
    };
  };
}

interface TranscriptViewerProps {
  bookingId: string;
  userId: string;
}

export default function TranscriptViewer({ bookingId, userId }: TranscriptViewerProps) {
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSummaryOpen, setIsSummaryOpen] = useState(true);
  const [isKeyPointsOpen, setIsKeyPointsOpen] = useState(true);

  useEffect(() => {
    fetchTranscript();
  }, [bookingId]);

  const fetchTranscript = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/transcripts?bookingId=${bookingId}`);
      const data = await response.json();
      setTranscript(data.transcript);
    } catch (error) {
      console.error('Failed to fetch transcript:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch('/api/transcripts/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      });
      const data = await response.json();
      if (data.pdf) {
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${data.pdf}`;
        link.download = `Transcript_${bookingId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark class="bg-primary/20 text-primary px-0.5 rounded">$1</mark>');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent shadow-lg" />
      </div>
    );
  }

  if (!transcript) {
    return (
      <Card className="p-20 text-center border-dashed border-2">
        <div className="w-16 h-16 bg-surface-2 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
          <FileText className="w-8 h-8 text-text-muted" />
        </div>
        <p className="text-text-primary font-black uppercase tracking-widest text-xs">Intelligence Pending</p>
        <p className="text-text-secondary text-sm mt-2 font-medium">This transcript is being processed by AI.</p>
      </Card>
    );
  }

  const mentorName = transcript.booking.employee.studentProfile?.fullName || transcript.booking.employee.employeeProfile?.fullName || 'Mentor';

  return (
    <div className="space-y-6 sm:space-y-10 pb-20">
      
      {/* Premium Mobile-First Header */}
      <Card className="p-0 overflow-hidden shadow-premium border-primary/10 bg-gradient-to-br from-surface to-primary/[0.02]">
         <div className="p-6 sm:p-10 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-8">
            <div className="flex items-center gap-5">
               <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                  <ShieldCheck className="w-8 h-8" />
               </div>
               <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">Call Intel</h2>
                  <div className="flex flex-wrap items-center gap-4 mt-1 text-[10px] font-black uppercase tracking-widest text-text-muted">
                     <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {new Date(transcript.booking.scheduledAt).toLocaleDateString()}</span>
                     <span className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3 text-success" /> Verified</span>
                  </div>
               </div>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
               <Button onClick={handleDownload} className="flex-1 sm:flex-none h-14 px-8 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20">
                  <Download className="w-4 h-4 mr-2" /> PDF Report
               </Button>
               <button className="p-4 bg-surface-2 border border-border rounded-2xl text-text-secondary hover:text-primary transition-all">
                  <Share2 className="w-5 h-5" />
               </button>
            </div>
         </div>

         <div className="p-6 sm:p-10 flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-primary/20 shadow-md">
               <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${mentorName}`} alt={mentorName} />
            </div>
            <div className="text-center sm:text-left">
               <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-muted mb-1">Expert Presence</p>
               <p className="text-xl font-black text-text-primary leading-none">{mentorName}</p>
               <p className="text-sm font-bold text-primary mt-2">{transcript.booking.topic}</p>
            </div>
         </div>
      </Card>

      {/* Dynamic Search */}
      <div className="relative group">
         <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-primary transition-colors" />
         <input 
           type="text" 
           placeholder="Search intelligence log..." 
           value={searchQuery}
           onChange={(e) => setSearchQuery(e.target.value)}
           className="w-full h-16 pl-14 pr-6 bg-surface-2 border-2 border-border rounded-3xl text-base font-bold focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
         />
      </div>

      {/* AI Summary Accordion */}
      {transcript.summary && (
        <Card className="p-0 overflow-hidden shadow-sm border-primary/5">
           <button 
             onClick={() => setIsSummaryOpen(!isSummaryOpen)}
             className="w-full p-6 flex items-center justify-between hover:bg-surface-2 transition-all group h-14 sm:h-16"
           >
              <div className="flex items-center gap-3">
                 <FileText className="w-5 h-5 text-primary" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-text-primary">Executive Summary</span>
              </div>
              {isSummaryOpen ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
           </button>
           <AnimatePresence>
              {isSummaryOpen && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                   <div className="p-8 pt-0 text-base sm:text-lg leading-relaxed text-text-secondary font-medium">
                      <div dangerouslySetInnerHTML={{ __html: highlightText(transcript.summary, searchQuery) }} />
                   </div>
                </motion.div>
              )}
           </AnimatePresence>
        </Card>
      )}

      {/* Key points with high-touch icons */}
      <Card className="p-8 sm:p-12 shadow-premium border-emerald-500/10 bg-emerald-500/[0.01]">
         <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-8 flex items-center gap-3">
            <CheckCircle className="w-5 h-5" /> Critical Insights
         </h3>
         <div className="space-y-6">
            {transcript.keyPoints?.map((point, i) => (
              <div key={i} className="flex items-start gap-4 sm:gap-6 p-4 sm:p-6 bg-surface rounded-2xl border border-border shadow-sm group hover:border-emerald-500/30 transition-all">
                 <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-black text-xs shrink-0">{i+1}</div>
                 <p className="text-base sm:text-lg font-medium text-text-primary leading-relaxed" dangerouslySetInnerHTML={{ __html: highlightText(point, searchQuery) }} />
              </div>
            ))}
         </div>
      </Card>

      {/* Full Transcript Scrollable */}
      <section>
         <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted mb-6 ml-1">Transmission Log</h3>
         <Card className="p-8 sm:p-12 shadow-premium border-primary/5 bg-surface/50 backdrop-blur-md">
            <div className="max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
               <p className="text-base sm:text-lg leading-loose text-text-secondary font-medium whitespace-pre-wrap selection:bg-primary/20" dangerouslySetInnerHTML={{ __html: highlightText(transcript.content, searchQuery) }} />
            </div>
         </Card>
      </section>

    </div>
  );
}
