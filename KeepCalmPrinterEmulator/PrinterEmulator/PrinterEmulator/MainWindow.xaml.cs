using System;
using System.ComponentModel;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using PrintDream.Model;
using JsonSerializer = PrintDream.Core.JsonSerializer;
using System.Collections.Generic;
using System.Linq;

namespace PrinterEmulator
{
    public partial class MainWindow
    {
        private const int MaxLineCount = 100;
        private CancellationTokenSource cancellationTokenSource;
        private readonly Random random = new Random(DateTime.Now.Millisecond);

        public MainWindow()
        {
            InitializeComponent();
            DataContext = this;
            States = Enum.GetValues(typeof(State)).OfType<State>().ToList();
            SelectedState = State.Idle;
            LineCount = 100;
            LineIndex = 1;
            CheckBoxStatus.IsChecked = true;
        }

        public List<State> States { get; set; }

        public State SelectedState { get; set; }

        public int LineIndex { get; set; }

        public int LineCount { get; set; }

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

            AppendTextToOutput($"{(error ? "output error" : "output")}>> {output.Replace("\n", Environment.NewLine)}");
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
                    char c = (char)Console.In.Read();

                    if (c == '\n')
                    {
                        Dispatcher.Invoke(() =>
                        {
                            AppendTextToOutput(TextBoxOutput.Text += $"input>> {buffer}{Environment.NewLine}");
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
                            ConsoleWrite(GetInfo() + "\n");
                        }
                    });
                    Thread.Sleep(5000);
                } while (!cancellationToken.IsCancellationRequested);
            }, cancellationToken);

            Task.Run(() =>
            {
                do
                {
                    Dispatcher.Invoke(() =>
                    {
                        ConsoleWrite("* Some other info output *\n");
                    });
                    Thread.Sleep(10000);
                } while (!cancellationToken.IsCancellationRequested);
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

        private string GetInfo(bool isPrinting = false)
        {
            return InfoOutput.PackagePrefix + 
                JsonSerializer.Serialize(new InfoOutput
            {
                State = SelectedState,
                CullerRate = random.Next(0, 100),
                LineCount = LineCount,
                LineIndex = LineIndex,
                TempPWM = (short)random.Next(0, 1024),
                Temperature = random.Next(0, 300),
                BaseTemperature = random.Next(0, 300),
                CurrentPosition = new Position
                {
                    X = random.Next(0, 10000000),
                    Y = random.Next(0, 10000000),
                    Z = random.Next(0, 10000000)
                },
                FeedRate = random.Next(10, 5000),
                ExtruderOver = random.Next(10, 5000),
                Speed = random.Next(5, 300),
                FileName = @"C:\Users\Roma\Documents\Visual Studio 2015\Projects\KeepCalmPrinter\files\Folder1\CubeHeight.stl"
            });
        }

        private void AppendTextToOutput(string text)
        {
            TextBoxOutput.Text += text;
            if (TextBoxOutput.LineCount > MaxLineCount)
            {
                TextBoxOutput.Text = String.Join(Environment.NewLine, TextBoxOutput.Text.Split(new string[] { Environment.NewLine }, StringSplitOptions.None).Skip(TextBoxOutput.LineCount - MaxLineCount));
            }
        }
    }
}
