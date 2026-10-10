#!/bin/zsh
# Doble clic: enciende espaciococina y crea un link público para compartirla.
# El link funciona mientras esta ventana esté abierta y tu Mac encendida.
cd "$(dirname "$0")"
PUERTO=8080
LOG_TUNEL="$(mktemp -t espaciococina-tunel)"

terminar() {
  echo "\nApagando espaciococina…"
  [ -n "$PID_APP" ] && kill $PID_APP 2>/dev/null
  [ -n "$PID_TUNEL" ] && kill $PID_TUNEL 2>/dev/null
  rm -f "$LOG_TUNEL"
  exit 0
}
trap terminar INT TERM HUP EXIT

for programa in node cloudflared; do
  if ! command -v $programa >/dev/null 2>&1; then
    echo "Falta $programa. Instálalo con: brew install $([ $programa = node ] && echo node || echo cloudflared)"
    read -k1 "?Presiona una tecla para cerrar…"; exit 1
  fi
done

[ -d node_modules ] || { echo "Instalando lo necesario (solo la primera vez)…"; npm install || exit 1; }

# Si el puerto está ocupado, se busca otro libre.
while lsof -iTCP:$PUERTO -sTCP:LISTEN >/dev/null 2>&1; do PUERTO=$((PUERTO+1)); done

echo "1/3  Preparando la versión optimizada…"
npm run build --silent >/dev/null 2>&1 || { echo "No se pudo preparar la app. Ejecuta 'npm run build' para ver el error."; read -k1; exit 1; }

echo "2/3  Encendiendo la app…"
NODE_ENV=production PORT=$PUERTO node server/index.js >/dev/null 2>&1 &
PID_APP=$!
for i in {1..30}; do curl -s -o /dev/null "http://localhost:$PUERTO/api/estado" && break; sleep 0.5; done

echo "3/3  Creando el link público con Cloudflare…"
cloudflared tunnel --no-autoupdate --url "http://localhost:$PUERTO" >"$LOG_TUNEL" 2>&1 &
PID_TUNEL=$!
LINK=""
for i in {1..60}; do
  LINK=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_TUNEL" | head -1)
  [ -n "$LINK" ] && break
  sleep 1
done

if [ -z "$LINK" ]; then
  echo "No se pudo crear el link. Revisa tu internet y vuelve a intentarlo."
  read -k1 "?Presiona una tecla para cerrar…"; exit 1
fi

# Los links nuevos tardan unos segundos en existir en internet: se espera a que respondan.
echo "     Esperando que el link esté listo…"
HOST=${LINK#https://}
for i in {1..40}; do
  IP=$(dig @1.1.1.1 +short "$HOST" 2>/dev/null | head -1)
  if [ -n "$IP" ] && curl -s -m 10 --resolve "$HOST:443:$IP" -o /dev/null -w '%{http_code}' "$LINK/api/estado" | grep -q 200; then break; fi
  sleep 2
done
sleep 3

echo "$LINK" | pbcopy
clear
echo ""
echo "  ✅ espaciococina está en línea"
echo ""
echo "  Comparte este link (ya está copiado):"
echo ""
echo "     $LINK"
echo ""
echo "  • Funciona mientras esta ventana esté abierta y tu Mac encendida."
echo "  • Si cierras la ventana, el link deja de funcionar. Al volver a abrir"
echo "    este archivo se crea un link nuevo (distinto)."
echo "  • El recetario y las fotos se guardan en tu Mac (carpeta 'datos')."
echo ""
echo "  Para apagar: cierra esta ventana o presiona Control + C."
open "$LINK"
wait $PID_TUNEL
