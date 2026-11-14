#!/bin/sh
set -eu
umask 077

fail() { printf '%s\n' "$1" >&2; exit 1; }
valid_hostname() (
  [ "${#1}" -le 253 ] || return 1
  case "$1" in ''|*[!a-zA-Z0-9.-]*|.*|*.|*..*) return 1 ;; esac
  case "$1" in *.*) ;; *) return 1 ;; esac
  remainder=$1
  while :; do
    label=${remainder%%.*}
    [ "${#label}" -ge 1 ] && [ "${#label}" -le 63 ] || return 1
    case "$label" in -*|*-) return 1 ;; esac
    case "$remainder" in *.*) remainder=${remainder#*.} ;; *) return 0 ;; esac
  done
)
valid_ipv4() (
  case "$1" in ''|*[!0-9.]*|.*|*.|*..*) return 1 ;; esac
  remainder=$1
  octets=0
  while :; do
    octet=${remainder%%.*}
    # Reject ambiguous leading zeroes as well as malformed/out-of-range octets.
    case "$octet" in 0?*) return 1 ;; esac
    [ "${#octet}" -le 3 ] && [ "$octet" -le 255 ] || return 1
    octets=$((octets + 1))
    case "$remainder" in *.*) remainder=${remainder#*.} ;; *) break ;; esac
  done
  [ "$octets" -eq 4 ]
)
valid_hostname "${TURN_DOMAIN:-}" || fail 'TURN_DOMAIN must be a fully qualified DNS hostname with labels of 1-63 characters.'
valid_ipv4 "${TURN_EXTERNAL_IP:-}" || fail 'TURN_EXTERNAL_IP must contain four IPv4 octets between 0 and 255.'
first=${TURN_EXTERNAL_IP%%.*}
remainder=${TURN_EXTERNAL_IP#*.}
second=${remainder%%.*}
case "${TURN_DOMAIN:-}" in
  *.localhost|*.local) fail 'TURN_DOMAIN must resolve publicly, not to a local-only name.' ;;
esac
case "$TURN_EXTERNAL_IP" in
  203.0.113.*|198.51.100.*|192.0.2.*) fail 'Replace the documentation IP with the TURN VM public IPv4 address.' ;;
  0.*|10.*|127.*|169.254.*|192.168.*|192.0.0.*|192.88.99.*|198.18.*|198.19.*)
    fail 'TURN_EXTERNAL_IP must be publicly routable, not a private or special-use address.' ;;
esac
[ "$first" -lt 224 ] || fail 'TURN_EXTERNAL_IP must be a public unicast address.'
if { [ "$first" -eq 100 ] && [ "$second" -ge 64 ] && [ "$second" -le 127 ]; } ||
   { [ "$first" -eq 172 ] && [ "$second" -ge 16 ] && [ "$second" -le 31 ]; }; then
  fail 'TURN_EXTERNAL_IP must be publicly routable, not a private or shared address.'
fi
[ -r /run/secrets/turn_shared_secret ] || fail 'The TURN secret file is not readable by UID 65534.'
secret=$(tr -d '\r\n' < /run/secrets/turn_shared_secret)
case "$secret" in
  ''|*[!a-fA-F0-9]*) fail 'The TURN secret must be 64 hexadecimal characters (openssl rand -hex 32).' ;;
esac
[ "${#secret}" -eq 64 ] || fail 'The TURN secret must be 64 hexadecimal characters (openssl rand -hex 32).'
[ -r /certs/fullchain.pem ] && [ -r /certs/privkey.pem ] || fail 'Stage the certificate chain and private key with UID 65534 read access.'

cat /opt/turn/turnserver.conf > /tmp/turnserver.conf
printf '\nrealm=%s\nserver-name=%s\nexternal-ip=%s\nstatic-auth-secret=%s\n' \
  "$TURN_DOMAIN" "$TURN_DOMAIN" "$TURN_EXTERNAL_IP" "$secret" >> /tmp/turnserver.conf
unset secret
exec turnserver -c /tmp/turnserver.conf
