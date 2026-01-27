import { success, failure, Outcome } from "../types/outcome";
import { Exceptions } from "../types/outcome";

/**
 * Represents a change in data that invalidates cache
 */
export interface CacheInvalidationEvent<TData = any> {
  readonly type: "invalidation";
  readonly key: string;
  readonly timestamp: number;
  readonly data?: TData;
  readonly tags?: string[];
}

/**
 * Represents a mutation that occurred
 */
export interface MutationEvent<TResult = any, TError = any> {
  readonly type: "mutation";
  readonly operation: string;
  readonly timestamp: number;
  readonly result?: TResult;
  readonly error?: TError;
}

/**
 * Represents a subscription to data changes
 */
export interface Subscription<T = any> {
  readonly id: string;
  readonly key: string;
  readonly callback: (event: CacheInvalidationEvent | MutationEvent) => void | Promise<void>;
  readonly filters?: {
    tags?: string[];
    operations?: string[];
  };
  readonly created: number;
  readonly active: boolean;
}

/**
 * Stream event types
 */
export type StreamEvent<T = any, E = any> =
  | CacheInvalidationEvent<T>
  | MutationEvent<T, E>;

/**
 * Options for cache invalidation
 */
export interface InvalidationOptions {
  tags?: string[];
  data?: any;
}

/**
 * Options for creating subscriptions
 */
export interface SubscriptionOptions {
  filters?: {
    tags?: string[];
    operations?: string[];
  };
}

/**
 * Pseudo stream for cache invalidation between server and client
 * Simulates real-time subscriptions using an in-memory bus
 */
export class CacheInvalidationStream {
  private subscriptions: Map<string, Subscription> = new Map();
  private eventHistory: StreamEvent[] = [];
  private maxHistorySize = 1000;
  private subscriptionIdCounter = 0;

  /**
   * Invalidate cache for a specific key
   *
   * @param key - The cache key to invalidate
   * @param options - Optional tags and data
   *
   * @example
   * ```ts
   * stream.invalidate("users:123", {
   *   tags: ["users", "user"],
   *   data: { userId: 123 }
   * });
   * ```
   */
  invalidate(key: string, options: InvalidationOptions = {}): CacheInvalidationEvent {
    const event: CacheInvalidationEvent = {
      type: "invalidation",
      key,
      timestamp: Date.now(),
      data: options.data,
      tags: options.tags,
    };

    this.addToHistory(event);
    this.notifySubscribers(event);

    return event;
  }

  /**
   * Invalidate multiple cache keys at once
   *
   * @param keys - Array of cache keys to invalidate
   * @param options - Optional tags and data
   *
   * @example
   * ```ts
   * stream.invalidateMany(["users:1", "users:2", "users:3"], {
   *   tags: ["users"]
   * });
   * ```
   */
  invalidateMany(keys: string[], options: InvalidationOptions = {}): CacheInvalidationEvent[] {
    return keys.map((key) => this.invalidate(key, options));
  }

  /**
   * Invalidate all cache entries matching a tag
   *
   * @param tag - The tag to match
   * @param data - Optional data to include
   *
   * @example
   * ```ts
   * stream.invalidateByTag("users", { reason: "bulk update" });
   * ```
   */
  invalidateByTag(tag: string, data?: any): CacheInvalidationEvent[] {
    const events: CacheInvalidationEvent[] = [];

    // Find all cache keys associated with this tag
    this.subscriptions.forEach((sub) => {
      if (sub.filters?.tags?.includes(tag)) {
        const event = this.invalidate(sub.key, { tags: [tag], data });
        events.push(event);
      }
    });

    return events;
  }

