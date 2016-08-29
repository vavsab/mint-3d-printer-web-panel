using System;
using System.Threading;
using System.Threading.Tasks;
using PrintDream.Core;
using PrintDream.Model;

namespace PrintDream.PrinterEmulator
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var cancellationTokenSource = new CancellationTokenSource();
            var cancellationToken = cancellationTokenSource.Token;
            var random = new Random(DateTime.Now.Millisecond);
            Task.Run(() =>
            {
                string buffer = "";
                while (true)
                {
                    char c = (char)Console.Read();
                    
                    if (c == '\n')
                    {
                        Console.WriteLine($"* Some input: '" + buffer +"' *");
                        buffer = string.Empty;
                    }
                    else
                    {
                        buffer += c;
                    }
                }
            });

            Task.Run(() =>
            {
                do
                {
                    Console.Write("* Some other info output *\n");
                    Console.Write(
                        InfoOutput.PackagePrefix +
                        JsonSerializer.Serialize(new InfoOutput
                        {
                            CullerRate = random.Next(0, 100),
                            LineCount = random.Next(100000, 200000),
                            LineIndex = random.Next(10000, 100000),
                            TempPWM = (short)random.Next(0, 1024),
                            Temperature = random.Next(0, 5000),
                            BaseTemperature = random.Next(0, 5000),
                            CurrentPosition = new Position
                            {
                                X = random.Next(0, 10000000),
                                Y = random.Next(0, 10000000),
                                Z = random.Next(0, 10000000)
                            }
                         }) + "\n");
                } while (!cancellationToken.WaitHandle.WaitOne(TimeSpan.FromSeconds(5)));
            }, cancellationToken).Wait();
        }
    }
}
