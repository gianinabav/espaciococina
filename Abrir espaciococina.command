#!/bin/zsh
# Doble clic para abrir espaciococina en tu navegador.
# Deja esta ventana abierta mientras usas la app; ciérrala para apagarla.
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Falta Node.js. Descárgalo gratis desde https://nodejs.org (versión LTS), instálalo y vuelve a abrir este archivo."
  read -k1 "?Presiona una tecla para cerrar…"
  exit 1
fi

# Si la app ya está encendida, solo abre el navegador.
if lsof -iTCP:5173 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "espaciococina ya está encendida. Abriendo el navegador…"
  open "http://localhost:5173"
  exit 0
fi

if [ ! -d node_modules ]; then
  echo "Instalando lo necesario (solo la primera vez)…"
  npm install || { read -k1 "?No se pudo instalar. Presiona una tecla para cerrar…"; exit 1; }
fi

echo "Encendiendo espaciococina… (deja esta ventana abierta)"
( sleep 3 && open "http://localhost:5173" ) &
npm run dev
