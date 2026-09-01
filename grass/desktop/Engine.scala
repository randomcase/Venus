package grass

import ujson.Value
import scala.collection.mutable

/** The rules, ported from engine.js one function at a time so the two editions
  * agree. State is kept in plain mutable fields and round-trips through the
  * same JSON shape the page saves, so a save from one edition loads in the other. */
object J {
  def has(v: Value, k: String): Boolean = v.obj.contains(k)
  def num(v: Value, k: String, d: Double = 0): Double = v.obj.get(k).map(_.num).getOrElse(d)
  def str(v: Value, k: String, d: String = ""): String = v.obj.get(k).map(_.str).getOrElse(d)
  def arr(v: Value, k: String): Seq[Value] = v.obj.get(k).map(_.arr.toSeq).getOrElse(Nil)
  def bool(v: Value, k: String): Boolean = v.obj.get(k).exists(_.bool)
  def map(v: Value, k: String): Map[String, Double] = v.obj.get(k).map(_.obj.map { case (a, b) => a -> b.num }.toMap).getOrElse(Map.empty)
  def strs(v: Value, k: String): Seq[String] = arr(v, k).map(_.str)
}

class Engine(var D: Value) {
  import J._
  case class Ev(id: String, var left: Double)
  var clock = 0.0; var savedAt: Long = System.currentTimeMillis()
  val res = mutable.LinkedHashMap[String, Double](); val total = mutable.LinkedHashMap[String, Double](); val n = mutable.LinkedHashMap[String, Int]()
  val sectors = mutable.ArrayBuffer[String](); val research = mutable.ArrayBuffer[String](); val milestones = mutable.ArrayBuffer[String](); val events = mutable.ArrayBuffer[Ev]()
  val log = mutable.ArrayBuffer[(Int, String)]()
  var shipN = 1; var shipT = 0.0; var manifest: Option[Map[String, Double]] = None; var plan: Map[String, Double] = Map.empty
  var morale = 1.0; var ballast = 0; val doctrines = mutable.LinkedHashMap[String, Int](); var refloats = 0
  var playstyle: Option[String] = None; var avatar = mutable.LinkedHashMap[String, Value](); var still = 0.0
  var form = 0; var ring = 1; var acorns = 0; var formsDone = 0; var sinceAct = 0.0; var trees = 0; var spores = 0.0; var depth = 0; var flushT = 0.0
  val mods = mutable.HashMap[String, Double](); val unlock = mutable.HashSet[String]()
  var flows: Map[String, Double] = Map.empty
  var onLog: String => Unit = _ => (); var onShip: Map[String, Double] => Unit = _ => ()

  def machines: Seq[Value] = arr(D, "machines"); def sectorDefs: Seq[Value] = arr(D, "sectors"); def researchDefs: Seq[Value] = arr(D, "research")
  def eventDefs: Seq[Value] = arr(D, "events"); def milestoneDefs: Seq[Value] = arr(D, "milestones"); def playstyles: Seq[Value] = arr(D, "playstyles"); def resources: Seq[Value] = arr(D, "resources")
  def primary: String = D("primary").str
  def find(a: Seq[Value], id: String): Option[Value] = a.find(_("id").str == id)
  def machine(id: String): Option[Value] = find(machines, id)
  def stillCfg: Option[Value] = D.obj.get("stillness")
  def stillMax: Double = stillCfg.map(_("max").num).getOrElse(0)
  def rname(id: String): String = find(resources, id).map(_("name").str).getOrElse(id)

  def addLog(m: String): Unit = { log.prepend((clock.round.toInt, m)); if (log.size > 80) log.remove(80, log.size - 80); onLog(m) }

