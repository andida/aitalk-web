// OverType 1.2.6 ships declarations, but its exports map does not expose them
// to TypeScript's bundler resolution. Keep this declaration limited to the
// API used by MarkdownEditor and review it when upgrading the dependency.
declare module 'overtype' {
  export interface OverType {
    getValue(): string;
    setValue(value: string): void;
    destroy(): void;
  }

  export const OverType: {
    init(
      target: Element,
      options: {
        value?: string;
        onChange?: (value: string) => void;
        placeholder?: string;
        minHeight?: number;
        // Legacy caller option; OverType 1.2.6 uses `toolbar` and ignores this.
        showToolbar?: boolean;
      }
    ): OverType[];
  };
}
