import React, { FC, useState } from "react"
import { useTranslation } from "@/hooks/useTranslation"
interface ColumnSelectorProps {
  visibleColumns: Record<string, boolean>
  onToggleColumn: (column: string) => void
}

const ColumnSelector: FC<ColumnSelectorProps> = ({
  visibleColumns,
  onToggleColumn
}) => {
  const { t } = useTranslation()
  const [isCollapsed, setIsCollapsed] = useState(true)

  const handleToggle = () => {
    setIsCollapsed(prev => !prev)
  }

  return (
    <div className='relative'>
      <button
        onClick={handleToggle}
        className='flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-transform'
        aria-expanded={!isCollapsed}
        aria-label='Configure visible columns'
        data-cy='column-selector'
      >
        <span>{t("Configure Columns")}</span>
        <svg
          className={`w-4 h-4 transform transition-transform ${
            isCollapsed ? "rotate-0" : "rotate-180"
          }`}
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          viewBox='0 0 24 24'
          xmlns='http://www.w3.org/2000/svg'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            d='M19 9l-7 7-7-7'
          ></path>
        </svg>
      </button>

      <div
        className={`absolute top-full right-0 mt-2 w-64 bg-white border rounded-md shadow-lg transition-all duration-300 transform ${
          isCollapsed ? "scale-0 opacity-0" : "scale-100 opacity-100"
        } origin-top-right dark:bg-gray-800 dark:border-gray-700`}
        role='region'
        aria-hidden={isCollapsed}
      >
        <h2
          className='p-4 text-lg font-semibold text-gray-700 border-b dark:text-gray-200 dark:border-gray-600'
          data-cy='column-selector-title'
        >
          {t("Configure Columns")}
        </h2>
        <div className='p-4 grid grid-cols-1 gap-3'>
          {Object.entries(visibleColumns).map(([column, isVisible]) => (
            <label
              key={column}
              className='flex items-center gap-2 p-2 bg-gray-50 rounded-md hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'
              data-cy={`column-selector-${column}-label`}
            >
              <input
                type='checkbox'
                checked={isVisible}
                onChange={() => onToggleColumn(column)}
                className='w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 dark:focus:ring-blue-300 dark:bg-gray-600'
                aria-checked={isVisible}
                data-cy={`column-selector-${column}-checkbox`}
              />
              <span
                className='text-sm font-medium'
                data-cy={`column-selector-${column}`}
              >
                {t(
                  column.charAt(0).toUpperCase() +
                    column.slice(1).replace(/_/g, " ")
                )}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ColumnSelector