  def fresh(): Unit = {
    clock = 0; res.clear(); resources.foreach(r => res(r("id").str) = num(r, "start")); total.clear(); total(primary) = 0; total("ships") = 0
    n.clear(); machines.foreach(m => n(m("id").str) = 0); sectors.clear(); sectorDefs.filter(s => bool(s, "built")).foreach(s => sectors += s("id").str)
    research.clear(); milestones.clear(); events.clear(); shipN = 1; shipT = D("ship")("cadence").num; manifest = None; plan = map(D("ship"), "plan")
    morale = 1; still = stillMax; playstyle = None; avatar = mutable.LinkedHashMap[String, Value]()
    form = 0; ring = 1; acorns = 0; formsDone = 0; sinceAct = 0; trees = 0; spores = 0; depth = 0; flushT = D.obj.get("mycelium").map(_("every").num).getOrElse(0.0)
    D.obj.get("avatar").foreach(a => a("fields").arr.foreach { f => avatar(f("id").str) = f.obj.getOrElse("default", if (f("type").str == "range") f("min") else f("options")(0)) })
  }
  fresh(); recompute()

  /* ------------------------------------------------------------ save shape */
  def toJson: Value = ujson.Obj(
    "v" -> 2, "clock" -> clock, "saved" -> System.currentTimeMillis().toDouble,
    "res" -> ujson.Obj.from(res.map { case (k, v) => k -> ujson.Num(v) }), "total" -> ujson.Obj.from(total.map { case (k, v) => k -> ujson.Num(v) }),
    "n" -> ujson.Obj.from(n.map { case (k, v) => k -> ujson.Num(v) }), "sectors" -> sectors.map(ujson.Str(_)), "research" -> research.map(ujson.Str(_)),
    "milestones" -> milestones.map(ujson.Str(_)), "events" -> events.map(e => ujson.Obj("id" -> e.id, "left" -> e.left)),
    "log" -> log.map { case (t, m) => ujson.Obj("t" -> t, "m" -> m) },
    "ship" -> ujson.Obj("n" -> shipN, "t" -> shipT, "manifest" -> manifest.map(m => ujson.Obj.from(m.map { case (k, v) => k -> ujson.Num(v) }): Value).getOrElse(ujson.Null)),
    "plan" -> ujson.Obj.from(plan.map { case (k, v) => k -> ujson.Num(v) }), "morale" -> morale, "ballast" -> ballast,
    "doctrines" -> ujson.Obj.from(doctrines.map { case (k, v) => k -> ujson.Num(v) }), "refloats" -> refloats,
    "playstyle" -> playstyle.map(ujson.Str(_): Value).getOrElse(ujson.Null), "avatar" -> ujson.Obj.from(avatar.toSeq), "still" -> still,
    "form" -> form, "ring" -> ring, "acorns" -> acorns, "formsDone" -> formsDone, "sinceAct" -> sinceAct, "trees" -> trees, "spores" -> spores, "depth" -> depth, "flushT" -> flushT)
  def load(s: Value): Unit = {
    fresh(); clock = num(s, "clock"); savedAt = num(s, "saved", System.currentTimeMillis().toDouble).toLong
    s.obj.get("res").foreach(_.obj.foreach { case (k, v) => res(k) = v.num }); s.obj.get("total").foreach(_.obj.foreach { case (k, v) => total(k) = v.num })
    s.obj.get("n").foreach(_.obj.foreach { case (k, v) => if (n.contains(k)) n(k) = v.num.toInt })
    if (has(s, "sectors")) { sectors.clear(); sectors ++= strs(s, "sectors") }; research ++= strs(s, "research"); milestones ++= strs(s, "milestones")
    arr(s, "events").foreach(e => events += Ev(e("id").str, e("left").num)); arr(s, "log").foreach(l => log += ((l("t").num.toInt, l("m").str)))
    s.obj.get("ship").foreach { sh => shipN = num(sh, "n", 1).toInt; shipT = num(sh, "t", shipT); manifest = sh.obj.get("manifest").filter(_ != ujson.Null).map(_.obj.map { case (k, v) => k -> v.num }.toMap) }
    if (has(s, "plan")) plan = map(s, "plan"); morale = num(s, "morale", 1); ballast = num(s, "ballast").toInt; refloats = num(s, "refloats").toInt
    s.obj.get("doctrines").foreach(_.obj.foreach { case (k, v) => doctrines(k) = v.num.toInt }); playstyle = s.obj.get("playstyle").filter(_ != ujson.Null).map(_.str)
    s.obj.get("avatar").foreach(_.obj.foreach { case (k, v) => if (avatar.contains(k)) avatar(k) = v }); still = num(s, "still", stillMax)
    form = num(s, "form").toInt; ring = num(s, "ring", 1).toInt; acorns = num(s, "acorns").toInt; formsDone = num(s, "formsDone").toInt; sinceAct = num(s, "sinceAct"); trees = num(s, "trees").toInt; spores = num(s, "spores"); depth = num(s, "depth").toInt; flushT = num(s, "flushT", flushT)
    recompute()
  }

