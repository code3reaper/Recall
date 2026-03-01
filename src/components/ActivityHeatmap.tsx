import { useMemo } from 'react';
import {
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  format,
  isSameDay,
  getDay,
  startOfWeek,
  addDays,
  subYears,
} from 'date-fns';
import type { Memory } from '@/types/memory';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ActivityHeatmapProps {
  memories: Memory[];
  onDateClick: (date: Date) => void;
  className?: string;
}

interface DayData {
  date: Date;
  count: number;
  memories: Memory[];
}

export function ActivityHeatmap({ memories, onDateClick, className }: ActivityHeatmapProps) {
  const today = new Date();
  const yearAgo = subYears(today, 1);

  const { days, maxCount, weeks, monthLabels } = useMemo(() => {
    // Get start from beginning of the week a year ago
    const startDate = startOfWeek(yearAgo, { weekStartsOn: 0 });
    const endDate = today;

    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    // Group memories by date
    const memoryByDate = new Map<string, Memory[]>();
    memories.forEach((memory) => {
      const dateKey = format(new Date(memory.created_at), 'yyyy-MM-dd');
      if (!memoryByDate.has(dateKey)) {
        memoryByDate.set(dateKey, []);
      }
      memoryByDate.get(dateKey)!.push(memory);
    });

    const dayData: DayData[] = allDays.map((date) => {
      const dateKey = format(date, 'yyyy-MM-dd');
      const dayMemories = memoryByDate.get(dateKey) || [];
      return {
        date,
        count: dayMemories.length,
        memories: dayMemories,
      };
    });

    const maxCount = Math.max(...dayData.map((d) => d.count), 1);

    // Group into weeks (7 days each)
    const weeks: DayData[][] = [];
    for (let i = 0; i < dayData.length; i += 7) {
      weeks.push(dayData.slice(i, i + 7));
    }

    // Generate month labels
    const monthLabels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, weekIndex) => {
      const firstDay = week[0];
      if (firstDay) {
        const month = firstDay.date.getMonth();
        if (month !== lastMonth) {
          monthLabels.push({
            label: format(firstDay.date, 'MMM'),
            weekIndex,
          });
          lastMonth = month;
        }
      }
    });

    return { days: dayData, maxCount, weeks, monthLabels };
  }, [memories, yearAgo, today]);

  const getIntensityClass = (count: number) => {
    if (count === 0) return 'bg-muted';
    const intensity = count / maxCount;
    if (intensity <= 0.25) return 'bg-accent/30';
    if (intensity <= 0.5) return 'bg-accent/50';
    if (intensity <= 0.75) return 'bg-accent/75';
    return 'bg-accent';
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-display font-semibold">Activity Timeline</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-0.5">
            <div className="w-3 h-3 rounded-sm bg-muted" />
            <div className="w-3 h-3 rounded-sm bg-accent/30" />
            <div className="w-3 h-3 rounded-sm bg-accent/50" />
            <div className="w-3 h-3 rounded-sm bg-accent/75" />
            <div className="w-3 h-3 rounded-sm bg-accent" />
          </div>
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="inline-block">
          {/* Month labels */}
          <div className="flex mb-1 ml-8">
            {monthLabels.map(({ label, weekIndex }, index) => (
              <div
                key={`${label}-${weekIndex}`}
                className="text-xs text-muted-foreground"
                style={{
                  marginLeft: index === 0 ? weekIndex * 14 : (monthLabels[index].weekIndex - monthLabels[index - 1].weekIndex - 1) * 14,
                  width: 'auto',
                  minWidth: 28,
                }}
              >
                {label}
              </div>
            ))}
          </div>

          <div className="flex">
            {/* Day labels */}
            <div className="flex flex-col gap-0.5 mr-2 text-xs text-muted-foreground">
              {weekDays.map((day, index) => (
                <div
                  key={day}
                  className="h-3 flex items-center"
                  style={{ visibility: index % 2 === 1 ? 'visible' : 'hidden' }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            <TooltipProvider delayDuration={100}>
              <div className="flex gap-0.5">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-0.5">
                    {week.map((day) => (
                      <Tooltip key={day.date.toISOString()}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => day.count > 0 && onDateClick(day.date)}
                            className={cn(
                              'w-3 h-3 rounded-sm transition-all',
                              getIntensityClass(day.count),
                              day.count > 0 && 'hover:ring-2 hover:ring-accent/50 cursor-pointer'
                            )}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <p className="font-medium">{format(day.date, 'MMM d, yyyy')}</p>
                          <p className="text-muted-foreground">
                            {day.count === 0
                              ? 'No memories'
                              : `${day.count} ${day.count === 1 ? 'memory' : 'memories'}`}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                ))}
              </div>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
