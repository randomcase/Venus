//> using scala 3.3.4
//
// DefenceSim — the half of the tower defence that CSS cannot do.
//
// defense.html is the placement phase: you fit three mounts against four
// hazards and commit. It stops there, honestly, because CSS has no loop and no
// clock — it can tell you what is covered, never what happens over time.
//
// This is the other half. It takes a placement, runs a wave tick by tick, and
// writes the report the page cannot: what arrived, what was mitigated, what
// got through, and what the envelope looked like at the end.
//
// Why Scala for this, specifically:
//
//   · `sealed trait Hazard` means the compiler checks every match over hazards
//     is exhaustive. Add a fifth hazard and every place that must handle it
//     fails to compile. That is the same guarantee the CSS version bought by
//     writing out every rule by hand — except here it is enforced rather than
//     remembered.
//   · the simulation is a fold over ticks producing a new immutable state each
//     time, so there is no mutable game object anybody can corrupt halfway
//     through, and the whole run is reproducible from its seed.
//   · no clock, no Random without a seed. Same input, same wave, forever —
//     which is the property the generator in this repo also holds, for the same
//     reason: a result you cannot reproduce is not a result.
//
// Run it:
//   scala-cli run DefenceSim.scala
//   scala-cli run DefenceSim.scala -- --seed 7 --mounts skin,drogue,shade
//   scala-cli run DefenceSim.scala -- --html defense-run.html
//
package io.cityoflight.virgo.venus

import scala.annotation.tailrec

// ---------------------------------------------------------------- hazards
sealed trait Hazard:
  def id: String
  def label: String
  def bite: Int // integrity cost per point of intensity, unmitigated

object Hazard:
  case object Acid extends Hazard:
    val id = "acid"; val label = "Sulfuric acid aerosol"; val bite = 3
  case object Shear extends Hazard:
    val id = "shear"; val label = "Superrotation shear"; val bite = 4
  case object Thermal extends Hazard:
    val id = "thermal"; val label = "Descent thermal soak"; val bite = 5
  case object Ultraviolet extends Hazard:
    val id = "uv"; val label = "Ultraviolet flux"; val bite = 2

  val all: List[Hazard] = List(Acid, Shear, Thermal, Ultraviolet)

// --------------------------------------------------------------- defences
final case class Defence(
    id: String,
    label: String,
    cost: Int,
    answers: Set[Hazard],
    mitigation: Double // fraction of the bite removed when it answers
)

object Defence:
  import Hazard.*
  val catalogue: List[Defence] = List(
    Defence("skin",     "Fluoropolymer skin", 30, Set(Acid),             0.92),
    Defence("drogue",   "Drogue anchor",      25, Set(Shear),            0.85),
    Defence("ballonet", "Ballonet trim",      35, Set(Thermal),          0.90),
    Defence("radiator", "Radiator fin",       30, Set(Thermal),          0.72),
    Defence("shade",    "Solar shade",        20, Set(Ultraviolet),      0.88),
    Defence("patch",    "Patch drone",        15, Set.empty,             0.00)
  )
  def byId(s: String): Option[Defence] = catalogue.find(_.id == s)

// ------------------------------------------------------------------- wave
final case class Arrival(tick: Int, hazard: Hazard, intensity: Int)

/** Deterministic from the seed. No clock is read anywhere in this file: the
  * same seed always produces the same wave, which is what makes a run worth
  * quoting to somebody else. */
object Wave:
  private def lcg(state: Long): Long = (state * 6364136223846793005L + 1442695040888963407L)

  def generate(seed: Long, ticks: Int): List[Arrival] =
    @tailrec def go(t: Int, s: Long, acc: List[Arrival]): List[Arrival] =
      if t > ticks then acc.reverse
      else
        val s1 = lcg(s)
        val s2 = lcg(s1)
        val hazard = Hazard.all(((s1 >>> 33) % Hazard.all.length).toInt.abs)
        val intensity = 1 + ((s2 >>> 33) % 4).toInt.abs // 1..4
        go(t + 1, s2, Arrival(t, hazard, intensity) :: acc)
    go(1, seed, Nil)

// ------------------------------------------------------------------ state
final case class Outcome(
    arrival: Arrival,
    covering: Option[Defence],
    damage: Int,
    integrityAfter: Int
)

