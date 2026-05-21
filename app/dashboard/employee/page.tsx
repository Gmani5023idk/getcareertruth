'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  TrendingUp,
  IndianRupee,
  Users,
  CheckCircle,
  Bell,
  ShieldCheck,
  Edit2,
  Check,
  X,
  User,
  ExternalLink,
  ChevronDown,
  Plus,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ThemeToggle from '@/components/ui/ThemeToggle';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';

// Types
type TimeSlot = {
  id: string;
  start: string; 
  end: string;   
};

type DayAvailability = {
  day: string;
  enabled: boolean;
  slots: TimeSlot[];
};

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

// Helper functions for time validation
const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const format12h = (time24: string) => {
  if (!time24) return { time: '--:--', ampm: 'AM' };
  const [hours, minutes] = time24.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return {
    time: `${hours12}:${minutes.toString().padStart(2, '0')}`,
    ampm
  };
};

// Mock data
const mockUser = {
  id: '1',
  name: 'Rahul Sharma',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul',
  jobTitle: 'Senior Software Engineer',
  company: 'Google',
  totalEarnings: 351000,
  verificationStatus: 'VERIFIED',
};

const initialAvailability: DayAvailability[] = DAYS_OF_WEEK.map(day => ({
  day,
  enabled: day === 'Monday' || day === 'Wednesday' || day === 'Friday',
  slots: day === 'Monday' || day === 'Wednesday' || day === 'Friday' 
    ? [{ id: Math.random().toString(), start: '18:00', end: '19:00' }]
    : []
}));

