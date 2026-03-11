using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Globalization;

class GammaHelper
{
    [DllImport("gdi32.dll", CharSet = CharSet.Unicode)]
    static extern IntPtr CreateDC(string lpszDriver, string lpszDevice, string lpszOutput, IntPtr lpInitData);

    [DllImport("gdi32.dll")]
    static extern bool DeleteDC(IntPtr hdc);

    [DllImport("gdi32.dll")]
    static extern bool SetDeviceGammaRamp(IntPtr hdc, ref RAMP ramp);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    static extern bool EnumDisplayDevices(string lpDevice, uint iDevNum, ref DISPLAY_DEVICE lpDisplayDevice, uint dwFlags);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    struct DISPLAY_DEVICE
    {
        public uint cb;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)]
        public string DeviceName;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)]
        public string DeviceString;
        public uint StateFlags;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)]
        public string DeviceID;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)]
        public string DeviceKey;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct RAMP
    {
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 256)]
        public ushort[] Red;
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 256)]
        public ushort[] Green;
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 256)]
        public ushort[] Blue;
    }

    static ushort ClampToAllowed(int index, double value)
    {
        int word = (int)Math.Round(value * 65535.0);
        int defaultVal = index * 256;
        int minVal = Math.Max(0, defaultVal - 32000);
        int maxVal = Math.Min(65535, defaultVal + 32000);
        word = Math.Max(minVal, Math.Min(maxVal, word));
        return (ushort)word;
    }

    struct DisplayEntry
    {
        public string DevicePath;   // e.g. \\.\DISPLAY1
        public string FriendlyName; // e.g. ASUS VG248QE
    }

    static List<DisplayEntry> GetDisplayDevices()
    {
        var devices = new List<DisplayEntry>();
        for (uint i = 0; i < 16; i++)
        {
            DISPLAY_DEVICE dd = new DISPLAY_DEVICE();
            dd.cb = (uint)Marshal.SizeOf(dd);
            if (EnumDisplayDevices(null, i, ref dd, 0))
            {
                if ((dd.StateFlags & 0x1) != 0) // ATTACHED_TO_DESKTOP
                {
                    string friendlyName = dd.DeviceString ?? "";
                    // Try second-level call to get the actual monitor name
                    DISPLAY_DEVICE mon = new DISPLAY_DEVICE();
                    mon.cb = (uint)Marshal.SizeOf(mon);
                    if (EnumDisplayDevices(dd.DeviceName, 0, ref mon, 0))
                    {
                        if (!string.IsNullOrEmpty(mon.DeviceString))
                            friendlyName = mon.DeviceString;
                    }
                    devices.Add(new DisplayEntry {
                        DevicePath = dd.DeviceName,
                        FriendlyName = friendlyName
                    });
                }
            }
        }
        return devices;
    }

    // Usage:
    //   gamma.exe list                                           → list displays
    //   gamma.exe <displayIdx> <gamma> <br> <ct> <r> <g> <b>    → apply to display
    //   gamma.exe <displayIdx> reset                             → reset display
    //   gamma.exe all reset                                      → reset all displays
    static int Main(string[] args)
    {
        if (args.Length == 0) { PrintUsage(); return 1; }

        // List displays
        if (args[0].ToLower() == "list")
        {
            var devices = GetDisplayDevices();
            for (int i = 0; i < devices.Count; i++)
                Console.WriteLine(i + ":" + devices[i].FriendlyName);
            return 0;
        }

        // Reset all displays
        if (args[0].ToLower() == "all" && args.Length >= 2 && args[1].ToLower() == "reset")
        {
            var devices = GetDisplayDevices();
            foreach (var dev in devices)
                ApplyToDisplay(dev.DevicePath, 1.0, 0, 1.0, 1.0, 1.0, 1.0);
            Console.WriteLine("OK");
            return 0;
        }

        // Parse display index
        int dispIdx;
        if (!int.TryParse(args[0], out dispIdx))
        {
            // Backwards compat: if first arg is "reset" apply to display 0
            if (args[0].ToLower() == "reset")
            {
                var devices = GetDisplayDevices();
                if (devices.Count == 0) { Console.Error.WriteLine("No display found"); return 4; }
                ApplyToDisplay(devices[0].DevicePath, 1.0, 0, 1.0, 1.0, 1.0, 1.0);
                Console.WriteLine("OK");
                return 0;
            }
            PrintUsage();
            return 1;
        }

        var allDevices = GetDisplayDevices();
        if (dispIdx < 0 || dispIdx >= allDevices.Count)
        {
            Console.Error.WriteLine("Display index " + dispIdx + " out of range (0-" + (allDevices.Count - 1) + ")");
            return 4;
        }
        string targetDevice = allDevices[dispIdx].DevicePath;

        // Reset a specific display
        if (args.Length >= 2 && args[1].ToLower() == "reset")
        {
            if (!ApplyToDisplay(targetDevice, 1.0, 0, 1.0, 1.0, 1.0, 1.0))
                return 2;
            Console.WriteLine("OK");
            return 0;
        }

        // Apply settings: <idx> <gamma> <brightness> <contrast> <red> <green> <blue>
        if (args.Length < 7)
        {
            PrintUsage();
            return 1;
        }

        double gamma      = double.Parse(args[1], CultureInfo.InvariantCulture);
        double brightness  = double.Parse(args[2], CultureInfo.InvariantCulture);
        double contrast    = double.Parse(args[3], CultureInfo.InvariantCulture);
        double red         = double.Parse(args[4], CultureInfo.InvariantCulture);
        double green       = double.Parse(args[5], CultureInfo.InvariantCulture);
        double blue        = double.Parse(args[6], CultureInfo.InvariantCulture);

        if (!ApplyToDisplay(targetDevice, gamma, brightness, contrast, red, green, blue))
            return 2;

        Console.WriteLine("OK");
        return 0;
    }

    static bool ApplyToDisplay(string deviceName, double gamma, double brightness,
                               double contrast, double red, double green, double blue)
    {
        RAMP ramp = new RAMP();
        ramp.Red   = new ushort[256];
        ramp.Green = new ushort[256];
        ramp.Blue  = new ushort[256];

        double[] mults = { red, green, blue };
        ushort[][] channels = { ramp.Red, ramp.Green, ramp.Blue };

        for (int c = 0; c < 3; c++)
        {
            for (int i = 0; i < 256; i++)
            {
                double v = (double)i / 255.0;
                v = Math.Pow(v, 1.0 / gamma);
                v = (v - 0.5) * contrast + 0.5;
                v += brightness / 100.0;
                v *= mults[c];
                v = Math.Max(0, Math.Min(1, v));
                channels[c][i] = ClampToAllowed(i, v);
            }
        }

        IntPtr hdc = CreateDC(deviceName, null, null, IntPtr.Zero);
        if (hdc == IntPtr.Zero)
        {
            Console.Error.WriteLine("CreateDC failed for " + deviceName);
            return false;
        }

        bool ok = SetDeviceGammaRamp(hdc, ref ramp);
        DeleteDC(hdc);

        if (!ok)
            Console.Error.WriteLine("SetDeviceGammaRamp failed for " + deviceName);

        return ok;
    }

    static void PrintUsage()
    {
        Console.Error.WriteLine("Usage:");
        Console.Error.WriteLine("  gamma.exe list");
        Console.Error.WriteLine("  gamma.exe <displayIdx> <gamma> <brightness> <contrast> <red> <green> <blue>");
        Console.Error.WriteLine("  gamma.exe <displayIdx> reset");
        Console.Error.WriteLine("  gamma.exe all reset");
    }
}
