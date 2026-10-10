import { useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import Navbar from "../../components/common/Navbar";
import Sidebar from "../../components/common/Sidebar";
import Table from "../../components/common/Table";
import { fetchTasksByDate } from "../../utils/api";

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function OfficerCalendar() {
  const [viewMode, setViewMode] = useState("Monthly");
  const [cursor, setCursor] = useState(new Date(2026, 8, 1)); // September 2026
  const [selectedKey, setSelectedKey] = useState("2026-09-11");
  const [tasksByDate, setTasksByDate] = useState({});

  useEffect(() => {
    fetchTasksByDate().then(setTasksByDate);
  }, []);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, muted: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, muted: false, key: toKey(year, month, d) });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: cells.length - (firstDayOfWeek + daysInMonth) + 1, muted: true });
  }

  const changeMonth = (delta) => setCursor(new Date(year, month + delta, 1));
  const selectedTasks = tasksByDate[selectedKey] || [];

  const columns = [
    { key: "id", header: "Request ID" },
    { key: "name", header: "Task Name" },
    { key: "department", header: "Department" },
    { key: "description", header: "Description" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 p-4 pb-20 md:p-6 md:pb-6 xl:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <CalendarDays className="text-[#b83825]" size={24} />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Maintenance Calendar</h2>
                <p className="text-gray-500 text-sm">
                  View scheduled maintenance tasks across all departments.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                aria-label="Calendar view"
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                className="border border-[#cf432c] text-[#b83825] font-semibold rounded-lg px-3 py-2"
              >
                <option>Monthly</option>
                <option>Weekly</option>
                <option>Yearly</option>
              </select>
              <button
                onClick={() => setCursor(new Date())}
                className="rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-700 transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-gray-200 active:scale-[0.96]"
              >
                Today
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_rgb(0_0_0/0.04)] ring-1 ring-black/[0.05]">
            <div className="flex items-center justify-between mb-4">
              <button aria-label="Previous month" onClick={() => changeMonth(-1)} className="inline-flex size-10 items-center justify-center rounded-xl transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-gray-100 active:scale-[0.96]">
                <ChevronLeft size={18} strokeWidth={2} />
              </button>
              <h3 className="font-bold text-[#b83825] text-lg">
                {monthNames[month]} {year}
              </h3>
              <button aria-label="Next month" onClick={() => changeMonth(1)} className="inline-flex size-10 items-center justify-center rounded-xl transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-gray-100 active:scale-[0.96]">
                <ChevronRight size={18} strokeWidth={2} />
              </button>
            </div>

            <p className="text-xs text-gray-400 flex items-center gap-4 mb-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-600 inline-block" />
                Scheduled task
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
                No task scheduled
              </span>
            </p>

            <div className="grid grid-cols-7 text-center text-sm font-semibold text-gray-500 border-b border-gray-100 pb-2 mb-1">
              {weekdays.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 text-center">
              {cells.map((cell, i) => {
                const hasTask = cell.key && tasksByDate[cell.key];
                const isSelected = cell.key === selectedKey;
                return (
                  <button
                    key={i}
                    disabled={cell.muted}
                    onClick={() => cell.key && setSelectedKey(cell.key)}
                    className={`flex h-16 flex-col items-center justify-start gap-1 border border-gray-50 pt-2 transition-[color,background-color,box-shadow,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.96] ${
                      cell.muted ? "text-gray-300" : "text-gray-700 hover:bg-[#fff5f2]"
                    } ${isSelected ? "bg-[#fff5f2] ring-1 ring-[#cf432c]/30" : ""}`}
                  >
                    <span className={isSelected ? "font-bold text-[#b83825]" : ""}>
                      {cell.day}
                    </span>
                    {hasTask && <span className="w-1.5 h-1.5 rounded-full bg-green-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_rgb(0_0_0/0.04)] ring-1 ring-black/[0.05]">
            <h3 className="font-bold text-gray-900 mb-4">
              Tasks on {selectedKey ? new Date(selectedKey).toDateString() : "—"}
            </h3>
            {selectedTasks.length === 0 ? (
              <p className="text-sm text-gray-400">No tasks scheduled for this day.</p>
            ) : (
              <Table columns={columns} rows={selectedTasks} rowKey="id" />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