export default function EmployeeDashboard() {
  const [pricePerCall, setPricePerCall] = useState(1500);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [tempPrice, setTempPrice] = useState(1500);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  
  // Availability State
  const [availability, setAvailability] = useState<DayAvailability[]>(initialAvailability);
  const [tempAvailability, setTempAvailability] = useState<DayAvailability[]>(initialAvailability);

  const handlePriceUpdate = () => {
    setPricePerCall(tempPrice);
    setIsEditingPrice(false);
  };

  // Availability Handlers
  const openAvailabilityModal = () => {
    setTempAvailability(JSON.parse(JSON.stringify(availability)));
    setShowAvailabilityModal(true);
  };

  const saveAvailability = () => {
    if (hasErrors) return;
    setAvailability(tempAvailability);
    setShowAvailabilityModal(false);
  };

  const toggleDay = (index: number) => {
    const newAvail = [...tempAvailability];
    newAvail[index].enabled = !newAvail[index].enabled;
    if (newAvail[index].enabled && newAvail[index].slots.length === 0) {
      newAvail[index].slots = [{ id: Math.random().toString(), start: '09:00', end: '10:00' }];
    }
    setTempAvailability(newAvail);
  };

  const addSlot = (dayIndex: number) => {
    const newAvail = [...tempAvailability];
    const lastSlot = newAvail[dayIndex].slots[newAvail[dayIndex].slots.length - 1];
    let newStart = '09:00';
    let newEnd = '10:00';
    
    if (lastSlot) {
      const endMins = timeToMinutes(lastSlot.end);
      const nextStart = Math.min(endMins + 15, 1425); 
      const h = Math.floor(nextStart / 60);
      const m = nextStart % 60;
      newStart = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      
      const nextEnd = Math.min(nextStart + 60, 1439);
      const eh = Math.floor(nextEnd / 60);
      const em = nextEnd % 60;
      newEnd = `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;
    }

    newAvail[dayIndex].slots.push({
      id: Math.random().toString(),
      start: newStart,
      end: newEnd
    });
    setTempAvailability(newAvail);
  };

  const removeSlot = (dayIndex: number, slotIndex: number) => {
    const newAvail = [...tempAvailability];
    newAvail[dayIndex].slots.splice(slotIndex, 1);
    if (newAvail[dayIndex].slots.length === 0) {
      newAvail[dayIndex].enabled = false;
    }
    setTempAvailability(newAvail);
  };

  const updateSlot = (dayIndex: number, slotIndex: number, field: 'start' | 'end', value: string) => {
    const newAvail = [...tempAvailability];
    newAvail[dayIndex].slots[slotIndex][field] = value;
    setTempAvailability(newAvail);
  };

  const toggleAMPM = (dayIndex: number, slotIndex: number, field: 'start' | 'end') => {
    const newAvail = [...tempAvailability];
    const currentTime = newAvail[dayIndex].slots[slotIndex][field];
    const [h, m] = currentTime.split(':').map(Number);
    const newH = (h + 12) % 24;
    newAvail[dayIndex].slots[slotIndex][field] = `${newH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    setTempAvailability(newAvail);
  };

  // Validation Logic
  const getSlotError = (slot: TimeSlot) => {
    const startMins = timeToMinutes(slot.start);
    const endMins = timeToMinutes(slot.end);

    if (endMins === 0) return null; 
    if (endMins <= startMins) return 'End time must be after start time';
    if (endMins - startMins < 15) return 'Session must be at least 15 minutes long';
    return null;
  };

  const hasErrors = useMemo(() => {
    return tempAvailability.some(day => 
      day.enabled && day.slots.some(slot => getSlotError(slot) !== null)
    );
  }, [tempAvailability]);

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      {/* Dashboard Nav */}
      <nav className="border-b border-border bg-surface/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Logo />
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button className="p-2 text-text-secondary hover:text-text-primary relative transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-bg"></span>
            </button>
            
            {/* Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-surface-2 transition-all border border-border/50"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-success/20">
                  <img src={mockUser.avatar} alt="User" />
                </div>
                <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showProfileMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowProfileMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-56 bg-surface border border-border rounded-2xl shadow-xl z-20 overflow-hidden"
                    >
                      <div className="p-4 border-b border-border bg-surface-2/30">
                        <p className="text-sm font-bold truncate">{mockUser.name}</p>
                        <p className="text-xs text-text-secondary truncate">{mockUser.jobTitle}</p>
                      </div>
                      <div className="p-2">
                        <Link 
                          href={`/employees/${mockUser.id}`}
                          className="flex items-center gap-3 px-3 py-2 text-sm text-text-secondary hover:text-primary hover:bg-primary/5 rounded-xl transition-all group"
                        >
                          <User className="w-4 h-4" />
                          <span>View Public Profile</span>
                          <ExternalLink className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100" />
                        </Link>
                        <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-secondary hover:text-primary hover:bg-primary/5 rounded-xl transition-all">
                          <ShieldCheck className="w-4 h-4" />
                          <span>Verification Status</span>
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-display font-bold">
                Hello, <span className="text-primary">{mockUser.name.split(' ')[0]}</span>
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border border-success/20">
                <ShieldCheck className="w-3 h-3" /> {mockUser.verificationStatus}
              </span>
            </div>
            <p className="text-text-secondary">{mockUser.jobTitle} @ {mockUser.company}</p>
          </div>
          <Link href={`/employees/${mockUser.id}`}>
            <Button variant="secondary" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              My Public Profile
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <Card className="p-6 glass group relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary font-medium mb-1">Total Earnings</p>
                <p className="text-2xl font-display font-bold">₹{(mockUser.totalEarnings / 1000).toFixed(0)}K</p>
              </div>
              <div className="p-3 rounded-xl bg-surface-2 text-success group-hover:scale-110 transition-transform">
                <IndianRupee className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="p-6 glass group relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary font-medium mb-1">Calls Taken</p>
                <p className="text-2xl font-display font-bold">234</p>
              </div>
              <div className="p-3 rounded-xl bg-surface-2 text-primary group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="p-6 glass group relative overflow-hidden border-primary/20">
            <div className="flex items-center justify-between h-full">
              <div className="flex-1">
                <p className="text-sm text-text-secondary font-medium mb-1">Price per 15m Call</p>
                {isEditingPrice ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xl font-bold">₹</span>
                    <input
                      type="number"
                      value={tempPrice}
                      onChange={(e) => setTempPrice(Number(e.target.value))}
                      className="w-24 bg-surface-2 border border-primary rounded-lg px-2 py-1 text-lg font-bold outline-none focus:ring-2 ring-primary/20"
                      autoFocus
                    />
                    <button onClick={handlePriceUpdate} className="p-1 bg-success/20 text-success rounded-md hover:bg-success/30 transition-colors">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setIsEditingPrice(false); setTempPrice(pricePerCall); }} className="p-1 bg-error/20 text-error rounded-md hover:bg-error/30 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-display font-bold">₹{pricePerCall}</p>
                    <button 
                      onClick={() => setIsEditingPrice(true)}
                      className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-md transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="p-3 rounded-xl bg-surface-2 text-purple-400 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <h2 className="text-xl font-display font-bold">Today's Sessions</h2>
            <Card className="p-10 border-dashed border-2 border-border bg-transparent text-center">
              <p className="text-text-secondary">No sessions scheduled for today.</p>
              <Button 
                variant="secondary" 
                className="mt-4"
                onClick={openAvailabilityModal}
              >
                Update Availability
              </Button>
            </Card>
          </div>
          <div className="space-y-6">
            <Card className="p-6 glass">
              <h3 className="font-display font-bold mb-4">Earnings</h3>
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 mb-4">
                <p className="text-xs text-text-secondary font-bold uppercase mb-1">Available to withdraw</p>
                <p className="text-2xl font-display font-bold text-primary">₹58,500</p>
              </div>
              <Button variant="primary" className="w-full">Withdraw Now</Button>
            </Card>
          </div>
        </div>
      </main>

      {/* Availability Modal */}
      <AnimatePresence>
        {showAvailabilityModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAvailabilityModal(false)}
              className="fixed inset-0 bg-slate-900/40 dark:bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-surface rounded-3xl shadow-2xl overflow-hidden my-auto"
            >
              <div className="p-8 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between mb-6 shrink-0">
                  <div>
                    <h3 className="text-2xl font-display font-bold">Set Your Availability</h3>
                    <p className="text-sm text-text-secondary">Click AM/PM to toggle</p>
                  </div>
                  <button onClick={() => setShowAvailabilityModal(false)} className="p-2 hover:bg-surface-2 rounded-xl transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
                  {tempAvailability.map((item, dayIndex) => (
                    <div key={item.day} className={`p-4 rounded-2xl border transition-all ${item.enabled ? 'bg-surface-2 border-primary/20' : 'bg-surface opacity-60 border-border'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => toggleDay(dayIndex)}
                            className={`w-10 h-5 rounded-full relative transition-colors ${item.enabled ? 'bg-primary' : 'bg-border'}`}
                          >
                            <motion.div 
                              animate={{ x: item.enabled ? 22 : 2 }}
                              className="absolute top-1 w-3 h-3 bg-white rounded-full"
                            />
                          </button>
                          <span className={`font-bold ${item.enabled ? 'text-text-primary' : 'text-text-secondary'}`}>{item.day}</span>
                        </div>
                        {item.enabled && (
                          <button 
                            onClick={() => addSlot(dayIndex)}
                            className="text-xs font-bold text-primary hover:bg-primary/10 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Add Slot
                          </button>
                        )}
                      </div>

                      {item.enabled ? (
                        <div className="space-y-4">
                          {item.slots.map((slot, slotIndex) => {
                            const error = getSlotError(slot);
                            const startInfo = format12h(slot.start);
                            const endInfo = format12h(slot.end);
                            
                            return (
                              <div key={slot.id} className="space-y-2">
                                <div className="flex items-center gap-4">
                                  <div className="flex-1 grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary ml-1">From</label>
                                      <div className="relative flex items-center">
                                        <div className="relative flex-1 group">
                                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary dark:text-white group-focus-within:text-primary transition-colors" />
                                          <input 
                                            type="time" 
                                            value={slot.start}
                                            onChange={(e) => updateSlot(dayIndex, slotIndex, 'start', e.target.value)}
                                            className="w-full bg-surface border border-border rounded-l-xl pl-9 pr-3 py-2 text-sm focus:ring-2 ring-primary/20 outline-none transition-all"
                                          />
                                        </div>
                                        <button 
                                          onClick={() => toggleAMPM(dayIndex, slotIndex, 'start')}
                                          className={`px-3 py-2 text-[10px] font-bold border-y border-r border-border rounded-r-xl transition-all ${
                                            startInfo.ampm === 'PM' ? 'bg-primary text-white' : 'bg-surface-2 text-text-secondary'
                                          }`}
                                        >
                                          {startInfo.ampm}
                                        </button>
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary ml-1">To</label>
                                      <div className="relative flex items-center">
                                        <div className="relative flex-1 group">
                                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary dark:text-white group-focus-within:text-primary transition-colors" />
                                          <input 
                                            type="time" 
                                            value={slot.end}
                                            onChange={(e) => updateSlot(dayIndex, slotIndex, 'end', e.target.value)}
                                            className="w-full bg-surface border border-border rounded-l-xl pl-9 pr-3 py-2 text-sm focus:ring-2 ring-primary/20 outline-none transition-all"
                                          />
                                        </div>
                                        <button 
                                          onClick={() => toggleAMPM(dayIndex, slotIndex, 'end')}
                                          className={`px-3 py-2 text-[10px] font-bold border-y border-r border-border rounded-r-xl transition-all ${
                                            endInfo.ampm === 'PM' ? 'bg-primary text-white' : 'bg-surface-2 text-text-secondary'
                                          }`}
                                        >
                                          {endInfo.ampm}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                  <button 
                                    onClick={() => removeSlot(dayIndex, slotIndex)}
                                    className="p-2 text-text-secondary hover:text-error hover:bg-error/10 rounded-xl transition-all mt-5"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                                {error && (
                                  <motion.div 
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-1.5 text-error text-[11px] font-medium ml-1"
                                  >
                                    <AlertCircle className="w-3 h-3" />
                                    {error}
                                  </motion.div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-text-secondary italic">Unavailable</p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex gap-3 shrink-0">
                  <Button variant="ghost" className="flex-1" onClick={() => setShowAvailabilityModal(false)}>Cancel</Button>
                  <Button 
                    variant="primary" 
                    className="flex-1" 
                    onClick={saveAvailability}
                    disabled={hasErrors}
                  >
                    {hasErrors ? 'Fix Errors to Save' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