final case class Run(placement: List[Defence], outcomes: List[Outcome]):
  def spent: Int = placement.map(_.cost).sum
  def finalIntegrity: Int = outcomes.lastOption.map(_.integrityAfter).getOrElse(100)
  def through: List[Outcome] = outcomes.filter(_.covering.isEmpty)
  def mitigated: List[Outcome] = outcomes.filter(_.covering.isDefined)
  def worst: Option[Outcome] = outcomes.maxByOption(_.damage)

  /** Which hazards the placement answers at all — the thing defense.html shows
    * before you commit. The simulation only ever confirms it over time. */
  def coveredKinds: Set[Hazard] = placement.flatMap(_.answers).toSet
  def uncoveredKinds: List[Hazard] = Hazard.all.filterNot(coveredKinds.contains)

object Simulate:
  /** A fold, not a loop with mutable state: each tick produces the next
    * integrity and nothing can reach back and change an earlier one. */
  def run(placement: List[Defence], wave: List[Arrival], start: Int = 100): Run =
    val outcomes = wave
      .foldLeft((start, List.empty[Outcome])) { case ((integrity, acc), a) =>
        val cover = placement.find(_.answers.contains(a.hazard))
        val raw = a.hazard.bite * a.intensity
        val dealt = cover match
          case Some(d) => math.round(raw * (1.0 - d.mitigation)).toInt
          case None    => raw
        val next = math.max(0, integrity - dealt)
        (next, Outcome(a, cover, dealt, next) :: acc)
      }
      ._2
      .reverse
    Run(placement, outcomes)

// ----------------------------------------------------------------- report
object Report:
  def text(r: Run, seed: Long): String =
    val b = StringBuilder()
    b ++= s"\n  CLOUD DECK DEFENCE — run seed $seed\n"
    b ++= s"  ${"-" * 62}\n"
    b ++= s"  mounted   ${if r.placement.isEmpty then "nothing" else r.placement.map(_.label).mkString(", ")}\n"
    b ++= s"  spent     ${r.spent} slime of 90\n"
    val un = r.uncoveredKinds
    b ++= s"  unanswered${if un.isEmpty then "  none" else "  " + un.map(_.label).mkString(", ")}\n"
    b ++= s"  ${"-" * 62}\n"
    r.outcomes.foreach { o =>
      val mark = o.covering match
        case Some(d) => f"stopped by ${d.label}%-20s"
        case None    => f"${"THROUGH"}%-31s"
      b ++= f"  t${o.arrival.tick}%-3d ${o.arrival.hazard.label}%-24s x${o.arrival.intensity} $mark -${o.damage}%-3d => ${o.integrityAfter}%3d\n"
    }
    b ++= s"  ${"-" * 62}\n"
    b ++= s"  through   ${r.through.length} of ${r.outcomes.length} arrivals\n"
    r.worst.foreach(w => b ++= s"  worst     t${w.arrival.tick} ${w.arrival.hazard.label}, -${w.damage}\n")
    b ++= s"  integrity ${r.finalIntegrity} of 100\n"
    b ++= (if r.finalIntegrity == 0 then "  VERDICT   envelope lost\n"
           else if r.finalIntegrity < 40 then "  VERDICT   holed, still flying\n"
           else if r.finalIntegrity < 75 then "  VERDICT   worn, serviceable\n"
           else "  VERDICT   rode it out\n")
    b.result

  /** Emits a page in the yard's house style, so the simulation's output looks
    * like the rest of the boards rather than like a console. */
  def html(r: Run, seed: Long): String =
    val rows = r.outcomes.map { o =>
      val (cls, what) = o.covering match
        case Some(d) => ("ok", s"stopped &middot; ${d.label}")
        case None    => ("through", "through")
      s"""    <tr class="$cls"><td>t${o.arrival.tick}</td><td>${o.arrival.hazard.label}</td>
      <td>&times;${o.arrival.intensity}</td><td>$what</td><td>&minus;${o.damage}</td>
      <td>${o.integrityAfter}</td></tr>"""
    }.mkString("\n")
    val verdict =
      if r.finalIntegrity == 0 then "envelope lost"
      else if r.finalIntegrity < 40 then "holed, still flying"
      else if r.finalIntegrity < 75 then "worn, serviceable"
      else "rode it out"
    s"""<title>Defence Run &middot; seed $seed</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<!-- GENERATED by DefenceSim.scala. Do not edit; re-run with the same seed. -->
<style>
  :root{--void:#120b06;--card:#1e150e;--edge:#493526;--ink:#f6ecdd;--dim:#b39c82;
    --gold:#e8c77a;--good:#7fd6a0;--bad:#e0705a}
  *{box-sizing:border-box}
  body{margin:0;padding:20px 16px 44px;background:var(--void);color:var(--ink);
    font:14px/1.66 ui-rounded,system-ui,sans-serif}
  .wrap{max-width:820px;margin:0 auto}
  h1{margin:0 0 4px;font-size:22px;letter-spacing:-.02em}
  .sub{color:var(--dim);font-size:11.5px;margin:0 0 16px}
  .panel{background:var(--card);border:1px solid var(--edge);border-radius:12px;
    padding:14px 15px;margin-top:12px}
  .heads{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
  .h{background:#160f09;border:1px solid var(--edge);border-radius:10px;padding:11px 12px}
  .h span{font:9px/1 ui-monospace,monospace;letter-spacing:.14em;
    text-transform:uppercase;color:var(--dim)}
  .h b{display:block;font:22px/1.2 ui-monospace,monospace;color:var(--gold);margin-top:5px}
  table{width:100%;border-collapse:collapse;font:12px/1.6 ui-monospace,monospace;
    margin-top:10px}
  th{text-align:left;font-size:9px;letter-spacing:.14em;text-transform:uppercase;
    color:var(--dim);padding:0 0 7px}
  td{padding:5px 0;border-top:1px solid var(--edge)}
  tr.ok td:nth-child(4){color:var(--good)}
  tr.through td:nth-child(4){color:var(--bad);font-weight:700}
  .note{color:var(--dim);font-size:10.5px;line-height:1.7;margin:10px 0 0}
  a{color:var(--gold)}
</style>
<div class="wrap">
  <h1>Defence Run</h1>
  <p class="sub">seed $seed &middot; generated by <code>DefenceSim.scala</code>
    &middot; ${r.outcomes.length} ticks</p>
  <div class="heads">
    <div class="h"><span>mounted</span><b>${r.placement.length}</b></div>
    <div class="h"><span>spent</span><b>${r.spent}</b></div>
    <div class="h"><span>through</span><b>${r.through.length}</b></div>
    <div class="h"><span>integrity</span><b>${r.finalIntegrity}</b></div>
  </div>
  <div class="panel">
    <table>
      <tr><th>tick</th><th>hazard</th><th>int.</th><th>outcome</th><th>dmg</th><th>left</th></tr>
$rows
    </table>
    <p class="note"><b>Verdict: $verdict.</b> Unanswered hazard kinds:
      ${if r.uncoveredKinds.isEmpty then "none" else r.uncoveredKinds.map(_.label).mkString(", ")}.</p>
  </div>
  <div class="panel">
    <p class="note" style="margin-top:0"><b>This is the half the page cannot
      do.</b> <a href="defense.html">defense.html</a> is the placement phase and
      stops where CSS honestly stops — it can tell you what is covered, never
      what happens over time. Everything above is a fold over ticks in Scala,
      deterministic from the seed: run it again with seed $seed and you get this
      page back, character for character.</p>
  </div>
</div>
"""

