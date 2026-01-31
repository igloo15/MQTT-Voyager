import type { MqttMessage, TopicNode } from '../../../shared/types/models';

export class TopicTree {
  private root: Map<string, TopicNode> = new Map();

  /**
   * Add or update a message in the topic tree
   */
  addMessage(message: MqttMessage): void {
    const parts = message.topic.split('/');
    let currentLevel = this.root;
    let fullPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      fullPath = fullPath ? `${fullPath}/${part}` : part;

      let node = currentLevel.get(part);

      if (!node) {
        node = {
          name: part,
          fullPath,
          children: new Map(),
          messageCount: 0,
          subscribed: false,
        };
        currentLevel.set(part, node);
      }

      // Update message count and last message for the final node
      if (i === parts.length - 1) {
        node.messageCount++;
        node.lastMessage = message;
      }

      currentLevel = node.children;
    }
  }

  /**
   * Get the entire topic tree
   */
  getTree(): TopicNode[] {
    return Array.from(this.root.values());
  }

  /**
   * Find a node by topic path
   */
  findNode(topic: string): TopicNode | null {
    const parts = topic.split('/');
    let currentLevel = this.root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const node = currentLevel.get(part);

      if (!node) {
        return null;
      }

      if (i === parts.length - 1) {
        return node;
      }

      currentLevel = node.children;
    }

    return null;
  }

  /**
   * Mark a topic as subscribed
   */
  markSubscribed(topic: string, subscribed: boolean): void {
    const node = this.findNode(topic);
    if (node) {
      node.subscribed = subscribed;
    }
  }

  /**
   * Get all topics matching a pattern (supports + and # wildcards)
   */
  getMatchingTopics(pattern: string): string[] {
    const topics: string[] = [];
    const patternParts = pattern.split('/');

    const traverse = (node: TopicNode, depth: number): void => {
      const patternPart = patternParts[depth];

      // Exact match or single-level wildcard (+)
      if (patternPart === node.name || patternPart === '+') {
        if (depth === patternParts.length - 1) {
          // We've reached the end of the pattern
          topics.push(node.fullPath);
        } else {
          // Continue traversing children
          node.children.forEach((child) => traverse(child, depth + 1));
        }
      }

      // Multi-level wildcard (#) matches everything from this point
      if (patternPart === '#') {
        topics.push(node.fullPath);
        node.children.forEach((child) => traverseAll(child));
      }
    };

    const traverseAll = (node: TopicNode): void => {
      topics.push(node.fullPath);
      node.children.forEach((child) => traverseAll(child));
    };

    // Start traversal from root
    this.root.forEach((node) => traverse(node, 0));

    return topics;
  }

  /**
   * Get total message count across all topics
   */
  getTotalMessageCount(): number {
    let total = 0;

    const traverse = (node: TopicNode): void => {
      total += node.messageCount;
      node.children.forEach((child) => traverse(child));
    };

    this.root.forEach((node) => traverse(node));
    return total;
  }

  /**
   * Get count of unique topics
   */
  getTopicCount(): number {
    let count = 0;

    const traverse = (node: TopicNode): void => {
      if (node.messageCount > 0) {
        count++;
      }
      node.children.forEach((child) => traverse(child));
    };

    this.root.forEach((node) => traverse(node));
    return count;
  }

  /**
   * Clear the entire tree
   */
  clear(): void {
    this.root.clear();
  }

  /**
   * Export tree structure for serialization
   */
  toJSON(): any {
    const convertNode = (node: TopicNode): any => {
      return {
        name: node.name,
        fullPath: node.fullPath,
        messageCount: node.messageCount,
        subscribed: node.subscribed,
        lastMessage: node.lastMessage
          ? {
              topic: node.lastMessage.topic,
              payload: node.lastMessage.payload.toString(),
              qos: node.lastMessage.qos,
              retained: node.lastMessage.retained,
              timestamp: node.lastMessage.timestamp,
            }
          : undefined,
        children: Array.from(node.children.values()).map(convertNode),
      };
    };

    return Array.from(this.root.values()).map(convertNode);
  }
}
