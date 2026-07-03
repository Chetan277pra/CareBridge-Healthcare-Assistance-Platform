import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SlotPicker, SlotData } from "./SlotPicker";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    appointmentDate: string;
    appointmentTime: string;
    reasonForVisit: string;
    notes: string;
    slotId: number | null;
  }) => Promise<void>;
  providerName: string;
  providerId: number | null;
  providerType: "THERAPIST" | "HOSPITAL" | null;
}

const TODAY = new Date().toISOString().split("T")[0];

export function BookingModal({
  isOpen,
  onClose,
  onSubmit,
  providerName,
  providerId,
  providerType,
}: BookingModalProps) {
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<SlotData[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SlotData | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setDate("");
      setSlots([]);
      setSelectedSlot(null);
      setReason("");
      setNotes("");
      setErrors({});
    }
  }, [isOpen]);

  // Fetch slots whenever date or provider changes
  const fetchSlots = useCallback(async (selectedDate: string) => {
    if (!selectedDate || !providerId || !providerType) return;

    setSlotsLoading(true);
    setSlots([]);
    setSelectedSlot(null);
    try {
      const token = localStorage.getItem("token");
      const endpoint =
        providerType === "THERAPIST"
          ? `${API_BASE}/api/availability/therapist/${providerId}?date=${selectedDate}`
          : `${API_BASE}/api/availability/hospital/${providerId}?date=${selectedDate}`;

      const res = await axios.get(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setSlots(res.data);
    } catch (err) {
      console.error("Failed to load slots:", err);
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [providerId, providerType]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setDate(newDate);
    setErrors((prev) => ({ ...prev, date: "" }));
    if (newDate) fetchSlots(newDate);
  };

  const handleSlotSelect = (slot: SlotData) => {
    setSelectedSlot(slot);
    setErrors((prev) => ({ ...prev, slot: "" }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!date) {
      newErrors.date = "Please select a date";
    }
    if (!selectedSlot) {
      newErrors.slot = "Please select an available time slot";
    }
    if (!reason.trim()) {
      newErrors.reason = "Reason for visit is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await onSubmit({
        appointmentDate: date,
        appointmentTime: selectedSlot!.startTime,
        reasonForVisit: reason,
        notes,
        slotId: selectedSlot!.id,
      });
      onClose();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        "Failed to book appointment. Please try again.";
      setErrors((prev) => ({ ...prev, form: message }));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <Card className="w-full max-w-lg bg-slate-900 border border-slate-700 shadow-2xl rounded-3xl overflow-hidden text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 border-b border-slate-800 flex-shrink-0">
          <CardTitle className="text-xl font-bold">Book Appointment</CardTitle>
          <p className="text-indigo-100 text-sm mt-1">
            With <span className="font-semibold">{providerName}</span>
          </p>
        </CardHeader>

        {/* Scrollable body */}
        <CardContent className="p-6 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Step 1 — Date */}
            <div className="space-y-1.5">
              <Label htmlFor="booking-date" className="text-slate-300 font-semibold">
                1. Select Date
              </Label>
              <Input
                id="booking-date"
                type="date"
                value={date}
                min={TODAY}
                onChange={handleDateChange}
                className={`bg-slate-800 border-slate-700 text-white ${
                  errors.date ? "border-red-500" : ""
                }`}
              />
              {errors.date && (
                <p className="text-red-400 text-xs font-semibold">{errors.date}</p>
              )}
            </div>

            {/* Step 2 — Slot Picker */}
            {date && (
              <div className="space-y-2">
                <Label className="text-slate-300 font-semibold">2. Select Time Slot</Label>
                <div className="bg-slate-800/60 rounded-2xl border border-slate-700 p-4">
                  <SlotPicker
                    slots={slots}
                    selectedSlotId={selectedSlot?.id ?? null}
                    onSelect={handleSlotSelect}
                    loading={slotsLoading}
                  />
                </div>
                {selectedSlot && (
                  <p className="text-indigo-300 text-xs font-semibold pl-1">
                    ✓ Selected: {selectedSlot.startTime} – {selectedSlot.endTime}
                  </p>
                )}
                {errors.slot && (
                  <p className="text-red-400 text-xs font-semibold">{errors.slot}</p>
                )}
              </div>
            )}

            {/* Step 3 — Reason */}
            <div className="space-y-1.5">
              <Label htmlFor="booking-reason" className="text-slate-300 font-semibold">
                3. Reason for Visit
              </Label>
              <Input
                id="booking-reason"
                type="text"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setErrors((prev) => ({ ...prev, reason: "" }));
                }}
                placeholder="Brief reason for your visit..."
                className={`bg-slate-800 border-slate-700 text-white ${
                  errors.reason ? "border-red-500" : ""
                }`}
              />
              {errors.reason && (
                <p className="text-red-400 text-xs font-semibold">{errors.reason}</p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="booking-notes" className="text-slate-300">
                Notes <span className="text-slate-500 font-normal">(Optional)</span>
              </Label>
              <textarea
                id="booking-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes for the provider..."
                className="w-full min-h-[72px] rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white shadow-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
              />
            </div>

            {/* Global error */}
            {errors.form && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/40 p-3 text-red-400 text-sm font-semibold">
                ⚠ {errors.form}
              </div>
            )}

            {/* Summary + Actions */}
            {selectedSlot && date && (
              <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-3 text-xs text-indigo-300 space-y-1">
                <p className="font-bold text-indigo-200">Appointment Summary</p>
                <p>📅 {new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
                <p>🕐 {selectedSlot.startTime} – {selectedSlot.endTime}</p>
                <p>👤 {providerName}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 rounded-xl bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !selectedSlot}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-bold disabled:opacity-50"
              >
                {submitting ? "Booking..." : "Confirm Booking"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
