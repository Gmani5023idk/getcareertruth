'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Plus, Trash2, Calendar, Clock, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

// New AvailabilitySlot type matching the relational model
interface Slot {
  dayOfWeek: number;  // 0=Sunday, 1=Monday, ..., 6=Saturday
  startTime: string;  // HH:mm in 24h format
  endTime: string;    // HH:mm in 24h format
  timezone?: string;  // IANA timezone, default: 'Asia/Kolkata'
}

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface SlotEditorProps {
  initialSlots: Slot[];
  onSave: (slots: Slot[]) => Promise<void>;
}

export default function SlotEditor({ initialSlots, onSave }: SlotEditorProps) {
  const [slots, setSlots] = useState<Slot[]>(
    initialSlots.length > 0
      ? initialSlots
      : [{ dayOfWeek: 1, startTime: '10:00', endTime: '11:00', timezone: 'Asia/Kolkata' }]
  );
  const [loading, setLoading] = useState(false);

  const addSlot = () => {
    setSlots([...slots, { dayOfWeek: 1, startTime: '10:00', endTime: '11:00', timezone: 'Asia/Kolkata' }]);
  };

  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: keyof Slot, value: number | string) => {
    const newSlots = slots.map((slot, i) =>
      i === index ? { ...slot, [field]: value } : slot
    );
    setSlots(newSlots);
  };

  const handleSave = async () => {
    // Validate slots before saving
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (!slot.startTime || !slot.endTime) {
        toast.error(`Slot ${i + 1}: Start and end times are required`);
        return;
      }
      if (slot.startTime >= slot.endTime) {
        toast.error(`Slot ${i + 1}: End time must be after start time`);
        return;
      }
    }

    setLoading(true);
    try {
      await onSave(slots);
      toast.success('Availability slots updated successfully!');
    } catch (error) {
      toast.error((error as Error).message || 'Failed to update availability');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-8 shadow-premium border-primary/5">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
        <div>
          <h2 className="text-3xl font-black text-text-primary tracking-tight">Availability Center</h2>
          <p className="text-text-secondary font-medium mt-1">Configure your recurring weekly slots for student consultations.</p>
        </div>
        <Button onClick={addSlot} className="gap-2 px-8 h-12 shadow-lg shadow-primary/10" variant="secondary">
          <Plus className="w-5 h-5" /> New Slot
        </Button>
      </div>

      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 scrollbar-thin">
        {slots.length === 0 ? (
          <div className="text-center py-24 bg-surface-2 rounded-3xl border-2 border-dashed border-border group hover:border-primary/20 transition-all cursor-pointer" onClick={addSlot}>
            <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Calendar className="w-10 h-10 text-text-muted group-hover:text-primary transition-colors" />
            </div>
            <p className="text-text-secondary font-bold text-lg">No slots available</p>
            <p className="text-text-muted text-sm mt-1">Click the button above to add your first recurring slot.</p>
          </div>
        ) : (
          slots.map((slot, index) => (
            <div key={index} className="flex flex-col md:flex-row items-end md:items-center gap-6 p-6 rounded-3xl bg-surface-2 border border-border group hover:border-primary/20 hover:bg-surface-3 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                <Clock className="w-6 h-6" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                {/* Day of Week */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1">Day</label>
                  <div className="grid grid-cols-2 gap-1">
                    {DAY_SHORT.map((label, d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => updateSlot(index, 'dayOfWeek', d)}
                        className={`h-10 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${
                          slot.dayOfWeek === d
                            ? 'bg-primary text-white border-primary'
                            : 'bg-surface border-border text-text-secondary hover:border-primary/50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Start Time */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1">Start Time</label>
                  <input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) => updateSlot(index, 'startTime', e.target.value)}
                    className="w-full h-12 px-4 rounded-2xl border border-border bg-surface focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none font-bold text-sm transition-all"
                  />
                </div>

                {/* End Time */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1">End Time</label>
                  <input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) => updateSlot(index, 'endTime', e.target.value)}
                    className="w-full h-12 px-4 rounded-2xl border border-border bg-surface focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none font-bold text-sm transition-all"
                  />
                </div>

                {/* Timezone */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1">
                    <Globe className="w-3 h-3 inline mr-1" />Timezone
                  </label>
                  <select
                    value={slot.timezone || 'Asia/Kolkata'}
                    onChange={(e) => updateSlot(index, 'timezone', e.target.value)}
                    className="w-full h-12 px-4 rounded-2xl border border-border bg-surface focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none font-bold text-sm transition-all"
                  >
                    <option value="Asia/Kolkata">IST (UTC+5:30)</option>
                    <option value="Asia/Dubai">GST (UTC+4)</option>
                    <option value="America/New_York">EST (UTC-5)</option>
                    <option value="Europe/London">GMT (UTC+0)</option>
                    <option value="Asia/Singapore">SGT (UTC+8)</option>
                    <option value="Australia/Sydney">AEST (UTC+10)</option>
                    <option value="Pacific/Auckland">NZST (UTC+12)</option>
                    <option value="America/Los_Angeles">PST (UTC-8)</option>
                  </select>
                </div>
              </div>
              <button
                onClick={() => removeSlot(index)}
                className="p-4 rounded-2xl bg-white text-error hover:bg-error hover:text-white border border-border hover:border-error transition-all duration-300 shadow-sm"
                title="Remove this slot"
              >
                <Trash2 className="w-6 h-6" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="mt-12 pt-10 border-t border-border flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-4 text-text-muted">
           <div className="p-3 bg-surface-2 rounded-xl">
             <Calendar className="w-5 h-5" />
           </div>
           <div>
             <p className="text-xs font-black uppercase tracking-widest text-text-primary">Recurring Weekly</p>
             <p className="text-[11px] font-medium">Slots repeat every week. Students see upcoming dates for booking.</p>
           </div>
        </div>
        <Button
          onClick={handleSave}
          isLoading={loading}
          className="w-full md:w-auto px-16 h-16 shadow-2xl shadow-primary/30 text-lg font-black"
        >
          Publish All Slots
        </Button>
      </div>
    </Card>
  );
}
