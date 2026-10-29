#!/usr/bin/env python3
"""
Genera la fotografía de ambiente de la plantilla "Casa Verdés".

Desde este entorno no hay acceso a bancos de imágenes, así que las imágenes
se construyen por código: paisajes de cordilleras con niebla, luz de ventana
sobre pared. Todas comparten la misma
paleta cálida para que la página se lea como un conjunto coherente.

Cuando el cliente entregue sus fotos reales, basta con sustituir los
archivos manteniendo el mismo nombre y proporción.

Uso:  python img/generar-imagenes.py   (necesita numpy y pillow)
"""
import numpy as np
from PIL import Image, ImageFilter
import os

# Guarda las imágenes en la misma carpeta donde está este script (img/),
# sea cual sea el ordenador o la carpeta desde la que se ejecute
OUT = os.path.dirname(os.path.abspath(__file__))
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(20260910)


def to_img(arr):
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")


def vgrad(w, h, top, bottom, gamma=1.0):
    t = (np.linspace(0, 1, h) ** gamma)[:, None, None]
    return np.array(top)[None, None, :] * (1 - t) + np.array(bottom)[None, None, :] * t


def ridge_profile(w, n_waves=6, seed=None):
    """Perfil de altura suave: suma de senos con fases aleatorias."""
    r = np.random.default_rng(seed)
    x = np.linspace(0, 1, w)
    y = np.zeros(w)
    for k in range(n_waves):
        freq = r.uniform(0.6, 4.5) * (k + 1) * 0.5
        y += r.uniform(0.25, 1.0) / (k + 1) * np.sin(2 * np.pi * freq * x + r.uniform(0, 6.28))
    y -= y.min()
    if y.max() > 0:
        y /= y.max()
    return y


def grain(arr, amount=7.0, mono=True):
    h, w = arr.shape[:2]
    if mono:
        n = rng.normal(0, amount, (h, w, 1))
    else:
        n = rng.normal(0, amount, (h, w, 3))
    return arr + n


def vignette(arr, strength=0.34):
    h, w = arr.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    cx, cy = w / 2, h / 2
    d = np.sqrt(((xx - cx) / cx) ** 2 + ((yy - cy) / cy) ** 2)
    m = 1 - strength * np.clip((d - 0.45) / 1.05, 0, 1) ** 1.7
    return arr * m[:, :, None]


def landscape(w, h, palette="dawn", layers=6, sun=(0.68, 0.30), seed=0, horizon=0.62):
    """Cordilleras superpuestas con niebla entre capas."""
    P = {
        # cielo_arriba, cielo_horizonte, cresta_lejana, cresta_cercana, halo_sol
        "dawn": ((92, 106, 122), (238, 203, 168), (150, 156, 152), (30, 36, 32), (255, 224, 178)),
        "mist": ((176, 186, 188), (232, 231, 223), (140, 150, 142), (44, 52, 45), (250, 248, 238)),
        "dusk": ((54, 62, 78), (206, 148, 108), (108, 106, 104), (22, 25, 24), (255, 190, 130)),
        "forest": ((150, 166, 160), (226, 226, 210), (120, 136, 118), (28, 38, 30), (243, 243, 225)),
    }[palette]
    sky_top, sky_hz, far, near, halo = P

    horizon = int(h * horizon)
    arr = np.zeros((h, w, 3), float)
    arr[:horizon] = vgrad(w, horizon, sky_top, sky_hz, gamma=1.5)
    arr[horizon:] = np.array(sky_hz)[None, None, :]

    # Halo del sol
    yy, xx = np.mgrid[0:h, 0:w]
    sx, sy = sun[0] * w, sun[1] * h
    d = np.sqrt((xx - sx) ** 2 + (yy - sy) ** 2) / (0.75 * w)
    glow = np.clip(1 - d, 0, 1) ** 2.6
    arr += glow[:, :, None] * (np.array(halo)[None, None, :] - arr) * 0.75

    # Capas de cresta, de lejana a cercana
    for i in range(layers):
        t = i / max(1, layers - 1)
        base = int(horizon + (h - horizon) * (0.06 + 0.85 * t))
        amp = (0.16 - 0.10 * t) * h
        prof = ridge_profile(w, n_waves=5 + i, seed=seed * 31 + i)
        top = base - (prof * amp).astype(int)

        col = np.array(far) * (1 - t) + np.array(near) * t
        # La niebla aclara las capas del fondo
        col = col * (1 - 0.55 * (1 - t)) + np.array(sky_hz) * (0.55 * (1 - t))

        mask = (yy >= top[None, :]).astype(float)
        mask = np.array(Image.fromarray((mask * 255).astype(np.uint8)).filter(
            ImageFilter.GaussianBlur(1.2))) / 255.0
        arr = arr * (1 - mask[:, :, None]) + col[None, None, :] * mask[:, :, None]

        # Bruma acumulada al pie de cada cresta
        band = np.clip(1 - np.abs(yy - top[None, :]) / (0.045 * h), 0, 1) ** 2
        arr += band[:, :, None] * (np.array(sky_hz)[None, None, :] - arr) * 0.30 * (1 - t)

    arr = vignette(grain(arr, 6.0), 0.30)
    return to_img(arr)


