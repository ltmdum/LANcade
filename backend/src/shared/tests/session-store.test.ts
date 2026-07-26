import { describe, it, expect } from 'vitest';
import { createSessionStore } from '../stores/session-store.js';

describe('session store', () => {
  it('returns undefined for missing keys', () => {
    const store = createSessionStore();
    expect(store.get('nonexistent')).toBeUndefined();
  });

  it('stores and retrieves a string value', () => {
    const store = createSessionStore();
    store.set('key1', 'hello');
    expect(store.get('key1')).toBe('hello');
  });

  it('stores and retrieves a number value', () => {
    const store = createSessionStore();
    store.set('count', 42);
    expect(store.get('count')).toBe(42);
  });

  it('stores and retrieves an array value', () => {
    const store = createSessionStore();
    const words = ['apple', 'banana', 'cherry'];
    store.set('words', words);
    expect(store.get<string[]>('words')).toEqual(['apple', 'banana', 'cherry']);
  });

  it('stores and retrieves a boolean value', () => {
    const store = createSessionStore();
    store.set('enabled', true);
    expect(store.get<boolean>('enabled')).toBe(true);
  });

  it('stores and retrieves an object value', () => {
    const store = createSessionStore();
    const obj = { id: 1, name: 'test' };
    store.set('obj', obj);
    expect(store.get<{ id: number; name: string }>('obj')).toEqual({ id: 1, name: 'test' });
  });

  it('overwrites an existing key', () => {
    const store = createSessionStore();
    store.set('key', 'first');
    store.set('key', 'second');
    expect(store.get('key')).toBe('second');
  });

  it('lists all keys', () => {
    const store = createSessionStore();
    store.set('a', 1);
    store.set('b', 2);
    store.set('c', 3);
    const keys = store.keys();
    expect(keys.sort()).toEqual(['a', 'b', 'c']);
  });

  it('returns empty keys array for fresh store', () => {
    const store = createSessionStore();
    expect(store.keys()).toEqual([]);
  });

  it('handles undefined value', () => {
    const store = createSessionStore();
    store.set('undef', undefined);
    expect(store.get('undef')).toBeUndefined();
  });

  it('handles null value', () => {
    const store = createSessionStore();
    store.set('nullVal', null);
    expect(store.get('nullVal')).toBeNull();
  });

  it('supports multiple independent stores', () => {
    const store1 = createSessionStore();
    const store2 = createSessionStore();
    store1.set('shared-key', 'from-one');
    store2.set('shared-key', 'from-two');
    expect(store1.get('shared-key')).toBe('from-one');
    expect(store2.get('shared-key')).toBe('from-two');
  });
});
