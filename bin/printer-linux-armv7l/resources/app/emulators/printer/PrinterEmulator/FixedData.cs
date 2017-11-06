using GalaSoft.MvvmLight;
using PrintDream.Model;

namespace PrinterEmulator
{
    public class FixedData : ObservableObject
    {
        private long x;
        private long y;
        private long z;
        private bool isEnabled;
        private long temperature;
        private long baseTemperature;
        private long bedTemperature;
        private long bedBaseTemperature;
        private int cullerRate;

        public bool IsEnabled
        {
            get { return isEnabled; }
            set { Set(() => IsEnabled, ref isEnabled, value); }
        }

        public long X
        {
            get { return x; }
            set { Set(() => X, ref x, value); }
        }

        public long Y
        {
            get { return y; }
            set { Set(() => Y, ref y, value); }
        }

        public long Z
        {
            get { return z; }
            set { Set(() => Z, ref z, value); }
        }

        public long Temperature
        {
            get { return temperature; }
            set { Set(() => Temperature, ref temperature, value); }
        }

        public long BaseTemperature
        {
            get { return baseTemperature; }
            set { Set(() => BaseTemperature, ref baseTemperature, value); }
        }

        public long BedTemperature
        {
            get { return bedTemperature; }
            set { Set(() => BedTemperature, ref bedTemperature, value); }
        }

        public long BedBaseTemperature
        {
            get { return bedBaseTemperature; }
            set { Set(() => BedBaseTemperature, ref bedBaseTemperature, value); }
        }

        public int CullerRate
        {
            get { return cullerRate; }
            set { Set(() => CullerRate, ref cullerRate, value); }
        }

        public void Update(InfoOutput info)
        {
            X = info.CurrentPosition.X;
            Y = info.CurrentPosition.Y;
            Z = info.CurrentPosition.Z;
            Temperature = info.Temperature;
            BaseTemperature = info.BaseTemperature;
            BedTemperature = info.BedTemperature;
            BedBaseTemperature = info.BedBaseTemperature;
            CullerRate = info.CullerRate;
        }

        public void Apply(InfoOutput info)
        {
            info.CurrentPosition.X = X;
            info.CurrentPosition.Y = Y;
            info.CurrentPosition.Z = Z;
            info.Temperature = Temperature;
            info.BaseTemperature = BaseTemperature;
            info.BedTemperature = BedTemperature;
            info.BedBaseTemperature = BedBaseTemperature;
            info.CullerRate = CullerRate;
        }
    }
}
