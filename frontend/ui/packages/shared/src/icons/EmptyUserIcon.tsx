import type { FC } from 'react'
import { memo } from 'react'

export const EmptyUserIcon: FC = memo(() => {
  return (
    <div style={{ display: 'flex' }} data-testid="UserIcon">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="10" fill="#D5DCE3"/>
        <path
          d="M12.75 7.25C12.75 5.73063 11.5194 4.5 10 4.5C8.48063 4.5 7.25 5.73063 7.25 7.25C7.25 8.76937 8.48063 10 10 10C11.5194 10 12.75 8.76937 12.75 7.25ZM4.5 14.1154V14.83C4.5 15.2 4.79997 15.5 5.17 15.5H14.83C15.2 15.5 15.5 15.2 15.5 14.83V14.1154C15.5 11.6923 11.8356 11 10 11C8.16437 11 4.5 11.6923 4.5 14.1154Z"
          fill="#8F9EB4"/>
      </svg>
    </div>
  )
})
