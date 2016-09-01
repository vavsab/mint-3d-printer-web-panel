using System;
using System.Diagnostics;
using System.Linq;

namespace PrintDream.Core
{
    public class ProcessController
    {
        public event EventHandler<string> DataReceived;

        public string Path { get; set; }

        public string FileName { get; set; }

        public Process Start()
        {
            var startInfo = new ProcessStartInfo
            {
                FileName = System.IO.Path.Combine(Path, FileName),
                RedirectStandardOutput = true
            };

            var process = 
                Process.GetProcessesByName(FileName).FirstOrDefault() 
                ?? Process.Start(startInfo);

            process.BeginOutputReadLine();
            process.OutputDataReceived += (sender, eventArgs) =>
            {
                DataReceived?.Invoke(this, eventArgs.Data);
            };

            return process;
        }
    }
}
