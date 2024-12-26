import React, { FC } from "react"

interface CustomMarkerProps {
  size?: number
  markerColor?: string
  circleColor?: string
}

const CustomMarker: FC<CustomMarkerProps> = ({
  size = 36,
  markerColor = "#FF6E6E",
  circleColor = "#0C0058"
}) => {
  const markerStyle = {
    width: `${size}px`,
    height: `${size}px`
  }

  return (
    <svg
      style={markerStyle}
      viewBox='-4 0 36 36'
      xmlns='http://www.w3.org/2000/svg'
      xmlnsXlink='http://www.w3.org/1999/xlink'
    >
      <g fill='none' fillRule='evenodd'>
        <g>
          <path
            d='M14,0 C21.732,0 28,5.641 28,12.6 C28,23.963 14,36 14,36 C14,36 0,24.064 0,12.6 C0,5.641 6.268,0 14,0 Z'
            fill={markerColor}
          />
          <circle cx='14' cy='14' r='7' fill={circleColor} />
        </g>
      </g>
    </svg>
  )
}

export default CustomMarker
