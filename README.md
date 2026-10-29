# Casa Verdés · Alojamiento rural

Plantilla de web para casas rurales y apartamentos turísticos: portada a
pantalla completa, presentación de la casa, estancias con precio, galería,
entorno, opinión de huéspedes y formulario de consulta de disponibilidad.

Es una demo: el nombre, los textos y las fotos son de ejemplo.

## Qué incluye

- Navegación horizontal en escritorio y panel lateral en móvil.
- Estancias en retícula de 12 columnas: la foto ocupa 8 y el panel de texto
  se monta sobre las dos últimas, alternando el lado en cada fila.
- Galería en mosaico con visor a pantalla completa navegable con teclado.
- Entorno en rejilla de 4 columnas en escritorio y tira deslizable en móvil.
- Formulario con fechas de entrada y salida validadas (la salida debe ser
  posterior a la entrada y no se admiten fechas pasadas).
- Accesibilidad comprobada: contraste AA, orden de encabezados, foco atrapado
  en el menú y el visor.

HTML, CSS y JavaScript sin librerías ni frameworks.

## Estructura

```
index.html
css/style.css
js/script.js
img/                       fotos de ejemplo
img/generar-imagenes.py    crea las fotos de ejemplo (necesita numpy y pillow)
```

## Poner las fotos reales del cliente

Sustituye cada archivo de `img/` por otro **con el mismo nombre**. Si la
proporción de una foto cambia, actualiza también sus atributos `width` y
`height` en `index.html`: el navegador los usa para reservar el hueco
mientras carga la imagen y así evitar saltos de contenido.

## Formulario

El envío está **simulado** (ver `send()` en `js/script.js`), porque GitHub
Pages solo sirve archivos estáticos. Para recibir las consultas de verdad, la
forma más sencilla es un servicio como [Formspree](https://formspree.io):

```js
fetch("https://formspree.io/f/TU_ID", { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
```

## Publicar en GitHub Pages

Las instrucciones están en [PUBLICAR.md](PUBLICAR.md).
