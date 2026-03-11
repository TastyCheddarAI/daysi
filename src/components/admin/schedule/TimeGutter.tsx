import { format } from "date-fns";

interface TimeGutterProps {
  timeSlots: number[];
  slotHeight: number;
}

export function TimeGutter({ timeSlots, slotHeight }: TimeGutterProps) {
  return (
    <div className="w-14 sm:w-20 shrink-0 border-r relative">
      {timeSlots.map((hour, idx) => {
        // Create a date object for formatting
        const timeDate = new Date();
        timeDate.setHours(hour, 0, 0, 0);

        return (
          <div
            key={hour}
            className="absolute left-0 right-0 flex items-start justify-end pr-1 sm:pr-2 text-[10px] sm:text-xs text-muted-foreground"
            style={{ top: idx * slotHeight, height: slotHeight }}
          >
            <span className="mt-[-0.5em]">
              {format(timeDate, "h a")}
            </span>
          </div>
        );
      })}
    </div>
  );
}
