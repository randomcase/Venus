/* The roster. One source of truth for all five pages.
 *
 * A classic script, not a module, on purpose: these pages have to open by
 * double-clicking them. A module import from a file:// URL is blocked by CORS
 * and the page silently does nothing, which is the worst failure a lesson can
 * have.
 *
 * TWO THINGS ARE LEFT BLANK ON PURPOSE and they are the only two:
 *
 *   1. The names. This file will not invent a name for anybody. Fill them in
 *      and every page picks them up.
 *   2. The fourth relation. Three were given as two grandfathers and a great
 *      uncle; the fourth is written as "father" and may be wrong. One edit.
 */
window.Lanterns = {
  LANTERNS: [
    { id: 1, name: "", relation: "grandfather", service: "Vietnam", rank: "Corporal",
      lesson: "The Field", file: "01-field.html", language: "HTML" },
    { id: 2, name: "", relation: "grandfather", service: "Vietnam", rank: "Corporal",
      lesson: "The Clock", file: "02-clock.html", language: "JavaScript" },
    { id: 3, name: "", relation: "great uncle", service: "Vietnam", rank: "Corporal",
      lesson: "The Swarm", file: "03-swarm.html", language: "JavaScript" },
    { id: 4, name: "", relation: "father", service: "Vietnam", rank: "Corporal",
      lesson: "The Line", file: "04-line.html", language: "Java" }
  ],
  /** How a lantern is written when it has no name yet. */
  label: function (l) {
    return l.name ? (l.name + " — " + l.rank) : (l.relation + ", " + l.rank);
  }
};
