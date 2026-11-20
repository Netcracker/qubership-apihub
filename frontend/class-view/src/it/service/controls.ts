export interface BooleanControl {
  click(waitUpdate?: boolean): Promise<void>;

  checked(): Promise<boolean>;
}

export interface EmbeddedOptionsControl {
  check(name: string, waitUpdate?: boolean): Promise<void>;
}

export interface NumberControl {
  set(value: number, waitUpdate?: boolean): Promise<void>;
}

export interface TextControl {
  fill(text: string, waitUpdate?: boolean): Promise<void>;
}
