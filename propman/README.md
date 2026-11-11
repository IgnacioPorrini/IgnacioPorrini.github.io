# PropMan

Aplicación web gratuita para administrar alquileres desde el celular o la computadora. Pensada para administradores, dueños con varias propiedades y contadores en Uruguay.

- **Abrir la app:** https://ignacioporrini.github.io/propman/
- **Avances y video guía (1 minuto):** https://ignacioporrini.github.io/propman/avances.html
- **Estado del proyecto:** [PROYECTO.md](PROYECTO.md)

## Empezar en 5 minutos

1. Abrí https://ignacioporrini.github.io/propman/ en el celular o la computadora. No hay que instalar nada ni registrarse.
2. La primera vez, la app te pide un nombre y un mail para tu cuenta local. Queda solo en tu dispositivo.
3. En **Propiedades**, tocá "Nueva propiedad" y cargá la dirección, el inquilino, el contrato (inicio y fin) y el monto del alquiler.
4. En **Pagos**, registrá el pago del mes.
5. Mirá **Vencimientos**, **Liquidación** y **Resumen anual**: se completan solos con lo que cargaste.

¿Ya tenés tus alquileres en una planilla? En **Cuenta y datos → Importar CSV** podés cargarlos de una vez. Primero Propiedades y después Pagos.

## Qué hace

| Sección | Para qué sirve |
| --- | --- |
| Resumen | Todas las propiedades de un vistazo, con ingresos y gastos por moneda. |
| Vencimientos | Qué alquiler ajusta este mes y qué contrato vence en los próximos 60 días. |
| Propiedades | Contrato, inquilino e historial de montos con su índice de ajuste. Hasta 100 propiedades. |
| Pagos | Pagado, pendiente o atrasado. Recibo en PDF y aviso de cobro por WhatsApp con el mensaje ya escrito. |
| Liquidación | Por mes y por propietario: cobrado menos comisión y gastos, con el resumen listo para mandar. |
| Resumen anual | Para el contador: totales del año por propietario, en CSV o PDF. |
| Movimientos y gastos compartidos | Ingresos y gastos en pesos o dólares, y gastos repartidos entre propiedades. |
| Delegación | Compartir una propiedad con otra persona, con permisos. |
| Cuenta y datos | Importar y exportar CSV y JSON, y guardar el respaldo en Google Drive. |

## Tus datos

PropMan guarda todo **solo en el navegador del dispositivo que usás**. No hay servidor ni base de datos central, así que nadie más ve tu información.

- Si usás dos dispositivos, pasá los datos con **Cuenta y datos → Exportar JSON** (o "Guardar en Drive") en uno, e **Importar JSON** en el otro.
- Hacé un respaldo cada tanto: si borrás los datos del navegador, se pierden.

## Probarlo con ayuda de Claude

Si no querés pelearte con planillas, formatos o pasos técnicos, podés usar [Claude](https://claude.ai) como asistente para probar PropMan. Algunos pedidos que funcionan bien:

- **Entender el proyecto:** "Leé https://ignacioporrini.github.io/propman/PROYECTO.md y explicame qué hace PropMan y cómo me sirve para administrar alquileres."
- **Pasar tus datos:** pegale o adjuntale tu planilla de alquileres y pedile: "Convertí esto en los archivos CSV para importar en PropMan: propiedades (columnas `direccion, tipo, inquilino_nombre, inquilino_contacto, contrato_inicio, contrato_fin, renovacion_auto, desde, monto, moneda, indice`) y pagos (columnas `direccion, periodo, montoEsperado, montoRecibido, fechaVencimiento, fechaPago`). Fechas en formato AAAA-MM-DD y períodos en AAAA-MM."
- **Paso a paso:** "Guiame para cargar mi primera propiedad y un pago en PropMan desde el celular."
- **Dudas:** "En PropMan, ¿cómo calculo la liquidación de un dueño con 8 % de comisión?"

Claude no entra a la app ni ve tus datos: te ayuda a preparar los archivos y te explica qué tocar. Lo que cargues queda en tu dispositivo.

## Contacto

Ignacio Porrini — https://ignacioporrini.github.io/
