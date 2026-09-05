// Generic table.
// columns: [{ key, header, render?(row) }]
// rows: array of data objects
// rowKey: field name (or function) used as the React key for each row
export default function Table({ columns, rows, rowKey = "id", emptyMessage = "No data available." }) {
  const getKey = (row, i) =>
    typeof rowKey === "function" ? rowKey(row) : row[rowKey] ?? i;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-gray-500 border-b border-gray-100">
            {columns.map((col) => (
              <th key={col.key} className="py-2 px-2 font-semibold">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-6 px-2 text-center text-gray-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={getKey(row, i)} className="border-b border-gray-100 last:border-0">
                {columns.map((col) => (
                  <td key={col.key} className="py-3 px-2 text-gray-700">
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
