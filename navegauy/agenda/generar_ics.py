#!/usr/bin/env python3
"""Genera agenda-nautica.ics desde agenda/eventos.json. Uso: python3 agenda/generar_ics.py"""
import json, datetime as dt, pathlib
raiz = pathlib.Path(__file__).resolve().parent.parent
data = json.loads((raiz / "agenda" / "eventos.json").read_text(encoding="utf-8"))
def esc(s): return s.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")
def fold(line):
    b = line.encode("utf-8"); out = []
    while len(b) > 75:
        cut = 75 if not out else 74
        while (b[cut] & 0xC0) == 0x80: cut -= 1
        out.append(b[:cut]); b = b[cut:]
    out.append(b)
    return "\r\n ".join(x.decode("utf-8") for x in out)
d = lambda s: dt.date.fromisoformat(s)
stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ignacio Porrini//Agenda Nautica Uruguay//ES",
     "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Agenda Náutica Uruguay",
     "X-WR-TIMEZONE:America/Montevideo",
     "X-WR-CALDESC:Regatas de club\\, escuelas de verano\\, aniversarios y campeonatos de la náutica uruguaya. Cada evento con su fuente.",
     "REFRESH-INTERVAL;VALUE=DURATION:P1D", "X-PUBLISHED-TTL:P1D"]
for e in data["eventos"]:
    # UID con el dominio viejo a propósito: evita duplicados al migrar suscriptores
    L += ["BEGIN:VEVENT", f"UID:{e['id']}@ignacioporrini.github.io", f"DTSTAMP:{stamp}"]
    if e.get("hora"):
        h, m = map(int, e["hora"].split(":"))
        ini = dt.datetime.combine(d(e["inicio"]), dt.time(h, m)) + dt.timedelta(hours=3)  # UY = UTC-3
        fin = ini + dt.timedelta(hours=e.get("duracionHoras", 2))
        L += [f"DTSTART:{ini:%Y%m%dT%H%M%SZ}", f"DTEND:{fin:%Y%m%dT%H%M%SZ}"]
    else:
        fin = d(e.get("fin", e["inicio"])) + dt.timedelta(days=1)
        L += [f"DTSTART;VALUE=DATE:{d(e['inicio']):%Y%m%d}", f"DTEND;VALUE=DATE:{fin:%Y%m%d}"]
    desc = f"{e['detalle']}\nOrganiza: {e['organiza']}\nFuente: {e['fuente']['nombre']} – {e['fuente']['url']}\nAgenda: https://navegauy.github.io/docencia-de-vela.html#agenda"
    L += [f"SUMMARY:{esc(e['titulo'])}", f"LOCATION:{esc(e['lugar'])}", f"DESCRIPTION:{esc(desc)}",
          f"URL:{e['fuente']['url']}", f"CATEGORIES:{esc(e['tipo'])}", "END:VEVENT"]
L.append("END:VCALENDAR")
(raiz / "agenda-nautica.ics").write_text("\r\n".join(fold(x) for x in L) + "\r\n", encoding="utf-8", newline="")
print(len(data["eventos"]), "eventos")