  /* ------------------------------------------------------------------ mods */
  private def apply(e: Value, soft: Double = 1): Unit = e("type").str match {
    case "unlock" => unlock += e("id").str
    case "add" => val k = e("target").str; mods(k) = mods.getOrElse(k, 0.0) + e("x").num
    case _ => val k = e("target").str; val x = if (soft == 1) e("x").num else 1 + (e("x").num - 1) * soft; mods(k) = mods.getOrElse(k, 1.0) * x
  }
  def mod(k: String): Double = mods.getOrElse(k, if (k == "night" || k == "liftBase") 0.0 else 1.0)
  def recompute(): Unit = {
    mods.clear(); unlock.clear(); mods("night") = 0
    playstyle.flatMap(find(playstyles, _)).foreach(p => arr(p, "effects").foreach(apply(_)))
    season.foreach(se => arr(se, "effects").foreach(apply(_)))
    formDef().foreach(fd => arr(fd, "effects").foreach(apply(_)))
    becoming.foreach(b => mods("all") = mod("all") * (1 + b("perForm").num * formsDone + b("perRing").num * (ring - 1)))
    forestCfg.foreach { f => mods("all") = mod("all") * (1 + f("perTree").num * trees + f("tierBonus").num * forestTier.index); mods("liftBase") = mod("liftBase") + f("ground").num * trees }
    mycCfg.foreach(y => mods("all") = mod("all") * (1 + y("perLevel").num * depth))
    sectorDefs.filter(s => sectors.contains(s("id").str)).foreach(s => arr(s, "effects").foreach(apply(_)))
    researchDefs.filter(r => research.contains(r("id").str)).foreach(r => arr(r, "effects").foreach(apply(_)))
    milestoneDefs.filter(m => milestones.contains(m("id").str)).foreach(m => arr(m, "effects").foreach(apply(_)))
    doctrines.foreach { case (d, lv) => find(arr(D("prestige"), "doctrines"), d).foreach(doc => (1 to lv).foreach(_ => arr(doc, "effects").foreach(apply(_)))) }
    mods("all") = mod("all") * (1 + D("prestige")("perPoint").num * ballast)
    events.foreach(ev => find(eventDefs, ev.id).foreach(d => arr(d, "effects").foreach(apply(_, mod("storm")))))
  }
  def mm(id: String): Double = mod("machine:" + id); def rm(id: String): Double = mod("res:" + id)

