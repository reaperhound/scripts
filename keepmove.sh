#!/bin/bash

# Find a mouse device that supports REL_X and REL_Y
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

# Find a keyboard device that supports Super and Tab.
find_keyboard() {
    for dev in /dev/input/event*; do
        if evemu-describe "$dev" 2>/dev/null | grep -qi "keyboard" &&
           evemu-describe "$dev" 2>/dev/null | grep -q "KEY_LEFTMETA" &&
           evemu-describe "$dev" 2>/dev/null | grep -q "KEY_TAB"; then
            echo "$dev"
            return
        fi
    done
}

MOUSEDEV=$(find_mouse)
KEYBOARDDEV=$(find_keyboard)

if [ -z "$MOUSEDEV" ]; then
    echo "No mouse device supporting REL_X and REL_Y found."
    exit 1
fi

if [ -z "$KEYBOARDDEV" ]; then
    echo "No keyboard device supporting Super and Tab found."
    exit 1
fi

echo "Using mouse device: $MOUSEDEV"
echo "Using keyboard device: $KEYBOARDDEV"
echo "Press ESC or Ctrl+C to stop..."

# Mouse movement loop
move_mouse() {
    while true; do
        X_MOVE=$(( RANDOM % 81 - 40 ))  # -40 to +40
        Y_MOVE=$(( RANDOM % 81 - 40 ))  # -40 to +40

        evemu-event "$MOUSEDEV" --type EV_REL --code REL_X --value "$X_MOVE"
        evemu-event "$MOUSEDEV" --type EV_REL --code REL_Y --value "$Y_MOVE" --sync

        sleep 1
    done
}

# Press Super+Tab once.
press_super_tab() {
    evemu-event "$KEYBOARDDEV" --type EV_KEY --code KEY_LEFTMETA --value 1
    evemu-event "$KEYBOARDDEV" --type EV_KEY --code KEY_TAB --value 1
    evemu-event "$KEYBOARDDEV" --type EV_KEY --code KEY_TAB --value 0
    evemu-event "$KEYBOARDDEV" --type EV_KEY --code KEY_LEFTMETA --value 0 --sync
}

# Press Super+Tab every 30 seconds.
key_loop() {
    while true; do
        sleep 30
        press_super_tab
    done
}

# Start background loops
move_mouse &
MOUSE_PID=$!
key_loop &
KEY_PID=$!

# Stop a background process if it is still running.
stop_process() {
    local pid="$1"
    if kill -0 "$pid" 2>/dev/null; then
        kill "$pid" 2>/dev/null
        wait "$pid" 2>/dev/null
    fi
}

handle_interrupt() {
    echo -e "\nCtrl+C pressed. Stopping..."
    exit 130
}

trap handle_interrupt SIGINT
trap 'exit 143' SIGTERM
trap 'stop_process "$MOUSE_PID"; stop_process "$KEY_PID"' EXIT

# Wait for ESC key
while true; do
    read -rsn1 key
    if [[ $key == $'\e' ]]; then
        echo -e "\nESC pressed. Stopping..."
        exit 0
    fi
done
