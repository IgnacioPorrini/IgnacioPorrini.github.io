# PropMan — estado del proyecto

Última actualización: 11 de noviembre de 2026.
Responsable: Ignacio Porrini (ignacioporrini.github.io).

Este archivo resume qué es PropMan, qué hace hoy y hacia dónde va. Está escrito para que cualquier persona, o su asistente de IA, pueda entender el proyecto sin contexto previo.

## Qué es

PropMan es una aplicación web para administrar alquileres de inmuebles desde el celular o la computadora. Está pensada para administradores de alquileres, dueños con varias propiedades y sus contadores, con las particularidades de Uruguay: ajuste anual de alquileres, pesos y dólares, gastos compartidos.

- Dirección: https://ignacioporrini.github.io/propman/
- Avances y video guía: https://ignacioporrini.github.io/propman/avances.html
- Código: https://github.com/IgnacioPorrini/IgnacioPorrini.github.io/tree/main/propman
- Costo: gratis, sin registro.
- Privacidad: los datos se guardan solo en el navegador de quien la usa. No hay servidor ni base de datos central. Cada uno hace sus respaldos (archivo JSON).

## Qué hace hoy

| Sección | Para qué sirve |
| --- | --- |
| Resumen | Panorama por propietario, por inquilino y de mora, con gráficos. |
| Vencimientos | Qué alquiler ajusta este mes o pronto (según el mes de inicio del contrato) y qué contrato vence en los próximos 60 días o ya venció. |
| Propiedades | Hasta 100 propiedades, con contrato (inicio, fin, renovación) e historial de montos por tramos con su índice de ajuste. |
| Inquilinos | Datos de contacto de cada inquilino. |
| Pagos | Pagos mensuales con estado: pagado, pendiente o atrasado. Recibo de alquiler imprimible o en PDF, y aviso de cobro por WhatsApp con el mensaje ya escrito (lo envía la persona, no la app). |
| Liquidación | Por mes y por propietario: cobrado − comisión de administración − gastos. Botón para copiar el resumen y mandarlo por WhatsApp o mail. |
| Resumen anual | Para el contador: totales del año por propietario y detalle mes a mes. Exporta CSV e imprime o guarda PDF. |
| Movimientos | Ingresos y gastos en pesos o dólares. |
| Gastos compartidos | Un gasto repartido entre varias propiedades: en partes iguales, en proporción al alquiler o a mano. |
| Delegación | Compartir una propiedad con otra persona (por ejemplo, un administrador), con permisos. |
| Cuenta y datos | Importar y exportar CSV y JSON, y guardar el respaldo en Google Drive desde el celular (Android). |

## Cómo probarlo en 5 minutos

1. Abrir https://ignacioporrini.github.io/propman/ y crear la cuenta local (nombre y mail).
2. En Propiedades, cargar una propiedad con su contrato y monto.
3. En Pagos, registrar un pago del mes.
4. Mirar Vencimientos, Liquidación y Resumen anual.
5. En Cuenta y datos, exportar el respaldo.

## Próximos pasos

1. Ayuda para el ajuste anual: cargar el coeficiente del INE del mes y que la app proponga el nuevo monto.
2. Vista para el inquilino: ver sus pagos y vencimientos.
3. Sincronización entre dispositivos y entre administrador y contador.

## A quién está dirigido

- Administradores independientes e inmobiliarias chicas.
- Dueños con varias propiedades que administran sin intermediario.
- Contadores que preparan la declaración de rentas por arrendamientos de sus clientes.

Estamos buscando administradores que lo prueben con casos reales y nos digan qué les sirve y qué les falta.

## Contacto

Ignacio Porrini — https://ignacioporrini.github.io/
