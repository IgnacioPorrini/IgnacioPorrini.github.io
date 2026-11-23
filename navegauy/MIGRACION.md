# Migración: Docencia de Vela → Navegauy

Preparado el 23/11/2026. El paquete está en la rama `navegauy-migracion` del repositorio `ignacioporrini/ignacioporrini.github.io`, en la carpeta `navegauy/`.

## Qué es Navegauy

- La idea: «Toda la vela de Uruguay en un solo lugar: dónde aprender, cuándo competir y cómo salir al agua».
- Dirección: https://navegauy.github.io. Organización de GitHub `navegauy`, repositorio `navegauy/Navegauy.github.io` (ya creados por Ignacio).
- Secciones de la portada: Aprender, Agenda, Competir, Docencia de Vela («para profes»), Clubes y Tiendas y servicios.
- Docencia de Vela pasa a ser una sección dentro de Navegauy.
- Reglas del contenido:
  - Cada dato lleva su fuente.
  - Solo se nombran instituciones, nunca personas.
  - **No se menciona ningún sponsor ni patrocinio.**
  - Trato de «usted».
- Futuro (opcional): dominio pago navega.uy o navegauy.com. Hay que revisar si están libres.

## Contenido del paquete (`navegauy/`)

| Archivo | Qué es |
|---|---|
| `index.html` | Portada: logo, lema, 6 secciones y las próximas 4 fechas leídas de la agenda |
| `docencia-de-vela.html` | La página actual adaptada: canonical a navegauy, calendario apuntando a navegauy.github.io, enlaces a las herramientas que siguen en el sitio personal y sin Google Analytics del sitio personal |
| `agenda/eventos.json` | Datos de la agenda: 16 eventos al 23/11/2026 |
| `agenda/generar_ics.py` | Genera `agenda-nautica.ics`. Los UID se mantienen con `@ignacioporrini.github.io` a propósito, para que nadie vea eventos duplicados al cambiarse de calendario |
| `agenda-nautica.ics` | Calendario para suscribirse, ya generado |
| `favicon.ico`, `robots.txt`, `sitemap.xml` | Básicos del sitio |
| `../navegauy-redireccion/docencia-de-vela.html` | Redirección para poner en el sitio personal **recién cuando Navegauy esté publicado** |

## Pasos en la próxima sesión

1. Copiar el contenido de `navegauy/` (sin este archivo, si se prefiere) a la raíz de `navegauy/Navegauy.github.io`, rama `main`.
2. Activar GitHub Pages: Settings → Pages → Deploy from branch → `main` / root. Si la herramienta no puede, Ignacio lo hace a mano.
3. Revisar https://navegauy.github.io en el celular: portada, agenda y botones de suscripción.
4. Con el visto bueno de Ignacio, en `ignacioporrini/ignacioporrini.github.io`:
   - Reemplazar `docencia-de-vela.html` por la redirección de `navegauy-redireccion/`.
   - Actualizar los enlaces internos que apuntan a `docencia-de-vela.html`: agenda.html, clinicas.html, clubes.html, curso-brevet.html, nautica.html, profes-de-vela.html, web-en-una-semana.html y sitemap.xml.
   - **Seguir publicando `agenda-nautica.ics` en el sitio personal** para los suscriptores actuales. La agenda se edita en Navegauy y se copia el `.ics` al sitio personal en cada cambio.
5. Actualizar la tarea programada «Revisión semanal de la Agenda Náutica»: que lea `navegauy/Navegauy.github.io` → `agenda/eventos.json` y que la página pública sea navegauy.github.io/docencia-de-vela.html#agenda.
6. Opcional: renombrar el repositorio a `navegauy.github.io`, en minúscula.

## Decisiones pendientes de Ignacio

- Si quiere estadísticas de visitas en Navegauy, ¿con qué cuenta?
- El lema definitivo y el logo, que por ahora es una vela sobre el agua dentro de un círculo azul.
- Si separa las secciones en páginas propias (Aprender, Competir, Clubes, Tiendas) o deja todo dentro de Docencia de Vela por ahora.

## Texto para empezar la próxima sesión

> Seguimos con la migración a Navegauy. Lea `navegauy/MIGRACION.md` en la rama `navegauy-migracion` de ignacioporrini/ignacioporrini.github.io y publique el sitio en navegauy/Navegauy.github.io siguiendo los pasos. No toque el sitio personal hasta que yo revise navegauy.github.io.

(La sesión tiene que tener acceso a los dos repositorios: `ignacioporrini/ignacioporrini.github.io` y `navegauy/Navegauy.github.io`.)