  /* ----------------------------------------------------------------- world */
  def phase: Double = (clock % D("day")("length").num) / D("day")("length").num
  def isDay: Boolean = phase < 1 - D("day")("night").num
  def light: Double = if (isDay) 1 else math.min(1, mod("night"))
  def calm: Double = stillCfg.map(c => c("floor").num + (1 - c("floor").num) * still / c("max").num).getOrElse(1.0)
  case class Power(sup: Double, dem: Double) { def eff: Double = if (dem > 0) math.min(1, sup / dem) else 1 }
  def power(l: Double = light): Power = { var sup = 0.0; var dem = 0.0
    machines.foreach { m => val id = m("id").str; val k = n(id); if (k > 0) {
      val out = map(m, "out"); out.get("power").foreach { p0 => var p = p0 * k * mm(id) * mod("all"); if (bool(m, "solar")) p *= l; if (bool(m, "night")) p *= (if (l < 1) 1 else 0); sup += p }
      dem += num(m, "draw") * k * mod("draw") } }; Power(sup, dem) }
  case class Crew(need: Double, have: Double) { def eff: Double = if (need > 0) math.min(1, have / need) else 1 }
  def crew: Crew = Crew(machines.map(m => num(m, "crew") * n(m("id").str)).sum * mod("crewNeed"), res("crew"))
  case class Lift(cap: Double, used: Double)
  def lift: Lift = Lift((D("lift")("base").num + mod("liftBase") + machines.map(m => num(m, "lift") * n(m("id").str)).sum) * mod("lift"),
    machines.map(m => num(m, "mass") * n(m("id").str)).sum + res("crew") * D("lift")("crewMass").num)
  def available(m: Value): Boolean = sectors.contains(m("sector").str) && (!has(m, "requires") || unlock.contains(m("requires").str)) &&
    m.obj.get("needsMachine").forall(nm => n.getOrElse(nm("id").str, 0) >= nm("n").num)
  def cap(r: String): Double = find(resources, r).filter(has(_, "cap")).map(d => (d("cap").num + machines.map(m => map(m, "store").getOrElse(r, 0.0) * n(m("id").str)).sum) * mod("cap")).getOrElse(Double.PositiveInfinity)
  def seasonIdx: Int = D.obj.get("seasons").map(s => (math.floor(clock / s("length").num) % s("list").arr.size).toInt).getOrElse(-1)
  def season: Option[Value] = D.obj.get("seasons").map(s => s("list")(seasonIdx))

