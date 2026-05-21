'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Briefcase,
  Calendar as CalendarIcon,
  Clock,
  Mail,
  ExternalLink,
  CheckCircle,
  ChevronRight,
  Star,
  Users,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ProfilePicture from '@/components/ui/ProfilePicture';
import Link from 'next/link';
import Image from 'next/image';

// Mock data
const mockEmployee = {
  id: '1',
  name: 'Rahul Sharma',
  jobTitle: 'Senior Software Engineer',
  company: 'Google',
  industry: 'Technology',
  yearsOfExperience: 8,
  pricePerCall: 1500,
  topics: ['Software Engineering', 'Career Growth', 'FAANG Interview Prep', 'System Design', 'Tech Leadership'],
  verified: true,
  verificationMethod: 'LINKEDIN',
  location: 'Bangalore',
  avatar: null,
  linkedinUrl: 'https://linkedin.com/in/rahulsharma',
  bio: 'I am a Senior Software Engineer at Google with 8+ years of experience in building scalable distributed systems. I have interviewed 100+ candidates and helped many engineers crack FAANG interviews. I am passionate about mentoring and helping others grow in their careers.',
  education: [{ degree: 'B.Tech Computer Science', institution: 'IIT Delhi', year: '2012 - 2016' }],
  previousCompanies: ['Amazon', 'Microsoft'],
  rating: 4.9,
  reviewCount: 124,
  availability: [
    { day: 'Mon, 19 May', slots: ['06:00 PM', '06:30 PM', '07:00 PM'] },
    { day: 'Tue, 20 May', slots: ['06:00 PM', '07:00 PM', '08:00 PM'] },
    { day: 'Wed, 21 May', slots: ['09:00 AM', '10:00 AM', '06:00 PM'] },
  ],
};