def window_light(w, h, warm=True, seed=1):
    """Pared interior con una mancha de luz de ventana."""
    r = np.random.default_rng(seed)
    wall_a = (188, 174, 154) if warm else (166, 170, 166)
    wall_b = (104, 93, 79) if warm else (92, 97, 94)
    arr = vgrad(w, h, wall_a, wall_b, gamma=1.15) * np.ones((h, w, 3))

    yy, xx = np.mgrid[0:h, 0:w]
    cx, cy = w * r.uniform(0.32, 0.56), h * r.uniform(0.38, 0.58)
    ww, hh = w * r.uniform(0.24, 0.34), h * r.uniform(0.40, 0.52)
    skew = r.uniform(-0.55, 0.55)
    u = (xx - cx) / ww + skew * (yy - cy) / hh
    v = (yy - cy) / hh
    patch = ((np.abs(u) < 1) & (np.abs(v) < 1)).astype(float)
    patch = np.clip(patch - (np.abs(u) < r.uniform(0.04, 0.08)).astype(float), 0, 1)
    patch = np.array(Image.fromarray((patch * 255).astype(np.uint8)).filter(
        ImageFilter.GaussianBlur(w * r.uniform(0.008, 0.016)))) / 255.0

    light = np.array([96, 80, 56]) if warm else np.array([78, 82, 86])
    arr += patch[:, :, None] * light[None, None, :]
    return to_img(vignette(grain(arr, 6.5), 0.46))


def save(im, name, quality=82):
    path = f"{OUT}/{name}"
    im.save(path, "JPEG", quality=quality, optimize=True, progressive=True)
    print(f"{name:24s} {im.size[0]}x{im.size[1]}  {os.path.getsize(path)//1024} KB")


# ---- Portada ----
# Horizonte alto: el degradado oscuro del hero tapa la franja inferior, así
# que las crestas tienen que quedar por encima para verse.
save(landscape(2000, 1250, "dawn", 7, (0.70, 0.22), 3, horizon=0.46), "hero.jpg")

# ---- Estancias ----
save(window_light(1600, 1100, True, 11), "estancia-1.jpg")
save(landscape(1600, 1100, "forest", 6, (0.30, 0.24), 5), "estancia-2.jpg")
save(window_light(1600, 1100, False, 31), "estancia-3.jpg")

# ---- Galería: el orden del HTML cierra un rectángulo de 4x3 ----
save(landscape(1200, 1600, "mist", 6, (0.42, 0.22), 7), "gal-1.jpg")
save(window_light(1200, 900, True, 37), "gal-2.jpg")
save(window_light(1200, 900, True, 53), "gal-3.jpg")
save(landscape(1600, 900, "dusk", 7, (0.24, 0.34), 9), "gal-4.jpg")
save(landscape(900, 1200, "dusk", 6, (0.60, 0.22), 41), "gal-5.jpg")
save(landscape(1200, 900, "forest", 5, (0.78, 0.26), 11), "gal-6.jpg")
save(landscape(1600, 900, "mist", 6, (0.32, 0.24), 61), "gal-7.jpg")
save(landscape(1200, 900, "forest", 6, (0.62, 0.30), 67), "gal-8.jpg")
save(landscape(1200, 900, "dusk", 6, (0.38, 0.26), 71), "gal-9.jpg")

# ---- Entorno ----
save(landscape(1200, 900, "mist", 5, (0.55, 0.20), 13), "entorno-1.jpg")
save(landscape(1200, 900, "dawn", 6, (0.20, 0.30), 15), "entorno-2.jpg")
save(landscape(1200, 900, "dusk", 5, (0.70, 0.36), 17), "entorno-3.jpg")

# ---- Fondo de la cita ----
save(landscape(2000, 1000, "dusk", 7, (0.50, 0.30), 19), "cita.jpg")
