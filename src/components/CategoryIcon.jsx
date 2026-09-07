import { categoryOf } from '../lib/categories.js'

/** React counterpart to iconSvgMarkup — same geometry, same stroke weight. */
export default function CategoryIcon({ category, size = 18, strokeWidth = 1.9, className }) {
  const { paths } = categoryOf(category)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
