# MEMRY — Next Steps

**Status:** Web portal layout fixed. Ready for hardware breadboard testing + deployment.

---

## 1. WEB PORTAL — Final Checks (30 min)

### Local testing
```bash
cd /home/claude/memry/memry-web
npm run dev
```

**Test these pages on desktop (1920px+ width):**
- `/dashboard` — content should center at 1400px max-width
- `/dashboard/upload` — fixed grid layout (400px left panel)
- `/dashboard/library` — already has max-width
- `/dashboard/devices` — already has max-width

**What to verify:**
- Desktop: content centers, no excessive empty space
- Tablet (768-1024px): padding adjusts smoothly
- Mobile (<768px): full-width, sidebar hidden

If layout looks good, proceed to deployment.

---

## 2. DEPLOY WEB PORTAL TO VERCEL (1 hour)

**Rationale:** Deploy first so the firmware has a real endpoint to test against.

### Prerequisites
- Supabase project created
- Environment variables ready

### Steps

**A. Supabase setup**
1. Create Supabase project: https://supabase.com/dashboard
2. Run schema:
   ```sql
   -- Copy contents from /home/claude/memry/memry-web/supabase-schema.sql
   ```
3. Enable Storage bucket named `memry-photos` (public read)
4. Get keys from Settings > API:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

**B. Vercel deployment**
1. Push to GitHub: `https://github.com/zooperic/MEMRY`
2. Import to Vercel: https://vercel.com/new
3. Add environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```
4. Deploy

**C. Test deployed app**
- Sign up with test account
- Pair a device (use test ID like `test-001`)
- Upload a photo
- Verify API endpoint: `https://your-app.vercel.app/api/device/test-001/current-image`
  - Should return 404 or cached image data

**Note the deployed URL** — you'll need it for firmware config.

---

## 3. HARDWARE BREADBOARD TEST (2-3 hours)

**Goal:** Verify the entire system works end-to-end before shell assembly.

**You're building ONE unit**, so this breadboard test is critical. No second chances.

### Required components
- 1× Waveshare 3.6" e-Paper HAT+ (E) — Spectra 6, 600×400
- 1× Seeed XIAO ESP32C3
- 1× 300mAh LiPo battery (JST-PH 2.0mm)
- 8× F-F dupont jumper wires (10cm)
- 1× USB-C cable
- 1× breadboard (optional, for stability)

### Wiring table

**Display to XIAO — 8 connections + PWR tie**

| Display Pin | Wire Color | XIAO Pin | Notes |
|-------------|-----------|----------|-------|
| **VCC**     | Red       | 3V3      | Power supply |
| **GND**     | Black     | GND      | Ground |
| **DIN**     | Blue      | D10      | MOSI (SPI data) |
| **CLK**     | Yellow    | D8       | SCK (SPI clock) |
| **CS**      | Green     | D3       | Chip select |
| **DC**      | Orange    | D5       | Data/command |
| **RST**     | Purple    | D6       | Reset |
| **BUSY**    | White     | D7       | Busy signal |
| **PWR** ⚠️  | —         | 3V3      | **CRITICAL: Must tie PWR to 3.3V** |

**Interface switch:** Must be set to **0** (4-line SPI).

**Battery:** Connect JST to XIAO battery port. USB-C for programming.

### Breadboard assembly sequence

1. **Check display interface switch** — set to 0
2. **Seat XIAO on breadboard** (or tape to desk if no breadboard)
3. **Wire power first:**
   - Display VCC → XIAO 3V3 (red wire)
   - Display GND → XIAO GND (black wire)
   - **Display PWR → XIAO 3V3** (jumper wire, easy to miss)
4. **Wire SPI signals** (follow table above)
5. **Double-check all 9 connections** (8 wires + PWR tie)
6. **Connect LiPo** to XIAO battery port
7. **Connect USB-C** to XIAO for programming

