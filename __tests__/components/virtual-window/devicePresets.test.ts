import { describe, expect, it } from "vitest";

import {
  DEVICE_CATEGORIES,
  DEVICE_PRESETS,
  getDevicePreset,
  getDevicesByCategory,
  type DevicePreset,
} from "@/components/virtual-window/lib/devicePresets";

describe("devicePresets", () => {
  describe("DEVICE_PRESETS", () => {
    it("contains expected number of devices", () => {
      const devices = Object.keys(DEVICE_PRESETS);
      expect(devices.length).toBeGreaterThanOrEqual(15);
    });

    it("all devices have required properties", () => {
      Object.values(DEVICE_PRESETS).forEach((device) => {
        expect(device).toHaveProperty("name");
        expect(device).toHaveProperty("displayName");
        expect(device).toHaveProperty("width");
        expect(device).toHaveProperty("height");
        expect(device).toHaveProperty("pixelRatio");
        expect(device).toHaveProperty("userAgent");
        expect(device).toHaveProperty("category");

        // Type checks
        expect(typeof device.name).toBe("string");
        expect(typeof device.displayName).toBe("string");
        expect(typeof device.width).toBe("number");
        expect(typeof device.height).toBe("number");
        expect(typeof device.pixelRatio).toBe("number");
        expect(typeof device.userAgent).toBe("string");
        expect(["mobile", "tablet", "desktop", "watch"]).toContain(
          device.category,
        );
      });
    });

    it("all devices have valid dimensions", () => {
      Object.values(DEVICE_PRESETS).forEach((device) => {
        expect(device.width).toBeGreaterThan(0);
        expect(device.height).toBeGreaterThan(0);
        expect(device.pixelRatio).toBeGreaterThan(0);
      });
    });
  });

  describe("iPhone devices", () => {
    it("contains iPhone 15 Pro", () => {
      const device = DEVICE_PRESETS["iphone-15-pro"] as DevicePreset;
      expect(device).toBeDefined();
      expect(device.displayName).toBe("iPhone 15 Pro");
      expect(device.width).toBe(393);
      expect(device.height).toBe(852);
      expect(device.category).toBe("mobile");
      expect(device.hasNotch).toBe(true);
    });

    it("contains iPhone 15 Pro Max", () => {
      const device = DEVICE_PRESETS["iphone-15-pro-max"] as DevicePreset;
      expect(device).toBeDefined();
      expect(device.displayName).toBe("iPhone 15 Pro Max");
      expect(device.width).toBe(430);
      expect(device.height).toBe(932);
    });

    it("contains iPhone 14", () => {
      const device = DEVICE_PRESETS["iphone-14"] as DevicePreset;
      expect(device).toBeDefined();
      expect(device.width).toBe(390);
      expect(device.height).toBe(844);
    });

    it("contains iPhone SE", () => {
      const device = DEVICE_PRESETS["iphone-se"] as DevicePreset;
      expect(device).toBeDefined();
      expect(device.width).toBe(375);
      expect(device.height).toBe(667);
      expect(device.hasNotch).toBeUndefined(); // No notch on SE
    });
  });

  describe("iPad devices", () => {
    it('contains iPad Pro 12.9"', () => {
      const device = DEVICE_PRESETS["ipad-pro-12.9"] as DevicePreset;
      expect(device).toBeDefined();
      expect(device.displayName).toBe('iPad Pro 12.9"');
      expect(device.width).toBe(1024);
      expect(device.height).toBe(1366);
      expect(device.category).toBe("tablet");
    });

    it("contains iPad Air", () => {
      const device = DEVICE_PRESETS["ipad-air"] as DevicePreset;
      expect(device).toBeDefined();
      expect(device.width).toBe(820);
      expect(device.height).toBe(1180);
    });

    it("contains iPad Mini", () => {
      const device = DEVICE_PRESETS["ipad-mini"] as DevicePreset;
      expect(device).toBeDefined();
      expect(device.width).toBe(744);
      expect(device.height).toBe(1133);
    });
  });

  describe("Android devices", () => {
    it("contains Google Pixel devices", () => {
      const pixel7Pro = DEVICE_PRESETS["pixel-7-pro"] as DevicePreset;
      const pixel7 = DEVICE_PRESETS["pixel-7"] as DevicePreset;

      expect(pixel7Pro).toBeDefined();
      expect(pixel7).toBeDefined();

      expect(pixel7Pro.displayName).toBe("Google Pixel 7 Pro");
      expect(pixel7.displayName).toBe("Google Pixel 7");

      expect(pixel7Pro.category).toBe("mobile");
      expect(pixel7.category).toBe("mobile");
    });

    it("contains Samsung Galaxy devices", () => {
      const s23Ultra = DEVICE_PRESETS["galaxy-s23-ultra"] as DevicePreset;
      const s23 = DEVICE_PRESETS["galaxy-s23"] as DevicePreset;

      expect(s23Ultra).toBeDefined();
      expect(s23).toBeDefined();

      expect(s23Ultra.displayName).toBe("Samsung Galaxy S23 Ultra");
      expect(s23.displayName).toBe("Samsung Galaxy S23");
    });

    it("contains Galaxy Tab", () => {
      const tab = DEVICE_PRESETS["galaxy-tab-s8"] as DevicePreset;
      expect(tab).toBeDefined();
      expect(tab.category).toBe("tablet");
      expect(tab.width).toBe(753);
      expect(tab.height).toBe(1037);
    });
  });

  describe("Desktop devices", () => {
    it("contains MacBook devices", () => {
      const pro = DEVICE_PRESETS["macbook-pro-14"] as DevicePreset;
      const air = DEVICE_PRESETS["macbook-air-13"] as DevicePreset;

      expect(pro).toBeDefined();
      expect(air).toBeDefined();

      expect(pro.category).toBe("desktop");
      expect(air.category).toBe("desktop");

      expect(pro.width).toBeGreaterThan(1000);
      expect(air.width).toBeGreaterThan(1000);
    });
  });

  describe("Watch devices", () => {
    it("contains Apple Watch", () => {
      const watch = DEVICE_PRESETS["apple-watch-series-9"] as DevicePreset;
      expect(watch).toBeDefined();
      expect(watch.category).toBe("watch");
      expect(watch.width).toBe(205);
      expect(watch.height).toBe(251);
    });
  });

  describe("Device chrome", () => {
    it("iPhones with notch have chrome dimensions", () => {
      const iphone15Pro = DEVICE_PRESETS["iphone-15-pro"] as DevicePreset;
      expect(iphone15Pro.chrome).toBeDefined();
      expect(iphone15Pro.chrome?.top).toBeGreaterThan(0);
      expect(iphone15Pro.chrome?.bottom).toBeGreaterThan(0);
    });

    it("iPhone SE has chrome but no notch indicator", () => {
      const iphoneSE = DEVICE_PRESETS["iphone-se"] as DevicePreset;
      expect(iphoneSE.chrome).toBeDefined();
      expect(iphoneSE.hasNotch).toBeUndefined();
    });
  });

  describe("DEVICE_CATEGORIES", () => {
    it("contains all categories", () => {
      expect(DEVICE_CATEGORIES).toHaveProperty("mobile");
      expect(DEVICE_CATEGORIES).toHaveProperty("tablet");
      expect(DEVICE_CATEGORIES).toHaveProperty("desktop");
      expect(DEVICE_CATEGORIES).toHaveProperty("watch");
    });

    it("mobile category has correct devices", () => {
      const mobileDevices = DEVICE_CATEGORIES.mobile;
      expect(mobileDevices).toContain("iphone-15-pro");
      expect(mobileDevices).toContain("pixel-7-pro");
      expect(mobileDevices).toContain("galaxy-s23-ultra");
      expect(mobileDevices.length).toBeGreaterThanOrEqual(8);
    });

    it("tablet category has correct devices", () => {
      const tabletDevices = DEVICE_CATEGORIES.tablet;
      expect(tabletDevices).toContain("ipad-pro-12.9");
      expect(tabletDevices).toContain("ipad-air");
      expect(tabletDevices).toContain("galaxy-tab-s8");
    });

    it("all category devices exist in DEVICE_PRESETS", () => {
      Object.values(DEVICE_CATEGORIES)
        .flat()
        .forEach((deviceName) => {
          expect(DEVICE_PRESETS[deviceName]).toBeDefined();
        });
    });
  });

  describe("getDevicePreset", () => {
    it("returns device for valid name", () => {
      const device = getDevicePreset("iphone-15-pro") as DevicePreset;
      expect(device).toBeDefined();
      expect(device?.name).toBe("iphone-15-pro");
    });

    it("returns undefined for invalid name", () => {
      const device = getDevicePreset("non-existent-device");
      expect(device).toBeUndefined();
    });

    it("returns undefined for empty string", () => {
      const device = getDevicePreset("");
      expect(device).toBeUndefined();
    });
  });

  describe("getDevicesByCategory", () => {
    it("returns all mobile devices", () => {
      const devices = getDevicesByCategory("mobile");
      expect(devices.length).toBeGreaterThanOrEqual(8);
      devices.forEach((device) => {
        expect(device.category).toBe("mobile");
      });
    });

    it("returns all tablet devices", () => {
      const devices = getDevicesByCategory("tablet");
      expect(devices.length).toBeGreaterThanOrEqual(4);
      devices.forEach((device) => {
        expect(device.category).toBe("tablet");
      });
    });

    it("returns all desktop devices", () => {
      const devices = getDevicesByCategory("desktop");
      expect(devices.length).toBeGreaterThanOrEqual(2);
      devices.forEach((device) => {
        expect(device.category).toBe("desktop");
      });
    });

    it("returns all watch devices", () => {
      const devices = getDevicesByCategory("watch");
      expect(devices.length).toBeGreaterThanOrEqual(1);
      devices.forEach((device) => {
        expect(device.category).toBe("watch");
      });
    });

    it("returns empty array for invalid category", () => {
      const devices = getDevicesByCategory("invalid" as any);
      expect(devices).toEqual([]);
    });
  });

  describe("Pixel ratios", () => {
    it("Apple devices have expected pixel ratios", () => {
      expect((DEVICE_PRESETS["iphone-15-pro"] as DevicePreset).pixelRatio).toBe(
        3,
      );
      expect((DEVICE_PRESETS["iphone-se"] as DevicePreset).pixelRatio).toBe(2);
      expect((DEVICE_PRESETS["ipad-pro-12.9"] as DevicePreset).pixelRatio).toBe(
        2,
      );
    });

    it("Android devices have appropriate pixel ratios", () => {
      expect(
        (DEVICE_PRESETS["pixel-7-pro"] as DevicePreset).pixelRatio,
      ).toBeGreaterThan(2);
      expect((DEVICE_PRESETS["galaxy-s23"] as DevicePreset).pixelRatio).toBe(3);
    });
  });

  describe("User agents", () => {
    it("all devices have non-empty user agents", () => {
      Object.values(DEVICE_PRESETS).forEach((device) => {
        expect(device.userAgent.length).toBeGreaterThan(0);
      });
    });

    it("iOS devices have iOS user agents", () => {
      const iphone = DEVICE_PRESETS["iphone-15-pro"] as DevicePreset;
      const ipad = DEVICE_PRESETS["ipad-air"] as DevicePreset;

      expect(iphone.userAgent).toContain("iPhone");
      expect(iphone.userAgent).toContain("Safari");

      expect(ipad.userAgent).toContain("iPad");
      expect(ipad.userAgent).toContain("Safari");
    });

    it("Android devices have Android user agents", () => {
      const pixel = DEVICE_PRESETS["pixel-7"] as DevicePreset;
      const galaxy = DEVICE_PRESETS["galaxy-s23"] as DevicePreset;

      expect(pixel.userAgent).toContain("Android");
      expect(pixel.userAgent).toContain("Chrome");

      expect(galaxy.userAgent).toContain("Android");
      expect(galaxy.userAgent).toContain("Chrome");
    });
  });
});
