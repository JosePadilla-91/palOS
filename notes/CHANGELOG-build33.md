# palOS 27 Clownfish — build 33

Build 32 plus the sound fix below.

## Where sound goes
A new **sound router** runs in every palOS session, including the setup screen. It decides where sound goes, and decides again whenever sound hardware changes (headphones plugged in or out, a screen turned on, a USB or Bluetooth device connected):

1. **Headphones plugged in:** sound goes to them. That covers the front headset jack, and USB or Bluetooth headsets.
2. **Otherwise, your chosen output:** whatever you pick in Settings › Sound, or in any other app's sound settings. palOS remembers it.
3. **Nothing chosen yet, or your choice has nothing attached:** the best output that does, in this order:
   - USB or Bluetooth sound
   - the computer's own speakers, or speakers detected in its jack
   - a screen's sound over HDMI/DisplayPort, when the screen reports speakers
   - anything else

   An empty jack is never chosen.

- **What was wrong:** the front headset jack and the rear jack are one output with two ports. When the headset was unplugged, that output fell back to the empty rear jack. palOS ranked HDMI sound below it, so sound went nowhere, and nothing re-decided when you plugged in or unplugged. Settings showed no output selected because the default pointed at nothing usable.
- **Choosing with headphones in:** if you pick another output while headphones are plugged in, your pick holds until they're unplugged or plugged in again.
- **Graphics cards:** if your graphics card's sound is set to a connector with no screen (NVIDIA cards have several), it's switched to the one your monitor is on.
- **Anything playing** moves to the new output when the router switches.
- **The old rule** that pushed HDMI sound to the bottom is gone. USB sound still ranks above the computer's own.

## Tested
- **22 checks against realistic sound data:**
  - your PC (front headset jack plus NVIDIA HDMI): headset in, headset out, your choices;
  - a laptop's speakers versus an HDMI screen;
  - rear speakers detected or undetectable;
  - a USB headset;
  - the graphics card set to the wrong connector, set right, or off;
  - the motherboard's sound card never being switched;
  - a simulated session: log in, plug in, unplug, choose in Settings, choose with the headset in, replug.
- **palOS's own PipeWire:** the router reads real `pactl` output and decides.
- **Not tested:** the actual switch with real sound hardware. This workspace has none, so your PC is the real test.

**If sound still goes the wrong way:** run `grep sound /home/$USER/.cache/paladin-session/session.log | tail -20`. The router logs every decision with its reason.

## Your package repo
These packages own files that changed:
- `paladin-session`: `usr/bin/paladin-session`, plus the new `usr/lib/paladin-session/palos-sound-router`
- `palos-firstboot`: `usr/lib/palos-firstboot/session`

`etc/wireplumber/main.lua.d/51-palos-output-priority.lua` is in no package.