**Visual check:** Take a photo of your wiring for reference.

---

## 4. FIRMWARE FLASH & TEST (1 hour)

### Update firmware config

**Edit:** `/home/claude/memry/memry-firmware/config.h`

```cpp
// Replace with your deployed Vercel URL
#define DEVICE_API_BASE "https://your-app.vercel.app/api/device/"

// Replace with your device ID from web portal
#define DEVICE_ID "your-device-id"
```

**Why these values:**
- `DEVICE_API_BASE`: Your Vercel deployment from Step 2
- `DEVICE_ID`: The ID you used when pairing the device in the web portal

### Flash firmware

**Using Arduino IDE:**

1. Install Arduino IDE 2.x
2. Install ESP32 boards:
   - File → Preferences → Additional Board Manager URLs:
     ```
     https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
     ```
   - Tools → Board Manager → search "esp32" → Install
3. Select board:
   - Tools → Board → esp32 → **XIAO_ESP32C3**
4. Open `/home/claude/memry/memry-firmware/memry.ino`
5. Compile & upload (may take 2-3 minutes)

**Expected behavior on first boot:**
- Display shows WiFi provisioning screen
- Device creates WiFi network: `MEMRY-SETUP-XXXX`

### WiFi provisioning

1. Connect phone/laptop to `MEMRY-SETUP-XXXX`
2. Browser should auto-open captive portal (if not, go to `192.168.4.1`)
3. Enter your WiFi credentials
4. Device saves creds and reboots

**After WiFi connect:**
- Display fetches from API
- Should show test image or "No image set" screen
- Deep sleep for configured hours

### End-to-end test

**Upload a photo from web portal:**
1. Open your deployed app
2. Upload a test photo to your paired device
3. Force device wake:
   - Press RESET button on XIAO, OR
   - Wait for next wake cycle (check `sleep_hours` in dashboard)
4. Device should:
   - Wake up
   - Connect to WiFi (~5-8 seconds)
   - Fetch new image
   - Refresh display (~19 seconds for Spectra 6)
   - Deep sleep

**What to observe:**
- Display refresh animation (6-color Spectra 6)
- Photo renders correctly (check orientation, colors, dithering)
- Device goes silent after refresh (deep sleep)

### Measure power consumption (optional but recommended)

**Tools needed:**
- USB power meter (or multimeter in series)

**Measurements:**
1. **Deep sleep:** Should be <1mA (battery lasts months)
2. **WiFi active:** ~80-150mA (only during wake/fetch)
3. **Display refresh:** ~100-200mA (19 seconds)

**Battery math for 300mAh:**
- Assume 8hr sleep cycle, 30s wake time
- Wake 3× per day = 90s active, 86,310s sleep
- Average current ≈ (150mA × 90s + 0.5mA × 86,310s) / 86,400s ≈ **0.65mA**
- Runtime: 300mAh / 0.65mA ≈ **460 hours ≈ 19 days**
- With 24hr sleep: **2-3 months**

### Troubleshooting

**Display stays blank:**
- Check PWR is tied to 3.3V (most common miss)
- Check interface switch is at 0
- Check all 8 SPI wires

**WiFi provisioning doesn't work:**
- Device creates network but portal won't open → try `192.168.4.1` manually
- Can't connect to device network → check ESP32 board package version (2.0.11+ recommended)

**Display shows garbage/wrong colors:**
- Firmware color mapping wrong → check `epd3in6e_driver.h` palette matches Spectra 6
- Partial update artifacts → full refresh needed, check LUT table

**Device doesn't wake:**
- Check battery voltage (should be >3.0V)
- Check deep sleep timer in code
- USB-C connected overrides battery — disconnect to test sleep

**API fetch fails:**
- Check Serial Monitor for error logs
- Verify Vercel URL is correct in `config.h`
- Check device ID matches web portal
- Test API manually: `curl https://your-app.vercel.app/api/device/test-001/current-image`

