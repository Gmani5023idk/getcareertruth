'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Plus, Trash2, Calendar, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface Slot {
  start: string;
  end: string;
}

interface SlotEditorProps {
  initialSlots: Slot[];
  onSave: (slots: Slot[]) => Promise<void>;
}

export default function SlotEditor({ initialSlots, onSave }: SlotEditorProps) {
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [loading, setLoading] = useState(false);

  const addSlot = () => {
    // Default slot: tomorrow 10:00 AM to 10:15 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    
    const end = new Date(tomorrow);
    end.setMinutes(end.getMinutes() + 15);

    setSlots([...slots, { 
      start: tomorrow.toISOString(), 
      end: end.toISOString() 
    }]);
  };

  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: 'start' | 'end', value: string) => {
    const newSlots = [...slots];
    const date = new Date(value);
    newSlots[index] = { ...newSlots[index], [field]: date.toISOString() };
    setSlots(newSlots);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(slots);
      toast.success('Availability slots updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update availability');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-8 shadow-premium border-primary/5">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
        <div>
          <h2 className="text-3xl font-black text-text-primary tracking-tight">Availability Center</h2>
          <p className="text-text-secondary font-medium mt-1">Configure your open slots for student consultations.</p>
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
            <p className="text-text-muted text-sm mt-1">Click the button above to add your first session slot.</p>
          </div>
        ) : (
          slots.map((slot, index) => (
            <div key={index} className="flex flex-col md:flex-row items-end md:items-center gap-6 p-6 rounded-3xl bg-surface-2 border border-border group hover:border-primary/20 hover:bg-surface-3 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                <Clock className="w-6 h-6" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1">Session Start</label>
                  <input 
                    type="datetime-local" 
                    value={new Date(new Date(slot.start).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} 
                    onChange={(e) => updateSlot(index, 'start', e.target.value)}
                    className="w-full h-12 px-5 rounded-2xl border border-border bg-surface focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none font-bold text-sm transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1">Session End</label>
                  <input 
                    type="datetime-local" 
                    value={new Date(new Date(slot.end).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} 
                    onChange={(e) => updateSlot(index, 'end', e.target.value)}
                    className="w-full h-12 px-5 rounded-2xl border border-border bg-surface focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none font-bold text-sm transition-all"
                  />
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
             <p className="text-xs font-black uppercase tracking-widest text-text-primary">Live Sync</p>
             <p className="text-[11px] font-medium">Slots are visible to students immediately after saving.</p>
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
