"use client"

import MessageBox from "./messageBox"
import PreviousMessages from "./previousMessages"

export default function Page() {
  return (
    <div className="mt-20 flex flex-col items-center justify-center gap-12 mb-20">
      <PreviousMessages />
      <MessageBox />
    </div>
  )
}
