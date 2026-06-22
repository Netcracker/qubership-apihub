import YAML from "js-yaml";

export const parseYamlSource = (sourceText: string): Record<string, unknown> => {
  let parsedSource: unknown = undefined;

  try {
    parsedSource = JSON.parse(sourceText);
  } catch (error) {
    console.error("Cannot parse JSON:", error);
    parsedSource = undefined;
  }

  try {
    if (!parsedSource) {
      parsedSource = YAML.load(sourceText);
    }
  } catch (error) {
    console.error("Cannot parse YAML:", error);
    parsedSource = undefined;
  }

  if (!parsedSource || typeof parsedSource !== "object") {
    return {};
  }

  return parsedSource as Record<string, unknown>;
};
