'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export interface TimeSlot {
  id: string;
  date: string;
  time: string;
  available: boolean;
}

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selectedSlot: string | null;
  onSelectSlot: (slotId: string) => void;
  disabled?: boolean;
}

export function TimeSlotPicker({
  slots,
  selectedSlot,
  onSelectSlot,
  disabled = false,
}: TimeSlotPickerProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    return new Date(now.setDate(diff));
  });

  // Get dates for the current week
  const getWeekDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  // Format date for display
  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  // Get slots for a specific date
  const getSlotsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return slots.filter((slot) => slot.date === dateStr);
  };

  // Navigate to previous week
  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  // Navigate to next week
  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const weekDates = getWeekDates();

  return (
    <Card variant="elevated">
      <div className="p-6">
        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPreviousWeek}
            disabled={disabled}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-400" />
            <span className="font-medium text-slate-900">
              {weekDates[0].toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
              })}{' '}
              -{' '}
              {weekDates[6].toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextWeek}
            disabled={disabled}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Time Slots Grid */}
        <div className="space-y-4">
          {weekDates.map((date) => {
            const daySlots = getSlotsForDate(date);
            if (daySlots.length === 0) {
              return null;
            }

            return (
              <div key={date.toISOString()}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-slate-900">
                    {formatDate(date)}
                  </span>
                  <span className="text-sm text-slate-500">
                    {date.toLocaleDateString('en-US', { weekday: 'long' })}
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {daySlots.map((slot) => (
                    <motion.button
                      key={slot.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => !disabled && slot.available && onSelectSlot(slot.id)}
                      disabled={disabled || !slot.available}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        selectedSlot === slot.id
                          ? 'bg-teal-500 text-white border-teal-500'
                          : slot.available
                          ? 'bg-white text-slate-700 border-slate-300 hover:border-teal-500'
                          : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{slot.time}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* No Slots Message */}
        {weekDates.every((date) => getSlotsForDate(date).length === 0) && (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">No available slots this week</p>
            <Button
              variant="secondary"
              className="mt-4"
              onClick={goToNextWeek}
              disabled={disabled}
            >
              Check Next Week
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
