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
        /// Determines whether printer is active now
        /// </summary>
        [DataMember(Name = "isPrint")]
        public byte IsPrint { get; set; }
    }
}
