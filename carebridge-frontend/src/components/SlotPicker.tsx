
export interface SlotData {
  id: number;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  available: boolean;
}

interface SlotPickerProps {
  slots: SlotData[];
  selectedSlotId: number | null;
  onSelect: (slot: SlotData) => void;
  loading: boolean;
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export function SlotPicker({ slots, selectedSlotId, onSelect, loading }: SlotPickerProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading available slots...</p>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-6 rounded-xl border border-dashed border-slate-700 bg-slate-800/40">
        <p className="text-slate-400 font-semibold text-sm">No slots available for this date</p>
        <p className="text-slate-500 text-xs mt-1">
          The provider may be on leave or fully booked. Try another date.
        </p>
      </div>
    );
  }

  const available = slots.filter((s) => s.available);
  const unavailable = slots.filter((s) => !s.available);

  return (
    <div className="space-y-4">
      {available.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
            Available ({available.length})
          </p>
          <div className="grid grid-cols-3 gap-2">
            {available.map((slot) => {
              const isSelected = slot.id === selectedSlotId;
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => onSelect(slot)}
                  className={`
                    py-2 px-1 rounded-xl text-xs font-bold text-center transition-all duration-150 border
                    ${isSelected
                      ? "bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/30 scale-105"
                      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 hover:scale-105"
                    }
                  `}
                >
                  {formatTime(slot.startTime)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {unavailable.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Booked / Unavailable ({unavailable.length})
          </p>
          <div className="grid grid-cols-3 gap-2">
            {unavailable.map((slot) => (
              <button
                key={slot.id}
                type="button"
                disabled
                className="py-2 px-1 rounded-xl text-xs font-bold text-center border border-slate-700 bg-slate-800/60 text-slate-600 cursor-not-allowed line-through"
              >
                {formatTime(slot.startTime)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