---

## 5. SHELL ASSEMBLY (if breadboard test passes)

**⚠️ Only proceed if breadboard test is 100% successful.**

### Shell update needed first

**Current shell:** Window is 85×85mm (designed for 4.2" B&W, 400×300)  
**Actual display:** Spectra 6 active area is 84.6×56.4mm (600×400 landscape)

**Required changes in Tinkercad:**
1. Open `/home/claude/memry/memry-shell/memry_shell_v4.scad`
2. Change window dimensions:
   - From: `WINDOW_W = 85, WINDOW_H = 85`
   - To: `WINDOW_W = 85, WINDOW_H = 58`
3. Bottom strip grows: 23mm → ~31mm (more Polaroid-authentic)
4. Re-export STLs
5. **Resubmit to Pune printer** — print 2× (one spare)

**Wait for prints** before assembly.

### Assembly sequence (per ROADMAP.md)

**After prints arrive:**

1. **Breadboard test again** — confirm display + XIAO + battery still work
2. **Conformal coat** — spray XIAO + all solder joints, cure 24h (protects from humidity)
3. **Seat display** — place face-down in display bay, route ribbon
4. **Seal display edge** — thin silicone bead around window perimeter (inside)
5. **Seat XIAO + battery** — component bay, connect jumpers + JST
6. **Fill gasket groove** — clear silicone into rim groove
7. **Drop back panel** — self-locates inside rim ledge, press evenly
8. **Drive 4× M2×6mm screws** — corners, firm but don't overtighten
9. **Insert magnets** — drop N52 20mm×3mm into ghost-ring holes from outside
10. **Epoxy magnets** — fill with 2-part epoxy, cure 30min

**Tools needed:**
- PCB conformal coating spray
- Clear silicone sealant
- 2-part epoxy
- Small Phillips screwdriver for M2 screws

**Cure times:**
- Conformal coating: 24 hours
- Silicone: 6-12 hours (full cure 24h)
- Epoxy: 30 minutes (full cure 24h)

---

## 6. FINAL VERIFICATION

**After assembly:**
1. Charge via USB-C
2. Press RESET → should wake, connect WiFi, fetch image
3. Leave on desk for 24h to verify deep sleep + wake cycles
4. Test with real photos (faces, landscapes, text) — check dithering quality
5. Stick to fridge → test magnet strength

**If all passes:** ✅ Unit ready to gift

---

## 7. DEPLOYMENT CHECKLIST

**Before July 11, 2025:**

- [ ] Web portal deployed to Vercel
- [ ] Supabase project live with schema
- [ ] Domain setup (optional: memry.app)
- [ ] Unit assembled and tested for 24h
- [ ] Jo's account created
- [ ] Device paired to Jo's account
- [ ] First photo pre-loaded
- [ ] Friends invited as contributors
- [ ] Setup guide written (one-page PDF)
- [ ] Gift packaged

---

## RATIONALE FOR THIS ORDER

**Why deploy web first?**
- Firmware needs a real API endpoint to test against
- Mock server is for development only
- Easier to debug API issues before hardware assembly

**Why breadboard before shell?**
- No second chances with one unit
- Once assembled, fixing wiring is destructive
- Breadboard lets you verify every connection

**Why update shell before printing?**
- Current window size is wrong for Spectra 6
- Don't waste money printing wrong dimensions
- Fixing post-print requires reprinting anyway

**Why conformal coating?**
- Pune humidity is high (60-80% monsoon season)
- Bare solder joints will corrode over months
- Coating adds <1mm thickness, fits in shell

---

## CURRENT BLOCKERS

**Web portal:** ✅ Fixed (desktop layout centered at 1400px)  
**Hardware:** Waiting for you to do breadboard test  
**Shell:** Needs dimension update + reprint before assembly  

**Next action:** Start with Step 2 (Vercel deployment) so firmware has an endpoint.
