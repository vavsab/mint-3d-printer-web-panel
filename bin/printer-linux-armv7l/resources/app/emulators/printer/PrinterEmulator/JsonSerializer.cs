using System.IO;
using Newtonsoft.Json;

namespace PrintDream.Core
{
    public static class JsonSerializer
    {
        public static string Serialize(object obj)
            => Serialize(obj, quoteName: false);

        public static string Serialize(object obj, bool quoteName)
        {
            using (var stringWriter = new StringWriter())
            {
                using (var jsonWriter = new JsonTextWriter(stringWriter) {QuoteName = false})
                {
                    new Newtonsoft.Json.JsonSerializer().Serialize(jsonWriter, obj);
                }

                return stringWriter.ToString();
            }
        }

        public static T Deserialize<T>(string xmlString)
        {
            return JsonConvert.DeserializeObject<T>(xmlString);
        }
    }
}
