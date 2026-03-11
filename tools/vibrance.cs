using System;
using System.Runtime.InteropServices;

class Vibrance
{
    [DllImport("nvapi64.dll", EntryPoint = "nvapi_QueryInterface", CallingConvention = CallingConvention.Cdecl)]
    static extern IntPtr QueryInterface(uint id);

    delegate int NvAPI_Initialize_t();
    delegate int NvAPI_EnumDisplay_t(uint idx, ref IntPtr handle);
    delegate int NvAPI_SetDVCLevel_t(IntPtr handle, uint outputId, int level);

    // NVAPI function IDs
    const uint ID_Initialize = 0x0150E828;
    const uint ID_EnumDisplay = 0x9ABDD40D;
    const uint ID_SetDVCLevel = 0x172409B4;

    static int Main(string[] args)
    {
        if (args.Length < 1)
        {
            Console.Error.WriteLine("Usage: vibrance <level 0-100>");
            return 1;
        }

        int level = int.Parse(args[0]);

        try
        {
            // Initialize NVAPI
            var init = Marshal.GetDelegateForFunctionPointer<NvAPI_Initialize_t>(QueryInterface(ID_Initialize));
            int r = init();
            if (r != 0)
            {
                Console.Error.WriteLine("NvAPI_Initialize failed: " + r);
                return 2;
            }

            // Get first display handle
            var enumD = Marshal.GetDelegateForFunctionPointer<NvAPI_EnumDisplay_t>(QueryInterface(ID_EnumDisplay));
            IntPtr handle = IntPtr.Zero;
            r = enumD(0, ref handle);
            if (r != 0)
            {
                Console.Error.WriteLine("NvAPI_EnumDisplay failed: " + r);
                return 3;
            }

            // Set digital vibrance level
            var setDVC = Marshal.GetDelegateForFunctionPointer<NvAPI_SetDVCLevel_t>(QueryInterface(ID_SetDVCLevel));
            r = setDVC(handle, 0, level);
            if (r != 0)
            {
                Console.Error.WriteLine("NvAPI_SetDVCLevel failed: " + r);
                return 4;
            }

            Console.WriteLine("OK:" + level);
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine("Error: " + ex.Message);
            return 5;
        }
    }
}