  /**
   * Notify subscribers of a mutation event
   *
   * @param operation - The mutation operation name
   * @param result - The result or error
   *
   * @example
   * ```ts
   * stream.notifyMutation("createUser", { ok: true, value: { id: 1, name: "Alice" }});
   * ```
   */
  notifyMutation<TResult, TError>(
    operation: string,
    result: Outcome<TResult, any, TError>
  ): MutationEvent<TResult, TError> {
    const event: MutationEvent<TResult, TError> = {
      type: "mutation",
      operation,
      timestamp: Date.now(),
      result: result._tag === "Success" ? result.value : undefined,
      error: result._tag === "Exception" ? result.errors :
             result._tag === "Failure" ? result.causes : undefined,
    };

    this.addToHistory(event);
    this.notifySubscribers(event);

    return event;
  }

  /**
   * Subscribe to cache invalidation events for a key
   *
   * @param key - The cache key to watch
   * @param callback - Function to call when events occur
   * @param options - Optional filters
   * @returns Unsubscribe function
   *
   * @example
   * ```ts
   * const unsubscribe = stream.subscribe("users:123", (event) => {
   *   if (event.type === "invalidation") {
   *     console.log("Cache invalidated for", event.key);
   *   }
   * });
   *
   * // Later: unsubscribe();
   * ```
   */
  subscribe(
    key: string,
    callback: (event: StreamEvent) => void | Promise<void>,
    options: SubscriptionOptions = {}
  ): () => void {
    const id = `sub_${this.subscriptionIdCounter++}`;

    const subscription: Subscription = {
      id,
      key,
      callback,
      filters: options.filters,
      created: Date.now(),
      active: true,
    };

    this.subscriptions.set(id, subscription);

    // Return unsubscribe function
    return () => {
      const sub = this.subscriptions.get(id);
      if (sub) {
        sub.active = false;
        this.subscriptions.delete(id);
      }
    };
  }

  /**
   * Subscribe to all events matching specific tags
   *
   * @param tags - Array of tags to watch
   * @param callback - Function to call when events occur
   * @param options - Additional options
   * @returns Unsubscribe function
   *
   * @example
   * ```ts
   * const unsubscribe = stream.subscribeByTags(["users", "posts"], (event) => {
   *   console.log("Event:", event);
   * });
   * ```
   */
  subscribeByTags(
    tags: string[],
    callback: (event: StreamEvent) => void | Promise<void>,
    options: SubscriptionOptions = {}
  ): () => void {
    // Create a special subscription that filters by tags
    const wildcardKey = `tags:${tags.join(",")}`;

    return this.subscribe(
      wildcardKey,
      (event) => {
        // Check if event matches any of our tags
        if (
          event.type === "invalidation" &&
          event.tags?.some((tag) => tags.includes(tag))
        ) {
          callback(event);
        }
      },
      {
        filters: {
          tags,
          ...options.filters,
        },
      }
    );
  }

  /**
   * Subscribe to mutation events for specific operations
   *
   * @param operations - Array of operation names to watch
   * @param callback - Function to call when mutations occur
   * @returns Unsubscribe function
   *
   * @example
   * ```ts
   * const unsubscribe = stream.subscribeToMutations(
   *   ["createUser", "updateUser", "deleteUser"],
   *   (event) => {
   *     if (event.type === "mutation") {
   *       console.log("Mutation:", event.operation);
   *     }
   *   }
   * );
   * ```
   */
  subscribeToMutations(
    operations: string[],
    callback: (event: MutationEvent) => void | Promise<void>
  ): () => void {
    const wrappedCallback = (event: StreamEvent) => {
      if (event.type === "mutation" && operations.includes(event.operation)) {
        callback(event);
      }
    };

    return this.subscribe(`mutations:${operations.join(",")}`, wrappedCallback, {
      filters: { operations },
    });
  }

  /**
   * Get all active subscriptions
   */
  getSubscriptions(): Subscription[] {
    return Array.from(this.subscriptions.values()).filter((s) => s.active);
  }

  /**
   * Get subscription count for a key
   */
  getSubscriptionCount(key: string): number {
    return Array.from(this.subscriptions.values()).filter(
      (s) => s.active && s.key === key
    ).length;
  }

