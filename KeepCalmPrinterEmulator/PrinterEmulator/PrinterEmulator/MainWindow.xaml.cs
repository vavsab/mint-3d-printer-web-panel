using System;
using System.ComponentModel;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using PrintDream.Model;
using JsonSerializer = PrintDream.Core.JsonSerializer;

namespace PrinterEmulator
{    
    public partial class MainWindow
    {
        private CancellationTokenSource cancellationTokenSource;
        private readonly Random random = new Random(DateTime.Now.Millisecond);

        public MainWindow()
        {
            InitializeComponent();
        }

        protected override void OnClosing(CancelEventArgs e)
        {
            cancellationTokenSource?.Cancel();
            base.OnClosing(e);
        }

        private void ConsoleWrite(string output, bool error = false)
        {
            if (error)
            {
                TextWriter errorWriter = Console.Error;
                errorWriter.Write(output);
            }
            else
            {
                Console.Write(output);
            }

            TextBoxOutput.Text += $"{(error ? "output error" : "output")}>> {output.Replace("\n", Environment.NewLine)}";
        }

        private void CheckBoxStatus_OnChecked(object sender, RoutedEventArgs e)
        {
            cancellationTokenSource = new CancellationTokenSource();
            var cancellationToken = cancellationTokenSource.Token;

            Task.Run(() =>
            {
                string buffer = "";
                while (!cancellationToken.IsCancellationRequested)
                {
                    char c = (char)Console.Read();

                    if (c == '\n')
                    {
                        Dispatcher.Invoke(() =>
                        {
                            TextBoxOutput.Text += $"input>> {buffer}{Environment.NewLine}";
                            if (buffer.StartsWith("G300"))
                            {
                                ConsoleWrite(GetInfo() + "\n");
                            }
                        });

                        Console.WriteLine($"* Some input: '" + buffer + "' *");
                        buffer = string.Empty;
                    }
                    else
                    {
                        buffer += c;
                    }
                }
            }, cancellationToken);

            Task.Run(() =>
            {
                do
                {
                    Dispatcher.Invoke(() =>
                    {
                        if (CheckBoxStatus.IsChecked ?? false)
                        {
                            ConsoleWrite("* Some other info output *\n");
                            ConsoleWrite(GetInfo() + "\n");
                        }
                    });
                } while (!cancellationToken.WaitHandle.WaitOne(TimeSpan.FromSeconds(5)));
            }, cancellationToken);
        }

        private void CheckBoxStatus_OnUnchecked(object sender, RoutedEventArgs e)
        {
            cancellationTokenSource?.Cancel();
            cancellationTokenSource = null;
        }

        private void ButtonSendCommand_Click(object sender, RoutedEventArgs e)
        {
            ConsoleWrite(TextBoxCommand.Text + '\n');
        }

        private void ButtonError_OnClick(object sender, RoutedEventArgs e)
        {
            ConsoleWrite("Some error #" + random.Next() + '\n', error: true);   
        }

        private string GetInfo()
        {
            return InfoOutput.PackagePrefix + 
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
            })
        }
    }
}
