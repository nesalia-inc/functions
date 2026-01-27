import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  CacheInvalidationStream,
  createCacheStream,
  defaultStream,
  StreamUtils,
  type CacheInvalidationEvent,
  type MutationEvent,
} from "../../src/events/stream";
import { successOutcome, failureOutcome, exceptionOutcome, Causes, Exceptions } from "../../src/types/outcome";

describe("CacheInvalidationStream", () => {
  let stream: CacheInvalidationStream;

  beforeEach(() => {
    stream = new CacheInvalidationStream();
  });

  describe("invalidate()", () => {
    it("should invalidate a cache key", () => {
      const event = stream.invalidate("users:123");

      expect(event.type).toBe("invalidation");
      expect(event.key).toBe("users:123");
      expect(event.timestamp).toBeDefined();
    });

    it("should include tags in invalidation event", () => {
      const event = stream.invalidate("users:123", {
        tags: ["users", "user"],
      });

      expect(event.tags).toEqual(["users", "user"]);
    });

    it("should include data in invalidation event", () => {
      const data = { userId: 123, reason: "update" };
      const event = stream.invalidate("users:123", { data });

      expect(event.data).toEqual(data);
    });

    it("should notify subscribers of invalidation", async () => {
      const callback = vi.fn();
      stream.subscribe("users:123", callback);

      stream.invalidate("users:123");

      expect(callback).toHaveBeenCalledTimes(1);
      const event = callback.mock.calls[0][0];
      expect(event.type).toBe("invalidation");
      expect(event.key).toBe("users:123");
    });
  });

  describe("invalidateMany()", () => {
    it("should invalidate multiple keys", () => {
      const events = stream.invalidateMany(["users:1", "users:2", "users:3"]);

      expect(events).toHaveLength(3);
      expect(events[0].key).toBe("users:1");
      expect(events[1].key).toBe("users:2");
      expect(events[2].key).toBe("users:3");
    });

    it("should apply same options to all invalidations", () => {
      const events = stream.invalidateMany(
        ["users:1", "users:2"],
        { tags: ["users"], data: { bulk: true } }
      );

      events.forEach((event) => {
        expect(event.tags).toEqual(["users"]);
        expect(event.data).toEqual({ bulk: true });
      });
    });

    it("should notify subscribers for each key", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      stream.subscribe("users:1", callback1);
      stream.subscribe("users:2", callback2);

      stream.invalidateMany(["users:1", "users:2"]);

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  describe("invalidateByTag()", () => {
    it("should invalidate all keys with a tag", () => {
      stream.subscribe("users:1", vi.fn(), { filters: { tags: ["users"] } });
      stream.subscribe("posts:1", vi.fn(), { filters: { tags: ["posts"] } });
      stream.subscribe("users:2", vi.fn(), { filters: { tags: ["users"] } });

      const events = stream.invalidateByTag("users");

      expect(events).toHaveLength(2);
      expect(events.every((e) => e.tags?.includes("users"))).toBe(true);
    });

    it("should include data in tag invalidations", () => {
      stream.subscribe("users:1", vi.fn(), { filters: { tags: ["users"] } });

      const events = stream.invalidateByTag("users", { reason: "bulk update" });

      expect(events[0].data).toEqual({ reason: "bulk update" });
    });

    it("should return empty array if no keys match tag", () => {
      const events = stream.invalidateByTag("nonexistent");

      expect(events).toEqual([]);
    });
  });

  describe("notifyMutation()", () => {
    it("should create mutation event from successful outcome", () => {
      const outcome = successOutcome({ id: 1, name: "Alice" });
      const event = stream.notifyMutation("createUser", outcome);

      expect(event.type).toBe("mutation");
      expect(event.operation).toBe("createUser");
      expect(event.result).toEqual({ id: 1, name: "Alice" });
      expect(event.error).toBeUndefined();
    });

    it("should create mutation event from failed outcome", () => {
      const cause = Causes.validation("Invalid email", { field: "email" });
      const outcome = failureOutcome(cause);
      const event = stream.notifyMutation("createUser", outcome);

      expect(event.type).toBe("mutation");
      expect(event.operation).toBe("createUser");
      expect(event.result).toBeUndefined();
      expect(event.error).toBeDefined();
    });

    it("should notify mutation subscribers", () => {
      const callback = vi.fn();
      stream.subscribeToMutations(["createUser"], callback);

      const outcome = successOutcome({ id: 1 });
      stream.notifyMutation("createUser", outcome);

      expect(callback).toHaveBeenCalledTimes(1);
      const event = callback.mock.calls[0][0];
      expect(event.operation).toBe("createUser");
    });
  });

  describe("subscribe()", () => {
    it("should subscribe to key events", () => {
      const callback = vi.fn();
      const unsubscribe = stream.subscribe("users:123", callback);

      stream.invalidate("users:123");

      expect(callback).toHaveBeenCalled();

      unsubscribe();
      stream.invalidate("users:123");

      expect(callback).toHaveBeenCalledTimes(1); // Not called again
    });

    it("should only receive events for subscribed key", () => {
      const callback = vi.fn();
      stream.subscribe("users:123", callback);

      stream.invalidate("users:456");

      expect(callback).not.toHaveBeenCalled();
    });

    it("should return unsubscribe function", () => {
      const callback = vi.fn();
      const unsubscribe = stream.subscribe("users:123", callback);

      expect(typeof unsubscribe).toBe("function");

      unsubscribe();

      stream.invalidate("users:123");

      expect(callback).not.toHaveBeenCalled();
    });

    it("should support multiple subscribers to same key", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      stream.subscribe("users:123", callback1);
      stream.subscribe("users:123", callback2);

      stream.invalidate("users:123");

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it("should handle async callbacks", async () => {
      const callback = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      stream.subscribe("users:123", callback);
      stream.invalidate("users:123");

      // Wait for async callback
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(callback).toHaveBeenCalled();
    });

    it("should not fail if callback throws", () => {
      const errorCallback = vi.fn(() => {
        throw new Error("Callback error");
      });

      const successCallback = vi.fn();

      stream.subscribe("users:123", errorCallback);
      stream.subscribe("users:123", successCallback);

      expect(() => stream.invalidate("users:123")).not.toThrow();

      expect(errorCallback).toHaveBeenCalled();
      expect(successCallback).toHaveBeenCalled();
    });
  });

  describe("subscribeByTags()", () => {
    it("should subscribe to events with specific tags", () => {
      const callback = vi.fn();
      const unsubscribe = stream.subscribeByTags(["users", "posts"], callback);

      stream.invalidate("users:1", { tags: ["users"] });
      stream.invalidate("posts:1", { tags: ["posts"] });
      stream.invalidate("comments:1", { tags: ["comments"] });

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).not.toHaveBeenCalledWith(
        expect.objectContaining({ key: "comments:1" })
      );

      unsubscribe();
    });

    it("should match any of the specified tags", () => {
      const callback = vi.fn();
      stream.subscribeByTags(["users", "admin"], callback);

      stream.invalidate("users:1", { tags: ["users"] });
      stream.invalidate("admin:1", { tags: ["admin"] });
      stream.invalidate("guest:1", { tags: ["guest"] });

      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  describe("subscribeToMutations()", () => {
    it("should subscribe to specific mutation operations", () => {
      const callback = vi.fn();
      const unsubscribe = stream.subscribeToMutations(
        ["createUser", "updateUser"],
        callback
      );

      stream.notifyMutation("createUser", successOutcome({}));
      stream.notifyMutation("deleteUser", successOutcome({}));
      stream.notifyMutation("updateUser", successOutcome({}));

      expect(callback).toHaveBeenCalledTimes(2);
    });

    it("should only call callback for mutation events", () => {
      const callback = vi.fn();
      stream.subscribeToMutations(["createUser"], callback);

      stream.invalidate("users:123");

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("getSubscriptions()", () => {
    it("should return all active subscriptions", () => {
      stream.subscribe("key1", vi.fn());
      stream.subscribe("key2", vi.fn());

      const unsubscribe = stream.subscribe("key3", vi.fn());
      stream.subscribe("key4", vi.fn());

      unsubscribe(); // Unsubscribe key3

      const subs = stream.getSubscriptions();

      expect(subs).toHaveLength(3);
      expect(subs.every((s) => s.active)).toBe(true);
    });
  });

  describe("getSubscriptionCount()", () => {
    it("should return count for a key", () => {
      stream.subscribe("users:123", vi.fn());
      stream.subscribe("users:123", vi.fn());
      stream.subscribe("users:456", vi.fn());

      expect(stream.getSubscriptionCount("users:123")).toBe(2);
      expect(stream.getSubscriptionCount("users:456")).toBe(1);
      expect(stream.getSubscriptionCount("posts:123")).toBe(0);
    });
  });

  describe("getHistory()", () => {
    it("should return event history", () => {
      stream.invalidate("key1");
      stream.invalidate("key2");

      const history = stream.getHistory();

      expect(history).toHaveLength(2);
      expect(history[0].key).toBe("key1");
      expect(history[1].key).toBe("key2");
    });

    it("should limit history size", () => {
      for (let i = 0; i < 10; i++) {
        stream.invalidate(`key${i}`);
      }

      const history = stream.getHistory(5);

      expect(history).toHaveLength(5);
    });

    it("should respect max history size", () => {
      stream.setMaxHistorySize(5);

      for (let i = 0; i < 10; i++) {
        stream.invalidate(`key${i}`);
      }

      const history = stream.getHistory();

      expect(history).toHaveLength(5);
      expect(history[0].key).toBe("key5"); // First 5 were evicted
    });
  });

  describe("clearHistory()", () => {
    it("should clear event history", () => {
      stream.invalidate("key1");
      stream.invalidate("key2");

      stream.clearHistory();

      expect(stream.getHistory()).toEqual([]);
    });
  });

  describe("getStats()", () => {
    it("should return stream statistics", () => {
      stream.subscribe("key1", vi.fn());
      stream.subscribe("key2", vi.fn());
      stream.invalidate("key1");

      const stats = stream.getStats();

      expect(stats.totalSubscriptions).toBe(2);
      expect(stats.activeSubscriptions).toBe(2);
      expect(stats.eventHistorySize).toBe(1);
    });
  });

  describe("clearSubscriptions()", () => {
    it("should clear all subscriptions", () => {
      stream.subscribe("key1", vi.fn());
      stream.subscribe("key2", vi.fn());

      stream.clearSubscriptions();

      expect(stream.getSubscriptions()).toHaveLength(0);
      expect(stream.getSubscriptionCount("key1")).toBe(0);
      expect(stream.getSubscriptionCount("key2")).toBe(0);
    });

    it("should mark subscriptions as inactive", () => {
      stream.subscribe("key1", vi.fn());

      const sub = stream.getSubscriptions()[0];
      expect(sub.active).toBe(true);

      stream.clearSubscriptions();

      expect(sub.active).toBe(false);
    });
  });

  describe("setMaxHistorySize()", () => {
    it("should set maximum history size", () => {
      stream.setMaxHistorySize(5);

      for (let i = 0; i < 10; i++) {
        stream.invalidate(`key${i}`);
      }

      expect(stream.getHistory().length).toBeLessThanOrEqual(5);
    });

    it("should trim existing history if needed", () => {
      for (let i = 0; i < 10; i++) {
        stream.invalidate(`key${i}`);
      }

      stream.setMaxHistorySize(3);

      expect(stream.getHistory().length).toBe(3);
    });
  });
});

describe("createCacheStream", () => {
  it("should create a new stream instance", () => {
    const stream = createCacheStream({ maxHistorySize: 100 });

    expect(stream).toBeInstanceOf(CacheInvalidationStream);
    expect(stream.getStats().maxHistorySize).toBe(100);
  });

  it("should create stream with default options", () => {
    const stream = createCacheStream();

    expect(stream).toBeInstanceOf(CacheInvalidationStream);
  });
});

describe("defaultStream", () => {
  it("should provide a global default stream", () => {
    expect(defaultStream).toBeInstanceOf(CacheInvalidationStream);
  });

  it("should persist events across tests", () => {
    defaultStream.invalidate("test:key");

    const history = defaultStream.getHistory();
    expect(history.some((e) => e.key === "test:key")).toBe(true);

    defaultStream.clearHistory();
  });
});

describe("StreamUtils", () => {
  describe("key()", () => {
    it("should create cache key from parts", () => {
      const key = StreamUtils.key("users", "123", "profile");

      expect(key).toBe("users:123:profile");
    });

    it("should handle numbers", () => {
      const key = StreamUtils.key("users", 123, "posts", 456);

      expect(key).toBe("users:123:posts:456");
    });
  });

  describe("parseKey()", () => {
    it("should parse cache key into parts", () => {
      const parts = StreamUtils.parseKey("users:123:profile");

      expect(parts).toEqual(["users", "123", "profile"]);
    });

    it("should handle single part", () => {
      const parts = StreamUtils.parseKey("users");

      expect(parts).toEqual(["users"]);
    });
  });

  describe("pattern()", () => {
    it("should create regex pattern", () => {
      const pattern = StreamUtils.pattern("users:*");

      expect(pattern.test("users:123")).toBe(true);
      expect(pattern.test("users:abc")).toBe(true);
      expect(pattern.test("posts:123")).toBe(false);
    });

    it("should handle multiple wildcards", () => {
      const pattern = StreamUtils.pattern("*:*");

      expect(pattern.test("users:123")).toBe(true);
      expect(pattern.test("posts:abc")).toBe(true);
    });

    it("should handle question marks", () => {
      const pattern = StreamUtils.pattern("users:???");

      expect(pattern.test("users:123")).toBe(true);
      expect(pattern.test("users:12")).toBe(false);
      expect(pattern.test("users:1234")).toBe(false);
    });
  });

  describe("matchesPattern()", () => {
    it("should check if key matches pattern", () => {
      expect(StreamUtils.matchesPattern("users:123", "users:*")).toBe(true);
      expect(StreamUtils.matchesPattern("users:123", "posts:*")).toBe(false);
      expect(StreamUtils.matchesPattern("users:123", "*")).toBe(true);
    });
  });

  describe("extractTags()", () => {
    it("should extract tags from key", () => {
      const tags = StreamUtils.extractTags("users:123:#users:#active");

      expect(tags).toEqual(["users", "active"]);
    });

    it("should return empty array if no tags", () => {
      const tags = StreamUtils.extractTags("users:123");

      expect(tags).toEqual([]);
    });
  });

  describe("withTags()", () => {
    it("should add tags to a key", () => {
      const key = StreamUtils.withTags("users:123", ["users", "active"]);

      expect(key).toContain("#users");
      expect(key).toContain("#active");
    });
  });
});

describe("real-world scenarios", () => {
  it("should support cache invalidation for CRUD operations", () => {
    const stream = createCacheStream();
    const callback = vi.fn();

    // Subscribe to user updates
    stream.subscribe("users:123", callback);

    // Invalidate on update
    stream.invalidate("users:123", { tags: ["users"], data: { userId: 123 } });

    expect(callback).toHaveBeenCalled();
    const event = callback.mock.calls[0][0] as CacheInvalidationEvent;
    expect(event.key).toBe("users:123");
    expect(event.tags).toContain("users");
  });

  it("should support bulk cache invalidation", () => {
    const stream = createCacheStream();
    const callbacks = {
      user1: vi.fn(),
      user2: vi.fn(),
      user3: vi.fn(),
    };

    stream.subscribe("users:1", callbacks.user1);
    stream.subscribe("users:2", callbacks.user2);
    stream.subscribe("users:3", callbacks.user3);

    // Bulk invalidate
    stream.invalidateMany(["users:1", "users:2", "users:3"], {
      tags: ["users"],
      data: { bulk: true },
    });

    expect(callbacks.user1).toHaveBeenCalled();
    expect(callbacks.user2).toHaveBeenCalled();
    expect(callbacks.user3).toHaveBeenCalled();
  });

  it("should support mutation tracking", async () => {
    const stream = createCacheStream();
    const mutations: MutationEvent[] = [];

    stream.subscribeToMutations(["createUser", "updateUser", "deleteUser"], (event) => {
      if (event.type === "mutation") {
        mutations.push(event);
      }
    });

    // Simulate mutations
    stream.notifyMutation("createUser", successOutcome({ id: 1, name: "Alice" }));
    stream.notifyMutation("updateUser", successOutcome({ id: 1, name: "Alice Updated" }));
    stream.notifyMutation("deleteUser", successOutcome({ id: 1 }));

    expect(mutations).toHaveLength(3);
    expect(mutations[0].operation).toBe("createUser");
    expect(mutations[1].operation).toBe("updateUser");
    expect(mutations[2].operation).toBe("deleteUser");
  });

  it("should support tag-based cache clearing", () => {
    const stream = createCacheStream();
    const callbacks = {
      users: vi.fn(),
      posts: vi.fn(),
      comments: vi.fn(),
    };

    stream.subscribeByTags(["users"], callbacks.users);
    stream.subscribeByTags(["posts"], callbacks.posts);
    stream.subscribeByTags(["comments"], callbacks.comments);

    // Invalidate all user-related caches
    stream.invalidateByTag("users", { reason: "user permissions changed" });

    expect(callbacks.users).toHaveBeenCalled();
    expect(callbacks.posts).not.toHaveBeenCalled();
    expect(callbacks.comments).not.toHaveBeenCalled();
  });

  it("should support history-based replay", () => {
    const stream = createCacheStream();

    // Create some events
    stream.invalidate("users:1");
    stream.notifyMutation("createUser", successOutcome({ id: 1 }));
    stream.invalidate("users:1", { tags: ["users"] });

    // Get history
    const history = stream.getHistory();

    expect(history).toHaveLength(3);
    expect(history[0].type).toBe("invalidation");
    expect(history[1].type).toBe("mutation");
    expect(history[2].type).toBe("invalidation");
  });
});
