import { Server as NetServer, Socket } from 'net';
import { EventEmitter } from 'events';
import { MessageFramer } from './message-framer.js';
import { JSONRPCMessage } from '../server/protocol-types.js';

export interface Transport {
  onmessage?: (message: JSONRPCMessage) => void;
  send(message: JSONRPCMessage): void;
  close(): Promise<void>;
}

export class SocketServerTransport extends EventEmitter implements Transport {
  private server: NetServer;
  private socket: Socket | null = null;
  private framer: MessageFramer;
  public onmessage?: (message: JSONRPCMessage) => void;
  private port: number;

  constructor(port: number = 44557) {
    super();
    this.port = port;
    this.server = new NetServer();
    this.framer = new MessageFramer();

    // Handle incoming connections
    this.server.on('connection', this.handleConnection.bind(this));
    
    // Handle server errors
    this.server.on('error', (error) => {
      this.emit('error', error);
    });

    // Set up message framer
    this.framer.on('data', (message: JSONRPCMessage) => {
      if (this.onmessage) {
        this.onmessage(message);
      }
    });

    this.framer.on('error', (error) => {
      this.emit('error', error);
    });
  }

  private handleConnection(socket: Socket): void {
    if (this.socket) {
      // Only allow one connection at a time
      socket.end();
      return;
    }

    this.socket = socket;

    // Pipe socket data through message framer
    socket.pipe(this.framer);

    socket.on('error', (error) => {
      this.emit('error', error);
    });

    socket.on('close', () => {
      this.socket = null;
      this.emit('disconnect');
    });

    this.emit('connect');
  }

  public async listen(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, () => {
        this.emit('ready', this.port);
        resolve();
      });

      this.server.once('error', reject);
    });
  }

  public send(message: JSONRPCMessage): void {
    if (!this.socket) {
      throw new Error('No active connection');
    }

    const framedMessage = MessageFramer.frame(message);
    this.socket.write(framedMessage);
  }

  public async close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.socket) {
        this.socket.end();
      }
      this.server.close(() => resolve());
    });
  }

  public isConnected(): boolean {
    return this.socket !== null && !this.socket.destroyed;
  }
}

export class SocketClientTransport extends EventEmitter implements Transport {
  private socket: Socket;
  private framer: MessageFramer;
  public onmessage?: (message: JSONRPCMessage) => void;
  private connected: boolean = false;
  private port: number;
  private host: string;

  constructor(host: string = 'localhost', port: number = 44557) {
    super();
    this.host = host;
    this.port = port;
    this.socket = new Socket();
    this.framer = new MessageFramer();

    // Set up message framer
    this.framer.on('data', (message: JSONRPCMessage) => {
      if (this.onmessage) {
        this.onmessage(message);
      }
    });

    this.framer.on('error', (error) => {
      this.emit('error', error);
    });

    // Handle socket events
    this.socket.on('connect', () => {
      this.connected = true;
      this.emit('connect');
    });

    this.socket.on('error', (error) => {
      this.emit('error', error);
    });

    this.socket.on('close', () => {
      this.connected = false;
      this.emit('disconnect');
    });
  }

  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Pipe socket data through message framer
      this.socket.pipe(this.framer);

      this.socket.connect(this.port, this.host, () => {
        resolve();
      });

      this.socket.once('error', reject);
    });
  }

  public send(message: JSONRPCMessage): void {
    if (!this.connected) {
      throw new Error('Not connected');
    }

    const framedMessage = MessageFramer.frame(message);
    this.socket.write(framedMessage);
  }

  public async close(): Promise<void> {
    return new Promise((resolve) => {
      this.socket.end(() => resolve());
    });
  }

  public isConnected(): boolean {
    return this.connected;
  }
}
