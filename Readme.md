# AUTOJIGGLER (Linux - evemu based)

This project contains two scripts:

1. schedule.sh  → Starts the autojiggler after a delay
2. keepmove.sh  → Moves the mouse continuously

## Files:

* schedule.sh → 
* keepmove.sh → 

## DESCRIPTION

This tool simulates mouse movement to keep your system active.
It uses low-level Linux input events (evemu), so it works on both:

* X11
* Wayland

No GUI automation tools like xdotool or ydotool are used.

## REQUIREMENTS

You must install:

```
evemu-tools
```

Install it using:

```
sudo apt update  
sudo apt install evemu-tools  
```

## SETUP

1. Place both scripts in the SAME folder
   (This is required because schedule.sh runs ./keepmove.sh)

2. Make scripts executable:

   chmod +x schedule.sh keepmove.sh

## USAGE

Run the scheduler with delay (in minutes):

```
./schedule.sh <minutes>
```

Example:

```
./schedule.sh 20
```

This will:

* Wait 20 minutes
* Start the autojiggler
* Keep running until stopped

## STOPPING

Press:

```
Ctrl + C  
```

This will safely stop the autojiggler process.

## IMPORTANT (PERMISSIONS)

The script accesses:

```
/dev/input/event*
```

This usually requires root privileges.

Run with:

```
sudo ./schedule.sh 20
```

OR (advanced users):

Add your user to input group:

```
sudo usermod -aG input $USER  
newgrp input  
```

Note: Some systems still require sudo.

## HOW IT WORKS

* keepmove.sh:

  * Finds your mouse device
  * Sends random movement events every second

* schedule.sh:

  * Waits for given delay
  * Starts keepmove.sh in background
  * Handles cleanup on exit

## KNOWN ISSUES

* Will not work without proper permissions
* Multiple input devices may cause unexpected behavior
* Requires evemu tools installed

## SECURITY NOTE

This script injects input events at a low level.
Use only on systems you trust and control.

## AUTHOR NOTES

* Works on Ubuntu (X11 & Wayland)
* No dependency on GUI automation tools
* Designed for simplicity and reliability

## END

