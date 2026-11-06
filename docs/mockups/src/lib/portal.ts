import { createContext, useContext } from "react"

/**
 * The mock-up viewer renders each screen inside a "device frame".
 * Dialogs and sheets portal into that frame (instead of document.body)
 * so a bottom sheet on a phone-width mock-up stays phone-width.
 */
export const PortalContainerContext = createContext<HTMLElement | null>(null)

export function usePortalContainer(): HTMLElement | undefined {
  return useContext(PortalContainerContext) ?? undefined
}
