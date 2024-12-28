/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { IPlainTextOperation, TPlainTextOperation } from '@otjs/plaintext'
import { PlainTextOperation } from '@otjs/plaintext'

export class TextState {
  document: IPlainTextOperation
  snapshot: IPlainTextOperation
  revision = 0

  private _operations: TPlainTextOperation[] = []
  private _snapshotRevision = 0

  constructor(text: string) {
    this.document = PlainTextOperation.fromJSON([text])
    this.snapshot = this.document.clone()
  }

  clientOperation(ops: TPlainTextOperation): void {
    this._operations.push(ops)
    this.revision++
    this.document = this.document.compose(PlainTextOperation.fromJSON(ops))

    if (this._operations.length > 100) {
      this._operations = []
      this.snapshot = this.document.clone()
      this._snapshotRevision = this.revision
    }
  }

  getOperations(revision = 0): TPlainTextOperation[] {
    return this._snapshotRevision <= revision || !revision ? this._operations.slice(revision - this.revision) : this._operations
  }

  getSnapshot(revision = 0): TPlainTextOperation | undefined {
    return this._snapshotRevision >= revision ? this.snapshot.toJSON() : undefined
  }
}