  /* ---------------------------------------------------------------- buying */
  def cost(m: Value, k: Int = 1): Map[String, Double] = { val g = num(m, "growth", D("growth").num); val c = n(m("id").str)
    map(m, "cost").map { case (r, v) => r -> math.ceil(v * math.pow(g, c) * (math.pow(g, k) - 1) / (g - 1)) } }
  def can(c: Map[String, Double]): Boolean = c.forall { case (r, v) => res.getOrElse(r, 0.0) >= v }
  private def pay(c: Map[String, Double]): Unit = c.foreach { case (r, v) => res(r) = res(r) - v }
  def maxBuy(m: Value): Int = { val L = lift; def ok(k: Int) = can(cost(m, k)) && L.used + num(m, "mass") * k <= L.cap
    var lo = 0; var hi = 1000; while (lo < hi) { val mid = (lo + hi + 1) / 2; if (ok(mid)) lo = mid else hi = mid - 1 }; lo }
  def buy(id: String, k0: Int = 1): Boolean = machine(id).filter(available).exists { m => val k = if (k0 < 0) maxBuy(m) else k0
    if (k < 1) false else { val c = cost(m, k); val L = lift
      if (!can(c)) false else if (L.used + num(m, "mass") * k > L.cap) { addLog(s"No ${D("lift")("name").str} for that. Open more."); false }
      else { pay(c); n(id) = n(id) + k; true } } }
  def researchCost(r: Value): Double = math.ceil(r("cost").num * mod("researchCost"))
  def doResearch(id: String): Boolean = find(researchDefs, id).filter(r => !research.contains(id) && strs(r, "needs").forall(research.contains) && !strs(r, "excludes").exists(research.contains)).exists { r =>
    val c = researchCost(r); if (res("science") < c) false else { res("science") -= c; research += id; addLog(s"${r("name").str}: ${r("desc").str}."); recompute(); true } }
  def sectorOk(s: Value): Boolean = !sectors.contains(s("id").str) && strs(s, "needs").forall(sectors.contains)
  def build(id: String): Boolean = find(sectorDefs, id).filter(sectorOk).exists { s => val c0 = map(s, "cost"); val crewNeed = c0.getOrElse("crew", 0.0); val c = c0 - "crew"
    if (res("crew") < crewNeed || !can(c)) false else { pay(c); sectors += id; addLog(s"${s("name").str} (${s("role").str}) reached."); recompute(); true } }
  def tap(): Double = { val v = D("tap").num * mod("tap") * mod("all"); res(primary) += v; total(primary) = total.getOrElse(primary, 0.0) + v; sinceAct = 0
    stillCfg.foreach(c => still = math.max(0, still - c("tapCost").num)); v }
  def keys: Seq[String] = D("ship")("plan").obj.keys.toSeq
  def norm(p: Map[String, Double]): Map[String, Double] = { val t = keys.map(k => math.max(0, p.getOrElse(k, 0.0))).sum; val tt = if (t == 0) 1 else t; keys.map(k => k -> math.max(0, p.getOrElse(k, 0.0)) / tt).toMap }
  def setPlan(p: Map[String, Double]): Unit = plan = norm(p)
  def setPlaystyle(id: String): Boolean = if (playstyle.isDefined || find(playstyles, id).isEmpty) false else { playstyle = Some(id); addLog(s"Guest: ${find(playstyles, id).get("name").str}."); recompute(); true }
  def canRefloat: Boolean = sectors.contains(D("prestige")("requires").str) && total.getOrElse(primary, 0.0) >= D("prestige")("min").num
  def refloatPoints: Int = math.floor(math.sqrt(total.getOrElse(primary, 0.0) / D("prestige")("min").num)).toInt
  def refloat(doc: String): Boolean = if (!canRefloat || find(arr(D("prestige"), "doctrines"), doc).isEmpty) false else {
    val b = ballast + refloatPoints; val ds = doctrines.clone(); ds(doc) = ds.getOrElse(doc, 0) + 1; val rf = refloats + 1; val lg = log.clone(); val av = avatar.clone()
    val keep = (ring, acorns, formsDone, trees, spores, depth, sinceAct, flushT)
    fresh(); ballast = b; doctrines.clear(); doctrines ++= ds; refloats = rf; log ++= lg; avatar = av
    ring = keep._1; acorns = keep._2; formsDone = keep._3; trees = keep._4; spores = keep._5; depth = keep._6; sinceAct = keep._7; flushT = keep._8; recompute()
    addLog(s"${D("prestige")("name").str}: root $ballast, keeping $doc. Everything x${"%.1f".format(1 + D("prestige")("perPoint").num * ballast)} for good."); true }

