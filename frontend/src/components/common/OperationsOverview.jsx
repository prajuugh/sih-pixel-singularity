import { ArrowUpRight, CalendarDays, Gauge, Layers3 } from "lucide-react";
import { Link } from "react-router-dom";
import Table from "./Table";

export default function OperationsOverview({
  eyebrow,
  title,
  subtitle,
  stats,
  statMeta,
  upcoming,
  columns,
  calendarPath,
  getMetricRoute,
  alertBanner = null,
  tableTitle = "Upcoming maintenance",
  tableSubtitle = "Confirmed possession windows ordered for operational review.",
}) {
  const values = stats.map(({ value }) => Number(value) || 0);
  const maxValue = Math.max(...values, 1);
  const total = Number(stats.find(({ key }) => key === "total")?.value) || 0;
  const approved = Number(stats.find(({ key }) => key === "approved")?.value) || 0;
  const approvalRate = total ? Math.min(100, Math.round((approved / total) * 100)) : 0;

  const renderCardContent = (stat, hasLink = false) => {
    const meta = statMeta[stat.key] || statMeta.total;
    const Icon = meta.icon;

    return (
      <div className="flex flex-col justify-between w-full h-full min-w-0">
        {/* Top: Text starting from left above emoji */}
        <div className="flex items-start justify-between gap-1 min-h-[2rem]">
          <p
            className="text-[11px] xl:text-xs font-medium text-gray-500 line-clamp-2 leading-snug"
            title={stat.label}
          >
            {stat.label}
          </p>
          {hasLink && (
            <ArrowUpRight
              size={12}
              className="text-gray-300 group-hover:text-[#cf432c] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 mt-0.5"
            />
          )}
        </div>

        {/* Bottom: Emoji on left + Number */}
        <div className="flex items-center gap-2 pt-1 mt-auto">
          <div className={`${meta.bg} rounded-md p-1.5 shrink-0 transition-transform group-hover:scale-105`}>
            <Icon className={meta.iconColor} size={16} strokeWidth={2} />
          </div>
          <span className="text-xl xl:text-2xl font-bold tracking-tight text-gray-950 leading-none">
            {stat.value}
          </span>
        </div>
      </div>
    );
  };

  return (
    <main className="min-w-0 flex-1 p-4 pb-20 md:p-6 md:pb-6 xl:p-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-1 text-xs font-semibold text-[#cf432c]">
              {eyebrow}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
              {title}
            </h2>
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          </div>
          <Link
            to={calendarPath}
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors duration-150 hover:border-[#cf432c] hover:text-[#b83825] sm:self-auto shadow-2xs"
          >
            <CalendarDays size={16} strokeWidth={2} />
            Calendar
            <ArrowUpRight size={15} strokeWidth={2} />
          </Link>
        </header>

        {/* Actionable Alert Banner (if any pending items require urgent action) */}
        {alertBanner && (
          <div className="mb-6 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50/70 to-white p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all hover:shadow-xs">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-amber-100 p-2.5 text-amber-800 shrink-0 mt-0.5 shadow-2xs">
                <alertBanner.icon size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-sm text-gray-950">{alertBanner.title}</h4>
                  {alertBanner.count != null && (
                    <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-900">
                      {alertBanner.count} {alertBanner.countLabel || "Action Required"}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-gray-600 leading-relaxed">
                  {alertBanner.description}
                </p>
              </div>
            </div>
            <Link
              to={alertBanner.to}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 shrink-0 rounded-lg bg-[#cf432c] hover:bg-[#b83825] text-white px-4 text-xs font-bold shadow-xs transition-colors"
            >
              <span>{alertBanner.actionText || "Review Now"}</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-12">
          <section className="overflow-hidden rounded-xl border border-[#e3e5e4] bg-white xl:col-span-9 shadow-2xs">
            <div className={`grid grid-cols-2 sm:grid-cols-3 ${stats.length === 5 ? "lg:grid-cols-5" : stats.length === 6 ? "lg:grid-cols-6" : "lg:grid-cols-4"} border-b border-gray-100`}>
              {stats.map((stat) => {
                const target = getMetricRoute?.(stat.key);
                const classes =
                  "flex flex-col justify-between p-2.5 sm:px-3 sm:py-3 xl:px-3.5 xl:py-3.5 text-left border-r border-gray-100 last:border-r-0 min-w-0";

                return target ? (
                  <Link
                    key={stat.key}
                    to={target}
                    className={`${classes} group transition-all duration-150 hover:bg-[#fff7f5] cursor-pointer`}
                    title={`Click to open ${stat.label}`}
                  >
                    {renderCardContent(stat, true)}
                  </Link>
                ) : (
                  <div key={stat.key} className={classes}>
                    {renderCardContent(stat, false)}
                  </div>
                );
              })}
            </div>

            <div className="p-4 sm:p-6">
              <div className="mb-5 flex items-start gap-3">
                <div className="rounded-lg bg-[#fbeae7] p-2.5 text-[#b83825]">
                  <CalendarDays size={20} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-950">{tableTitle}</h3>
                  <p className="text-xs text-gray-500">{tableSubtitle}</p>
                </div>
              </div>
              <Table columns={columns} rows={upcoming} rowKey="requestId" />
            </div>
          </section>

          <aside className="grid gap-4 sm:grid-cols-2 xl:col-span-3 xl:grid-cols-1">
            <section className="rounded-xl border border-[#e3e5e4] bg-white p-5">
              <div className="mb-5 flex items-center gap-2">
                <Layers3 size={18} strokeWidth={2} className="text-[#b83825]" />
                <h3 className="text-sm font-semibold text-gray-950">Workload mix</h3>
              </div>
              <div className="space-y-4">
                {stats.map(({ key, label, value }) => (
                  <div key={key}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                      <span className="truncate text-gray-500">{label}</span>
                      <span className="font-semibold tabular-nums text-gray-800">{value}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-[#cf432c]"
                        style={{ width: `${((Number(value) || 0) / maxValue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="relative overflow-hidden rounded-xl bg-[#171918] p-5 text-white">
              <div className="absolute -right-10 -top-10 size-32 rounded-full border-[20px] border-white/[0.05]" />
              <div className="relative">
                <div className="mb-5 flex items-center gap-2 text-white/70">
                  <Gauge size={18} strokeWidth={2} />
                  <h3 className="text-sm font-semibold">Approval coverage</h3>
                </div>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-4xl font-semibold tracking-tight tabular-nums">
                      {approvalRate}%
                    </p>
                    <p className="mt-1 max-w-36 text-xs leading-relaxed text-white/55">
                      Approved requests against the current total.
                    </p>
                  </div>
                  <div
                    className="grid size-20 shrink-0 place-items-center rounded-full"
                    style={{
                      background: `conic-gradient(#cf432c ${approvalRate * 3.6}deg, rgb(255 255 255 / 0.12) 0deg)`,
                    }}
                  >
                    <div className="size-14 rounded-full bg-[#171918]" />
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
