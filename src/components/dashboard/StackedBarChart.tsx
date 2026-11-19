import React, { useState } from 'react';
import type { DayScreeningStat } from '../../types/kyc';

interface StackedBarChartProps {
  data: DayScreeningStat[];
  totalScreenings: number;
  totalPotential: number;
}

export const StackedBarChart: React.FC<StackedBarChartProps> = ({
  data,
  totalScreenings,
  totalPotential,
}) => {
  const [hoveredDay, setHoveredDay] = useState<DayScreeningStat | null>(null);

  // Maximum scale value for Y-axis (round up to next even number or at least 6)
  const maxVal = Math.max(6, ...data.map((d) => d.total));
  const maxScale = Math.ceil(maxVal / 2) * 2; // e.g. 6 or 8

  const yTicks = [maxScale, Math.round((maxScale * 2) / 3), Math.round(maxScale / 3), 0];

  const dateRangeLabel = (() => {
    if (!data || data.length === 0) return 'Last 14 days';
    const first = data[0];
    const last = data[data.length - 1];
    const firstDate = new Date(first.date);
    const lastDate = new Date(last.date);
    if (!isNaN(firstDate.getTime()) && !isNaN(lastDate.getTime())) {
      const firstMonth = firstDate.toLocaleString('en-US', { month: 'short' });
      const lastMonth = lastDate.toLocaleString('en-US', { month: 'short' });
      if (firstMonth === lastMonth) {
        return `${first.dayNumber}–${last.dayNumber} ${lastMonth}`;
      }
      return `${first.dayNumber} ${firstMonth}–${last.dayNumber} ${lastMonth}`;
    }
    return `${first.dayNumber}–${last.dayNumber}`;
  })();

  const ariaSummary = `Screenings per day: ${totalScreenings} screenings, ${totalPotential} potential matches across ${data.length} days from ${dateRangeLabel}.`;

  return (
    <div
      className="chart-card"
      style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        boxSizing: 'border-box',
      }}
      aria-label={ariaSummary}
      role="region"
    >
      {/* Chart Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '16px',
        }}
      >
        <div>
          <h3
            style={{
              margin: '0 0 4px 0',
              fontSize: '16px',
              fontWeight: 600,
              color: '#111827',
            }}
          >
            Screenings per day
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: '#6B7280',
            }}
          >
            {totalScreenings} screenings · {totalPotential} potential matches · {dateRangeLabel}
          </p>
        </div>

        {/* Legend */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            fontSize: '12px',
            color: '#4B5563',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                backgroundColor: '#D13438',
                display: 'inline-block',
              }}
            />
            <span>Potential match</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                backgroundColor: '#D8CEDB',
                display: 'inline-block',
              }}
            />
            <span>No match</span>
          </div>
        </div>
      </div>

      {/* Chart Plot Area */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flex: 1,
          minHeight: '180px',
          paddingTop: '10px',
          paddingBottom: '24px',
        }}
      >
        {/* Y-Axis Ticks */}
        <div
          style={{
            width: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            fontSize: '11px',
            color: '#9CA3AF',
            paddingRight: '6px',
            height: '160px',
            userSelect: 'none',
          }}
        >
          {yTicks.map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>

        {/* Chart Grid & Bars Container */}
        <div
          style={{
            position: 'relative',
            flex: 1,
            height: '160px',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            paddingLeft: '6px',
            paddingRight: '4px',
          }}
        >
          {/* Horizontal Gridlines */}
          {yTicks.map((tick, idx) => {
            const topPct = (idx / (yTicks.length - 1)) * 100;
            return (
              <div
                key={tick}
                style={{
                  position: 'absolute',
                  top: `${topPct}%`,
                  left: 0,
                  right: 0,
                  height: '1px',
                  backgroundColor: tick === 0 ? '#E5E7EB' : '#F3F4F6',
                  zIndex: 0,
                }}
              />
            );
          })}

          {/* Day Columns */}
          {data.map((day) => {
            const totalPct = (day.total / maxScale) * 100;
            const clearedPct = day.total > 0 ? (day.cleared / day.total) * 100 : 0;
            const potentialPct = day.total > 0 ? (day.potential / day.total) * 100 : 0;

            const isHovered = hoveredDay?.date === day.date;

            return (
              <div
                key={day.date}
                onMouseEnter={() => setHoveredDay(day)}
                onMouseLeave={() => setHoveredDay(null)}
                style={{
                  position: 'relative',
                  flex: 1,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  zIndex: 1,
                  cursor: 'pointer',
                  padding: '0 2px',
                }}
              >
                {/* Stacked Bar */}
                <div
                  style={{
                    width: '100%',
                    maxWidth: '24px',
                    height: `${totalPct}%`,
                    display: 'flex',
                    flexDirection: 'column-reverse',
                    borderRadius: '3px 3px 0 0',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                    boxShadow: isHovered ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
                    transform: isHovered ? 'scaleY(1.03)' : 'scaleY(1)',
                    transformOrigin: 'bottom',
                  }}
                >
                  {/* Cleared Segment (Bottom) */}
                  {day.cleared > 0 && (
                    <div
                      style={{
                        height: `${clearedPct}%`,
                        backgroundColor: isHovered ? '#BEB0C3' : '#D8CEDB',
                        width: '100%',
                        transition: 'background-color 0.15s ease',
                      }}
                    />
                  )}

                  {/* Potential Match Segment (Top) */}
                  {day.potential > 0 && (
                    <div
                      style={{
                        height: `${potentialPct}%`,
                        backgroundColor: isHovered ? '#B91C1C' : '#D13438',
                        width: '100%',
                        transition: 'background-color 0.15s ease',
                      }}
                    />
                  )}
                </div>

                {/* X-axis Label */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-22px',
                    fontSize: day.isToday ? '11px' : '11px',
                    fontWeight: day.isToday ? 700 : 500,
                    color: day.isToday ? '#831B84' : '#6B7280',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {day.dayLabel}
                </div>

                {/* Hover Tooltip */}
                {isHovered && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '105%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: '#1F2937',
                      color: '#FFFFFF',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      zIndex: 20,
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '2px' }}>
                      {day.isToday ? 'Today' : `${day.dayNumber} Nov 2026`}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span>Total: {day.total}</span>
                      <span style={{ color: '#FCA5A5' }}>Potential: {day.potential}</span>
                      <span style={{ color: '#E9D5FF' }}>No match: {day.cleared}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
