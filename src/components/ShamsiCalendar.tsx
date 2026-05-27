import React, { useEffect } from 'react';
import moment from 'moment-jalaali';

interface ShamsiCalendarProps {
  calendarOpen: boolean;
  setCalendarOpen: (open: boolean) => void;
  curY: number;
  setCurY: (y: number) => void;
  curM: number;
  setCurM: (m: number) => void;
  selY: number;
  selM: number;
  selD: number;
  onDayClick: (day: number) => void;
}

const monthNames = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const weekDays = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

export const ShamsiCalendar: React.FC<ShamsiCalendarProps> = ({
  calendarOpen,
  setCalendarOpen,
  curY,
  setCurY,
  curM,
  setCurM,
  selY,
  selM,
  selD,
  onDayClick
}) => {
  
  const getMonthDays = (y: number, m: number) => {
    if (m <= 6) return 31;
    if (m <= 11) return 30;
    const isLeap = moment(`${y}/12/01`, 'jYYYY/jMM/jDD').isLeapYear();
    return isLeap ? 30 : 29;
  };

  const buildCalendarDays = () => {
    const days = getMonthDays(curY, curM);
    const firstDay = moment(`${curY}/${curM}/1`, 'jYYYY/jMM/jDD');
    let startWeekday = firstDay.day(); // 0=شنبه
    const calDays: (number | null)[] = [];
    for (let i = 0; i < startWeekday; i++) calDays.push(null);
    for (let d = 1; d <= days; d++) calDays.push(d);
    return calDays;
  };

  const prevMonth = () => {
    if (curM === 1) {
      setCurY(curY - 1);
      setCurM(12);
    } else {
      setCurM(curM - 1);
    }
  };

  const nextMonth = () => {
    if (curM === 12) {
      setCurY(curY + 1);
      setCurM(1);
    } else {
      setCurM(curM + 1);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (calendarOpen && !(e.target as HTMLElement).closest(".calendar-container")) {
        setCalendarOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [calendarOpen, setCalendarOpen]);

  if (!calendarOpen) return null;

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 rounded-xl p-3 z-20 border border-amber-500/50 shadow-lg">
      <div className="flex justify-between items-center mb-2 text-amber-300">
        <button onClick={prevMonth} className="px-2 text-lg">◀</button>
        <span>{monthNames[curM - 1]} {curY}</span>
        <button onClick={nextMonth} className="px-2 text-lg">▶</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-blue-200 mb-1">
        {weekDays.map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {buildCalendarDays().map((day, idx) => (
          <div
            key={idx}
            onClick={() => day !== null && onDayClick(day)}
            className={`text-center text-sm py-1 rounded-md cursor-pointer ${
              day === null
                ? "bg-transparent"
                : day === selD && curY === selY && curM === selM
                ? "bg-orange-500 text-black font-bold"
                : "hover:bg-amber-600/50 text-white"
            }`}
          >
            {day !== null ? day : ""}
          </div>
        ))}
      </div>
    </div>
  );
};