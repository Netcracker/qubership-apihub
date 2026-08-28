package org.qubership.jdiff.japicmp;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.w3c.dom.Element;
import org.w3c.dom.Node;

/**
 * Extracts human-readable detail lines from japicmp XML elements that are not represented as
 * {@code compatibilityChange} codes.
 */
final class JapicmpDetailsExtractor {

    private static final String NOT_APPLICABLE = "n.a.";
    private static final String UNCHANGED = "UNCHANGED";

    private static final Map<String, String> JAVA_RELEASE_BY_MAJOR = Map.ofEntries(
            Map.entry("45", "1.1"),
            Map.entry("46", "1.2"),
            Map.entry("47", "1.3"),
            Map.entry("48", "1.4"),
            Map.entry("49", "5"),
            Map.entry("50", "6"),
            Map.entry("51", "7"),
            Map.entry("52", "8"),
            Map.entry("53", "9"),
            Map.entry("54", "10"),
            Map.entry("55", "11"),
            Map.entry("56", "12"),
            Map.entry("57", "12"),
            Map.entry("58", "14"),
            Map.entry("59", "15"),
            Map.entry("60", "16"),
            Map.entry("61", "17"),
            Map.entry("62", "18"),
            Map.entry("63", "19"),
            Map.entry("64", "20"),
            Map.entry("65", "21"),
            Map.entry("66", "22"),
            Map.entry("67", "23"),
            Map.entry("68", "24"));

    private JapicmpDetailsExtractor() {
    }

    static String extractClassDetails(Element classEl) {
        List<String> parts = new ArrayList<>();
        appendIfModified(parts, "Class file format version", firstChild(classEl, "classFileFormatVersion"),
                JapicmpDetailsExtractor::formatClassFileFormatVersion);
        appendIfModified(parts, "Class type", firstChild(classEl, "classType"),
                el -> formatOldNew("oldType", "newType", el));
        appendIfModified(parts, "Superclass", firstChild(classEl, "superclass"),
                el -> formatOldNew("superclassOld", "superclassNew", el));
        appendModifiedModifiers(parts, firstChild(classEl, "modifiers"));
        return joinOrNull(parts);
    }

    static String extractMemberDetails(Element memberEl, String tag) {
        List<String> parts = new ArrayList<>();
        appendModifiedModifiers(parts, firstChild(memberEl, "modifiers"));
        switch (tag) {
            case "method" -> appendIfModified(parts, "Return type", firstChild(memberEl, "returnType"),
                    el -> formatOldNew("oldValue", "newValue", el));
            case "field" -> appendIfModified(parts, "Type", firstChild(memberEl, "type"),
                    el -> formatOldNew("oldValue", "newValue", el));
            case "constructor" -> appendModifiedParameters(parts, firstChild(memberEl, "parameters"));
            default -> {
                // no member-specific details
            }
        }
        if ("method".equals(tag)) {
            appendModifiedParameters(parts, firstChild(memberEl, "parameters"));
        }
        return joinOrNull(parts);
    }

    private static void appendIfModified(List<String> parts, String label, Element el,
            java.util.function.Function<Element, String> formatter) {
        if (el == null || UNCHANGED.equals(attr(el, "changeStatus"))) {
            return;
        }
        String formatted = formatter.apply(el);
        if (formatted != null && !formatted.isBlank()) {
            parts.add(label + ": " + formatted);
        }
    }

    private static void appendModifiedModifiers(List<String> parts, Element modifiersEl) {
        if (modifiersEl == null) {
            return;
        }
        for (Element modifier : childElements(modifiersEl, "modifier")) {
            if (UNCHANGED.equals(attr(modifier, "changeStatus"))) {
                continue;
            }
            String change = formatOldNew("oldValue", "newValue", modifier);
            if (change != null && !change.isBlank()) {
                parts.add("Modifier: " + change);
            }
        }
    }

    private static void appendModifiedParameters(List<String> parts, Element parametersEl) {
        if (parametersEl == null) {
            return;
        }
        for (Element parameter : childElements(parametersEl, "parameter")) {
            if (UNCHANGED.equals(attr(parameter, "changeStatus"))) {
                continue;
            }
            String name = attr(parameter, "name");
            String typeChange = formatOldNew("oldType", "newType", parameter);
            if (typeChange == null || typeChange.isBlank()) {
                continue;
            }
            if (isPresent(name)) {
                parts.add("Parameter " + name + " type: " + typeChange);
            } else {
                parts.add("Parameter type: " + typeChange);
            }
        }
    }

    private static String formatClassFileFormatVersion(Element el) {
        String old = formatBytecodeVersion(attr(el, "majorVersionOld"), attr(el, "minorVersionOld"));
        String neu = formatBytecodeVersion(attr(el, "majorVersionNew"), attr(el, "minorVersionNew"));
        return formatOldNewValues(old, neu);
    }

    private static String formatBytecodeVersion(String major, String minor) {
        if (!isPresent(major)) {
            return null;
        }
        String version = major + "." + (isPresent(minor) ? minor : "0");
        String javaRelease = JAVA_RELEASE_BY_MAJOR.get(major);
        if (javaRelease != null) {
            return version + " (Java " + javaRelease + ")";
        }
        return version;
    }

    private static String formatOldNew(String oldAttr, String newAttr, Element el) {
        return formatOldNewValues(attr(el, oldAttr), attr(el, newAttr));
    }

    private static String formatOldNewValues(String oldValue, String newValue) {
        if (!isPresent(oldValue) && !isPresent(newValue)) {
            return null;
        }
        return (isPresent(oldValue) ? oldValue : NOT_APPLICABLE) + " -> "
                + (isPresent(newValue) ? newValue : NOT_APPLICABLE);
    }

    private static String joinOrNull(List<String> parts) {
        if (parts.isEmpty()) {
            return null;
        }
        return String.join("; ", parts);
    }

    private static boolean isPresent(String value) {
        return value != null && !value.isBlank() && !NOT_APPLICABLE.equals(value);
    }

    private static String attr(Element el, String name) {
        return el.hasAttribute(name) ? el.getAttribute(name) : null;
    }

    private static Element firstChild(Element parent, String tagName) {
        for (Node n = parent.getFirstChild(); n != null; n = n.getNextSibling()) {
            if (n instanceof Element el && el.getTagName().equals(tagName)) {
                return el;
            }
        }
        return null;
    }

    private static List<Element> childElements(Element parent, String tagName) {
        List<Element> result = new ArrayList<>();
        for (Node n = parent.getFirstChild(); n != null; n = n.getNextSibling()) {
            if (n instanceof Element el && el.getTagName().equals(tagName)) {
                result.add(el);
            }
        }
        return result;
    }
}
