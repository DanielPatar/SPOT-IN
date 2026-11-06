import type { ScreenDef } from "@/registry"
import { foundationScreens } from "./foundations"
import { authScreens } from "./auth"
import { onboardingScreens } from "./onboarding"
import { adminScreens } from "./admin"
import { searchScreens } from "./search"
import { venueScreens } from "./venue"
import { quoteScreens } from "./quotes"
import { bookingScreens } from "./booking"
import { eventScreens } from "./events"
import { accountScreens } from "./account"

/** Order follows the PRD §6 flows so "next/previous" walks the demo script. */
export const screens: ScreenDef[] = [
  ...foundationScreens,
  ...authScreens,
  ...onboardingScreens,
  ...adminScreens,
  ...searchScreens,
  ...venueScreens,
  ...quoteScreens,
  ...bookingScreens,
  ...eventScreens,
  ...accountScreens,
]
