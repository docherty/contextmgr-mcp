import { Transform } from 'stream';

/**
 * Handles framing of JSON-RPC messages using Content-Length headers
 * Format:
 * Content-Length: <length>\r\n
 * \r\n
 * <message>
 */
export class MessageFramer extends Transform {
  private buffer: Buffer;
  private contentLength: number | null;
  
  constructor() {
    super({
      readableObjectMode: true,
      writableObjectMode: false
    });
    this.buffer = Buffer.alloc(0);
    this.contentLength = null;
  }

  _transform(chunk: Buffer, encoding: string, callback: Function): void {
    // Append new data to existing buffer
    this.buffer = Buffer.concat([this.buffer, chunk]);

    // Process complete messages
    while (this.processNextMessage()) {
      // Continue until no more complete messages
    }

    callback();
  }

  private processNextMessage(): boolean {
    // Need to find header boundary first
    if (this.contentLength === null) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) {
        return false; // Not enough data for headers
      }

      // Parse Content-Length header
      const header = this.buffer.slice(0, headerEnd).toString();
      const match = header.match(/Content-Length: (\d+)/);
      if (!match) {
        this.emit('error', new Error('Invalid message header'));
        return false;
      }

      this.contentLength = parseInt(match[1], 10);
      this.buffer = this.buffer.slice(headerEnd + 4); // Skip header + separator
    }

    // Check if we have a complete message
    if (this.buffer.length >= this.contentLength!) {
      try {
        // Parse and emit the message
        const message = JSON.parse(this.buffer.slice(0, this.contentLength!).toString());
        this.push(message);
        
        // Remove processed message from buffer
        this.buffer = this.buffer.slice(this.contentLength!);
        this.contentLength = null;
        
        return true; // Indicate we found a message
      } catch (err) {
        this.emit('error', new Error('Invalid JSON in message'));
        return false;
      }
    }

    return false; // Not enough data for message
  }

  /**
   * Frame a message with Content-Length header
   */
  static frame(message: any): Buffer {
    const json = JSON.stringify(message);
    const header = `Content-Length: ${Buffer.byteLength(json)}\r\n\r\n`;
    return Buffer.from(header + json);
  }
}
