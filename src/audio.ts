import { Buffer } from 'node:buffer'
import { Readable } from 'node:stream'
import { createAudioResource, StreamType } from '@discordjs/voice'
import { FFmpeg } from 'prism-media'

/** How long in milliseconds to wait between sending stream data */
const MS_PER_SEND = 20

/** Opaque type, used to play/pause/remove a track once created */
export type TrackHandle = number

/**
 * Allows multiple tracks to be played at once,
 * with the ability to dynamically add tracks even
 * as others are playing
 */
export class Mixer extends Readable {
  private tracks: Record<TrackHandle, Readable> = {}

  // Fixed number of streams that get merged
  // Tracks added to the mixer get allocated to a stream
  private streams: {
    mixerStream: MixerStream
    allocation: TrackHandle | null
  }[] = []

  private time = performance.now()

  /**
   * Reads from the final mixer stream,
   * which is a combination of all individual streams
   */
  _read() {
    // Figure out how long to wait to send
    const elapsed = performance.now() - this.time
    this.time = performance.now()
    const timeTilNextSend = MS_PER_SEND - elapsed

    const sendBytes = async () => {
      // Multiply by 48 * 2 * 2 because 48Khz with 2 bytes per sample and 2 channels
      const bytesToRead = MS_PER_SEND * 48 * 2 * 2

      const results: Buffer[] = []

      // Read the streams
      for (const stream of this.streams) {
        let result: Buffer | null = null
        while (result === null) {
          result = stream.mixerStream.read(bytesToRead) as Buffer | null
          await new Promise<void>(setImmediate)
        }
        results.push(result)
      }

      // Merge the streams
      const mergedResult = Buffer.alloc(bytesToRead)
      for (let i = 0; i < bytesToRead / 2; i++) {
        const values = results.map(buf => buf.readInt16LE(i * 2))
        mergedResult.writeInt16LE(
          Math.max(Math.min(values.reduce((a, b) => a + b, 0), 32767), -32768),
          i * 2,
        )
      }

      this.push(mergedResult)
    }

    // Send when ready
    timeTilNextSend > 0
      ? setTimeout(() => void sendBytes(), timeTilNextSend)
      : void sendBytes()
  }

  constructor(streamCount = 3) {
    super()

    for (let i = 0; i < streamCount; i++) {
      this.streams.push({
        mixerStream: new MixerStream(),
        allocation: null,
      })
    }
  }

  /** Gets the mixer's `AudioResource` */
  getAudioResource() {
    return createAudioResource(this, { inputType: StreamType.Raw })
  }

  /** Plays a track */
  playTrack(stream: Readable, startPaused?: boolean): TrackHandle {
    const handle = Math.random()

    // Store the stream
    this.tracks[handle] = stream

    // Find stream with no allocation
    const unallocatedStream = this.streams.find(s => s.allocation === null)
    if (unallocatedStream === undefined) {
      throw new Error('Too many concurrent tracks.')
    }

    unallocatedStream.allocation = handle
    unallocatedStream.mixerStream.play(stream)
    if (startPaused) {
      unallocatedStream.mixerStream.pauseStream()
    }

    // Remove allocation once stream has ended
    stream.once('end', () => {
      if (unallocatedStream.allocation === handle) {
        unallocatedStream.allocation = null
      }
    })

    return handle
  }

  private getStreamFromHandle(handle) {
    const result = this.streams.find(s => s.allocation === handle)
    return result?.mixerStream
  }

  private removeAllocation(handle) {
    const result = this.streams.find(s => s.allocation === handle)
    if (result !== undefined) {
      result.allocation = null
    }
  }

  /** Pauses a track */
  pauseTrack(handle: TrackHandle) {
    this.getStreamFromHandle(handle)?.pauseStream()
  }

  /** Stops a tracks */
  stopTrack(handle: TrackHandle) {
    this.getStreamFromHandle(handle)?.pauseStream()
    this.removeAllocation(handle)
  }

  /** Resumes a track */
  resumeTrack(handle: TrackHandle) {
    this.getStreamFromHandle(handle)?.resumeStream()
  }

  /** Changes an existing track to something else */
  changeTrack(handle: TrackHandle, readable: Readable) {
    this.getStreamFromHandle(handle)?.play(readable)
  }

  /** Sets the track volume */
  setTrackVolume(handle: TrackHandle, volume: number) {
    const stream = this.getStreamFromHandle(handle)
    if (stream !== undefined) {
      stream.volume = volume
    }
  }
}

/** An individual stream in a `Mixer`, which supports pausing */
class MixerStream extends Readable {
  private time = performance.now()
  private stream: Readable | null = null
  private isStreamPaused = false

  /** The stream's volume */
  public volume = 1

  /**
   * Reads from the stream,
   * which outputs silence if nothing is playing
   */
  _read() {
    const elapsed = performance.now() - this.time
    this.time = performance.now()
    const timeTilNextSend = MS_PER_SEND - elapsed

    const sendBytes = () => {
      // Multiply by 48 * 2 * 2 because 48Khz with 2 bytes per sample and 2 channels
      const bytesToSend = MS_PER_SEND * 48 * 2 * 2

      if (this.stream !== null && !this.isStreamPaused) {
        const data = this.stream.read(bytesToSend) as Buffer | null

        if (data !== null) {
          const dataWithVolume = Buffer.alloc(data.length)

          for (let i = 0; i < data.length / 2; i++) {
            dataWithVolume.writeInt16LE(
              data.readInt16LE(i * 2) * this.volume,
              i * 2,
            )
          }

          this.push(dataWithVolume)
        }
        else {
          this.push(Buffer.alloc(bytesToSend, 0))
        }
      }
      else {
        this.push(Buffer.alloc(bytesToSend, 0))
      }
    }

    timeTilNextSend > 0
      ? setTimeout(sendBytes, timeTilNextSend)
      : sendBytes()
  }

  /** Plays a new stream */
  play(stream: Readable) {
    this.stream = stream
  }

  /** Pauses the current stream */
  pauseStream() {
    this.isStreamPaused = true
  }

  /** Resumes the current stream */
  resumeStream() {
    this.isStreamPaused = false
  }
}

/** Converts a file path to a stream */
export function streamFromFile(fp: string): Readable {
  const ffmpeg = new FFmpeg({
    args: `-i ${fp} -ar 48k -ac 2 -af apad=pad_dur=5 -f s16le`.split(' '),
  })

  return ffmpeg
}
