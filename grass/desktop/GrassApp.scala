package grass

import scalafx.Includes._
import scalafx.animation.AnimationTimer
import scalafx.application.{JFXApp3, Platform}
import scalafx.application.JFXApp3.PrimaryStage
import scalafx.collections.ObservableBuffer
import scalafx.geometry.Insets
import scalafx.scene.{Node, Scene}
import scalafx.scene.canvas.{Canvas, GraphicsContext}
import scalafx.scene.control._
import scalafx.scene.layout._
import scalafx.scene.paint.Color
import scalafx.scene.text.Font
import java.nio.file.{Files, Path, Paths}
import scala.collection.mutable

/** The First Blade, ScalaFX edition. Reads the same def.json as the page,
  * saves to ~/.grass/save.json in the same shape, exports the same grass.html,
  * and serves the same calls over HTTP so it can be scripted. */
object GrassApp extends JFXApp3 {
  val home: Path = Paths.get(System.getProperty("user.home"), ".grass")
  val gameDir: Path = Seq(Paths.get("grass"), Paths.get("."), Paths.get(".."), Paths.get("../..")).map(_.toAbsolutePath.normalize)
    .find(p => Files.exists(p.resolve("def.json")) && Files.exists(p.resolve("play.html"))).getOrElse(Paths.get("grass").toAbsolutePath)
  def read(p: Path): String = new String(Files.readAllBytes(p), "UTF-8")
  def write(p: Path, s: String): Unit = { Files.createDirectories(p.getParent); Files.write(p, s.getBytes("UTF-8")) }
  val shipped: ujson.Value = ujson.read(read(gameDir.resolve("def.json")))
  def currentDef: ujson.Value = if (Files.exists(home.resolve("def.json"))) ujson.read(read(home.resolve("def.json"))) else shipped
  var E: Engine = new Engine(currentDef)
  if (Files.exists(home.resolve("save.json"))) { try E.load(ujson.read(read(home.resolve("save.json")))) catch { case _: Exception => () } }
  E.catchUp()
  val api = new Api(() => E, d => Platform.runLater { applyDef(d) })

  def fmt(n: Double): String = { val a = math.abs(n)
    if (a < 1e3) { if (a < 10 && n % 1 != 0) f"$n%.2f" else if (a < 100 && n % 1 != 0) f"$n%.1f" else n.round.toString }
    else Seq(("T", 1e12), ("B", 1e9), ("M", 1e6), ("k", 1e3)).collectFirst { case (sfx, v) if a >= v => (if (a / v < 10) f"${n / v}%.2f" else f"${n / v}%.1f") + sfx }.getOrElse(n.toString) }
  def rname(id: String): String = E.rname(id)
  def costStr(c: Map[String, Double]): String = c.map { case (r, v) => s"${fmt(v)} ${rname(r)}" }.mkString(" · ")
  def saveNow(): Unit = write(home.resolve("save.json"), E.toJson.render())
  def applyDef(d: ujson.Value): Unit = { val s = E.toJson; E = new Engine(d); E.load(s); rebuildAll() }
  val dim = "-fx-text-fill: #95a0b3; -fx-font-size: 11px"; val ink = "-fx-text-fill: #efe9dc"; val panel = "-fx-background-color: #151922; -fx-background-radius: 8; -fx-border-color: #2b3445; -fx-border-radius: 8"

  /* ------------------------------------------------------------------- UI */
  val logItems = ObservableBuffer[String](); lazy val clockLabel = new Label("") { style = dim }; lazy val statBox = new HBox { spacing = 6 }
  val stats = mutable.LinkedHashMap[String, (Label, Label, ProgressBar)]()
  def stat(id: String, title: String): Unit = { val v = new Label("") { style = "-fx-font-size: 15px; -fx-text-fill: #efe9dc" }; val i = new Label("") { style = dim }
    val bar = new ProgressBar { progress = 0; prefWidth = 130 }; stats(id) = (v, i, bar)
    statBox.children += new VBox { spacing = 1; padding = Insets(6, 8, 6, 8); style = panel; children = Seq[Node](new Label(title.toUpperCase) { style = "-fx-text-fill: #95a0b3; -fx-font-size: 9px" }, v, i, bar) } }
  def add(box: Pane, ns: Node*): Unit = ns.foreach(n => box.children += n)
  def setStat(id: String, v: String, i: String, bar: Double): Unit = stats.get(id).foreach { case (a, b, c) => a.text = v; b.text = i; c.progress = math.max(0, math.min(1, bar)) }

  lazy val meadowBox = new VBox { spacing = 6; padding = Insets(8) }; lazy val sayingsBox = new FlowPane { hgap = 6; vgap = 6; padding = Insets(8) }; lazy val chaptersBox = new FlowPane { hgap = 6; vgap = 6; padding = Insets(8) }
  lazy val returnBox = new VBox { spacing = 6; padding = Insets(8) }; lazy val rainsBox = new VBox { spacing = 6; padding = Insets(8) }; lazy val youBox = new VBox { spacing = 6; padding = Insets(8) }; lazy val workshopBox = new VBox { spacing = 6; padding = Insets(8) }
  var mult = 1; var sig = ""
  val rows = mutable.ArrayBuffer[(String, Label, Label, Button)](); val sayBtns = mutable.ArrayBuffer[(String, Button)](); val chapBtns = mutable.ArrayBuffer[(String, Button)](); val returnBtns = mutable.ArrayBuffer[Button]()
  var rainsStatus: Label = null; var rainsSliders: Seq[(String, Slider, Label)] = Nil; var returnStatus: Label = null
  lazy val tapBtn = new Button("Act") { maxWidth = Double.MaxValue; onAction = _ => { E.synchronized(E.tap()); refresh() } }
  def signature: String = E.sectors.mkString(",") + "|" + E.research.mkString(",") + "|" + E.unlock.mkString(",") + "|" + E.playstyle + "|" + E.refloats + "|" + E.ring + ":" + E.form
  var formLabel: Label = null; var condLabel: Label = null; var becomeBtn: Button = null
  def refreshYou(): Unit = if (formLabel != null && E.becoming.isDefined) { val fd = E.formDef().get; val nx = E.nextForm.get
    formLabel.text = s"${fd("name").str} — ${J.str(fd, "text", "it is what it is")}\nring ${E.ring} · form ${E.form + 1} of ${E.formsPerRing()} · ${E.acorns} acorns · ${E.formsDone} becomings · +${((E.becoming.get("perForm").num * E.formsDone + E.becoming.get("perRing").num * (E.ring - 1)) * 100).round}% for good"
    condLabel.text = s"To become ${nx("name").str} (${J.str(nx, "text")}):\n" + E.conditions().map(c => s"  ${if (c.ok) "✓" else "·"} ${fmt(c.have)} / ${fmt(c.need)} ${c.label}").mkString("\n")
    becomeBtn.text = s"Become ${nx("name").str}"; becomeBtn.disable = !E.canBecome }

