namespace PrinterEmulator
{
    public enum State
    {
        Idle,

        CopyData,

        CopyDataBuffer,

        Buffering,

        PrintBuffering,

        Printing,

        Pause,

        PauseBuffering,

        PausePrintBuffering
    }
}
