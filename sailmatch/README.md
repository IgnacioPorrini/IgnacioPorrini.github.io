# ⛵ SailMatch liviano

Patrones que buscan tripulación y gente con ganas de salir a navegar. Sin registros: el patrón publica la salida desde la web y quien quiera sumarse le escribe directo por WhatsApp.

- **Web:** https://ignacioporrini.github.io/sailmatch/
- **Datos:** una planilla privada de Google ("SailMatch — Salidas"), manejada por un Apps Script.
- El repo original `Sailmatch` (Next.js + Supabase) no se tocó.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html`, `styles.css`, `app.js` | La web (HTML y JavaScript simple) |
| `config.js` | La URL del Apps Script. Mientras esté vacía, la web funciona en **modo ejemplo** |
| `apps-script/Codigo.gs` | El script que se pega en la planilla |

## Puesta en marcha (una sola vez, unos 5 minutos)

1. Abrir la planilla **SailMatch — Salidas** en Google Drive.
2. Menú **Extensiones → Apps Script**. Borrar lo que haya en `Código.gs` y pegar todo el contenido de `apps-script/Codigo.gs`. Guardar (ícono de disquete).
3. Arriba, en el selector de funciones, elegir **configurar** y tocar **Ejecutar**. Google va a pedir permisos: elegir su cuenta → *Configuración avanzada* → *Ir a SailMatch (no seguro)* → *Permitir*. Esto aparece porque el script es suyo y no está verificado por Google; es normal.
   Al terminar, la planilla tiene una pestaña **Salidas** con los encabezados.
4. **Implementar → Nueva implementación**. En el engranaje elegir **Aplicación web**.
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona**
   Tocar **Implementar** y copiar la **URL de la aplicación web** (termina en `/exec`).
5. Pegar esa URL en `config.js`:
   ```js
   window.SAILMATCH_API = 'https://script.google.com/macros/s/.../exec';
   ```
   (O mandársela a Claude y la pone él.)

Listo: el aviso de "modo ejemplo" desaparece y la web ya lee y guarda en la planilla.

## Si cambia el script más adelante

Después de editar el código en Apps Script: **Implementar → Gestionar implementaciones → lápiz → Versión: Nueva versión → Implementar**. Así la URL sigue siendo la misma.

## Moderación

- Para **ocultar** una salida: poner `NO` en la columna `visible`.
- Las salidas con fecha pasada o canceladas dejan de mostrarse solas.
- Nunca se borran filas desde la web; la planilla funciona también como historial.
- La columna `codigo_hash` guarda el código de edición cifrado. No hace falta tocarla.

## Cómo funciona

- **Publicar:** formulario en la web → el script agrega una fila y devuelve un **código de 6 letras**. El patrón puede mandárselo a su propio WhatsApp con un botón.
- **Editar o cerrar:** pestaña *Mi salida*, con el número de salida y el código. Desde ahí se cambian los datos, se marca como completa o se cancela.
- **Sumarse:** el botón "Quiero sumarme" abre WhatsApp con el patrón y un mensaje ya escrito.
- **Anti-bots:** un campo oculto que solo completan los bots y un tope de 20 envíos por minuto.
- El número de WhatsApp del patrón es público en la salida (se avisa en el formulario).
