import { FC } from "react";

type LevelIndicatorProps = {
  level: number
  lastInvisible?: boolean
}

export const LevelIndicator: FC<LevelIndicatorProps> = (props) => {
  const { level, lastInvisible = false } = props

  if (level === 0) return null

  return (
    <div
      data-name="LevelIndicator"
      className="pl-5"
      style={{
        display: 'flex',
        gap: 24,
        alignSelf: 'stretch',
      }}
    >
      {Array.from({ length: level }).map((_, index) => (
        <div
          key={index}
          style={{
            width: '1px',
            backgroundColor: index === level - 1 && lastInvisible ? 'transparent' : '#9e9e9e',
            alignSelf: 'stretch',
          }}
        />
      ))}
    </div>
  )
}
