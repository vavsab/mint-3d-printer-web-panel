using System.Runtime.Serialization;

namespace PrintDream.Model
{
    [DataContract]
    public class Position
    {
        [DataMember]
        public long X { get; set; }

        [DataMember]
        public long Y { get; set; }

        [DataMember]
        public long Z { get; set; }
    }
}