  def card(title: String, desc: String, extra: String, btn: Option[Button]): VBox = new VBox { spacing = 3; prefWidth = 230; padding = Insets(8); style = "-fx-background-color: #1c2230; -fx-background-radius: 8; -fx-border-color: #2b3445; -fx-border-radius: 8"
    children = Seq[Node](new Label(title) { wrapText = true; style = "-fx-font-weight: bold; -fx-text-fill: #efe9dc"; maxWidth = 214 }, new Label(desc) { wrapText = true; style = dim; maxWidth = 214 }) ++
      (if (extra.nonEmpty) Seq[Node](new Label(extra) { wrapText = true; style = "-fx-text-fill: #f2c98a; -fx-font-size: 11px"; maxWidth = 214 }) else Nil) ++ btn.toSeq }

  def buildMeadow(): Unit = { rows.clear(); meadowBox.children.clear()
    val seg = new HBox { spacing = 6; children = Seq[Node](new Label("let") { style = dim }) ++ Seq(1, 10, -1).map(k => new Button(if (k < 0) "×max" else s"×$k") { onAction = _ => { mult = k; buildMeadow(); refresh() } }) }
    add(meadowBox, tapBtn, seg)
    if (E.playstyle.isEmpty) meadowBox.children += new VBox { spacing = 4; padding = Insets(8); style = "-fx-background-color: #2a2036; -fx-background-radius: 8"
      children = Seq[Node](new Label("Who stays as your guest? A guest is a template: multipliers and a few things only they know how to let happen.") { wrapText = true; style = ink }) ++
        E.playstyles.map(p => new Button(s"${p("name").str} — ${p("desc").str}") { maxWidth = Double.MaxValue; onAction = _ => { E.synchronized(E.setPlaystyle(p("id").str)); rebuildAll() } }) }
    E.sectorDefs.filter(s => E.sectors.contains(s("id").str)).foreach { s => val ms = E.machines.filter(m => m("sector").str == s("id").str && E.available(m)); if (ms.nonEmpty) {
      val sec = new VBox { spacing = 4; padding = Insets(8); style = panel }
      sec.children += new Label(s"${s("name").str}  ·  ${s("role").str}".toUpperCase) { style = "-fx-text-fill:#95a0b3; -fx-font-size: 10px" }
      ms.foreach { m => val mid = m("id").str; val cnt = new Label("0") { style = "-fx-font-size: 18px; -fx-text-fill: #3f8fbf"; minWidth = 40 }; val info = new Label("") { wrapText = true; style = dim; maxWidth = 520 }
        val b = new Button("let") { onAction = _ => { E.synchronized(E.buy(mid, mult)); refresh() } }; rows += ((mid, cnt, info, b))
        val text = new VBox { children = Seq[Node](new Label(m("name").str) { style = "-fx-font-weight: bold; -fx-text-fill:#efe9dc" }, new Label(m("desc").str) { wrapText = true; style = dim; maxWidth = 520 }, info) }
        HBox.setHgrow(text, Priority.Always); sec.children += new HBox { spacing = 8; children = Seq[Node](cnt, text, b) } }
      meadowBox.children += sec } }
    sig = signature }
  def refreshMeadow(): Unit = { val L = E.lift; val cm = E.calm
    rows.foreach { case (id, cnt, info, b) => val m = E.machine(id).get; val k = if (mult < 0) math.max(1, E.maxBuy(m)) else mult; val c = E.cost(m, k); cnt.text = E.n(id).toString
      val outs = J.map(m, "out").map { case (r, q) => s"${fmt(q * E.mm(id) * E.mod("all") * (if (r == "power") 1 else E.rm(r) * cm))} ${if (r == "power") E.D("powerName").str else rname(r)}/s" }
      val ins = J.map(m, "in").map { case (r, q) => s"−${fmt(q)} ${rname(r)}/s" }
      val room = L.used + J.num(m, "mass") * k <= L.cap
      info.text = (outs ++ ins ++ Seq(if (J.has(m, "lift")) s"+${fmt(J.num(m, "lift") * E.mod("lift"))} ${E.D("lift")("name").str}" else "", if (J.has(m, "draw")) s"${fmt(J.num(m, "draw") * E.mod("draw"))} ${E.D("powerName").str}" else "", if (J.has(m, "crew")) s"${fmt(J.num(m, "crew") * E.mod("crewNeed"))} ${E.D("crew")("name").str}" else "")).filter(_.nonEmpty).mkString(" · ") + s"\n×$k: ${costStr(c)}" + (if (room) "" else s" · no ${E.D("lift")("name").str}")
      b.disable = !(E.can(c) && room) }
    tapBtn.text = s"Act · +${fmt(E.D("tap").num * E.mod("tap") * E.mod("all"))} ${rname(E.primary)}" + E.stillCfg.map(c => s" · costs ${c("tapCost").num.toInt} stillness").getOrElse("") }

