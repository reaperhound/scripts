#!/bin/bash

set -euo pipefail

# Usage: ./autojiggler.sh <delay_in_minutes>

if [ $# -ne 1 ]; then
    echo "Usage: $0 <delay_in_minutes>"
    exit 1
fi

if ! [[ "$1" =~ ^[0-9]+$ ]]; then
    echo "Delay must be a positive integer."
    exit 1
fi

DELAY_MINUTES="$1"
DELAY_SECONDS=$((DELAY_MINUTES * 60))

readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

AUTOJIGGLER_PID=""

cleanup() {
    echo
    echo -e "${YELLOW}[CLEANUP]${NC} Stopping autojiggler..."

    if [[ -n "${AUTOJIGGLER_PID:-}" ]] && kill -0 "$AUTOJIGGLER_PID" 2>/dev/null; then
        kill "$AUTOJIGGLER_PID" 2>/dev/null || true

        # Wait briefly for graceful exit
        for _ in {1..20}; do
            if ! kill -0 "$AUTOJIGGLER_PID" 2>/dev/null; then
                break
            fi
            sleep 0.1
        done

        # Force kill if still alive
        if kill -0 "$AUTOJIGGLER_PID" 2>/dev/null; then
            kill -9 "$AUTOJIGGLER_PID" 2>/dev/null || true
        fi

        wait "$AUTOJIGGLER_PID" 2>/dev/null || true
    fi

    echo -e "${GREEN}✓ Autojiggler stopped${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

find_mouse() {
    for dev in /dev/input/event*; do
        if evemu-describe "$dev" 2>/dev/null | grep -qi "mouse" &&
           evemu-describe "$dev" 2>/dev/null | grep -q "REL_X" &&
           evemu-describe "$dev" 2>/dev/null | grep -q "REL_Y"; then
            echo "$dev"
            return
        fi
    done
}

echo -e "${BLUE}══════════════════════════════════════${NC}"
echo -e "${GREEN}Autojiggler Scheduler${NC}"
echo -e "${BLUE}══════════════════════════════════════${NC}"
echo
echo -e "${BLUE}[INFO]${NC} Delay: ${DELAY_MINUTES} minute(s)"
echo

remaining=$DELAY_SECONDS

while (( remaining > 0 )); do
    mins=$((remaining / 60))
    secs=$((remaining % 60))
    printf "\r${YELLOW}⏱ %02d:%02d remaining (Ctrl+C to cancel)${NC}" "$mins" "$secs"
    sleep 1
    ((remaining--))
done

echo
echo

MOUSEDEV=$(find_mouse)

if [ -z "$MOUSEDEV" ]; then
    echo -e "${RED}No compatible mouse device found.${NC}"
    exit 1
fi

echo -e "${GREEN}Using mouse device:${NC} $MOUSEDEV"
echo

move_mouse() {
    while true; do
        X_MOVE=$((RANDOM % 81 - 40))
        Y_MOVE=$((RANDOM % 81 - 40))

        evemu-event "$MOUSEDEV" \
            --type EV_REL \
            --code REL_X \
            --value "$X_MOVE"

        evemu-event "$MOUSEDEV" \
            --type EV_REL \
            --code REL_Y \
            --value "$Y_MOVE" \
            --sync

        sleep 1
    done
}

echo -e "${GREEN}[START]${NC} Starting autojiggler..."
echo -e "${YELLOW}Press Ctrl+C to stop.${NC}"
echo

move_mouse &
AUTOJIGGLER_PID=$!

wait "$AUTOJIGGLER_PID"
