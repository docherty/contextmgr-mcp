import { EventEmitter } from 'events';
import { Transport } from '../transport/socket-transport.js';
import { ServerCapabilities, ServerInfo, InitializeParams, InitializeResult } from './protocol-types.js';

export interface Session {
  id: string;
  transport: Transport;
  initialized: boolean;
  capabilities: InitializeParams['capabilities'];
}

export class SessionManager extends EventEmitter {
  private sessions: Map<string, Session> = new Map();
  private sessionCounter: number = 0;

  constructor(
    private serverInfo: ServerInfo,
    private serverCapabilities: ServerCapabilities
  ) {
    super();
  }

  public createSession(transport: Transport): Session {
    const sessionId = this.generateSessionId();
    const session: Session = {
      id: sessionId,
      transport,
      initialized: false,
      capabilities: {}
    };

    this.sessions.set(sessionId, session);
    this.emit('session:created', session);

    return session;
  }

  public async initializeSession(
    sessionId: string,
    params: InitializeParams
  ): Promise<InitializeResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.initialized) {
      throw new Error('Session already initialized');
    }

    // Store client capabilities
    session.capabilities = params.capabilities || {};
    session.initialized = true;

    // Filter capabilities based on client requirements
    const filteredCapabilities: ServerCapabilities = {
      tools: params.capabilities?.tools ? this.serverCapabilities.tools : undefined,
      resources: params.capabilities?.resources ? this.serverCapabilities.resources : undefined
    };

    const result: InitializeResult = {
      capabilities: filteredCapabilities,
      serverInfo: this.serverInfo
    };

    this.emit('session:initialized', session);
    
    return result;
  }

  public getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  public removeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.delete(sessionId);
      this.emit('session:closed', session);
    }
  }

  public getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  public isInitialized(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return session ? session.initialized : false;
  }

  private generateSessionId(): string {
    return `session-${++this.sessionCounter}`;
  }

  public async shutdown(): Promise<void> {
    // Close all active sessions
    const sessions = Array.from(this.sessions.values());
    await Promise.all(
      sessions.map(async (session) => {
        try {
          await session.transport.close();
          this.removeSession(session.id);
        } catch (error) {
          this.emit('error', error);
        }
      })
    );
  }
}