  def buildRains(): Unit = { rainsBox.children.clear(); val sh = E.D("ship"); rainsStatus = new Label("") { wrapText = true; style = ink }
    add(rainsBox, new Label(sh("note").str) { wrapText = true; style = dim; maxWidth = 600 }, rainsStatus)
    rainsSliders = E.keys.map { k => val sl = new Slider(0, 100, (E.plan.getOrElse(k, 0.0) * 100).round.toDouble) { prefWidth = 260 }; (k, sl, new Label("") { style = ink }) }
    rainsSliders.foreach { case (k, sl, out) => sl.value.onChange { (_, _, _) => E.synchronized(E.setPlan(rainsSliders.map { case (k2, s2, _) => k2 -> s2.value.value }.toMap)) }
      rainsBox.children += new HBox { spacing = 8; children = Seq[Node](new Label(rname(k)) { minWidth = 80; style = dim }, sl, out) } } }
  def refreshRains(): Unit = { val cargo = E.D("ship")("cargo").num * E.mod("cargo"); val man = E.manifest.getOrElse(E.plan)
    rainsStatus.text = s"${E.D("ship")("name").str} ${E.shipN} · in ${math.ceil(E.shipT).toInt} d · ${if (E.manifest.isDefined) "the clouds have gathered; what they carry is settled" else s"open for ${math.ceil(E.shipT - E.D("ship")("lock").num).toInt} d more"} · carries ${fmt(cargo)}"
    rainsSliders.foreach { case (k, _, out) => val kg = cargo * man.getOrElse(k, 0.0); out.text = if (k == "crew") s"${math.floor(kg / (E.D("ship")("crewMass").num * E.mod("crewMass"))).toInt} ${E.D("crew")("name").str}" else s"${fmt(kg)} ${rname(k)}" } }

  def buildSayings(): Unit = { sayingsBox.children.clear(); sayBtns.clear(); E.researchDefs.foreach { r => val rid = r("id").str; val done = E.research.contains(rid); val needs = J.strs(r, "needs").filterNot(E.research.contains)
    val b = new Button(if (done) "known" else s"${fmt(E.researchCost(r))} ${rname("science")}") { disable = done || needs.nonEmpty; onAction = _ => { E.synchronized(E.doResearch(rid)); rebuildAll() } }; sayBtns += ((rid, b))
    sayingsBox.children += card(r("name").str, r("desc").str, if (needs.nonEmpty) "needs " + needs.flatMap(x => E.find(E.researchDefs, x)).map(_("name").str).mkString(", ") else "", Some(b)) } }
  def refreshSayings(): Unit = sayBtns.foreach { case (id, b) => E.find(E.researchDefs, id).foreach(r => if (!E.research.contains(id)) b.disable = J.strs(r, "needs").exists(x => !E.research.contains(x)) || E.res("science") < E.researchCost(r)) }

  def buildChapters(): Unit = { chaptersBox.children.clear(); chapBtns.clear(); E.sectorDefs.foreach { s => val sid = s("id").str; val built = E.sectors.contains(sid); val c0 = J.map(s, "cost"); val crew = c0.getOrElse("crew", 0.0); val c = c0 - "crew"
    val b = if (built) None else Some(new Button(costStr(c) + (if (crew > 0) s" · ${crew.toInt} ${E.D("crew")("name").str}" else "")) { onAction = _ => { E.synchronized(E.build(sid)); rebuildAll() } })
    b.foreach(bt => chapBtns += ((sid, bt)))
    chaptersBox.children += card(s"${s("name").str}  (${s("role").str})", s("desc").str, (if (J.has(s, "needs")) "after " + J.strs(s, "needs").flatMap(x => E.find(E.sectorDefs, x)).map(_("name").str).mkString(" and ") else "") + (if (built) "  · reached" else ""), b) } }
  def refreshChapters(): Unit = chapBtns.foreach { case (id, b) => E.find(E.sectorDefs, id).foreach { s => val c0 = J.map(s, "cost"); b.disable = !(E.sectorOk(s) && E.can(c0 - "crew") && E.res("crew") >= c0.getOrElse("crew", 0.0)) } }

  def buildReturn(): Unit = { returnBox.children.clear(); returnBtns.clear(); val P = E.D("prestige"); returnStatus = new Label("") { wrapText = true; style = ink; maxWidth = 600 }
    add(returnBox, new Label(P("note").str) { wrapText = true; style = dim; maxWidth = 600 }, returnStatus)
    val fp = new FlowPane { hgap = 6; vgap = 6 }; J.arr(P, "doctrines").foreach { d => val did = d("id").str
      val b = new Button("Return, keeping this") { disable = !E.canRefloat; onAction = _ => { E.synchronized(E.refloat(did)); rebuildAll() } }; returnBtns += b
      fp.children += card(d("name").str + E.doctrines.get(did).map(k => s"  ×$k").getOrElse(""), d("desc").str, "", Some(b)) }
    returnBox.children += fp }
  def refreshReturn(): Unit = { returnStatus.text = (if (E.canRefloat) "the root is ready" else s"needs ${E.find(E.sectorDefs, E.D("prestige")("requires").str).map(_("name").str).getOrElse("")} and ${fmt(E.D("prestige")("min").num)} ${rname(E.primary)} all time") +
    s" · root ${E.ballast} → +${E.refloatPoints} · everything ×${"%.1f".format(1 + E.D("prestige")("perPoint").num * E.ballast)} · returns ${E.refloats}"; returnBtns.foreach(_.disable = !E.canRefloat) }

