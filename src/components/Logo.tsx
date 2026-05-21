import React from 'react'

interface LogoProps {
  size?: number
  className?: string
  style?: React.CSSProperties
}

/**
 * tardyDevs brand logo — precise SVG recreation from reference image.
 *
 * The logo consists of:
 *  1. A green organic shape: large circular head (top-left) with a punched hole,
 *     a very narrow curved waist/neck sweeping diagonally, expanding into a
 *     wide rounded lobe at the bottom-right.
 *  2. A dark outline-only circle (top-right) — similar size to the head,
 *     positioned beside it, slightly overlapping the blob edge.
 *  3. A dark outline-only circle (bottom-left) — smaller, at the waist area.
 *
 * ViewBox: 0 0 220 220
 */
export const Logo: React.FC<LogoProps> = ({ size = 40, className, style }) => {
  const id = React.useId().replace(/:/g, '')
  const maskId = `tdm-${id}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 220 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="tardyDevs logo"
      role="img"
      className={className}
      style={style}
    >
      <defs>
        <mask id={maskId}>
          {/*
            Green blob outline — white = visible.
            Head centre ~(68, 65), radius ~42.
            Waist pinches to ~16px wide around (95, 108).
            Tail lobe centre ~(148, 155), radius ~34.
          */}
          <path
            fill="white"
            d="
              M 68 23
              C 92 23, 110 41, 110 65
              C 110 79, 104 91, 96 100
              C 100 105, 106 112, 114 118
              C 130 130, 148 130, 160 142
              C 174 156, 174 178, 158 188
              C 142 198, 120 194, 110 180
              C 100 166, 104 148, 100 136
              C 98 128, 92 122, 84 116
              C 76 110, 66 106, 58 98
              C 38 80, 26 56, 40 38
              C 48 26, 58 23, 68 23
              Z
            "
          />
          {/* Hole punched through the head */}
          <circle cx="68" cy="65" r="24" fill="black" />
        </mask>
      </defs>

      {/*
        Outline circle — top-right.
        Positioned to the right of the head, slightly overlapping blob.
        Centre ~(152, 62), radius ~30.
      */}
      <circle
        cx="152"
        cy="62"
        r="30"
        stroke="rgba(25,25,25,0.72)"
        strokeWidth="7"
        fill="none"
      />

      {/*
        Outline circle — bottom-left.
        Smaller ring at the waist/neck area.
        Centre ~(72, 130), radius ~18.
      */}
      <circle
        cx="72"
        cy="130"
        r="18"
        stroke="rgba(25,25,25,0.72)"
        strokeWidth="6"
        fill="none"
      />

      {/* Green blob with hole */}
      <path
        fill="#6DC52A"
        mask={`url(#${maskId})`}
        d="
          M 68 23
          C 92 23, 110 41, 110 65
          C 110 79, 104 91, 96 100
          C 100 105, 106 112, 114 118
          C 130 130, 148 130, 160 142
          C 174 156, 174 178, 158 188
          C 142 198, 120 194, 110 180
          C 100 166, 104 148, 100 136
          C 98 128, 92 122, 84 116
          C 76 110, 66 106, 58 98
          C 38 80, 26 56, 40 38
          C 48 26, 58 23, 68 23
          Z
        "
      />
    </svg>
  )
}