  /**
   * Get event history
   */
  getHistory(limit?: number): StreamEvent[] {
    if (limit !== undefined) {
      return this.eventHistory.slice(-limit);
    }
    return [...this.eventHistory];
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get stream statistics
   */
  getStats() {
    return {
      totalSubscriptions: this.subscriptions.size,
      activeSubscriptions: this.getSubscriptions().length,
      eventHistorySize: this.eventHistory.length,
      maxHistorySize: this.maxHistorySize,
    };
  }

  /**
   * Clear all subscriptions
   */
  clearSubscriptions(): void {
    this.subscriptions.forEach((sub) => {
      sub.active = false;
    });
    this.subscriptions.clear();
  }

  /**
   * Set maximum history size
   */
  setMaxHistorySize(size: number): void {
    this.maxHistorySize = size;
    // Trim existing history if needed
    if (this.eventHistory.length > size) {
      this.eventHistory = this.eventHistory.slice(-size);
    }
  }

  /**
   * Add event to history (with size limit)
   */
  private addToHistory(event: StreamEvent): void {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Notify all relevant subscribers of an event
   */
  private notifySubscribers(event: StreamEvent): void {
    this.getSubscriptions().forEach((sub) => {
      // Check if subscription should receive this event
      if (this.shouldNotify(sub, event)) {
        try {
          sub.callback(event);
        } catch (error) {
          console.error(`Error in subscription ${sub.id}:`, error);
        }
      }
    });
  }

  /**
   * Check if a subscription should receive an event
   */
  private shouldNotify(subscription: Subscription, event: StreamEvent): boolean {
    // For tag-based subscriptions
    if (subscription.key.startsWith("tags:")) {
      return event.type === "invalidation" &&
        event.tags?.some((tag) => subscription.filters?.tags?.includes(tag));
    }

    // For mutation subscriptions
    if (subscription.key.startsWith("mutations:")) {
      return event.type === "mutation" &&
        subscription.filters?.operations?.includes(event.operation);
    }

    // For key-based subscriptions
    if (event.type === "invalidation") {
      return subscription.key === event.key;
    }

    return false;
  }
}

/**
 * Create a new cache invalidation stream
 *
 * @param options - Configuration options
 * @returns A new stream instance
 *
 * @example
 * ```ts
 * const stream = createCacheStream({ maxHistorySize: 500 });
 * ```
 */
export function createCacheStream(options: {
  maxHistorySize?: number;
} = {}): CacheInvalidationStream {
  const stream = new CacheInvalidationStream();

  if (options.maxHistorySize) {
    stream.setMaxHistorySize(options.maxHistorySize);
  }

  return stream;
}

/**
 * Global default stream instance
 */
export const defaultStream = new CacheInvalidationStream();

/**
 * Stream utilities for common patterns
 */
export const StreamUtils = {
  /**
   * Create a cache key from parts
   */
  key(...parts: (string | number)[]): string {
    return parts.join(":");
  },

  /**
   * Parse a cache key
   */
  parseKey(key: string): string[] {
    return key.split(":");
  },

  /**
   * Create a pattern for matching keys
   */
  pattern(pattern: string): RegExp {
    // Convert simple glob pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");
    return new RegExp(`^${regexPattern}$`);
  },

  /**
   * Check if a key matches a pattern
   */
  matchesPattern(key: string, pattern: string): boolean {
    const regex = this.pattern(pattern);
    return regex.test(key);
  },

  /**
   * Extract tags from a key
   */
  extractTags(key: string): string[] {
    const parts = this.parseKey(key);
    // Assume tags are parts starting with '#'
    return parts.filter((part) => part.startsWith("#")).map((part) => part.slice(1));
  },

  /**
   * Add tags to a key
   */
  withTags(key: string, tags: string[]): string {
    const tagged = tags.map((tag) => `#${tag}`);
    return this.key(...this.parseKey(key), ...tagged);
  },
};
