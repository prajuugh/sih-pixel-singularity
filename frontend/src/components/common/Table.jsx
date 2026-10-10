// Generic table.
// columns: [{ key, header, render?(row) }]
// rows: array of data objects
// rowKey: field name (or function) used as the React key for each row
export default function Table({ columns, rows, rowKey = "id", emptyMessage = "No data available." }) {
  const getKey = (row, i) =>
    typeof rowKey === "function" ? rowKey(row) : row[rowKey] ?? i;

  return (
    <div className="overflow-x-auto rounded-lg border border-[#e3e5e4]">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50/80">
          <tr className="border-b border-gray-100 text-gray-500">
            {columns.map((col) => (
              <th key={col.key} className={`px-3 py-2.5 font-semibold ${col.className || ""}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-10 text-center text-gray-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={getKey(row, i)}
                className="border-b border-gray-100 transition-colors duration-150 last:border-0 hover:bg-gray-50/70"
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-3 py-3 text-gray-700 ${col.className || ""}`}>
                    {col.render ? col.render(row, i) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