  lazy val youCanvas = new Canvas(260, 340)
  def buildYou(): Unit = { youBox.children.clear(); val form = new VBox { spacing = 4 }
    if (E.becoming.isDefined) { formLabel = new Label("") { wrapText = true; style = ink; maxWidth = 700 }; condLabel = new Label("") { wrapText = true; style = dim; maxWidth = 700 }
      becomeBtn = new Button("Become") { maxWidth = Double.MaxValue; onAction = _ => { E.synchronized(E.become()); rebuildAll() } }
      youBox.children += new VBox { spacing = 4; padding = Insets(8); style = panel; children = Seq[Node](new Label("YOUR FORM · " + E.becoming.get("note").str) { wrapText = true; style = dim; maxWidth = 700 }, formLabel, condLabel, becomeBtn) } }
    E.forestCfg.foreach { f => val ft = E.forestTier; youBox.children += new Label(s"THE FOREST · ${E.trees} trees · ${ft.name}${ft.nextAt.map(a => s" · ${ft.nextName} at ${fmt(a)}").getOrElse("")} · +${(f("perTree").num * 100).round}% each, +${(f("tierBonus").num * 100).round}% per tier · ${f("note").str}") { wrapText = true; style = dim; maxWidth = 700 } }
    E.mycCfg.foreach { y => youBox.children += new Label(s"THE MYCELIUM · ${E.depthName()} · depth ${E.depth} · ${fmt(E.spores)} spores · next at ${fmt(E.depthNeed(E.depth + 1))} · fruits every ${y("every").num.toInt} days, tribute ${(y("tribute").num * 100).round}% · ${y("note").str}") { wrapText = true; style = dim; maxWidth = 700 } }
    refreshYou()
    E.D.obj.get("avatar").foreach { av => form.children += new Label(av("note").str) { wrapText = true; style = dim; maxWidth = 420 }
      av("fields").arr.foreach { f => val fid = f("id").str; val ctl: Node = f("type").str match {
        case "text" => new TextField { text = E.avatar.get(fid).map(_.str).getOrElse(""); text.onChange { (_, _, v) => E.avatar(fid) = ujson.Str(v) } }
        case "range" => new Slider(f("min").num, f("max").num, E.avatar.get(fid).map(_.num).getOrElse(f("min").num)) { value.onChange { (_, _, v) => E.avatar(fid) = ujson.Num(v.doubleValue) } }
        case _ => new ChoiceBox[String](ObservableBuffer.from(f("options").arr.map(_.str))) { value = E.avatar.get(fid).map(_.str).getOrElse(f("options")(0).str); value.onChange { (_, _, v) => E.avatar(fid) = ujson.Str(v) } } }
        form.children += new HBox { spacing = 8; children = Seq[Node](new Label(f("name").str) { minWidth = 100; style = dim }, ctl) } } }
    youBox.children += new HBox { spacing = 10; children = Seq[Node](youCanvas, new ScrollPane { content = form; prefHeight = 340; style = "-fx-background: #0b0d12" }) } }
  def drawYou(t: Double): Unit = { val g = youCanvas.graphicsContext2D; g.fill = Color.web("#12263a"); g.fillRect(0, 0, 260, 340); g.fill = Color.web("#3a5a3a"); g.fillRect(0, 300, 260, 40); Scene2D.form(g, 130, 300, 1.5, E, t) }

  def buildWorkshop(): Unit = { workshopBox.children.clear(); val ta = new TextArea(ujson.write(E.D, 1)) { prefRowCount = 18; style = "-fx-font-family: Consolas, monospace; -fx-font-size: 11px" }; val msg = new Label("") { style = dim }
    def b(t: String)(f: => String): Button = new Button(t) { onAction = _ => msg.text = (try f catch { case e: Exception => "no: " + e.getMessage }) }
    add(workshopBox, new Label("The rules, live. Apply keeps your save; Save as default keeps the rules in ~/.grass/def.json.") { style = dim }, ta,
      new HBox { spacing = 6; children = Seq[Node](b("Apply") { applyDef(ujson.read(ta.text.value)); "applied" }, b("Save as default") { write(home.resolve("def.json"), ta.text.value); applyDef(ujson.read(ta.text.value)); "saved" },
        b("Revert to shipped") { Files.deleteIfExists(home.resolve("def.json")); applyDef(shipped); ta.text = ujson.write(shipped, 1); "shipped rules restored" },
        b("Export grass.html to the yard") { val files = Seq("play.html", "engine.js", "ui.js").map(f => f -> read(gameDir.resolve(f))).toMap
          val html = Export.assemble(files, E.D.render(), "<footer class=\"yard\"><a href=\"arcade.html\">← the arcade</a> · <a href=\"index.html\">the yard</a> · <a href=\"grass/play.html\">the workshop</a></footer>")
          val out = gameDir.getParent.resolve("grass.html"); write(out, html); s"wrote $out (${html.length} bytes)" },
        b("Wipe save") { Files.deleteIfExists(home.resolve("save.json")); E = new Engine(E.D); rebuildAll(); "wiped" }) }, msg)
    val idx = gameDir.resolve("templates/index.json")
    if (Files.exists(idx)) { val list = ujson.read(read(idx)).arr.toSeq; val pick = new ChoiceBox[String](ObservableBuffer.from(list.map(t => s"${t("name").str}  [${t("status").str}]"))) { value = list.headOption.map(t => s"${t("name").str}  [${t("status").str}]").getOrElse("") }
      workshopBox.children += new HBox { spacing = 6; children = Seq[Node](new Label("Templates · n0 is the game as shipped; the maybe list holds candidates") { style = dim }, pick,
        b("Start a new meadow with this") { val t = list(pick.selectionModel().getSelectedIndex); val d = ujson.read(read(gameDir.resolve("templates").resolve(t("file").str)))
          write(home.resolve("def.json"), d.render(indent = 1)); Files.deleteIfExists(home.resolve("save.json")); E = new Engine(d); rebuildAll(); ta.text = ujson.write(d, 1); s"started under ${t("name").str}" }) } }
    workshopBox.children += new VBox { children = Seq[Node](
      new Label(s"API on http://127.0.0.1:7331/api — GET state|def|rates|mods; POST tap, buy/{id}?k=, research/{id}, build/{id}, plan, playstyle/{id}, refloat/{id}, avatar; PUT def. Files: $gameDir") { wrapText = true; style = dim; maxWidth = 700 }) } }