// ------------------------------------------------------------------- main
object DefenceSim:
  private val Usage =
    """usage: scala-cli run DefenceSim.scala -- [options]
      |  --seed N            wave seed (default 1)
      |  --ticks N           arrivals to simulate (default 12)
      |  --mounts a,b,c      up to three defence ids (default skin,drogue,shade)
      |  --html PATH         also write a report page
      |  --list              show the catalogue and exit
      |""".stripMargin

  def main(args: Array[String]): Unit =
    val opts = args
      .sliding(2, 2)
      .collect { case Array(k, v) if k.startsWith("--") => k.drop(2) -> v }
      .toMap

    if args.contains("--list") then
      println("\n  id         name                  cost  answers")
      Defence.catalogue.foreach { d =>
        val ans = if d.answers.isEmpty then "-" else d.answers.map(_.id).mkString(",")
        println(f"  ${d.id}%-10s ${d.label}%-21s ${d.cost}%4d  $ans")
      }
      println()
      return

    if args.contains("--help") then { println(Usage); return }

    val seed  = opts.get("seed").flatMap(_.toLongOption).getOrElse(1L)
    val ticks = opts.get("ticks").flatMap(_.toIntOption).getOrElse(12)
    val ids   = opts.getOrElse("mounts", "skin,drogue,shade").split(",").map(_.trim).filter(_.nonEmpty)

    val unknown = ids.filterNot(Defence.byId(_).isDefined)
    if unknown.nonEmpty then
      System.err.println(s"unknown defence(s): ${unknown.mkString(", ")}\n$Usage")
      sys.exit(2)

    // three mounts, always — the constraint the page enforces structurally
    val placement = ids.take(3).toList.flatMap(Defence.byId)
    if ids.length > 3 then
      System.err.println(s"note: ${ids.length} given, only the first three are mounted")

    val run = Simulate.run(placement, Wave.generate(seed, ticks))
    print(Report.text(run, seed))

    opts.get("html").foreach { path =>
      java.nio.file.Files.writeString(java.nio.file.Path.of(path), Report.html(run, seed))
      println(s"  written   $path\n")
    }
