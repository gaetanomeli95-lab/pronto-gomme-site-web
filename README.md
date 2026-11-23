# Pronto Gomme · sito web

Sito di **Pronto Gomme**, gommista in Via Messina Marine 707/709, 90121 Palermo.
Tel. 327 010 7728 · prontogomme19@gmail.com

Una sola pagina con una ruota 3D fatta interamente col codice (Three.js), che si muove con lo scroll e racconta i servizi: gomme, usura del battistrada, cerchi, equilibratura e convergenza.

## Cosa c'è dentro

| Cartella / file | A cosa serve |
| --- | --- |
| `index.html` | **Il sito pronto.** Un unico file con tutto dentro (grafica, foto, font). È quello da pubblicare. |
| `src/index.src.html` | Testi, struttura e stile della pagina |
| `src/main.js` | Animazioni, scroll, ingresso col manometro, preventivo WhatsApp, orari |
| `src/wheel.js` | La ruota 3D: gomma, cerchio, disco e pinza del freno |
| `assets/` | Foto dell'officina, logo, foto dei cerchi per la vetrina, font Archivo |
| `build.mjs` | Unisce tutto in `index.html` |

## Pubblicarlo

È un sito statico: basta pubblicare `index.html`.
- **Vercel**: importa questo repository, nessuna impostazione da cambiare.
- **GitHub Pages**: Settings → Pages → branch `main`, cartella `/ (root)`.

## Modificarlo

```bash
npm install
npm run build
```

Dopo ogni modifica in `src/` o `assets/` si rilancia `npm run build`, che rigenera `index.html`.

## Tecnologie

- [Three.js](https://threejs.org) r187 con il nuovo motore **WebGPU** e gli shader **TSL**. Se il dispositivo non regge WebGPU, il sito passa da solo a WebGL2.
- [GSAP](https://gsap.com) + ScrollTrigger per le animazioni legate allo scroll
- [Lenis](https://lenis.darkroom.engineering) per lo scroll morbido
- Animazioni CSS legate allo scroll (`animation-timeline`) per le strisce di battistrada
- Font Archivo incluso nel file (nessuna chiamata a Google Fonts)

## Da completare prima di andare online

- [ ] Partita IVA nel piè di pagina
- [ ] Verificare che il 327 010 7728 abbia WhatsApp
- [ ] Confermare l'elenco dei marchi trattati
- [ ] Sostituire le foto della vetrina cerchi (ora sono immagini generate) con foto di cerchi reali
- [ ] Controllare la foto dell'officina (è ritoccata: il civico mostrato è 171 invece di 707)
- [ ] Aggiornare ogni tanto il voto Google (ora: 4,6 su 5, 36 recensioni)