  def rebuildAll(): Unit = { buildMeadow(); buildRains(); buildSayings(); buildChapters(); buildReturn(); buildYou(); refresh() }
  def refresh(): Unit = { val P = E.power(); val C = E.crew; val L = E.lift; val R = E.flows
    setStat("primary", fmt(E.res(E.primary)), s"${if (R.getOrElse(E.primary, 0.0) >= 0) "+" else ""}${fmt(R.getOrElse(E.primary, 0.0))}/s · all ×${"%.2f".format(E.mod("all"))}", 0)
    E.stillCfg.foreach(c => setStat("still", s"${E.still.round} / ${c("max").num.toInt}", s"growing at ${(E.calm * 100).round}%", E.still / c("max").num))
    setStat("power", s"${fmt(P.sup)} / ${fmt(P.dem)}", if (P.eff < 1) s"short: everything at ${(P.eff * 100).round}%" else "supply / demand", if (P.dem > 0) P.sup / P.dem else 1)
    setStat("ground", s"${fmt(L.used)} / ${fmt(L.cap)}", "used / open", L.used / L.cap)
    setStat("crew", fmt(E.res("crew")), s"${fmt(C.need)} wanted · morale ${(E.morale * 100).round}%", if (C.need > 0) math.min(1, E.res("crew") / C.need) else 1)
    setStat("rains", s"${math.ceil(E.shipT).toInt} d", if (E.manifest.isDefined) "the clouds have gathered" else "still open", 1 - E.shipT / E.D("ship")("cadence").num)
    val ev = E.events.flatMap(e => E.find(E.eventDefs, e.id)).map(_("name").str).mkString(", ")
    setStat("sky", E.season.map(_("name").str + " · ").getOrElse("") + (if (E.isDay) E.D("day")("dayName").str else E.D("day")("nightName").str), if (ev.nonEmpty) ev else if (E.isDay) "sun on the grass" else s"dark · ${(E.mod("night") * 100).round}%", E.phase)
    clockLabel.text = s"day ${E.clock.toInt} · ${E.playstyle.map("guest: " + _).getOrElse("no guest yet")}${E.formDef().map(fd => s" · ring ${E.ring}, ${fd("name").str}").getOrElse("")} · " + E.resources.filter(r => r("id").str != E.primary && r("id").str != "crew").map(r => s"${fmt(E.res(r("id").str))} ${r("name").str}").mkString(" · ")
    E.becoming.foreach { _ => val cs = E.conditions(); val fd = E.formDef().get; setStat("form", fd("name").str, s"ring ${E.ring} · ${E.acorns} acorns · ${if (E.canBecome) "ready to become " + E.nextForm.get("name").str else cs.count(_.ok) + "/" + cs.size + " toward " + E.nextForm.get("name").str}", if (cs.isEmpty) 1 else cs.map(c => math.min(1, c.have / c.need)).sum / cs.size) }
    E.forestCfg.foreach { _ => val ft = E.forestTier; setStat("forest", s"${E.trees} trees", ft.name + ft.nextAt.map(a => s" · ${ft.nextName} at ${fmt(a)}").getOrElse(""), ft.nextAt.map(a => E.trees / a).getOrElse(1.0)) }
    E.mycCfg.foreach { _ => val need = E.depthNeed(E.depth + 1); val prev = if (E.depth > 0) E.depthNeed(E.depth) else 1.0; setStat("myc", E.depthName(), s"${fmt(E.spores)} spores · fruits in ${math.ceil(E.flushT).toInt} d", math.log(math.max(1, E.spores) / prev) / math.log(need / prev)) }
    if (signature != sig) { buildMeadow(); buildSayings(); buildChapters(); buildReturn(); buildYou() }
    refreshMeadow(); refreshRains(); refreshSayings(); refreshChapters(); refreshReturn(); refreshYou()
    if (logItems.size != E.log.size || (E.log.nonEmpty && logItems.nonEmpty && !logItems.head.endsWith(E.log.head._2))) { logItems.clear(); logItems ++= E.log.map { case (t, m) => s"d$t  $m" } } }

  override def start(): Unit = {
    stat("primary", rname(E.primary)); if (E.stillCfg.isDefined) stat("still", "stillness"); stat("power", E.D("powerName").str); stat("ground", E.D("lift")("name").str); stat("crew", E.D("crew")("name").str); stat("rains", E.D("ship")("name").str); stat("sky", "the sky")
    if (E.becoming.isDefined) stat("form", "your form"); if (E.forestCfg.isDefined) stat("forest", "the forest"); if (E.mycCfg.isDefined) stat("myc", "the mycelium")
    val sceneCanvas = new Canvas(960, 170)
    val tabPane = new TabPane { tabClosingPolicy = TabPane.TabClosingPolicy.Unavailable }
    tabPane.tabs = Seq(
      new Tab { text = "The meadow"; content = new ScrollPane { content = meadowBox; fitToWidth = true; style = "-fx-background: #0b0d12" } },
      new Tab { text = E.D("ship")("name").str; content = rainsBox }, new Tab { text = "Sayings"; content = new ScrollPane { content = sayingsBox; fitToWidth = true } },
      new Tab { text = "Chapters"; content = new ScrollPane { content = chaptersBox; fitToWidth = true } }, new Tab { text = E.D("prestige")("name").str; content = returnBox },
      new Tab { text = "Your blade"; content = youBox }, new Tab { text = "Workshop"; content = workshopBox },
      new Tab { text = "Log"; content = new ListView[String](logItems) })
    buildWorkshop(); rebuildAll()
    val header = new HBox { spacing = 10; children = Seq[Node](new Label("The First Blade") { font = Font(18); style = "-fx-text-fill: #f2c98a; -fx-font-weight: bold" }, new Label(E.D("tagline").str) { style = dim }) }
    val topBox = new VBox { spacing = 4; padding = Insets(8); children = Seq[Node](header, sceneCanvas, statBox, clockLabel) }
    val layout = new BorderPane { style = "-fx-background-color: #0b0d12"; top = topBox; center = tabPane }
    stage = new PrimaryStage { title = "The First Blade"; width = 980; height = 760; scene = new Scene(layout) { fill = Color.web("#0b0d12") } }
    var last = System.nanoTime(); var acc = 0.0; var saveAcc = 0.0
    AnimationTimer { now => val dt = math.min(1.0, (now - last) / 1e9); last = now; acc += dt; saveAcc += dt
      E.synchronized(E.step(dt)); Scene2D.draw(sceneCanvas.graphicsContext2D, sceneCanvas.width.value, sceneCanvas.height.value, E, now / 1e6)
      if (tabPane.selectionModel().getSelectedIndex == 5) drawYou(now / 1e6)
      if (acc > 0.1) { acc = 0; refresh() }; if (saveAcc > 5) { saveAcc = 0; saveNow() } }.start()
    api.start(); stage.onCloseRequest = _ => { saveNow(); api.stop() }
  }
}

