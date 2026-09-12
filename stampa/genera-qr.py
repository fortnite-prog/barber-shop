#!/usr/bin/env python3
"""
Genera il QR code da stampare (specchio, cassa, biglietto da visita).

USO
    python3 stampa/genera-qr.py "https://il-dominio-vero.it" qr-sito

Produce, nella cartella stampa/:
    <nome>.svg   per la stampa: vettoriale, nitido a qualsiasi misura
    <nome>.png   per l'uso a schermo o nelle grafiche social
    <nome>-cartello.png   cartellino pronto con logo e istruzione

SERVE
    pip install segno pillow

PERCHE' IL QR E' NERO SU BIANCO
    Perche' funzioni, la fotocamera deve distinguere i quadratini dal
    fondo. Un QR oro su nero e' bello ma molti telefoni vecchi non lo
    leggono. Il colore lo si mette intorno, non dentro.
"""
import sys, os
import segno
from PIL import Image, ImageDraw, ImageFont

QUI = os.path.dirname(os.path.abspath(__file__))
RADICE = os.path.dirname(QUI)
ORO, CREMA, NERO, GRIGIO = (213, 161, 23), (242, 239, 232), (13, 13, 15), (150, 146, 138)


def genera(url, nome):
    # error='h': il livello di correzione piu' alto. Il codice resta
    # leggibile anche se sporco, piegato o parzialmente coperto: su un
    # adesivo attaccato allo specchio serve davvero.
    qr = segno.make(url, error='h')
    qr.save(os.path.join(QUI, nome + '.svg'), scale=12, border=3,
            dark='#000000', light='#ffffff')
    qr.save(os.path.join(QUI, nome + '.png'), scale=14, border=3,
            dark='#000000', light='#ffffff')
    cartello(url, nome)
    print('creati %s.svg, %s.png e %s-cartello.png' % (nome, nome, nome))


def cartello(url, nome):
    """Cartellino 1080x1500: logo, QR e istruzione. Pronto da stampare."""
    W, H = 1080, 1500
    im = Image.new('RGB', (W, H), NERO)
    d = ImageDraw.Draw(im)

    logo = Image.open(os.path.join(RADICE, 'img', 'logo.webp')).convert('RGBA')
    lw = 420
    logo = logo.resize((lw, round(logo.height * lw / logo.width)), Image.LANCZOS)
    im.paste(logo, ((W - lw) // 2, 90), logo)

    qr = Image.open(os.path.join(QUI, nome + '.png')).convert('RGB')
    lato = 620
    qr = qr.resize((lato, lato), Image.NEAREST)   # NEAREST: bordi netti
    # cornice bianca intorno: il QR ha bisogno di margine chiaro per
    # essere riconosciuto dalla fotocamera
    d.rounded_rectangle([(W - lato) // 2 - 26, 620, (W + lato) // 2 + 26, 620 + lato + 52],
                        radius=28, fill='white')
    im.paste(qr, ((W - lato) // 2, 646))

    try:
        titolo = ImageFont.truetype(os.path.join(QUI, 'oswald.ttf'), 56)
        testo = ImageFont.truetype(os.path.join(QUI, 'inter.ttf'), 34)
    except OSError:
        titolo = testo = ImageFont.load_default()

    def centrato(t, f, y, colore):
        larg = d.textbbox((0, 0), t, font=f)[2]
        d.text(((W - larg) // 2, y), t, font=f, fill=colore)

    centrato('INQUADRA CON LA FOTOCAMERA', titolo, 1352, ORO)
    centrato(url.replace('https://', ''), testo, 1424, GRIGIO)

    # righe del palo in fondo
    for i in range(-40, W + 60, 40):
        d.polygon([(i, H), (i + 20, H), (i + 20 - 26, H - 10), (i - 26, H - 10)], fill=ORO)
        d.polygon([(i + 20, H), (i + 40, H), (i + 40 - 26, H - 10), (i + 20 - 26, H - 10)], fill=CREMA)

    im.save(os.path.join(QUI, nome + '-cartello.png'), optimize=True)


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    genera(sys.argv[1], sys.argv[2])