  /* -------------------------------------------------------------- becoming
     The transformation of things: forms and rings, the forest, the mycelium. Same hash as the page. */
  def h32(a: Int, b: Int, c: Int): Long = { var x = (a * 73856093) ^ (b * 19349663) ^ (c * 83492791); x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x.toLong & 0xffffffffL }
  def becoming: Option[Value] = D.obj.get("becoming"); def forestCfg: Option[Value] = D.obj.get("forest"); def mycCfg: Option[Value] = D.obj.get("mycelium")
  def formsPerRing(r: Int = ring): Int = becoming.map(b => if (r == 1) b("forms").arr.size else b("generator")("formsPerRing").num.toInt).getOrElse(0)
  def formDef(r: Int = ring, k: Int = form): Option[Value] = becoming.map { b => if (r == 1) b("forms")(math.min(k, b("forms").arr.size - 1)) else {
    val g = b("generator"); val seed = b("seed").num.toInt; val hn = h32(seed, r, k * 3 + 1); val hp = h32(seed, r, k * 3 + 2); val hs = h32(seed, r, k * 3 + 3)
    val first = g("names")("first").arr; val plants = g("names")("plant").arr; val shapes = g("shapes").arr; val pas = g("passives").arr; val plant = (hp % plants.size).toInt; val p = pas((hs % pas.size).toInt)
    val th = g("threshold"); val when = ujson.Obj("total" -> ujson.Obj(primary -> th("base").num * math.pow(th("perForm").num, k) * math.pow(th("perRing").num, r - 1)))
    g.obj.get("twist").foreach(tw => if (k % tw("every").num.toInt == 0) when("stillDays") = tw("stillDays").num * r)
    ujson.Obj("id" -> s"r${r}f$k", "name" -> (first((hn % first.size).toInt).str + " " + plants(plant).str), "shape" -> shapes(plant % shapes.size).str, "effects" -> p("effects"), "text" -> p("text"), "when" -> when) } }
  def nextForm: Option[Value] = if (form + 1 < formsPerRing()) formDef(ring, form + 1) else formDef(ring + 1, 0)
  case class Cond(label: String, have: Double, need: Double) { def ok: Boolean = have >= need }
  def conditions(fd: Option[Value] = formDef()): Seq[Cond] = fd.flatMap(_.obj.get("when")).map { w => val out = mutable.ArrayBuffer[Cond]()
    w.obj.get("total").foreach(_.obj.foreach { case (r, v) => out += Cond(s"${rname(r)}, all time", total.getOrElse(r, 0.0), v.num) })
    w.obj.get("res").foreach(_.obj.foreach { case (r, v) => out += Cond(s"${rname(r)} in hand", res.getOrElse(r, 0.0), v.num) })
    w.obj.get("n").foreach(_.obj.foreach { case (id, v) => out += Cond(machine(id).map(_("name").str).getOrElse(id), n.getOrElse(id, 0).toDouble, v.num) })
    w.obj.get("sectors").foreach(v => out += Cond("chapters", sectors.size.toDouble, v match { case _: ujson.Str => sectorDefs.size.toDouble; case x => x.num }))
    w.obj.get("stillDays").foreach(v => out += Cond("days without acting", sinceAct, v.num)); out.toSeq }.getOrElse(Nil)
  def canBecome: Boolean = becoming.isDefined && conditions().forall(_.ok)
  def become(): Boolean = if (!canBecome) false else { val was = formDef().get("name").str; form += 1; formsDone += 1
    if (form >= formsPerRing()) { ring += 1; form = 0; acorns += 1; trees += 1; addLog(s"${was.capitalize} dropped an acorn. Ring ${ring - 1} closed and a tree stands. Ring $ring begins as ${formDef().get("name").str}.") }
    else { val now = formDef().get; addLog(s"${was.capitalize} became ${now("name").str}." + now.obj.get("text").map(t => " " + t.str.capitalize + ".").getOrElse("")) }
    recompute(); true }
  case class Tier(index: Int, name: String, nextAt: Option[Double], nextName: String)
  def forestTier: Tier = forestCfg.map { f => val tiers = f("tiers").arr.toSeq; var index = 0; var name = str(f, "none", "no trees yet"); var next: Option[(Double, String)] = tiers.headOption.map(t => (t("at").num, t("name").str))
    tiers.zipWithIndex.foreach { case (t, i) => if (trees >= t("at").num) { index = i + 1; name = t("name").str; next = tiers.lift(i + 1).map(x => (x("at").num, x("name").str)) } }
    val last = tiers.last; if (trees >= last("at").num) { val k = math.floor(math.log10(trees / last("at").num)).toInt; index = tiers.size + k; if (k > 0) name = s"${last("name").str}, $trees trees"; val na = last("at").num * math.pow(10, k + 1); next = Some((na, s"${last("name").str}, ${na.toLong} trees")) }
    Tier(index, name, next.map(_._1), next.map(_._2).getOrElse("")) }.getOrElse(Tier(0, "", None, ""))
  def depthOf(sp: Double): Int = mycCfg.map(y => if (sp < y("base").num) 0 else math.floor(math.log(sp / y("base").num) / math.log(y("growth").num)).toInt + 1).getOrElse(0)
  def depthNeed(d: Int): Double = mycCfg.map(y => y("base").num * math.pow(y("growth").num, d - 1)).getOrElse(Double.PositiveInfinity)
  def depthName(d: Int = depth): String = mycCfg.map { y => val ns = y("names").arr; if (d < ns.size) ns(d).str else s"${ns.last.str}, depth $d" }.getOrElse("")

