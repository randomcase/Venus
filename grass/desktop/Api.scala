package grass

import com.sun.net.httpserver.{HttpExchange, HttpServer}
import java.net.InetSocketAddress
import java.nio.charset.StandardCharsets

/** A small HTTP API on 127.0.0.1:7331 so the desktop edition can be driven by
  * scripts, the page, or curl — the same calls window.Tick exposes.
  *
  *   GET  /api/state  /api/def  /api/rates  /api/mods
  *   POST /api/tap  /api/buy/{id}?k=1|max  /api/research/{id}  /api/build/{id}
  *   POST /api/plan   {"rain":70,"crew":10,"stone":10,"wood":10}
  *   POST /api/playstyle/{id}  /api/refloat/{doctrine}  /api/avatar {...}
  *   PUT  /api/def    (the whole definition; replaces the rules, keeps the save)
  */
class Api(engine: () => Engine, replaceDef: ujson.Value => Unit, port: Int = 7331) {
  private val server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0)
  private def send(x: HttpExchange, code: Int, body: String, mime: String = "application/json"): Unit = {
    val b = body.getBytes(StandardCharsets.UTF_8); x.getResponseHeaders.add("Content-Type", mime + "; charset=utf-8"); x.getResponseHeaders.add("Access-Control-Allow-Origin", "*")
    x.sendResponseHeaders(code, b.length); val o = x.getResponseBody; o.write(b); o.close() }
  private def ok(v: Any): String = ujson.Obj("ok" -> ujson.Bool(v == true || v.isInstanceOf[Double] || v.isInstanceOf[Map[_, _]]), "result" -> (v match { case d: Double => ujson.Num(d); case b: Boolean => ujson.Bool(b); case _ => ujson.Null })).render()
  server.createContext("/api", (x: HttpExchange) => try {
    val path = x.getRequestURI.getPath.stripPrefix("/api").split("/").filter(_.nonEmpty).toList
    val q = Option(x.getRequestURI.getQuery).getOrElse("").split("&").filter(_.contains("=")).map(_.split("=", 2)).map(a => a(0) -> a(1)).toMap
    val body = new String(x.getRequestBody.readAllBytes(), StandardCharsets.UTF_8)
    val E = engine()
    val out: String = E.synchronized { (x.getRequestMethod, path) match {
      case ("GET", List("state")) => E.toJson.render()
      case ("GET", List("def")) => E.D.render()
      case ("GET", List("rates")) => ujson.Obj.from(E.flows.map { case (k, v) => k -> ujson.Num(v) }).render()
      case ("GET", List("mods")) => ujson.Obj.from(E.mods.map { case (k, v) => k -> ujson.Num(v) }).render()
      case ("GET", List("form")) => ujson.Obj("form" -> E.formDef().getOrElse(ujson.Null), "next" -> E.nextForm.getOrElse(ujson.Null), "ring" -> E.ring, "acorns" -> E.acorns, "trees" -> E.trees, "depth" -> E.depth, "canBecome" -> E.canBecome,
        "conditions" -> E.conditions().map(c => ujson.Obj("label" -> c.label, "have" -> c.have, "need" -> c.need, "ok" -> c.ok))).render()
      case ("POST", List("become")) => ok(E.become())
      case ("POST", List("tap")) => ok(E.tap())
      case ("POST", List("buy", id)) => ok(E.buy(id, if (q.get("k").contains("max")) -1 else q.get("k").map(_.toInt).getOrElse(1)))
      case ("POST", List("research", id)) => ok(E.doResearch(id))
      case ("POST", List("build", id)) => ok(E.build(id))
      case ("POST", List("playstyle", id)) => ok(E.setPlaystyle(id))
      case ("POST", List("refloat", id)) => ok(E.refloat(id))
      case ("POST", List("plan")) => E.setPlan(ujson.read(body).obj.map { case (k, v) => k -> v.num }.toMap); ok(true)
      case ("POST", List("avatar")) => ujson.read(body).obj.foreach { case (k, v) => E.avatar(k) = v }; ok(true)
      case ("PUT", List("def")) => replaceDef(ujson.read(body)); ok(true)
      case _ => ujson.Obj("ok" -> false, "error" -> "no such call").render()
    } }
    send(x, 200, out)
  } catch { case e: Exception => send(x, 400, ujson.Obj("ok" -> false, "error" -> e.getMessage).render()) })
  def start(): Unit = { server.setExecutor(null); server.start() }
  def stop(): Unit = server.stop(0)
}
