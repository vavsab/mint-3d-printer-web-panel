using PrinterEmulator;
using System.Runtime.Serialization;

namespace PrintDream.Model
{
    /// <summary>
    /// Represents package "I{temp:1258,baseTemp:2000,tempPWM:1024,cullerRate:0,currentPos:{X:0,Y:0,Z:500000}, line_count:146086, line_index:15}"
    /// </summary>
    [DataContract]
    public class InfoOutput
    {
        public const string PackagePrefix = "I";

        [DataMember(Name = "ID", IsRequired = false, EmitDefaultValue = false)]
        public string Id { get; set; }

        [DataMember(Name = "State")]
        public int StateCode { get; set; }

        public State State
        {
            get { return (State)StateCode; }
            set { StateCode = (int)value; }
        }

        [DataMember(Name = "temp")]
        public long Temperature { get; set; }

        [DataMember(Name = "baseTemp")]
        public long BaseTemperature { get; set; }

        [DataMember(Name = "currentPos")]
        public Position CurrentPosition { get; set; }

        /// <summary>
        /// Teperature source voltage: from 0 to 1024.
        /// </summary>
        [DataMember(Name = "tempPWM")]
        public short TempPWM { get; set; }

        [DataMember(Name = "bedTemp")]
        public long BedTemperature { get; set; }

        [DataMember(Name = "bedBaseTemp")]
        public long BedBaseTemperature { get; set; }

        /// <summary>
        /// Teperature source voltage: from 0 to 1024.
        /// </summary>
        [DataMember(Name = "bedTempPwm")]
        public short BedTempPWM { get; set; }

        /// <summary>
        /// TODO: Unknown unit of measurement
        /// </summary>
        [DataMember(Name = "cullerRate")]
        public int CullerRate { get; set; }

        /// <summary>
        /// How many lines file with data contains
        /// </summary>
        [DataMember(Name = "line_count")]
        public long LineCount { get; set; }

        /// <summary>
        /// Host many lines printer has processed
        /// </summary>
        [DataMember(Name = "line_index")]
        public int LineIndex { get; set; }

        /// <summary>
        /// Extruder pushing coefficient (1234 means 123,4 %)
        /// </summary>
        [DataMember(Name = "extrOver")]
        public int ExtruderOver { get; set; }

        /// <summary>
        /// Printer general speed (1234 means 123,4 %)
        /// </summary>
        [DataMember(Name = "feedRate")]
        public int FeedRate { get; set; }

        /// <summary>
        /// Speed of head moving in meters/minute multiplied by 10^3
        /// </summary>
        [DataMember(Name = "speed")]
        public int Speed { get; set; }

        /// <summary>
        /// File name of the current or the last printed file
        /// </summary>
        [DataMember(Name = "fileName")]
        public string FileName { get; set; }
    }
}
