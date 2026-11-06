import { t } from "@/lib/i18n";
import { requireVenuePage } from "@/web/view";
import { TeamPanel } from "@/components/TeamPanel";

export default async function VenueTeamPage() {
  const { session, venue } = await requireVenuePage("/venue/tim");
  return (
    <div>
      <h1>{t("team.title")}</h1>
      <TeamPanel userId={session.userId} m={venue} path="/venue/tim" />
    </div>
  );
}
