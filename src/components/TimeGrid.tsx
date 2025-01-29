import { TimeGridEntry } from '../types/index';

interface TimeGridProps {
  entries: TimeGridEntry[];
}

export function TimeGrid({ entries }: TimeGridProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[600px]">
        <thead>
          <tr className="border-b border-brown-200">
            <th className="py-2 px-4 text-left">Date</th>
            <th className="py-2 px-4 text-left">Clock In</th>
            <th className="py-2 px-4 text-left">Break Start</th>
            <th className="py-2 px-4 text-left">Break End</th>
            <th className="py-2 px-4 text-left">Clock Out</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={index} className="border-b border-brown-100">
              <td className="py-2 px-4">{entry.date.toLocaleDateString()}</td>
              <td className="py-2 px-4">{entry.clockIn?.toLocaleTimeString() || '-'}</td>
              <td className="py-2 px-4">{entry.breakStart?.toLocaleTimeString() || '-'}</td>
              <td className="py-2 px-4">{entry.breakEnd?.toLocaleTimeString() || '-'}</td>
              <td className="py-2 px-4">{entry.clockOut?.toLocaleTimeString() || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}