/** The meadow, drawn. A port of the page's scene: sky by the hour, hills,
  * tufts for what has grown, the rains arriving, the guest events, and your blade. */
object Scene2D {
  def draw(g: GraphicsContext, W: Double, H: Double, E: Engine, t: Double): Unit = {
    val day = E.isDay; val ph = E.phase; val night = E.D("day")("night").num
    g.fill = if (day) Color.web("#2a4a6e") else Color.web("#070b16"); g.fillRect(0, 0, W, H); g.fill = if (day) Color.web("#e7a26b", 0.5) else Color.web("#1b2438", 0.6); g.fillRect(0, H * 0.4, W, H * 0.6)
    val f = if (day) ph / (1 - night) else (ph - (1 - night)) / night; val r = if (day) 13.0 else 9.0; g.fill = if (day) Color.web("#ffe9a8") else Color.web("#dfe6f5"); g.fillOval(W * f - r, H * 0.55 - math.sin(math.Pi * f) * H * 0.45 - r, r * 2, r * 2)
    g.fill = if (day) Color.web("#274f3b") else Color.web("#0e1f19"); (0 until 14).foreach { i => val x = W - i * (W / 12) - 30; val h = 40 + (i * 37 % 30); g.fillPolygon(Seq((x - 18, H * 0.62), (x, H * 0.62 - h), (x + 18, H * 0.62))) }
    val wy = H * (if (day) 0.66 else 0.68); g.fill = if (day) Color.web("#3f8fbf") else Color.web("#1a3550"); g.fillRect(0, wy, W, H - wy)
    g.fill = if (day) Color.web("#3a5a3a") else Color.web("#152215"); g.fillRect(0, H * 0.62, W, wy - H * 0.62)
    val prod = E.machines.filter(m => J.map(m, "out").contains(E.primary)).map(m => E.n(m("id").str)).sum
    val tufts = math.min(70, 1 + (math.log(1 + prod + E.res(E.primary) / 200) / math.log(2) * 7).round.toInt); g.stroke = if (day) Color.web("#9ad36a") else Color.web("#3f6b34"); g.lineWidth = 2
    (0 until tufts).foreach { i => val x = 10 + (i * 137 % math.max(1, (W * 0.42).toInt)); val y = H * 0.63 + (i * 53 % math.max(1, (wy - 14 - H * 0.63).toInt)); val sw = math.sin(t / 700 + i) * 3; (-1 to 1).foreach(k => g.strokeLine(x, y, x + k * 4 + sw, y - 10 - (if (k == 0) 4 else 0))) }
    E.sectors.foreach { id => val k = E.sectorDefs.indexWhere(_("id").str == id); val x = 20 + k * (W / 13); g.fill = if (day) Color.web("#6b5a44") else Color.web("#2a2420"); g.fillRect(x, H * 0.62 - 16, 18, 16); g.fill = if (E.power().eff < 1 && math.sin(t / 60 + k) > 0.3) Color.web("#333333") else Color.web("#ffd68a"); g.fillRect(x + 6, H * 0.62 - 11, 5, 6) }
    if (E.shipT < 60) { val f2 = 1 - E.shipT / 60; val bx = W + 80 - f2 * (W * 0.7); g.fill = Color.web("#78828f", 0.85); Seq((-30, 16), (0, 22), (28, 15), (-8, 18)).foreach { case (dx, rr) => g.fillOval(bx + dx - rr, 34 - rr, rr * 2, rr * 2) } }
    E.events.zipWithIndex.foreach { case (e, i) => E.find(E.eventDefs, e.id).foreach { d => val colS = J.str(d, "color", "#ffffff"); J.str(d, "fx") match {
      case "shadow" => g.fill = Color.web(colS, 0.45); g.fillRect(0, 0, W, H); val dx = (t / 8) % (W + 300) - 150; g.fill = Color.web("#000000", 0.6); g.fillOval(dx - 90, 26, 180, 28)
      case "sparks" => g.fill = Color.web(colS); (0 until 14).foreach(j => g.fillRect((j * 83 + t / 9) % W, H - ((j * 41 + t / 6) % H), 3, 3))
      case "gold" => g.fill = Color.web(colS, 0.12); g.fillRect(0, 0, W, H)
      case "rain" => g.stroke = Color.web(colS, 0.4); g.lineWidth = 1; (0 until 40).foreach { j => val x = (j * 97 + t / 4) % W; val y = (j * 53 + t / 3) % H; g.strokeLine(x, y, x - 3, y + 10) }
      case _ => () }
      g.fill = Color.web("#efe9dc"); g.font = Font(12); g.fillText(s"${d("name").str} · ${math.ceil(e.left).toInt}d", W - 200, 18 + 16 * i) } }
    forest(g, W, H, wy, E, day); form(g, W * 0.45, wy - 10, 0.55, E, t)
    g.fill = Color.web("#efe9dc", 0.7); g.font = Font(11); g.fillText(s"${if (day) E.D("day")("dayName").str else E.D("day")("nightName").str} · light ${(E.light * 100).round}% · ${E.sectors.size}/${E.sectorDefs.size} chapters · stillness ${E.still.round}", 10, 16)
  }
  /** The form you are, drawn from its shape; the forest; the mushrooms. Silhouettes, no eyes. */
  def form(g: GraphicsContext, x: Double, y: Double, s: Double, E: Engine, t: Double): Unit = {
    val a = E.avatar; val shape = E.formDef().map(_("shape").str).getOrElse("blade"); val green = Color.web(a.get("green").collect { case v: ujson.Str => v.value }.getOrElse("#9ad36a")); val ring = E.ring
    val H = s * (10 + a.get("height").collect { case v: ujson.Num => v.value }.getOrElse(40.0) * 1.1); val wig = math.sin(t / 900) * 2 * s
    def tree(h: Double, w: Double, canopy: Seq[(Double, Double, Double)]): Unit = { g.fill = Color.web("#5a3d24"); g.fillRect(x - w / 2, y - h, w, h); g.fill = green; canopy.foreach { case (dx, dy, r) => g.fillOval(x + dx * s + wig * .3 - r * s, y - h - dy * s - r * s * .8, r * s * 2, r * s * 1.6) } }
    def label(): Unit = { g.fill = Color.web("#efe9dc", 0.85); g.font = Font(11 * s / 1.6); g.fillText(a.get("name").collect { case v: ujson.Str => v.value }.getOrElse(""), x - 30 * s, y + 16 * s) }
    def withA(kv: (String, String)*): collection.Map[String, ujson.Value] = a ++ kv.map { case (k, v) => k -> (ujson.Str(v): ujson.Value) }
    shape match {
      case "blade" | "fern" | "tuft" | "reed" | "sedge" => blade(g, x, y, s, if (shape == "blade") a else withA("clump" -> (if (shape == "tuft") "a tuft" else "three")), t)
      case "flower" | "blossom" | "lotus" | "thistle" => blade(g, x, y, s, withA("head" -> "none", "clump" -> "one blade"), t); val n = if (shape == "thistle") 14 else if (shape == "lotus") 8 else 6; val tx = x + wig; val ty = y - H
        g.fill = Color.web(a.get("headColor").collect { case v: ujson.Str => v.value }.getOrElse("#e8d9a0")); (0 until n).foreach { i => val an = i.toDouble / n * math.Pi * 2 + t / 4000; g.fillOval(tx + math.cos(an) * 6 * s - 3 * s, ty + math.sin(an) * 6 * s - 2 * s, 6 * s, 4 * s) }
        g.fill = Color.web(a.get("tip").collect { case v: ujson.Str => v.value }.getOrElse("#f2c98a")); g.fillOval(tx - 3 * s, ty - 3 * s, 6 * s, 6 * s)
      case "acorn" | "gourd" | "lichen" | "bramble" => g.fill = Color.web(if (shape == "gourd") "#c9a227" else if (shape == "lichen") "#8fb56a" else "#b98c5a"); g.fillOval(x - 7 * s, y - 17 * s, 14 * s, 18 * s)
        if (shape == "acorn" || shape == "bramble") { g.fill = Color.web("#6b4a2a"); g.fillOval(x - 8 * s, y - 18 * s, 16 * s, 8 * s); g.fillRect(x - s, y - 20 * s, 2 * s, 6 * s) }; label()
      case "sapling" | "willow" | "pine" => tree((30 + 6 * math.min(ring, 8)) * s, 3 * s, if (shape == "pine") Seq((0.0, 12.0, 9.0), (0.0, 4.0, 12.0), (0.0, -4.0, 15.0)) else Seq((0.0, 6.0, 12.0), (-6.0, 0.0, 8.0), (6.0, 0.0, 8.0))); label()
      case "oak" => tree((50 + 6 * math.min(ring, 10)) * s, 8 * s, Seq((0.0, 14.0, 26.0), (-18.0, 4.0, 16.0), (18.0, 4.0, 16.0), (-8.0, 24.0, 12.0), (8.0, 24.0, 12.0))); label()
      case "grove" => Seq(-26.0, 0.0, 26.0).foreach { dx => form2(g, x + dx * s, y, s, green, (40 + 5 * math.min(ring, 10)) * s, wig) }; label()
      case _ => blade(g, x, y, s, a, t) } }
  private def form2(g: GraphicsContext, x: Double, y: Double, s: Double, green: Color, h: Double, wig: Double): Unit = { g.fill = Color.web("#5a3d24"); g.fillRect(x - 2.5 * s, y - h, 5 * s, h); g.fill = green; Seq((0.0, 10.0, 18.0), (-10.0, 2.0, 12.0), (10.0, 2.0, 12.0)).foreach { case (dx, dy, r) => g.fillOval(x + dx * s + wig * .3 - r * s, y - h - dy * s - r * s * .8, r * s * 2, r * s * 1.6) } }
  def forest(g: GraphicsContext, W: Double, H: Double, wy: Double, E: Engine, day: Boolean): Unit = {
    (0 until math.min(40, E.trees)).foreach { i => val tx = W * .56 + (i * 41 % math.max(1, (W * .42).toInt)); val th = 18 + (i * 13 % 16); val ty = H * .62 + 4 + (i * 7 % 10); g.fill = Color.web(if (day) "#4a3220" else "#1e150c"); g.fillRect(tx - 1.5, ty - th, 3, th); g.fill = Color.web(if (day) "#3f8a3a" else "#173a1a"); g.fillOval(tx - 9, ty - th - 8, 18, 16) }
    if (E.trees > 40) { g.fill = Color.web("#efe9dc", 0.7); g.font = Font(10); g.fillText(s"${E.trees} trees", W - 80, H * .62 - 4) }
    (0 until math.min(30, E.depth * 3)).foreach { i => val mx = 12 + (i * 53 % math.max(1, (W * .4).toInt)); val my = wy - 4 - (i * 29 % math.max(1, (wy - 8 - H * .63).toInt)); g.fill = Color.web("#e8e0d0"); g.fillRect(mx - 1, my - 5, 2, 5); g.fill = Color.web(if (i % 3 == 0) "#e8c070" else "#c9583a"); g.fillArc(mx - 4, my - 7.5, 8, 5, 0, 180, javafx.scene.shape.ArcType.ROUND) } }
  /** Your blade, from the template. Nothing on it looks back. */
  def blade(g: GraphicsContext, x: Double, y: Double, s: Double, a: collection.Map[String, ujson.Value], t: Double): Unit = {
    def str(k: String, d: String = "") = a.get(k).collect { case v: ujson.Str => v.value }.getOrElse(d); def num(k: String, d: Double) = a.get(k).collect { case v: ujson.Num => v.value }.getOrElse(d)
    val H = s * (10 + num("height", 40) * 1.1); val w0 = Map("fine" -> 2.0, "narrow" -> 3.5, "broad" -> 6.0, "flat" -> 8.0).getOrElse(str("width"), 3.5) * s
    val wind = Map("still" -> .2, "swaying" -> 1.0, "restless" -> 2.2).getOrElse(str("mood"), 1.0); val lean = Map("upright" -> 0.0, "leaning" -> .18, "bowed" -> .45, "wind-bent" -> .3).getOrElse(str("lean"), 0.0)
    val nb = Map("one blade" -> 1, "three" -> 3, "five" -> 5, "a tuft" -> 9).getOrElse(str("clump"), 1); val green = Color.web(str("green", "#9ad36a")); val tip = Color.web(str("tip", "#e8e0a0")); val root = str("root", "bare earth")
    if (root == "moss") { g.fill = Color.web("#4f7a4a"); g.fillOval(x - 14 * s, y - 4 * s, 28 * s, 8 * s) }
    if (root.contains("shell") || root.contains("cowrie") || root.contains("pearl") || root.contains("stone")) { g.fill = Color.web(if (root.contains("pearl")) "#f4f0ff" else if (root.contains("stone")) "#8a8a90" else "#f2c98a"); val k = if (root.contains("lot")) 5 else 1; (0 until k).foreach(i => g.fillOval(x + (i - (k - 1) / 2.0) * 7 * s + 3 * s, y - 1.2 * s, 6 * s, 4.4 * s)) }
    (0 until nb).foreach { i => val off = if (nb == 1) 0.0 else (i - (nb - 1) / 2.0) * 3.2 * s; val hh = H * (if (nb == 1) 1.0 else .7 + ((i * 37) % 10) / 20.0); val ph = i * 1.3
      val sway = math.sin(t / (900 - wind * 200) + ph) * wind * .08 + lean + (if (nb == 1) 0.0 else off / (30 * s))
      val cx = x + off + sway * hh * .6; val cy = y - hh * .55; val tx = x + off + sway * hh * 1.4; val ty = y - hh * (1 - math.abs(sway) * .25)
      g.fill = green; g.beginPath(); g.moveTo(x + off - w0, y); g.quadraticCurveTo(cx - w0 * .6, cy, tx, ty); g.quadraticCurveTo(cx + w0 * .6, cy, x + off + w0, y); g.closePath(); g.fill()
      g.fill = tip; g.fillOval(tx - w0 * .5, ty - w0 * .5, w0, w0)
      g.stroke = Color.web("#000000", 0.18); g.lineWidth = math.max(.6, .5 * s); g.beginPath(); g.moveTo(x + off, y); g.quadraticCurveTo(cx, cy, tx, ty); g.stroke()
      val dew = str("dew", "none"); if (dew != "none") { g.fill = Color.web("#dcf0ff", 0.75); val nd = if (dew == "heavy") 5 else 2; (1 to nd).foreach { d => val u = d.toDouble / (nd + 1); val px = (1 - u) * (1 - u) * (x + off) + 2 * (1 - u) * u * cx + u * u * tx; val py = (1 - u) * (1 - u) * y + 2 * (1 - u) * u * cy + u * u * ty; g.fillOval(px + w0 * .4 - 1.1 * s, py - 1.6 * s, 2.2 * s, 3.2 * s) } }
      val head = str("head", "none"); if (head != "none" && (nb == 1 || i % 2 == 0)) { val hc = Color.web(str("headColor", "#e8d9a0")); g.fill = hc; g.stroke = hc
        head match {
          case "wheat ear" => (0 until 7).foreach(k => g.fillOval(tx + (if (k % 2 == 1) 1 else -1) * 2.2 * s - 2 * s, ty + 4 * s + k * 3 * s - 3 * s, 4 * s, 6 * s))
          case "foxtail plume" => g.lineWidth = .8 * s; (0 until 18).foreach { k => val yy = ty + 2 * s + k * 1.6 * s; g.strokeLine(tx, yy, tx + (if (k % 2 == 1) 5 else -5) * s, yy - 4 * s) }
          case "oat panicle" => g.lineWidth = .7 * s; (0 until 5).foreach { k => val yy = ty + 6 * s + k * 5 * s; val dx = (if (k % 2 == 1) 1 else -1) * (6 + k) * s; g.strokeLine(tx, yy, tx + dx, yy + 5 * s); g.fillOval(tx + dx - 1.6 * s, yy + 3 * s, 3.2 * s, 6 * s) }
          case "reed plume" => g.fill = Color.color(hc.red, hc.green, hc.blue, 0.8); g.fillOval(tx - 4 * s, ty - 18 * s, 8 * s, 24 * s)
          case "seed tuft" => (0 until 9).foreach { k => val an = k / 9.0 * math.Pi * 2; g.fillOval(tx + math.cos(an) * 4 * s - 1.2 * s, ty - 2 * s + math.sin(an) * 4 * s - 1.2 * s, 2.4 * s, 2.4 * s) }
          case _ => () } } }
    if (str("kind") == "bamboo") { g.stroke = Color.web("#000000", 0.25); g.lineWidth = s; (1 until 5).foreach { k => val yy = y - H * k / 5; g.strokeLine(x - w0 * 1.2, yy, x + w0 * 1.2, yy) } }
    g.fill = Color.web("#efe9dc", 0.85); g.font = Font(11 * s / 1.6); g.fillText(str("name"), x - 30 * s, y + 16 * s)
  }
}
