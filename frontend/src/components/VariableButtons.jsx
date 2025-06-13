import React from 'react'
import { Plus } from 'lucide-react'

const VariableButtons = ({ columns, onInsertVariable }) => (
  <div className="flex flex-wrap gap-2 mb-4">
    {columns.map((column, idx) => (
      <button
        key={idx}
        onClick={() => onInsertVariable(column)}
        className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors duration-200 flex items-center text-sm font-medium"
      >
        <Plus className="mr-1" size={14} />
        {column}
      </button>
    ))}
  </div>
)

export default VariableButtons