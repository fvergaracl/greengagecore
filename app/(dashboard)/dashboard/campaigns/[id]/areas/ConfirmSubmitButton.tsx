"use client"

import { MouseEvent, ReactNode } from "react"

export default function ConfirmSubmitButton({
  className,
  confirmMessage,
  children
}: {
  className?: string
  confirmMessage: string
  children: ReactNode
}) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (!window.confirm(confirmMessage)) {
      event.preventDefault()
    }
  }

  return (
    <button type='submit' className={className} onClick={handleClick}>
      {children}
    </button>
  )
}
