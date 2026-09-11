import { BarChart3 } from "lucide-react";
import Card from "../common/Card";

export default function DeptStatsCard({ departments }) {
  return (
    <Card title="Users by Department" icon={BarChart3}>
      <div className="flex flex-col gap-4">
        {departments.map((d) => (
          <div key={d.name} className="flex items-center gap-4">
            <span className="w-32 text-sm text-gray-600 shrink-0">{d.name}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#171918]"
                style={{ width: `${(d.count / d.max) * 100}%` }}
              />
            </div>
            <span className="w-16 text-sm text-gray-500 text-right shrink-0">
              {d.count} users
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