export default function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState(mockEmployee.availability[0].day);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showFullBio, setShowFullBio] = useState(false);

  const handleReserve = () => {
    if (!selectedSlot) return;
    router.push(`/book/${id}`);
  };

  const currentDaySlots = mockEmployee.availability.find(a => a.day === selectedDay)?.slots || [];

  return (
    <div className="min-h-screen bg-bg text-text-primary pb-32 sm:pb-20">
      {/* Mobile-First Header */}
      <div className="bg-surface border-b border-border pt-6 sm:pt-10 pb-8 sm:pb-12 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest text-text-muted mb-6">
            <Link href="/employees" className="hover:text-primary transition-colors">Directory</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-text-primary truncate">{mockEmployee.name}</span>
          </nav>
          
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-10">
            <div className="relative group">
              <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-2xl group-hover:bg-primary/30 transition-all"></div>
              <div className="relative">
                <ProfilePicture src={mockEmployee.avatar} alt={mockEmployee.name} size={96} verified={mockEmployee.verified} editable={false} />
                {mockEmployee.verified && (
                   <div className="absolute -bottom-2 -right-2 bg-success text-white p-2 rounded-2xl border-4 border-surface shadow-xl">
                      <ShieldCheck className="w-5 h-5" />
                   </div>
                )}
              </div>
            </div>
            
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-2">{mockEmployee.name}</h1>
              <p className="text-lg sm:text-xl font-bold text-text-secondary mb-4">{mockEmployee.jobTitle} <span className="text-primary">@ {mockEmployee.company}</span></p>
              
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-4 sm:gap-6 text-xs font-black uppercase tracking-widest text-text-muted">
                 <div className="flex items-center gap-2">
                   <Star className="w-4 h-4 text-yellow-500 fill-current" />
                   <span className="text-text-primary">{mockEmployee.rating}</span>
                   <span>({mockEmployee.reviewCount} Reviews)</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <Briefcase className="w-4 h-4" />
                   <span className="text-text-primary">{mockEmployee.yearsOfExperience}y Exp</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <MapPin className="w-4 h-4" />
                   <span className="text-text-primary">{mockEmployee.location}</span>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12">
          
          {/* Main Info Column */}
          <div className="lg:col-span-2 space-y-8 sm:space-y-12">
            
            {/* Bio Section */}
            <section>
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-text-muted mb-4">The Professional Truth</h2>
              <div className="relative">
                <p className={`text-base sm:text-lg leading-relaxed text-text-secondary font-medium ${!showFullBio ? 'line-clamp-3 sm:line-clamp-none' : ''}`}>
                  {mockEmployee.bio}
                </p>
                {!showFullBio && (
                  <button 
                    onClick={() => setShowFullBio(true)}
                    className="sm:hidden text-primary font-bold text-sm mt-2 flex items-center gap-1"
                  >
                    Read more <ChevronDown className="w-4 h-4" />
                  </button>
                )}
              </div>
            </section>

            {/* Expertise Section */}
            <section>
               <h2 className="text-xs font-black uppercase tracking-[0.2em] text-text-muted mb-4">Areas of Impact</h2>
               <div className="flex flex-wrap gap-3">
                 {mockEmployee.topics.map(topic => (
                   <span key={topic} className="px-4 py-2 bg-surface-2 border border-border rounded-xl text-xs sm:text-sm font-bold text-text-primary hover:border-primary/50 transition-colors cursor-default">
                     {topic}
                   </span>
                 ))}
               </div>
            </section>

            {/* Education & Experience */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-8">
               <Card className="p-6 sm:p-8 bg-surface-2/30 border-dashed border-2">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-6">Education</h3>
                  {mockEmployee.education.map((edu, i) => (
                    <div key={i} className="space-y-1">
                       <p className="font-black text-text-primary">{edu.degree}</p>
                       <p className="text-sm font-bold text-primary">{edu.institution}</p>
                       <p className="text-xs font-medium text-text-muted">{edu.year}</p>
                    </div>
                  ))}
               </Card>
               <Card className="p-6 sm:p-8 bg-surface-2/30 border-dashed border-2">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-6">Past Tenures</h3>
                  <div className="flex flex-wrap gap-4">
                    {mockEmployee.previousCompanies.map(company => (
                      <span key={company} className="text-base font-black text-text-secondary">{company}</span>
                    ))}
                  </div>
               </Card>
            </section>

            {/* Social Links */}
            <section className="pt-4 border-t border-border flex items-center gap-6">
               <a href={mockEmployee.linkedinUrl} target="_blank" className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors font-black text-[10px] uppercase tracking-widest">
                  <ExternalLink className="w-4 h-4" /> LinkedIn Profile
               </a>
               <button className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors font-black text-[10px] uppercase tracking-widest">
                  <Mail className="w-4 h-4" /> Contact Support
               </button>
            </section>
          </div>

          {/* Booking Sidebar / Mobile Sticky */}
          <div className="lg:relative">
             <Card className="p-6 sm:p-8 shadow-premium border-primary/10 bg-gradient-to-br from-surface to-primary/[0.02] sticky top-24">
                <div className="flex items-center justify-between mb-8">
                   <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Session Fee</div>
                      <div className="text-4xl font-black text-text-primary tracking-tighter">₹{mockEmployee.pricePerCall}</div>
                   </div>
                   <div className="text-right">
                      <div className="text-[10px] font-black uppercase tracking-widest text-success mb-1">Duration</div>
                      <div className="text-xl font-black text-text-primary">15 Mins</div>
                   </div>
                </div>

                <div className="space-y-6 mb-10">
                   <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-muted block mb-3 ml-1">Select Date</label>
                      <div className="grid grid-cols-3 gap-2">
                        {mockEmployee.availability.map(a => (
                          <button 
                            key={a.day} 
                            onClick={() => { setSelectedDay(a.day); setSelectedSlot(null); }}
                            className={`h-14 sm:h-12 rounded-xl text-[10px] font-black uppercase border transition-all ${selectedDay === a.day ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[0.98]' : 'bg-surface border-border text-text-secondary hover:border-primary/50'}`}
                          >
                            {a.day.split(',')[0]}
                            <span className="block opacity-60">{a.day.split(',')[1]}</span>
                          </button>
                        ))}
                      </div>
                   </div>

                   <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-muted block mb-3 ml-1">Available Slots</label>
                      <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                         {currentDaySlots.map(slot => (
                           <button 
                             key={slot} 
                             onClick={() => setSelectedSlot(slot)}
                             className={`h-14 sm:h-12 rounded-xl text-sm font-black border transition-all ${selectedSlot === slot ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20 scale-[0.98]' : 'bg-surface border-border text-text-primary hover:border-accent/50'}`}
                           >
                             {slot}
                           </button>
                         ))}
                      </div>
                   </div>
                </div>

                <div className="hidden sm:block">
                  <Button 
                    className="w-full h-16 shadow-2xl shadow-primary/20 text-lg font-black" 
                    disabled={!selectedSlot}
                    onClick={handleReserve}
                  >
                    {selectedSlot ? 'Reserve My Session' : 'Pick a Slot'}
                  </Button>
                  <p className="text-[10px] text-center mt-4 text-text-muted font-bold uppercase tracking-widest">Secure Zoom Link via Email</p>
                </div>
             </Card>
          </div>

        </div>
      </div>

      {/* Mobile Sticky CTA */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-surface/80 backdrop-blur-xl border-t border-border z-40 shadow-2xl">
         <div className="max-w-md mx-auto flex items-center gap-4">
            <div className="flex-1">
               <div className="text-[9px] font-black uppercase tracking-widest text-text-muted">Total Price</div>
               <div className="text-xl font-black text-text-primary leading-none">₹{mockEmployee.pricePerCall}</div>
            </div>
            <Button 
              className="flex-[2] h-14 font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20" 
              disabled={!selectedSlot}
              onClick={handleReserve}
            >
              {selectedSlot ? 'Confirm & Book' : 'Select Time'}
            </Button>
         </div>
      </div>
    </div>
  );
}
