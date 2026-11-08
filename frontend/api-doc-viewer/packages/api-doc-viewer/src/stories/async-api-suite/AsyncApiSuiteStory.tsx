import { AsyncApiOperationViewer } from "@apihub/components/AsyncApiOperationViewer/AsyncApiOperationViewer";
import { type ComponentProps, type FC } from "react";
import { type AutoSwitchArgs } from "../shared/auto-switch";

export type AsyncApiSuiteStoryProps = ComponentProps<typeof AsyncApiOperationViewer> & AutoSwitchArgs;

/**
 * `meta.component` of the hand-written `Async API Suite` stories: `AsyncApiOperationViewer` with the
 * `autoSwitch` story arg, which only the story `play` reads.
 */
export const AsyncApiSuiteStory: FC<AsyncApiSuiteStoryProps> = (props) => <AsyncApiOperationViewer {...props} />;
