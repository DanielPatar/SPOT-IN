/**
 * Marketing photography for the public landing and auth pages (UI v2).
 * Free-to-use photos served from the Unsplash CDN; listing photos always come from venues.
 */
const u = (id: string, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=70&auto=format&fit=crop`;

export const imagery = {
  hero: u("1464366400600-7168b8af9bc3", 2000),
  host: u("1511578314322-379afb476865", 1400),
  closing: u("1555396273-367ea4eb4db5", 1400),
  auth: u("1528605248644-14dd04022da1", 1200),
  /** One photo per event type (keys match EVENT_TYPES). */
  eventTypes: {
    exhibition: u("1567958451986-2de427a4a0be", 800),
    bazaar: u("1441986300917-64674bd600d8", 800),
    brand_activation: u("1505373877841-8d25f7d46678", 800),
    concert: u("1492684223066-81342ee5ff30", 800),
    workshop: u("1556761175-5973dc0f32e7", 800),
    seminar: u("1540575467063-178a50c2df87", 800),
    community: u("1517457373958-b7bdd4587205", 800),
    other: u("1519167758481-83f550bb49b3", 800),
  } as Record<string, string>,
  /** Rotated over city cards. */
  cities: [
    u("1531058020387-3be344556be6", 900),
    u("1600508774634-4e11d34730e2", 900),
    u("1521017432531-fbd92d768814", 900),
    u("1515187029135-18ee286d815b", 900),
  ],
};