  /* ------------------------------------------------------------------ tick */
  private def arrive(): Unit = { val cargo = D("ship")("cargo").num * mod("cargo"); val man = manifest.getOrElse(norm(plan)); val got = mutable.LinkedHashMap[String, Double]()
    man.foreach { case (k, f) => val kg = cargo * f; if (kg > 0) { if (k == "crew") { val c = math.floor(kg / (D("ship")("crewMass").num * mod("crewMass"))); res("crew") += c; got("crew") = c } else { res(k) = res.getOrElse(k, 0.0) + kg; got(k) = kg.round.toDouble } } }
    total("ships") = total.getOrElse("ships", 0.0) + 1
    addLog(s"${D("ship")("name").str} $shipN: " + got.map { case (k, v) => s"${v.round} ${rname(k)}" }.mkString(", ") + ".")
    shipN += 1; shipT += D("ship")("cadence").num; manifest = None; onShip(got.toMap) }
  def step(dt: Double, quiet: Boolean = false): Unit = {
    val s0 = seasonIdx; clock += dt; var dirty = false
    if (seasonIdx != s0) { dirty = true; if (!quiet) season.foreach(se => addLog(s"${se("name").str}.")) }
    val l = light; val P = power(l); val C = crew; val cm = calm; val fl = mutable.HashMap[String, Double]()
    def add(r: String, v: Double): Unit = fl(r) = fl.getOrElse(r, 0.0) + v
    D.obj.get("natural").foreach(_.obj.foreach { case (r, q) => val v = q.num * mod("all") * rm(r) * cm; res(r) = res.getOrElse(r, 0.0) + v * dt; total(r) = total.getOrElse(r, 0.0) + v * dt; add(r, v) })
    stillCfg.foreach(c => still = math.min(c("max").num, still + c("regen").num * mod("stillness") * dt))
    sinceAct += dt
    forestCfg.foreach(f => if (trees > 0) map(f, "natural").foreach { case (r, q) => val v = q * trees * mod("all") * rm(r) * cm; res(r) = res.getOrElse(r, 0.0) + v * dt; total(r) = total.getOrElse(r, 0.0) + v * dt; add(r, v) })
    machines.foreach { m => val id = m("id").str; val k = n(id); if (k > 0) {
      var r = 1.0; if (has(m, "draw")) r *= P.eff; if (has(m, "crew")) r *= C.eff * morale; if (bool(m, "solar")) r *= l; if (bool(m, "night")) r *= (if (l < 1) 1 else 0)
      val in = map(m, "in"); in.foreach { case (rs, q) => val need = q * k * r * dt; if (need > 0 && res(rs) < need) r *= math.max(0, res(rs) / need) }
      in.foreach { case (rs, q) => res(rs) = math.max(0, res(rs) - q * k * r * dt); add(rs, -q * k * r) }
      map(m, "out").foreach { case (rs, q) => if (rs != "power") { val v = q * k * r * mm(id) * mod("all") * rm(rs) * cm * (if (rs == "science") mod("science") else 1); res(rs) = res.getOrElse(rs, 0.0) + v * dt; total(rs) = total.getOrElse(rs, 0.0) + v * dt; add(rs, v) } } } }
    val c = res("crew"); if (c > 0) { var ok = true
      map(D("crew"), "needs").foreach { case (rs, q) => val w = q * c * mod("crewWater"); if (res(rs) < w * dt) ok = false; res(rs) = math.max(0, res(rs) - w * dt); add(rs, -w) }
      val target = if (ok) 1.0 else D("crew")("lowMorale").num; morale += math.signum(target - morale) * math.min(math.abs(target - morale), 0.05 * dt) }
    var lost = 0.0
    resources.foreach { r => val id = r("id").str; if (has(r, "decay")) { val loss = res(id) * r("decay").num * mod("decay") * dt; res(id) -= loss; lost += loss; add(id, -loss / dt) }; val cp = cap(id); if (res(id) > cp) res(id) = cp }
    mycCfg.foreach { y => spores += y("perTree").num * trees * dt + (if (bool(y, "fromDecay")) lost else 0.0)
      flushT -= dt; while (flushT <= 0) { flushT += y("every").num; val tr = res(primary) * y("tribute").num; res(primary) -= tr; spores += tr; if (!quiet) addLog(s"The mushrooms fruit. Tribute: ${tr.round} $primary to the mycelium.") }
      val d = depthOf(spores); if (d != depth) { depth = d; addLog(s"The mycelium is ${depthName(d)}."); dirty = true } }
    shipT -= dt; if (manifest.isEmpty && shipT <= D("ship")("lock").num) { manifest = Some(norm(plan)); addLog(s"${D("ship")("name").str} $shipN: the clouds have gathered. What they carry is settled.") }
    while (shipT <= 0) arrive()
    if (!quiet) { eventDefs.foreach { ev => val id = ev("id").str; if (!events.exists(_.id == id) && math.random() < ev("p").num * dt) { events += Ev(id, ev("dur").num); addLog(s"${ev("name").str}: ${ev("desc").str}"); dirty = true } }
      events.foreach(_.left -= dt); val before = events.size; events.filterInPlace(_.left > 0); if (events.size != before) dirty = true }
    milestoneDefs.foreach { ms => val id = ms("id").str; if (!milestones.contains(id)) { val v = str(ms, "kind") match { case "total" => total.getOrElse(ms("res").str, 0.0); case "res" => res(ms("res").str); case "research" => research.size.toDouble; case _ => sectors.size.toDouble }
      if (v >= ms("at").num) { milestones += id; addLog(ms("text").str); dirty = true } } }
    if (dirty) recompute(); flows = fl.toMap }
  def catchUp(now: Long = System.currentTimeMillis()): Double = { val away = math.min((now - savedAt) / 1000.0, D("offlineCap").num); if (away < 5) 0 else {
    val before = res(primary); var left = away; while (left > 0) { val d = math.min(5, left); step(d, quiet = true); left -= d }
    events.clear(); recompute(); addLog(s"Away ${(away / 60).round} min: +${(res(primary) - before).round} $primary."); away } }
}

/** The export, ported from Tick.assemble so the desktop can write grass.html too. */
object Export {
  def assemble(files: Map[String, String], defJson: String, footer: String): String = {
    val stamp = s"<!--\n  Exported from The First Blade (grass/desktop, ScalaFX) on ${java.time.LocalDate.now}.\n  Edit grass/def.json or the Workshop and export again; do not edit this file by hand.\n  SCRIPT: yes. It is a game and it counts while you are gone. Marked, like game.html.\n-->"
    def js(s: String) = s.replaceAll("(?i)</(script)", "<\\\\/$1") // a literal </script> inside inlined code would end the tag early
    files("play.html").replace("<!--STAMP-->", stamp)
      .replace("<script src=\"engine.js\"></script>", "<script>\n" + js(files("engine.js")) + "\n</script>")
      .replace("<script src=\"ui.js\"></script>", "<script id=\"tick-def\" type=\"application/json\">" + defJson.replace("</", "<\\/") + "</script>\n<script>\n" + js(files("ui.js")) + "\n</script>")
      .replace("<!--EXPORT-->", footer)
  }
}
